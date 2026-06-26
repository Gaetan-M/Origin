import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Prisma,
  LifeStatus,
  MemorialTributeKind,
  VisibilityScope,
  type MemorialTribute,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { VisibilityGuard } from '../authorization/visibility.guard';
import { CreateTributeDto } from './dto/create-tribute.dto';

/**
 * Memorial tributes (Phase 4 — Living Memory).
 *
 * A memorial tribute is an act of remembrance left on an ancestor who has
 * passed: a lit candle, a written memory, a photograph or a video. Tributes
 * honour those who came before us, so the domain enforces one solemn rule —
 * a tribute may only be left on a Person whose life_status = DECEASED.
 *
 * Every mutation:
 *   - respects the visibility model (defaults to FAMILY of the deceased),
 *   - writes a Contribution audit row,
 *   - uses soft-delete (never a physical DELETE),
 *   - never re-implements file upload (PHOTO/VIDEO reference an existing media_id).
 */
@Injectable()
export class MemorialService {
  private readonly logger = new Logger(MemorialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityGuard,
  ) {}

  /**
   * Leave a tribute on a person who has passed away.
   *
   * @throws NotFoundException   if the person does not exist / is soft-deleted.
   * @throws BadRequestException if the person is not DECEASED, or the tribute
   *                             payload is incomplete for its kind.
   */
  async addTribute(
    authorAccountId: string,
    personId: string,
    dto: CreateTributeDto,
  ): Promise<MemorialTribute> {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
      select: { id: true, lifeStatus: true },
    });

    if (!person) {
      throw new NotFoundException('Person not found / Personne introuvable');
    }

    // The solemn rule: tributes are for those who have passed.
    if (person.lifeStatus !== LifeStatus.DECEASED) {
      throw new BadRequestException(
        'Tributes may only be left for a person who has passed away / ' +
          'Les hommages ne peuvent être rendus qu’à une personne décédée',
      );
    }

    this.assertPayloadComplete(dto);

    if (dto.mediaId) {
      await this.assertMediaExists(dto.mediaId);
    }

    const visibilityScope = dto.visibilityScope ?? VisibilityScope.FAMILY;

    return this.prisma.$transaction(async (tx) => {
      const tribute = await tx.memorialTribute.create({
        data: {
          personId: person.id,
          authorAccountId,
          kind: dto.kind,
          message: dto.message ?? null,
          mediaId: dto.mediaId ?? null,
          visibilityScope,
          visibleMaxDegree: dto.visibleMaxDegree ?? null,
        },
      });

      await this.writeContribution(
        tx,
        authorAccountId,
        tribute.id,
        'CREATE',
        {
          newValue: {
            personId: person.id,
            kind: dto.kind,
            hasMessage: Boolean(dto.message),
            hasMedia: Boolean(dto.mediaId),
            visibilityScope,
          },
        },
      );

      return tribute;
    });
  }

  /**
   * List the tributes left for a person, newest first, filtered to those the
   * requester is allowed to see under the visibility model.
   *
   * The "owner" node for FAMILY degree computation is the deceased person — so
   * the family of the departed may gather around their memory.
   */
  async listTributes(
    personId: string,
    requesterAccountId: string,
  ): Promise<MemorialTribute[]> {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
      select: { id: true },
    });
    if (!person) {
      throw new NotFoundException('Person not found / Personne introuvable');
    }

    const requesterPersonId =
      await this.resolveRequesterPersonId(requesterAccountId);

    const tributes = await this.prisma.memorialTribute.findMany({
      where: { personId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const visible: MemorialTribute[] = [];
    for (const tribute of tributes) {
      const allowed = await this.visibility.evaluate(
        {
          ownerId: tribute.personId,
          visibilityScope: tribute.visibilityScope,
          visibleMaxDegree: tribute.visibleMaxDegree,
        },
        requesterPersonId,
      );
      if (allowed) {
        visible.push(tribute);
      }
    }
    return visible;
  }

  /**
   * Soft-delete a tribute. Only its author may withdraw it — a tribute is a
   * personal act of remembrance and belongs to the one who left it.
   *
   * @throws NotFoundException  if the tribute does not exist / already withdrawn.
   * @throws ForbiddenException if the requester is not the author.
   */
  async removeTribute(
    tributeId: string,
    authorAccountId: string,
  ): Promise<void> {
    const tribute = await this.prisma.memorialTribute.findFirst({
      where: { id: tributeId, deletedAt: null },
      select: { id: true, authorAccountId: true, personId: true },
    });

    if (!tribute) {
      throw new NotFoundException('Tribute not found / Hommage introuvable');
    }

    if (tribute.authorAccountId !== authorAccountId) {
      throw new ForbiddenException(
        'Only the author may withdraw this tribute / ' +
          'Seul l’auteur peut retirer cet hommage',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.memorialTribute.update({
        where: { id: tribute.id },
        data: { deletedAt: new Date() },
      });

      await this.writeContribution(tx, authorAccountId, tribute.id, 'DELETE', {
        oldValue: { personId: tribute.personId },
      });
    });
  }

  /**
   * Ensures the tribute payload carries what its kind requires.
   * Kept here (not in the DTO) so the message can stay domain-respectful.
   */
  private assertPayloadComplete(dto: CreateTributeDto): void {
    switch (dto.kind) {
      case MemorialTributeKind.MESSAGE:
        if (!dto.message || dto.message.trim().length === 0) {
          throw new BadRequestException(
            'A written tribute needs a message / Un hommage écrit doit contenir un message',
          );
        }
        break;
      case MemorialTributeKind.PHOTO:
      case MemorialTributeKind.VIDEO:
        if (!dto.mediaId) {
          throw new BadRequestException(
            'A photo or video tribute needs a media reference / ' +
              'Un hommage photo ou vidéo doit référencer un média',
          );
        }
        break;
      case MemorialTributeKind.CANDLE:
      default:
        // A silently lit candle is a complete tribute.
        break;
    }
  }

  /** Verifies the referenced media exists and is not soft-deleted. */
  private async assertMediaExists(mediaId: string): Promise<void> {
    const media = await this.prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
      select: { id: true },
    });
    if (!media) {
      throw new NotFoundException('Media not found / Média introuvable');
    }
  }

  /** Resolves the person node an account is verified-claimed as. */
  private async resolveRequesterPersonId(
    accountId: string,
  ): Promise<string | null> {
    const claim = await this.prisma.claim.findFirst({
      where: { accountId, status: 'VERIFIED' },
      select: { personId: true },
    });
    return claim?.personId ?? null;
  }

  private async writeContribution(
    tx: Prisma.TransactionClient,
    accountId: string,
    entityId: string,
    action: string,
    payload: {
      oldValue?: Prisma.InputJsonValue;
      newValue?: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await tx.contribution.create({
      data: {
        accountId,
        entityType: 'memorial_tribute',
        entityId,
        action,
        oldValue: payload.oldValue,
        newValue: payload.newValue,
      },
    });
  }
}
