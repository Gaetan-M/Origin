import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateParentChildDto } from './dto/create-parent-child.dto';
import { CreateUnionDto } from './dto/create-union.dto';
import { UpdateUnionDto } from './dto/update-union.dto';
import { AddUnionPartnerDto } from './dto/add-union-partner.dto';

@Injectable()
export class RelationshipsService {
  private readonly logger = new Logger(RelationshipsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============ Parent-Child ============

  async createParentChild(dto: CreateParentChildDto, accountId: string) {
    if (dto.parentId === dto.childId) {
      throw new BadRequestException('A person cannot be their own parent');
    }

    // Check both persons exist
    const [parent, child] = await Promise.all([
      this.prisma.person.findUnique({ where: { id: dto.parentId } }),
      this.prisma.person.findUnique({ where: { id: dto.childId } }),
    ]);

    if (!parent || parent.deletedAt) throw new NotFoundException('Parent person not found');
    if (!child || child.deletedAt) throw new NotFoundException('Child person not found');

    // Cycle detection: child cannot be ancestor of parent
    await this.detectCycle(dto.parentId, dto.childId);

    try {
      const relation = await this.prisma.parentChild.create({
        data: {
          parentId: dto.parentId,
          childId: dto.childId,
          relationshipType: dto.relationshipType ?? 'BIOLOGICAL',
          unionId: dto.unionId,
          notes: dto.notes,
          createdByAccountId: accountId,
        },
        include: {
          parent: { select: { id: true, displayName: true } },
          child: { select: { id: true, displayName: true } },
        },
      });

      await this.prisma.contribution.create({
        data: {
          accountId,
          entityType: 'parent_child',
          entityId: relation.id,
          action: 'CREATE',
          newValue: {
            parentId: dto.parentId,
            childId: dto.childId,
            type: dto.relationshipType ?? 'BIOLOGICAL',
          } as unknown as Prisma.JsonObject,
        },
      });

      return relation;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This parent-child relationship already exists');
      }
      throw error;
    }
  }

