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
import { UpdateAlbumItemDto } from './dto/update-album-item.dto';
import { ReorderAlbumItemsDto } from './dto/reorder-album-items.dto';
import { SetAlbumVisibilityDto } from './dto/set-album-visibility.dto';

const ALBUM_EVENT_VERSION = 1;

/**
 * Album as exposed to the web client. Enriches the persisted row with the
 * resolved subject person display name and the live item count, and drops
 * internal fields (deleted_at). Timestamps are ISO strings.
 */
export interface AlbumResponse {
  id: string;
  subjectPersonId: string | null;
  subjectPersonName: string | null;
  ownerAccountId: string;
  title: string;
  description: string | null;
  kind: AlbumKind;
  coverMediaId: string | null;
  visibilityScope: VisibilityScope;
  visibleMaxDegree: number | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A timeline item as exposed to the web client. */
export interface AlbumItemResponse {
  id: string;
  albumId: string;
  mediaId: string;
  caption: string | null;
  /** ISO date (yyyy-mm-dd) the media was captured, when known. */
  takenAt: string | null;
  takenAtText: string | null;
  position: number;
  createdAt: string;
}

/** Album with its ordered, non-deleted timeline items. */
export interface AlbumDetailResponse extends AlbumResponse {
  items: AlbumItemResponse[];
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
  ): Promise<AlbumResponse> {
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

    const subjectPersonName = await this.resolvePersonName(
      album.subjectPersonId,
    );
    return this.toAlbumResponse(album, subjectPersonName, 0);
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
  ): Promise<AlbumItemResponse> {
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

    return this.toAlbumItemResponse(item);
  }

