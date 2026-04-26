import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchMatchDto } from './dto/search-match.dto';

interface MatchCandidate {
  id: string;
  displayName: string;
  normalizedName: string;
  nameSoundex: string | null;
  nameMetaphone: string | null;
  gender: string | null;
  birthYearApproximate: number | null;
  villageOrigin: string | null;
  verificationLevel: string;
  similarity: number;
}

interface ScoredMatch {
  personId: string;
  displayName: string;
  score: number;
  signals: Record<string, number>;
  action: 'auto_match' | 'suggest' | 'ignore';
}

// Scoring weights
const WEIGHTS = {
  name: 0.30,
  phonetic: 0.15,
  date: 0.20,
  parent: 0.15,
  location: 0.10,
  other: 0.10,
};

// Thresholds
const THRESHOLD_AUTO_MATCH = 0.90;
const THRESHOLD_SUGGEST = 0.70;

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchMatchDto, accountId?: string) {
    const candidates = await this.findCandidates(dto);
    const scored = await Promise.all(
      candidates.map((c) => this.scoreMatch(c, dto)),
    );

    const ranked = scored
      .filter((s) => s.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);

    const personIds = ranked.map((r) => r.personId);
    const persons = personIds.length > 0
      ? await this.prisma.person.findMany({
          where: { id: { in: personIds }, deletedAt: null },
        })
      : [];

    // Visibility filter: only return persons the requester is allowed to see.
    // For unauthenticated callers (legacy paths), public-only.
    const visiblePersons = await this.filterVisible(persons, accountId);
    const visibleIds = new Set(visiblePersons.map((p) => p.id));
    const personMap = new Map(visiblePersons.map((p) => [p.id, p]));

    const visibleResults = ranked.filter((r) => visibleIds.has(r.personId)).slice(0, 20);

    return {
      query: {
        name: dto.name,
        birthYear: dto.birthYear,
        village: dto.village,
        parentName: dto.parentName,
      },
      matches: visibleResults.map((r) => ({
        person: personMap.get(r.personId) ?? null,
        score: r.score,
        action: r.action,
      })),
      total: visibleResults.length,
    };
  }

  /**
   * Mirrors PersonsService.canView's policy without depending on it (matching
   * runs from many entrypoints, including signup with no auth context). Public
   * persons + creator/claimer + neighbourhood (3 degrees) of the caller's
   * claimed Person are visible.
   */
  private async filterVisible<T extends {
    id: string;
    isPublic: boolean;
    createdByAccountId: string | null;
    claimedByAccountId: string | null;
  }>(persons: T[], accountId?: string): Promise<T[]> {
    if (!accountId) {
      return persons.filter((p) => p.isPublic);
    }

    const myClaim = await this.prisma.claim.findFirst({
      where: { accountId, status: 'VERIFIED' },
      select: { personId: true },
    });

    let neighbourhoodIds: Set<string> = new Set();
    if (myClaim) {
      try {
        const rows = await this.prisma.$queryRaw<Array<{ person_id: string }>>`
          SELECT person_id FROM get_family_neighborhood(${myClaim.personId}::uuid, 3)
        `;
        neighbourhoodIds = new Set(rows.map((r) => r.person_id));
        neighbourhoodIds.add(myClaim.personId);
      } catch {
        // Postgres function unavailable in tests — fall back to ownership only.
      }
    }

    return persons.filter(
      (p) =>
        p.isPublic ||
        p.createdByAccountId === accountId ||
        p.claimedByAccountId === accountId ||
        neighbourhoodIds.has(p.id),
    );
  }

  /**
   * Returns a pending MergeProposal for the inviter to review. Only the
   * creator/claimer of either side may see it — anyone else holding the
   * proposalId is forbidden. Candidate display fields are minimal (name,
   * year, village) to avoid leaking phone/email.
   */
  async getSuggestion(proposalId: string, accountId: string) {
    const proposal = await this.prisma.mergeProposal.findUnique({
      where: { id: proposalId },
      include: {
        personA: {
          select: {
            id: true,
            displayName: true,
            birthYearApproximate: true,
            villageOrigin: true,
            createdByAccountId: true,
            claimedByAccountId: true,
          },
        },
        personB: {
          select: {
            id: true,
            displayName: true,
            birthYearApproximate: true,
            villageOrigin: true,
            createdByAccountId: true,
            claimedByAccountId: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('Suggestion not found');
    }

    // Authorization: the requester must be the creator or claimer of either
    // side of the proposal. This blocks third parties from harvesting
    // proposalIds from logs/SMS metadata.
    const allowedAccountIds = new Set<string>([
      proposal.personA.createdByAccountId,
      proposal.personA.claimedByAccountId,
      proposal.personB.createdByAccountId,
      proposal.personB.claimedByAccountId,
      proposal.proposedByAccountId,
    ].filter((x): x is string => !!x));

    if (!allowedAccountIds.has(accountId)) {
      throw new ForbiddenException('You cannot view this suggestion');
    }

    return {
      id: proposal.id,
      status: proposal.status,
      matchScore: Number(proposal.matchScore),
      matchingSignals: proposal.matchingSignals,
      ghost: {
        id: proposal.personA.id,
        displayName: proposal.personA.displayName,
        birthYearApproximate: proposal.personA.birthYearApproximate,
        villageOrigin: proposal.personA.villageOrigin,
      },
      candidate: {
        id: proposal.personB.id,
        displayName: proposal.personB.displayName,
        birthYearApproximate: proposal.personB.birthYearApproximate,
        villageOrigin: proposal.personB.villageOrigin,
      },
      resolvedAt: proposal.resolvedAt,
      createdAt: proposal.createdAt,
    };
  }

  async resolveSuggestion(
    proposalId: string,
    accountId: string,
    decision: 'accept' | 'reject',
  ) {
    const proposal = await this.prisma.mergeProposal.findUnique({
      where: { id: proposalId },
      include: {
        personA: { select: { createdByAccountId: true, claimedByAccountId: true } },
        personB: { select: { createdByAccountId: true, claimedByAccountId: true } },
      },
    });
    if (!proposal) throw new NotFoundException('Suggestion not found');
    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('This suggestion has already been resolved');
    }

    const allowed = new Set<string>([
      proposal.personA.createdByAccountId,
      proposal.personA.claimedByAccountId,
      proposal.personB.createdByAccountId,
      proposal.personB.claimedByAccountId,
    ].filter((x): x is string => !!x));
    if (!allowed.has(accountId)) {
      throw new ForbiddenException('You cannot resolve this suggestion');
    }

    return this.prisma.mergeProposal.update({
      where: { id: proposalId },
      data: {
        status: decision === 'accept' ? 'ACCEPTED' : 'REJECTED',
        resolvedAt: new Date(),
        acceptedByAccountIds: decision === 'accept' ? { push: accountId } : undefined,
        rejectedByAccountIds: decision === 'reject' ? { push: accountId } : undefined,
      },
    });
  }

  async findDuplicates(personId: string) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
    });

    if (!person || person.deletedAt) {
      throw new NotFoundException('Person not found');
    }

    const dto: SearchMatchDto = {
      name: person.displayName,
      birthYear: person.birthYearApproximate ?? undefined,
      village: person.villageOrigin ?? undefined,
    };

    const candidates = await this.findCandidates(dto, personId);
    const scored = await Promise.all(
      candidates.map((c) => this.scoreMatch(c, dto)),
    );

    return scored
      .filter((s) => s.action !== 'ignore')
      .sort((a, b) => b.score - a.score);
  }

  private async findCandidates(
    dto: SearchMatchDto,
    excludePersonId?: string,
  ): Promise<MatchCandidate[]> {
    const normalizedName = dto.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    try {
      // Use pg_trgm similarity for fuzzy name matching
      let candidates: MatchCandidate[];

      if (excludePersonId) {
        candidates = await this.prisma.$queryRaw<MatchCandidate[]>`
          SELECT
            p.id,
            p.display_name AS "displayName",
            p.normalized_name AS "normalizedName",
            p.name_soundex AS "nameSoundex",
            p.name_metaphone AS "nameMetaphone",
            p.gender,
            p.birth_year_approximate AS "birthYearApproximate",
            p.village_origin AS "villageOrigin",
            p.verification_level AS "verificationLevel",
            similarity(p.normalized_name, ${normalizedName}) AS similarity
          FROM persons p
          WHERE p.deleted_at IS NULL
            AND similarity(p.normalized_name, ${normalizedName}) > 0.2
            AND p.id != ${excludePersonId}::uuid
          ORDER BY similarity DESC
          LIMIT 50
        `;
      } else {
        candidates = await this.prisma.$queryRaw<MatchCandidate[]>`
          SELECT
            p.id,
            p.display_name AS "displayName",
            p.normalized_name AS "normalizedName",
            p.name_soundex AS "nameSoundex",
            p.name_metaphone AS "nameMetaphone",
            p.gender,
            p.birth_year_approximate AS "birthYearApproximate",
            p.village_origin AS "villageOrigin",
            p.verification_level AS "verificationLevel",
            similarity(p.normalized_name, ${normalizedName}) AS similarity
          FROM persons p
          WHERE p.deleted_at IS NULL
            AND similarity(p.normalized_name, ${normalizedName}) > 0.2
          ORDER BY similarity DESC
          LIMIT 50
        `;
      }

      return candidates;
    } catch (error) {
      // Fallback if pg_trgm is not available: use LIKE-based search
      this.logger.warn('pg_trgm not available, falling back to LIKE search');

      const candidates = await this.prisma.person.findMany({
        where: {
          deletedAt: null,
          id: excludePersonId ? { not: excludePersonId } : undefined,
          OR: [
            { normalizedName: { contains: normalizedName } },
            { displayName: { contains: dto.name, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          displayName: true,
          normalizedName: true,
          nameSoundex: true,
          nameMetaphone: true,
          gender: true,
          birthYearApproximate: true,
          villageOrigin: true,
          verificationLevel: true,
        },
        take: 50,
      });

      return candidates.map((c) => ({
        ...c,
        similarity: this.calculateSimpleSimilarity(normalizedName, c.normalizedName),
      }));
    }
  }

  private async scoreMatch(
    candidate: MatchCandidate,
    dto: SearchMatchDto,
  ): Promise<ScoredMatch> {
    const signals: Record<string, number> = {};

    // 1. Name similarity (weight: 0.30)
    signals.name = candidate.similarity;

    // 2. Phonetic similarity (weight: 0.15)
    signals.phonetic = await this.calculatePhoneticScore(dto.name, candidate);

    // 3. Date/birth year similarity (weight: 0.20)
    signals.date = this.calculateDateScore(dto.birthYear, candidate.birthYearApproximate);

    // 4. Parent name similarity (weight: 0.15)
    signals.parent = dto.parentName
      ? await this.calculateParentScore(dto.parentName, candidate.id)
      : 0;

    // 5. Location similarity (weight: 0.10)
    signals.location = this.calculateLocationScore(dto.village, candidate.villageOrigin);

    // 6. Other factors (weight: 0.10) - verification level bonus
    signals.other = this.calculateOtherScore(candidate);

    // Calculate weighted total
    const score =
      signals.name * WEIGHTS.name +
      signals.phonetic * WEIGHTS.phonetic +
      signals.date * WEIGHTS.date +
      signals.parent * WEIGHTS.parent +
      signals.location * WEIGHTS.location +
      signals.other * WEIGHTS.other;

    // Round to 2 decimal places
    const roundedScore = Math.round(score * 100) / 100;

    let action: 'auto_match' | 'suggest' | 'ignore';
    if (roundedScore >= THRESHOLD_AUTO_MATCH) {
      action = 'auto_match';
    } else if (roundedScore >= THRESHOLD_SUGGEST) {
      action = 'suggest';
    } else {
      action = 'ignore';
    }

    return {
      personId: candidate.id,
      displayName: candidate.displayName,
      score: roundedScore,
      signals,
      action,
    };
  }

  private async calculatePhoneticScore(
    queryName: string,
    candidate: MatchCandidate,
  ): Promise<number> {
    if (!candidate.nameSoundex && !candidate.nameMetaphone) {
      return 0;
    }

    try {
      // Try to compute soundex/metaphone for the query name
      const result = await this.prisma.$queryRaw<
        Array<{ soundex: string; metaphone: string }>
      >`
        SELECT
          soundex(${queryName}) AS soundex,
          metaphone(${queryName}, 10) AS metaphone
      `;

      if (result.length === 0) return 0;

      const querySoundex = result[0].soundex;
      const queryMetaphone = result[0].metaphone;

      let score = 0;
      if (candidate.nameSoundex && querySoundex === candidate.nameSoundex) {
        score += 0.5;
      }
      if (candidate.nameMetaphone && queryMetaphone === candidate.nameMetaphone) {
        score += 0.5;
      }

      return score;
    } catch {
      // If phonetic functions are not available, return 0
      return 0;
    }
  }

  private calculateDateScore(
    queryBirthYear: number | undefined,
    candidateBirthYear: number | null,
  ): number {
    if (!queryBirthYear || !candidateBirthYear) {
      return 0;
    }

    const diff = Math.abs(queryBirthYear - candidateBirthYear);

    if (diff === 0) return 1.0;
    if (diff <= 1) return 0.9;
    if (diff <= 2) return 0.7;
    if (diff <= 5) return 0.4;
    if (diff <= 10) return 0.2;
    return 0;
  }

  private async calculateParentScore(
    parentName: string,
    candidateId: string,
  ): Promise<number> {
    const normalizedParentName = parentName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // Get parent relationships for this candidate
    const parentRels = await this.prisma.parentChild.findMany({
      where: { childId: candidateId, deletedAt: null },
      include: {
        parent: { select: { normalizedName: true, displayName: true } },
      },
    });

    if (parentRels.length === 0) return 0;

    let bestScore = 0;
    for (const rel of parentRels) {
      const sim = this.calculateSimpleSimilarity(
        normalizedParentName,
        rel.parent.normalizedName,
      );
      bestScore = Math.max(bestScore, sim);
    }

    return bestScore;
  }

  private calculateLocationScore(
    queryVillage: string | undefined,
    candidateVillage: string | null,
  ): number {
    if (!queryVillage || !candidateVillage) {
      return 0;
    }

    const normalizedQuery = queryVillage.toLowerCase().trim();
    const normalizedCandidate = candidateVillage.toLowerCase().trim();

    if (normalizedQuery === normalizedCandidate) {
      return 1.0;
    }

    // Partial match
    return this.calculateSimpleSimilarity(normalizedQuery, normalizedCandidate);
  }

  private calculateOtherScore(candidate: MatchCandidate): number {
    // Give a small bonus to verified persons (more reliable data)
    switch (candidate.verificationLevel) {
      case 'ADMIN_VERIFIED':
      case 'DOCUMENT_VERIFIED':
        return 1.0;
      case 'COMMUNITY_VERIFIED':
        return 0.8;
      case 'DOCUMENT_DECLARED':
        return 0.6;
      case 'SELF_DECLARED':
        return 0.4;
      default:
        return 0.2;
    }
  }

  private calculateSimpleSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0;

    // Bigram-based similarity (Dice coefficient)
    const bigramsA = this.getBigrams(a);
    const bigramsB = this.getBigrams(b);

    if (bigramsA.size === 0 && bigramsB.size === 0) return 1.0;
    if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

    let intersection = 0;
    for (const bigram of bigramsA) {
      if (bigramsB.has(bigram)) {
        intersection++;
      }
    }

    return (2 * intersection) / (bigramsA.size + bigramsB.size);
  }

  private getBigrams(str: string): Set<string> {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  }
}
