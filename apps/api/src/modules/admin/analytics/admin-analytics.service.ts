import { Injectable, Logger } from '@nestjs/common';
import {
  ClaimStatus,
  DocumentVerificationStatus,
  LifeStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * KPI snapshot returned by GET /admin/analytics/kpis.
 *
 * Shape mirrors the moderator dashboard tiles 1-to-1 so the frontend
 * can bind directly without further reshaping.
 */
export interface AdminKpiSnapshot {
  accounts: {
    total: number;
    active: number;
    banned: number;
    deleted: number;
    new7d: number;
    new30d: number;
  };
  persons: {
    total: number;
    deceased: number;
    alive: number;
    orphan: number;
    new7d: number;
  };
  claims: {
    pending: number;
    verified: number;
    disputed: number;
  };
  moderation: {
    pendingMerges: number;
    pendingVerifications: number;
    pendingDocuments: number;
  };
  contributions: {
    last24h: number;
    last7d: number;
  };
}

export interface GrowthBucket {
  date: string;
  accounts: number;
  persons: number;
  contributions: number;
}

export interface RecentActivityItem {
  contributionId: string;
  accountId: string;
  phoneNumberMasked: string;
  entityType: string;
  entityId: string;
  action: string;
  fieldName: string | null;
  createdAt: Date;
  personDisplayName: string | null;
}

export interface TopContributor {
  accountId: string;
  phoneNumberMasked: string;
  fullName: string | null;
  contributionCount: number;
  role: string;
}

export interface GeoDistribution {
  byBirthCountry: Array<{ country: string; count: number }>;
  byVillage: Array<{ village: string; count: number }>;
  byRegion: Array<{ region: string; count: number }>;
}

export interface HealthCheck {
  status: 'ok' | 'degraded';
  checks: {
    database: 'ok' | 'down';
    mediaStorage: 'ok' | 'unknown' | 'down';
    uptimeSeconds: number;
  };
}

/**
 * Read-only analytics aggregator backing the admin dashboard.
 *
 * All write operations remain in the domain modules — this service
 * only reads. Heavy aggregations are pushed down into a single SQL
 * statement via $queryRaw to avoid round-tripping millions of rows
 * into Node just to count them.
 */
@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mask a phone number for display in admin UIs.
   *
   * Keeps the country code prefix and the last 2 digits; the middle is
   * collapsed to `***`. Short or missing values fall back to a stable
   * placeholder so the UI never renders raw partial numbers.
   */
  static maskPhone(phone: string | null | undefined): string {
    if (!phone) return '***';
    if (phone.length <= 6) return '***';
    const head = phone.slice(0, 4);
    const tail = phone.slice(-2);
    return `${head}***${tail}`;
  }

  // ─────────────────────────────────────────────────────────────────────
  // KPIs
  // TODO(redis): cache this aggregate for ~30s once Redis is wired.
  // The tile refresh budget is generous and the underlying counts are
  // expensive on a large `contributions` table.
  // ─────────────────────────────────────────────────────────────────────
  async getKpis(): Promise<AdminKpiSnapshot> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      accountsTotal,
      accountsBanned,
      accountsDeleted,
      accountsNew7d,
      accountsNew30d,
      personsTotal,
      personsDeceased,
      personsAlive,
      personsNew7d,
      claimsPending,
      claimsVerified,
      claimsDisputed,
      pendingMerges,
      pendingVerifications,
      pendingDocuments,
      contributionsLast24h,
      contributionsLast7d,
      orphanRows,
    ] = await Promise.all([
      this.prisma.account.count({ where: { deletedAt: null } }),
      this.prisma.account.count({ where: { deletedAt: null, isBanned: true } }),
      this.prisma.account.count({ where: { deletedAt: { not: null } } }),
      this.prisma.account.count({
        where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.account.count({
        where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.person.count({ where: { deletedAt: null } }),
      this.prisma.person.count({
        where: { deletedAt: null, lifeStatus: LifeStatus.DECEASED },
      }),
      this.prisma.person.count({
        where: { deletedAt: null, lifeStatus: LifeStatus.ALIVE },
      }),
      this.prisma.person.count({
        where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.claim.count({ where: { status: ClaimStatus.PENDING } }),
      this.prisma.claim.count({ where: { status: ClaimStatus.VERIFIED } }),
      this.prisma.claim.count({ where: { status: ClaimStatus.DISPUTED } }),
      this.prisma.mergeProposal.count({ where: { status: 'PENDING' } }),
      this.prisma.verificationRequest.count({
        where: { status: { in: ['PENDING', 'IN_REVIEW'] } },
      }),
      // The brief lists 'SELF_DECLARED' and 'DOCUMENT_DECLARED' as the
      // "needs moderation" buckets. Only SELF_DECLARED currently exists
      // in DocumentVerificationStatus; DOCUMENT_DECLARED is reserved for
      // a future ingestion step where a scan has been attached but not
      // yet reviewed. We keep both in the filter (as the spec requires)
      // by widening through the enum type — when the schema gains the
      // new value, this filter starts counting it without further code
      // changes.
      this.prisma.identityDocument.count({
        where: {
          deletedAt: null,
          verificationStatus: {
            in: [
              DocumentVerificationStatus.SELF_DECLARED,
              'DOCUMENT_DECLARED' as DocumentVerificationStatus,
            ],
          },
        },
      }),
      this.prisma.contribution.count({ where: { createdAt: { gte: oneDayAgo } } }),
      this.prisma.contribution.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      // Orphan = person with no parent_child rows AND no claim. One CTE
      // keeps the heavy lifting on Postgres rather than streaming every
      // person row into Node just to filter them.
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        WITH parented AS (
          SELECT DISTINCT child_id AS person_id FROM parent_child WHERE deleted_at IS NULL
          UNION
          SELECT DISTINCT parent_id AS person_id FROM parent_child WHERE deleted_at IS NULL
        ),
        claimed AS (
          SELECT DISTINCT person_id FROM claims
        )
        SELECT COUNT(*)::bigint AS count
        FROM persons p
        WHERE p.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM parented x WHERE x.person_id = p.id)
          AND NOT EXISTS (SELECT 1 FROM claimed  c WHERE c.person_id = p.id)
      `,
    ]);

    const accountsActive = accountsTotal - accountsBanned;
    const orphan = Number(orphanRows[0]?.count ?? 0n);

    return {
      accounts: {
        total: accountsTotal,
        active: accountsActive,
        banned: accountsBanned,
        deleted: accountsDeleted,
        new7d: accountsNew7d,
        new30d: accountsNew30d,
      },
      persons: {
        total: personsTotal,
        deceased: personsDeceased,
        alive: personsAlive,
        orphan,
        new7d: personsNew7d,
      },
      claims: {
        pending: claimsPending,
        verified: claimsVerified,
        disputed: claimsDisputed,
      },
      moderation: {
        pendingMerges,
        pendingVerifications,
        pendingDocuments,
      },
      contributions: {
        last24h: contributionsLast24h,
        last7d: contributionsLast7d,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Growth time-series
  //
  // generate_series gives us a complete dense day axis even on quiet days
  // (no gaps in the chart). We left-join three sub-aggregates, one per
  // entity, so a missing bucket renders as 0 instead of being absent.
  // ─────────────────────────────────────────────────────────────────────
  async getGrowth(daysInput?: number): Promise<GrowthBucket[]> {
    const days = Math.max(1, Math.min(365, Math.floor(daysInput ?? 30)));

    const rows = await this.prisma.$queryRaw<
      Array<{
        date: Date;
        accounts: bigint;
        persons: bigint;
        contributions: bigint;
      }>
    >`
      WITH days AS (
        SELECT generate_series(
          (CURRENT_DATE - (${days - 1}::int * INTERVAL '1 day'))::date,
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day
      ),
      acc AS (
        SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::bigint AS c
        FROM accounts
        WHERE deleted_at IS NULL
          AND created_at >= CURRENT_DATE - (${days - 1}::int * INTERVAL '1 day')
        GROUP BY 1
      ),
      per AS (
        SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::bigint AS c
        FROM persons
        WHERE deleted_at IS NULL
          AND created_at >= CURRENT_DATE - (${days - 1}::int * INTERVAL '1 day')
        GROUP BY 1
      ),
      con AS (
        SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::bigint AS c
        FROM contributions
        WHERE created_at >= CURRENT_DATE - (${days - 1}::int * INTERVAL '1 day')
        GROUP BY 1
      )
      SELECT
        d.day                       AS date,
        COALESCE(acc.c, 0)::bigint  AS accounts,
        COALESCE(per.c, 0)::bigint  AS persons,
        COALESCE(con.c, 0)::bigint  AS contributions
      FROM days d
      LEFT JOIN acc ON acc.day = d.day
      LEFT JOIN per ON per.day = d.day
      LEFT JOIN con ON con.day = d.day
      ORDER BY d.day ASC
    `;

    return rows.map((r) => ({
      date: this.formatYmd(r.date),
      accounts: Number(r.accounts),
      persons: Number(r.persons),
      contributions: Number(r.contributions),
    }));
  }

  // ─────────────────────────────────────────────────────────────────────
  // Recent activity feed
  // ─────────────────────────────────────────────────────────────────────
  async getRecentActivity(limitInput?: number): Promise<RecentActivityItem[]> {
    const limit = Math.max(1, Math.min(50, Math.floor(limitInput ?? 20)));

    const contributions = await this.prisma.contribution.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        account: {
          select: { id: true, phoneNumber: true },
        },
      },
    });

    // Resolve display names for `person` rows in a single follow-up
    // query rather than N+1.
    const personIds = contributions
      .filter((c) => c.entityType === 'person')
      .map((c) => c.entityId);

    const persons = personIds.length
      ? await this.prisma.person.findMany({
          where: { id: { in: personIds } },
          select: { id: true, displayName: true },
        })
      : [];
    const personMap = new Map(persons.map((p) => [p.id, p.displayName]));

    return contributions.map((c) => ({
      contributionId: c.id,
      accountId: c.accountId,
      phoneNumberMasked: AdminAnalyticsService.maskPhone(c.account?.phoneNumber),
      entityType: c.entityType,
      entityId: c.entityId,
      action: c.action,
      fieldName: c.fieldName,
      createdAt: c.createdAt,
      personDisplayName:
        c.entityType === 'person' ? personMap.get(c.entityId) ?? null : null,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────
  // Top contributors
  // ─────────────────────────────────────────────────────────────────────
  async getTopContributors(
    limitInput?: number,
    daysInput?: number,
  ): Promise<TopContributor[]> {
    const limit = Math.max(5, Math.min(50, Math.floor(limitInput ?? 10)));
    const days = Math.max(1, Math.min(365, Math.floor(daysInput ?? 30)));

    const rows = await this.prisma.$queryRaw<
      Array<{
        account_id: string;
        phone_number: string;
        full_name: string | null;
        role: string;
        contribution_count: bigint;
      }>
    >`
      SELECT
        a.id            AS account_id,
        a.phone_number  AS phone_number,
        a.full_name     AS full_name,
        a.role::text    AS role,
        COUNT(c.id)::bigint AS contribution_count
      FROM contributions c
      JOIN accounts a ON a.id = c.account_id
      WHERE c.created_at >= NOW() - (${days}::int * INTERVAL '1 day')
        AND a.deleted_at IS NULL
      GROUP BY a.id, a.phone_number, a.full_name, a.role
      ORDER BY contribution_count DESC, a.id ASC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      accountId: r.account_id,
      phoneNumberMasked: AdminAnalyticsService.maskPhone(r.phone_number),
      fullName: r.full_name,
      contributionCount: Number(r.contribution_count),
      role: r.role,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────
  // Geo distribution
  // ─────────────────────────────────────────────────────────────────────
  async getGeoDistribution(): Promise<GeoDistribution> {
    const [byBirthCountry, byVillage, byRegion] = await Promise.all([
      this.prisma.$queryRaw<Array<{ country: string; count: bigint }>>`
        SELECT birth_country AS country, COUNT(*)::bigint AS count
        FROM persons
        WHERE deleted_at IS NULL AND birth_country IS NOT NULL AND birth_country <> ''
        GROUP BY birth_country
        ORDER BY count DESC, birth_country ASC
      `,
      this.prisma.$queryRaw<Array<{ village: string; count: bigint }>>`
        SELECT village_origin AS village, COUNT(*)::bigint AS count
        FROM persons
        WHERE deleted_at IS NULL AND village_origin IS NOT NULL AND village_origin <> ''
        GROUP BY village_origin
        ORDER BY count DESC, village_origin ASC
        LIMIT 20
      `,
      this.prisma.$queryRaw<Array<{ region: string; count: bigint }>>`
        SELECT birth_region AS region, COUNT(*)::bigint AS count
        FROM persons
        WHERE deleted_at IS NULL AND birth_region IS NOT NULL AND birth_region <> ''
        GROUP BY birth_region
        ORDER BY count DESC, birth_region ASC
        LIMIT 20
      `,
    ]);

    return {
      byBirthCountry: byBirthCountry.map((r) => ({
        country: r.country,
        count: Number(r.count),
      })),
      byVillage: byVillage.map((r) => ({
        village: r.village,
        count: Number(r.count),
      })),
      byRegion: byRegion.map((r) => ({
        region: r.region,
        count: Number(r.count),
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Health check
  //
  // Lightweight on purpose — this is a moderator-facing status pill, not
  // a load balancer probe. We never bubble the underlying error message
  // up because it can leak hostnames, schema names, etc.
  // ─────────────────────────────────────────────────────────────────────
  async getHealth(): Promise<HealthCheck> {
    let database: 'ok' | 'down' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      database = 'down';
      this.logger.warn(`Database health probe failed: ${(err as Error).message}`);
    }

    const status: HealthCheck['status'] = database === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      checks: {
        database,
        mediaStorage: 'unknown',
        uptimeSeconds: Math.floor(process.uptime()),
      },
    };
  }

  /**
   * Format a UTC date as `YYYY-MM-DD`.
   *
   * Postgres returns the bucket as a `date`, which the JS driver inflates
   * into a `Date` at 00:00:00 UTC. We extract the calendar parts in UTC
   * to match the original bucket and avoid an off-by-one on TZ boundaries.
   */
  private formatYmd(d: Date): string {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