  /**
   * Patch a timeline item's metadata. Owner-only. The referenced media file is
   * immutable. Returns the updated item.
   */
  async updateItem(
    albumId: string,
    itemId: string,
    ownerAccountId: string,
    dto: UpdateAlbumItemDto,
  ): Promise<AlbumItemResponse> {
    await this.loadOwnedAlbum(albumId, ownerAccountId);
    const item = await this.prisma.albumItem.findFirst({
      where: { id: itemId, albumId, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException('Album item not found / Élément introuvable');
    }

    const data: Prisma.AlbumItemUpdateInput = {};
    const audit: Record<string, string | number | null> = {};
    if (dto.caption !== undefined) {
      data.caption = dto.caption;
      audit.caption = dto.caption;
    }
    if (dto.takenAt !== undefined) {
      data.takenAt = dto.takenAt ? new Date(dto.takenAt) : null;
      audit.takenAt = dto.takenAt;
    }
    if (dto.takenAtText !== undefined) {
      data.takenAtText = dto.takenAtText;
      audit.takenAtText = dto.takenAtText;
    }
    if (dto.position !== undefined) {
      data.position = dto.position;
      audit.position = dto.position;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.albumItem.update({ where: { id: itemId }, data });
      await tx.album.update({
        where: { id: albumId },
        data: { updatedAt: new Date() },
      });
      await this.writeContribution(
        tx,
        ownerAccountId,
        'album_item',
        itemId,
        'update',
        { newValue: audit },
      );
      return next;
    });

    return this.toAlbumItemResponse(updated);
  }

  /**
   * Rewrite the timeline order. Owner-only. Each provided item's `position`
   * becomes its index in `orderedItemIds`; ids not belonging to the album are
   * ignored.
   */
  async reorderItems(
    albumId: string,
    ownerAccountId: string,
    dto: ReorderAlbumItemsDto,
  ): Promise<void> {
    await this.loadOwnedAlbum(albumId, ownerAccountId);

    const existing = await this.prisma.albumItem.findMany({
      where: { albumId, deletedAt: null },
      select: { id: true },
    });
    const validIds = new Set(existing.map((i) => i.id));

    await this.prisma.$transaction(async (tx) => {
      let position = 0;
      for (const id of dto.orderedItemIds) {
        if (!validIds.has(id)) {
          continue;
        }
        await tx.albumItem.update({ where: { id }, data: { position } });
        position += 1;
      }
      await tx.album.update({
        where: { id: albumId },
        data: { updatedAt: new Date() },
      });
      await this.writeContribution(
        tx,
        ownerAccountId,
        'album',
        albumId,
        'reorder_items',
        { newValue: { orderedItemIds: dto.orderedItemIds } },
      );
    });
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
  ): Promise<AlbumDetailResponse> {
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

    const subjectPersonName = await this.resolvePersonName(
      album.subjectPersonId,
    );

    return {
      ...this.toAlbumResponse(album, subjectPersonName, items.length),
      items: items.map((item) => this.toAlbumItemResponse(item)),
    };
  }

  /**
   * List the albums OWNED by the requesting account (their own albums),
   * regardless of visibility scope, most-recent first.
   */
  async listMyAlbums(ownerAccountId: string): Promise<AlbumResponse[]> {
    const albums = await this.prisma.album.findMany({
      where: { ownerAccountId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return this.enrichAlbums(albums);
  }

  /**
   * List the albums ABOUT a given person that the requester is allowed to see.
   * Visibility is filtered per-album with the same rules as {@link getAlbum}.
   */
  async listAlbumsForPerson(
    personId: string,
    requesterAccountId: string,
  ): Promise<AlbumResponse[]> {
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
    return this.enrichAlbums(visible);
  }

  /**
   * Patch album metadata. Owner-only. Returns the updated album.
   */
  async updateAlbum(
    albumId: string,
    ownerAccountId: string,
    dto: UpdateAlbumDto,
  ): Promise<AlbumResponse> {
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.album.update({ where: { id: albumId }, data });
      await this.writeContribution(tx, ownerAccountId, 'album', albumId, 'update', {
        newValue: audit,
      });
      return next;
    });

    return this.enrichAlbum(updated);
  }

  /**
   * Opt-in publish: change an album's visibility scope (and optional degree).
   * Owner-only.
   */
  async setVisibility(
    albumId: string,
    ownerAccountId: string,
    dto: SetAlbumVisibilityDto,
  ): Promise<AlbumResponse> {
    const existing = await this.loadOwnedAlbum(albumId, ownerAccountId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.album.update({
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
          newValue: { visibilityScope: next.visibilityScope },
        },
      );

      return next;
    });

    return this.enrichAlbum(updated);
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

  // --- response mapping ----------------------------------------------------

  /**
   * Map a persisted album row to the client response shape, enriching with the
   * subject person's display name and live item count. When the caller already
   * knows these (e.g. it just loaded the items), it can pass them to avoid
   * extra queries; otherwise they are resolved on demand.
   */
  private toAlbumResponse(
    album: Album,
    subjectPersonName: string | null = null,
    itemCount = 0,
  ): AlbumResponse {
    return {
      id: album.id,
      subjectPersonId: album.subjectPersonId,
      subjectPersonName,
      ownerAccountId: album.ownerAccountId,
      title: album.title,
      description: album.description,
      kind: album.kind,
      coverMediaId: album.coverMediaId,
      visibilityScope: album.visibilityScope,
      visibleMaxDegree: album.visibleMaxDegree,
      itemCount,
      createdAt: album.createdAt.toISOString(),
      updatedAt: album.updatedAt.toISOString(),
    };
  }

  private toAlbumItemResponse(item: AlbumItem): AlbumItemResponse {
    return {
      id: item.id,
      albumId: item.albumId,
      mediaId: item.mediaId,
      caption: item.caption,
      // The column is date-only; expose the calendar day (yyyy-mm-dd).
      takenAt: item.takenAt ? item.takenAt.toISOString().slice(0, 10) : null,
      takenAtText: item.takenAtText,
      position: item.position,
      createdAt: item.createdAt.toISOString(),
    };
  }

  /**
   * Enrich a list of albums with subject person names + item counts, batching
   * the lookups to avoid N+1 queries on list endpoints.
   */
  private async enrichAlbums(albums: Album[]): Promise<AlbumResponse[]> {
    if (albums.length === 0) {
      return [];
    }

    const subjectIds = [
      ...new Set(
        albums
          .map((a) => a.subjectPersonId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const persons =
      subjectIds.length > 0
        ? await this.prisma.person.findMany({
            where: { id: { in: subjectIds }, deletedAt: null },
            select: { id: true, displayName: true },
          })
        : [];
    const nameById = new Map(persons.map((p) => [p.id, p.displayName]));

    const counts = await Promise.all(
      albums.map((a) =>
        this.prisma.albumItem.count({
          where: { albumId: a.id, deletedAt: null },
        }),
      ),
    );

    return albums.map((album, i) =>
      this.toAlbumResponse(
        album,
        album.subjectPersonId
          ? (nameById.get(album.subjectPersonId) ?? null)
          : null,
        counts[i],
      ),
    );
  }

  /** Enrich a single album with its subject person name + live item count. */
  private async enrichAlbum(album: Album): Promise<AlbumResponse> {
    const [subjectPersonName, itemCount] = await Promise.all([
      this.resolvePersonName(album.subjectPersonId),
      this.prisma.albumItem.count({
        where: { albumId: album.id, deletedAt: null },
      }),
    ]);
    return this.toAlbumResponse(album, subjectPersonName, itemCount);
  }

  /** Resolve a single subject person's display name (null when absent). */
  private async resolvePersonName(
    personId: string | null,
  ): Promise<string | null> {
    if (!personId) {
      return null;
    }
    const person = await this.prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
      select: { displayName: true },
    });
    return person?.displayName ?? null;
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
