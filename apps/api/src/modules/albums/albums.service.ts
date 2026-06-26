import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Prisma,
  AlbumKind,
  VisibilityScope,
  ClaimStatus,
  type Album,
  type AlbumItem,
} from '@prisma/client';
import type { DomainEvent } from '@origin/shared-types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GraphDegreeService,
  DEFAULT_MAX_DEGREE,
} from '../authorization/graph-degree.service';
import { EventPublisher } from '../../eventing/event-publisher';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AddAlbumItemDto } from './dto/add-album-item.dto';
import { SetAlbumVisibilityDto } from './dto/set-album-visibility.dto';

const ALBUM_EVENT_VERSION = 1;

/** Album with its ordered, non-deleted timeline items. */
export interface AlbumWithItems extends Album {
  items: AlbumItem[];
}

type AlbumCreatedEvent = DomainEvent<
  'album.created',
  { albumId: string; subjectPersonId: string | null; ownerAccountId: string }
>;

type AlbumItemAddedEvent = DomainEvent<
  'album.item-added',
  { albumId: string; albumItemId: string; mediaId: string }
>;

/**
 * Albums engine (Phase 4 — Living Memory).
 *
 * An album documents a person's life over time: an ordered timeline of media
 * items (photo/video) each with an optional caption and capture date. Albums
 * are visibility-scoped (PRIVATE_SELF by default; owners opt in to FAMILY /
 * PUBLIC). The file bytes are owned by the Media module — album items only
 * REFERENCE `mediaId`.
 *
 * Invariants enforced here:
 *  - Mutations are OWNER-ONLY (owner_account_id === requester).
 *  - FAMILY reads are degree-bounded against the album's subject person via
 *    {@link GraphDegreeService} (reusing the platform authorization model).
 *  - Every mutation writes a Contribution audit row.
 *  - Soft-delete only (deleted_at) — never a physical DELETE.
 */
@Injectable()
export class AlbumsService {
  private readonly logger = new Logger(AlbumsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly graphDegree: GraphDegreeService,
    private readonly events: EventPublisher,
  ) {}

  /**
   * Create a new album owned by `ownerAccountId`. Defaults to PRIVATE_SELF.
   */
  async createAlbum(
    ownerAccountId: string,
    dto: CreateAlbumDto,
  ): Promise<Album> {
    if (dto.subjectPersonId) {
      await this.assertPersonExists(dto.subjectPersonId);
    }
    if (dto.coverMediaId) {
      await this.assertMediaExists(dto.coverMediaId);
    }

    const album = await this.prisma.$transaction(async (tx) => {
      const created = await tx.album.create({
        data: {
          subjectPersonId: dto.subjectPersonId ?? null,
          ownerAccountId,
          title: dto.title,
          description: dto.description ?? null,
          kind: dto.kind ?? AlbumKind.PERSONAL,
          coverMediaId: dto.coverMediaId ?? null,
          visibilityScope: dto.visibilityScope ?? VisibilityScope.PRIVATE_SELF,
          visibleMaxDegree: dto.visibleMaxDegree ?? null,
        },
      });

      await this.writeContribution(tx, ownerAccountId, 'album', created.id, 'create', {
        newValue: {
          title: created.title,
          kind: created.kind,
          visibilityScope: created.visibilityScope,
        },
      });

      return created;
    });

    await this.publish<AlbumCreatedEvent>({
      type: 'album.created',
      version: ALBUM_EVENT_VERSION,
      occurredAt: new Date().toISOString(),
      actorId: ownerAccountId,
      correlationId: randomUUID(),
      payload: {
        albumId: album.id,
        subjectPersonId: album.subjectPersonId,
        ownerAccountId,
      },
    });

    return album;
  }

  /**
   * Append a media item to the album timeline. Owner-only.
   *
   * `position` defaults to (max existing position + 1) so items naturally
   * accumulate in chronological insertion order; callers may pass an explicit
   * position to interleave.
   */
  async addItem(
    albumId: string,
    ownerAccountId: string,
    dto: AddAlbumItemDto,
  ): Promise<AlbumItem> {
    await this.loadOwnedAlbum(albumId, ownerAccountId);
    await this.assertMediaExists(dto.mediaId);

    const item = await this.prisma.$transaction(async (tx) => {
      const position = dto.position ?? (await this.nextPosition(tx, albumId));

      const created = await tx.albumItem.create({
        data: {
          albumId,
          mediaId: dto.mediaId,
          caption: dto.caption ?? null,
          takenAt: dto.takenAt ? new Date(dto.takenAt) : null,
          takenAtText: dto.takenAtText ?? null,
          position,
        },
      });

      // Touch the album so updated_at reflects timeline activity.
      await tx.album.update({
        where: { id: albumId },
        data: { updatedAt: new Date() },
      });

      await this.writeContribution(
        tx,
        ownerAccountId,
        'album_item',
        created.id,
        'create',
        { newValue: { albumId, mediaId: created.mediaId, position } },
      );

      return created;
    });

    await this.publish<AlbumItemAddedEvent>({
      type: 'album.item-added',
      version: ALBUM_EVENT_VERSION,
      occurredAt: new Date().toISOString(),
      actorId: ownerAccountId,
      correlationId: randomUUID(),
      payload: { albumId, albumItemId: item.id, mediaId: item.mediaId },
    });

    return item;
  }