  async deleteParentChild(id: string, accountId: string) {
    const relation = await this.prisma.parentChild.findUnique({ where: { id } });
    if (!relation || relation.deletedAt) throw new NotFoundException('Relationship not found');

    await this.prisma.parentChild.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'parent_child',
        entityId: id,
        action: 'DELETE',
      },
    });

    return { message: 'Parent-child relationship deleted' };
  }

  // ============ Unions ============

  async createUnion(dto: CreateUnionDto, accountId: string) {
    const union = await this.prisma.union.create({
      data: {
        unionType: dto.unionType ?? 'UNKNOWN',
        status: dto.status ?? 'UNKNOWN',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        startDatePrecision: dto.startDatePrecision,
        startYearApproximate: dto.startYearApproximate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        endReason: dto.endReason,
        place: dto.place,
        notes: dto.notes,
        createdByAccountId: accountId,
        partners: {
          create: dto.partners.map((p) => ({
            personId: p.personId,
            role: p.role,
            wifeRank: p.wifeRank,
          })),
        },
      },
      include: {
        partners: {
          include: { person: { select: { id: true, displayName: true } } },
        },
      },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'union',
        entityId: union.id,
        action: 'CREATE',
        newValue: {
          type: dto.unionType,
          partners: dto.partners.map((p) => p.personId),
        } as unknown as Prisma.JsonObject,
      },
    });

    return union;
  }

  async deleteUnion(id: string, accountId: string) {
    const union = await this.prisma.union.findUnique({ where: { id } });
    if (!union || union.deletedAt) throw new NotFoundException('Union not found');

    await this.prisma.union.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.contribution.create({
      data: { accountId, entityType: 'union', entityId: id, action: 'DELETE' },
    });

    return { message: 'Union deleted' };
  }

  async updateUnion(id: string, dto: UpdateUnionDto, accountId: string) {
    const union = await this.prisma.union.findUnique({ where: { id } });
    if (!union || union.deletedAt) throw new NotFoundException('Union not found');

    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    if (dto.unionType !== undefined) {
      oldValue.unionType = union.unionType;
      newValue.unionType = dto.unionType;
    }
    if (dto.status !== undefined) {
      oldValue.status = union.status;
      newValue.status = dto.status;
    }
    if (dto.startDate !== undefined) {
      oldValue.startDate = union.startDate?.toISOString() ?? null;
      newValue.startDate = dto.startDate;
    }
    if (dto.startDatePrecision !== undefined) {
      oldValue.startDatePrecision = union.startDatePrecision;
      newValue.startDatePrecision = dto.startDatePrecision;
    }
    if (dto.startYearApproximate !== undefined) {
      oldValue.startYearApproximate = union.startYearApproximate;
      newValue.startYearApproximate = dto.startYearApproximate;
    }
    if (dto.endDate !== undefined) {
      oldValue.endDate = union.endDate?.toISOString() ?? null;
      newValue.endDate = dto.endDate;
    }
    if (dto.endReason !== undefined) {
      oldValue.endReason = union.endReason;
      newValue.endReason = dto.endReason;
    }
    if (dto.place !== undefined) {
      oldValue.place = union.place;
      newValue.place = dto.place;
    }
    if (dto.notes !== undefined) {
      oldValue.notes = union.notes;
      newValue.notes = dto.notes;
    }

    const updated = await this.prisma.union.update({
      where: { id },
      data: {
        unionType: dto.unionType,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        startDatePrecision: dto.startDatePrecision,
        startYearApproximate: dto.startYearApproximate,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        endReason: dto.endReason,
        place: dto.place,
        notes: dto.notes,
      },
      include: {
        partners: {
          include: { person: { select: { id: true, displayName: true } } },
        },
      },
    });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'union',
        entityId: id,
        action: 'UPDATE',
        oldValue: oldValue as unknown as Prisma.InputJsonValue,
        newValue: newValue as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async addPartner(unionId: string, dto: AddUnionPartnerDto, accountId: string) {
    const union = await this.prisma.union.findUnique({ where: { id: unionId } });
    if (!union || union.deletedAt) throw new NotFoundException('Union not found');

    const person = await this.prisma.person.findUnique({ where: { id: dto.personId } });
    if (!person || person.deletedAt) throw new NotFoundException('Person not found');

    const existing = await this.prisma.unionPartner.findUnique({
      where: { unionId_personId: { unionId, personId: dto.personId } },
    });
    if (existing) {
      throw new ConflictException('Person is already a partner in this union');
    }

    try {
      await this.prisma.unionPartner.create({
        data: {
          unionId,
          personId: dto.personId,
          role: dto.role,
          wifeRank: dto.wifeRank,
        },
      });

      await this.prisma.contribution.create({
        data: {
          accountId,
          entityType: 'union_partner',
          entityId: unionId,
          action: 'CREATE',
          newValue: {
            unionId,
            personId: dto.personId,
            role: dto.role,
            wifeRank: dto.wifeRank,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return this.prisma.union.findUniqueOrThrow({
        where: { id: unionId },
        include: {
          partners: {
            include: { person: { select: { id: true, displayName: true } } },
          },
        },
      });
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Person is already a partner in this union');
      }
      throw error;
    }
  }

  async removePartner(unionId: string, partnerId: string, accountId: string) {
    const unionPartner = await this.prisma.unionPartner.findFirst({
      where: { id: partnerId, unionId },
    });
    if (!unionPartner) throw new NotFoundException('Union partner not found');

    await this.prisma.unionPartner.delete({ where: { id: partnerId } });

    await this.prisma.contribution.create({
      data: {
        accountId,
        entityType: 'union_partner',
        entityId: unionId,
        action: 'DELETE',
        oldValue: {
          partnerId,
          personId: unionPartner.personId,
          unionId,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { message: 'Partner removed from union' };
  }

  async getAllUnions(personId: string) {
    const person = await this.prisma.person.findUnique({ where: { id: personId } });
    if (!person || person.deletedAt) throw new NotFoundException('Person not found');

    const partnerEntries = await this.prisma.unionPartner.findMany({
      where: { personId },
      include: {
        union: {
          include: {
            partners: {
              include: {
                person: {
                  select: {
                    id: true,
                    displayName: true,
                    gender: true,
                    lifeStatus: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return partnerEntries.map((entry) => ({
      ...entry.union,
      isDeleted: entry.union.deletedAt !== null,
    }));
  }

  // ============ Query endpoints ============

  async getParents(personId: string) {
    return this.prisma.parentChild.findMany({
      where: { childId: personId, deletedAt: null },
      include: { parent: { select: { id: true, displayName: true, gender: true, lifeStatus: true } } },
    });
  }

  async getChildren(personId: string) {
    return this.prisma.parentChild.findMany({
      where: { parentId: personId, deletedAt: null },
      include: { child: { select: { id: true, displayName: true, gender: true, lifeStatus: true } } },
    });
  }

  async getSiblings(personId: string) {
    // Find parents of this person, then find all children of those parents
    const parentRelations = await this.prisma.parentChild.findMany({
      where: { childId: personId, deletedAt: null },
      select: { parentId: true },
    });

    const parentIds = parentRelations.map((r) => r.parentId);
    if (parentIds.length === 0) return [];

    const siblingRelations = await this.prisma.parentChild.findMany({
      where: {
        parentId: { in: parentIds },
        childId: { not: personId },
        deletedAt: null,
      },
      include: { child: { select: { id: true, displayName: true, gender: true, lifeStatus: true } } },
    });

    // Deduplicate siblings
    const seen = new Set<string>();
    return siblingRelations.filter((r) => {
      if (seen.has(r.childId)) return false;
      seen.add(r.childId);
      return true;
    });
  }

  async getSpouses(personId: string) {
    const partnerEntries = await this.prisma.unionPartner.findMany({
      where: { personId },
      include: {
        union: {
          include: {
            partners: {
              where: { personId: { not: personId } },
              include: { person: { select: { id: true, displayName: true, gender: true, lifeStatus: true } } },
            },
          },
        },
      },
    });

    return partnerEntries
      .filter((e) => !e.union.deletedAt)
      .flatMap((e) => e.union.partners.map((p) => ({
        ...p.person,
        unionId: e.union.id,
        unionType: e.union.unionType,
        unionStatus: e.union.status,
      })));
  }

  // ============ Cycle Detection ============

  private async detectCycle(parentId: string, childId: string): Promise<void> {
    // Check if childId is an ancestor of parentId using get_ancestors
    try {
      const ancestors = await this.prisma.$queryRaw<Array<{ ancestor_id: string }>>`
        SELECT ancestor_id FROM get_ancestors(${parentId}::uuid, 20)
      `;
      const ancestorIds = ancestors.map((a) => a.ancestor_id);
      if (ancestorIds.includes(childId)) {
        throw new BadRequestException(
          'Cycle detected: the child is an ancestor of the parent',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      // If function doesn't exist yet (no DB), skip cycle detection
      this.logger.warn('Cycle detection skipped: get_ancestors function not available');
    }
  }
}