  /**
   * Fetch an album with its ordered timeline, ENFORCING visibility:
   *  - PUBLIC       -> any authenticated requester.
   *  - PRIVATE_SELF -> the owner account only.
   *  - FAMILY       -> the owner, or a requester whose claimed person is within
   *                    `visibleMaxDegree` of the album subject in the global
   *                    family graph.
   */
  async getAlbum(
    albumId: string,
    requesterAccountId: string,
  ): Promise<AlbumWithItems> {
    const album = await this.prisma.album.findFirst({
      where: { id: albumId, deletedAt: null },
    });
    if (!album) {
      throw new NotFoundException('Album not found / Album introuvable');
    }

    const allowed = await this.canViewAlbum(album, requesterAccountId);
    if (!allowed) {
      // Do not leak existence — same message as not-found semantics.
      throw new ForbiddenException('Album not accessible / Album inaccessible');
    }

    const items = await this.prisma.albumItem.findMany({
      where: { albumId, deletedAt: null },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    return { ...album, items };
  }

  /**
   * List the albums ABOUT a given person that the requester is allowed to see.
   * Visibility is filtered per-album with the same rules as {@link getAlbum}.
   */
  async listAlbumsForPerson(
    personId: string,
    requesterAccountId: string,
  ): Promise<Album[]> {
    const albums = await this.prisma.album.findMany({
      where: { subjectPersonId: personId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const visible: Album[] = [];
    for (const album of albums) {
      if (await this.canViewAlbum(album, requesterAccountId)) {
        visible.push(album);
      }
    }
    return visible;
  }

  /**
   * Patch album metadata. Owner-only. Returns the updated album.
   */
  async updateAlbum(
    albumId: string,
    ownerAccountId: string,
    dto: UpdateAlbumDto,
  ): Promise<Album> {
    await this.loadOwnedAlbum(albumId, ownerAccountId);
    if (dto.coverMediaId) {
      await this.assertMediaExists(dto.coverMediaId);
    }

    const data: Prisma.AlbumUpdateInput = {};
    const audit: Record<string, string | number | null> = {};
    if (dto.title !== undefined) {
      data.title = dto.title;
      audit.title = dto.title;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
      audit.description = dto.description;
    }
    if (dto.kind !== undefined) {
      data.kind = dto.kind;
      audit.kind = dto.kind;
    }
    if (dto.coverMediaId !== undefined) {
      data.coverMediaId = dto.coverMediaId;
      audit.coverMediaId = dto.coverMediaId;
    }
    if (dto.visibilityScope !== undefined) {
      data.visibilityScope = dto.visibilityScope;
      audit.visibilityScope = dto.visibilityScope;
    }
    if (dto.visibleMaxDegree !== undefined) {
      data.visibleMaxDegree = dto.visibleMaxDegree;
      audit.visibleMaxDegree = dto.visibleMaxDegree;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.album.update({ where: { id: albumId }, data });
      await this.writeContribution(tx, ownerAccountId, 'album', albumId, 'update', {
        newValue: audit,
      });
      return updated;
    });
  }

  /**
   * Opt-in publish: change an album's visibility scope (and optional degree).
   * Owner-only.
   */
  async setVisibility(
    albumId: string,
    ownerAccountId: string,
    dto: SetAlbumVisibilityDto,
  ): Promise<Album> {
    const existing = await this.loadOwnedAlbum(albumId, ownerAccountId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.album.update({
        where: { id: albumId },
        data: {
          visibilityScope: dto.visibilityScope,
          visibleMaxDegree:
            dto.visibilityScope === VisibilityScope.FAMILY
              ? (dto.visibleMaxDegree ?? existing.visibleMaxDegree)
              : null,
        },
      });

      await this.writeContribution(
        tx,
        ownerAccountId,
        'album',
        albumId,
        'set_visibility',
        {
          fieldName: 'visibility_scope',
          oldValue: { visibilityScope: existing.visibilityScope },
          newValue: { visibilityScope: updated.visibilityScope },
        },
      );

      return updated;
    });
  }

  /**
   * Soft-delete a timeline item. Owner-only.
   */
  async removeItem(
    albumId: string,
    itemId: string,
    ownerAccountId: string,
  ): Promise<void> {
    await this.loadOwnedAlbum(albumId, ownerAccountId);
    const item = await this.prisma.albumItem.findFirst({
      where: { id: itemId, albumId, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException('Album item not found / Élément introuvable');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.albumItem.update({
        where: { id: itemId },
        data: { deletedAt: new Date() },
      });
      await this.writeContribution(
        tx,
        ownerAccountId,
        'album_item',
        itemId,
        'delete',
        {},
      );
    });
  }

  /**
   * Soft-delete an entire album. Owner-only. Items are left in place (they are
   * unreachable once the album is deleted) following soft-delete semantics.
   */
  async deleteAlbum(albumId: string, ownerAccountId: string): Promise<void> {
    await this.loadOwnedAlbum(albumId, ownerAccountId);

    await this.prisma.$transaction(async (tx) => {
      await tx.album.update({
        where: { id: albumId },
        data: { deletedAt: new Date() },
      });
      await this.writeContribution(
        tx,
        ownerAccountId,
        'album',
        albumId,
        'delete',
        {},
      );
    });
  }

  // --- internals -----------------------------------------------------------

  /**
   * Visibility decision for a single album. Mirrors the platform
   * VisibilityGuard logic but operates on account ids (owner) + the subject
   * person node for FAMILY degree, since the public surface here is account
   * scoped rather than route-guarded.
   */
  private async canViewAlbum(
    album: Album,
    requesterAccountId: string,
  ): Promise<boolean> {
    // The owner always sees their own album, regardless of scope.
    if (album.ownerAccountId === requesterAccountId) {
      return true;
    }

    switch (album.visibilityScope) {
      case VisibilityScope.PUBLIC:
        return true;

      case VisibilityScope.PRIVATE_SELF:
        return false;

      case VisibilityScope.FAMILY: {
        // Without a subject person there is no node to anchor degree on.
        if (!album.subjectPersonId) {
          return false;
        }
        const requesterPersonIds =
          await this.resolveClaimedPersonIds(requesterAccountId);
        if (requesterPersonIds.length === 0) {
          return false;
        }
        const maxDegree = album.visibleMaxDegree ?? DEFAULT_MAX_DEGREE;
        for (const personId of requesterPersonIds) {
          const degree = await this.graphDegree.computeDegree(
            personId,
            album.subjectPersonId,
            maxDegree,
          );
          if (degree !== null && degree <= maxDegree) {
            return true;
          }
        }
        return false;
      }

      default:
        // Unknown scope -> fail closed.
        return false;
    }
  }

  /**
   * The person nodes a requesting account is VERIFIED-claimed as. Used as the
   * source nodes for FAMILY degree computation.
   */
  private async resolveClaimedPersonIds(
    accountId: string,
  ): Promise<string[]> {
    const claims = await this.prisma.claim.findMany({
      where: { accountId, status: ClaimStatus.VERIFIED },
      select: { personId: true },
    });
    return claims.map((c) => c.personId);
  }

  /**
   * Loads an album and asserts the requester owns it. Throws NotFound when the
   * album is missing/deleted and Forbidden when owned by someone else.
   */
  private async loadOwnedAlbum(
    albumId: string,
    ownerAccountId: string,
  ): Promise<Album> {
    const album = await this.prisma.album.findFirst({
      where: { id: albumId, deletedAt: null },
    });
    if (!album) {
      throw new NotFoundException('Album not found / Album introuvable');
    }
    if (album.ownerAccountId !== ownerAccountId) {
      throw new ForbiddenException(
        'Only the album owner can modify it / Réservé au propriétaire',
      );
    }
    return album;
  }

  private async nextPosition(
    tx: Prisma.TransactionClient,
    albumId: string,
  ): Promise<number> {
    const last = await tx.albumItem.findFirst({
      where: { albumId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return last ? last.position + 1 : 0;
  }

  private async assertPersonExists(personId: string): Promise<void> {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
      select: { id: true },
    });
    if (!person) {
      throw new NotFoundException('Person not found / Personne introuvable');
    }
  }

  private async assertMediaExists(mediaId: string): Promise<void> {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
      select: { id: true },
    });
    if (!media) {
      throw new NotFoundException('Media not found / Média introuvable');
    }
  }

  private async writeContribution(
    tx: Prisma.TransactionClient,
    accountId: string,
    entityType: string,
    entityId: string,
    action: string,
    payload: {
      fieldName?: string;
      oldValue?: Prisma.InputJsonValue;
      newValue?: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await tx.contribution.create({
      data: {
        accountId,
        entityType,
        entityId,
        action,
        fieldName: payload.fieldName,
        oldValue: payload.oldValue,
        newValue: payload.newValue,
      },
    });
  }

  private async publish<TEvent extends DomainEvent<string, unknown>>(
    event: TEvent,
  ): Promise<void> {
    try {
      await this.events.publish(event);
    } catch (err) {
      // State already committed; a publish failure must not fail the request.
      this.logger.error(
        `Failed to publish ${event.type}: ${(err as Error).message}`,
      );
    }
  }
}
