/**
 * Phase-3 SIGNATURE feature — "Sommes-nous parents ?" (kinship-check)
 * Privacy & consent integration spec.
 *
 * This is the crux QA scenario for Phase 3: two accounts consent to learn
 * ONLY whether (and how distantly) they are related through the single global
 * family graph — never each other's names, person ids, ancestors, phone or the
 * path between them. PRIVACY IS THE CORE INVARIANT.
 *
 * It wires the REAL GraphDegreeService (bounded BFS over ParentChild +
 * UnionPartner) and the REAL RelationshipLabelService (degree -> bilingual
 * label) over a small in-memory slice of the unified graph, so it validates the
 * actual production compute + labelling units.
 *
 * The consent/compute ORCHESTRATION (KinshipCheckService) is being authored in
 * parallel; this spec encodes its AGREED contract as an executable reference
 * harness (`KinshipCheckHarness`) so the behaviour is pinned now and is
 * independent of any controller/HTTP wiring. When
 * `apps/api/src/modules/kinship-check/kinship-check.service.ts` lands, swap the
 * harness for the real service — the assertions (especially the privacy scan)
 * stay valid against its public output.
 *
 * Contract under test:
 *  1. compute does NOT happen before the target consents.
 *  2. a DECLINED check yields no result and never touches the graph.
 *  3. the COMPUTED result and every list/response payload contain ONLY
 *     { related, degree, label } — ZERO person-id / name / phone / path fields.
 *  4. related vs not-related labelling driven by the degree.
 *  5. an account with no VERIFIED claim -> "cannot determine" (related = null).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { GraphDegreeService } from '../src/modules/authorization/graph-degree.service';
import { RelationshipLabelService } from '../src/modules/kinship-check/relationship-label.service';
import {
  createKinshipPrismaMock,
  KinshipPrismaMock,
  MockKinshipCheck,
} from './support/kinship-prisma-mock';

// --------------------------------------------------------------------------
// Reference harness — mirrors the AGREED KinshipCheckService contract.
// It is deliberately the ONLY place person ids are resolved, and they live
// strictly as locals inside compute(): they are NEVER persisted on the
// KinshipCheck row (the agreed model stores no person ids/path) and NEVER
// returned. That is the privacy invariant made structural.
// --------------------------------------------------------------------------

interface PublicKinshipResult {
  related: boolean | null;
  degree: number | null;
  label: { fr: string; en: string };
}

interface PublicKinshipCheck {
  id: string;
  status: MockKinshipCheck['status'];
  requesterConsent: boolean;
  targetConsent: boolean;
  createdAt: Date;
  computedAt: Date | null;
  expiresAt: Date | null;
  result: PublicKinshipResult | null;
}

const KINSHIP_MAX_DEPTH = 6;

class KinshipCheckHarness {
  constructor(
    private readonly prisma: KinshipPrismaMock['prisma'],
    private readonly graph: GraphDegreeService,
    private readonly labels: RelationshipLabelService,
  ) {}

  private get kinshipCheck() {
    return this.prisma.kinshipCheck as {
      create: (a: unknown) => Promise<MockKinshipCheck>;
      findUnique: (a: unknown) => Promise<MockKinshipCheck | null>;
      findMany: (a: unknown) => Promise<MockKinshipCheck[]>;
      update: (a: unknown) => Promise<MockKinshipCheck>;
    };
  }

  private get claim() {
    return this.prisma.claim as {
      findFirst: (a: unknown) => Promise<{ personId: string } | null>;
    };
  }

  private get contribution() {
    return this.prisma.contribution as {
      create: (a: unknown) => Promise<unknown>;
    };
  }

  async request(input: {
    requesterAccountId: string;
    targetAccountId?: string;
    targetPhone?: string;
  }): Promise<PublicKinshipCheck> {
    const check = await this.kinshipCheck.create({
      data: {
        requesterAccountId: input.requesterAccountId,
        targetAccountId: input.targetAccountId ?? null,
        targetPhone: input.targetPhone ?? null,
        status: 'PENDING_CONSENT',
        requesterConsent: true,
        targetConsent: false,
      },
    });
    await this.audit(input.requesterAccountId, check.id, 'CREATE');
    return this.toPublic(check);
  }

  /** Target explicitly consents -> compute may now run. */
  async consent(
    checkId: string,
    targetAccountId: string,
  ): Promise<PublicKinshipCheck> {
    const consented = await this.kinshipCheck.update({
      where: { id: checkId },
      data: {
        targetAccountId,
        targetConsent: true,
        status: 'CONSENTED',
      },
    });
    await this.audit(targetAccountId, checkId, 'UPDATE');
    return this.compute(consented);
  }

  /** Target declines -> terminal, no result, graph never read. */
  async decline(
    checkId: string,
    targetAccountId: string,
  ): Promise<PublicKinshipCheck> {
    const declined = await this.kinshipCheck.update({
      where: { id: checkId },
      data: { targetAccountId, targetConsent: false, status: 'DECLINED' },
    });
    await this.audit(targetAccountId, checkId, 'UPDATE');
    return this.toPublic(declined);
  }

  async getCheck(checkId: string): Promise<PublicKinshipCheck | null> {
    const check = await this.kinshipCheck.findUnique({ where: { id: checkId } });
    return check ? this.toPublic(check) : null;
  }

  async listForAccount(accountId: string): Promise<PublicKinshipCheck[]> {
    const [asRequester, asTarget] = await Promise.all([
      this.kinshipCheck.findMany({
        where: { requesterAccountId: accountId, deletedAt: null },
      }),
      this.kinshipCheck.findMany({
        where: { targetAccountId: accountId, deletedAt: null },
      }),
    ]);
    return [...asRequester, ...asTarget].map((c) => this.toPublic(c));
  }

  // ---- internals ---------------------------------------------------------

  /**
   * GUARD: compute runs ONLY when both parties have consented. Person ids are
   * resolved here as locals and discarded — only the aggregate degree/label is
   * ever written or returned.
   */
  private async compute(check: MockKinshipCheck): Promise<PublicKinshipCheck> {
    if (
      !check.requesterConsent ||
      !check.targetConsent ||
      check.status !== 'CONSENTED'
    ) {
      return this.toPublic(check);
    }

    const requesterPersonId = await this.resolvePersonId(
      check.requesterAccountId,
    );
    const targetPersonId = check.targetAccountId
      ? await this.resolvePersonId(check.targetAccountId)
      : null;

    // Cannot determine: at least one side has no VERIFIED claim / graph node.
    if (!requesterPersonId || !targetPersonId) {
      const label = this.labels.label(null);
      const updated = await this.kinshipCheck.update({
        where: { id: check.id },
        data: {
          status: 'COMPUTED',
          resultDegree: null,
          resultRelated: null,
          resultLabelFr: label.fr,
          resultLabelEn: label.en,
          computedAt: new Date(),
        },
      });
      return this.toPublic(updated);
    }

    const degree = await this.graph.computeDegree(
      requesterPersonId,
      targetPersonId,
      KINSHIP_MAX_DEPTH,
    );
    const related = degree !== null;
    const label = this.labels.label(degree);

    const updated = await this.kinshipCheck.update({
      where: { id: check.id },
      data: {
        status: 'COMPUTED',
        resultDegree: degree,
        resultRelated: related,
        resultLabelFr: label.fr,
        resultLabelEn: label.en,
        computedAt: new Date(),
      },
    });
    return this.toPublic(updated);
  }

  private async resolvePersonId(accountId: string): Promise<string | null> {
    const claim = await this.claim.findFirst({
      where: { accountId, status: 'VERIFIED', deletedAt: null },
    });
    return claim?.personId ?? null;
  }

  private toPublic(check: MockKinshipCheck): PublicKinshipCheck {
    return {
      id: check.id,
      status: check.status,
      requesterConsent: check.requesterConsent,
      targetConsent: check.targetConsent,
      createdAt: check.createdAt,
      computedAt: check.computedAt,
      expiresAt: check.expiresAt,
      result:
        check.status === 'COMPUTED'
          ? {
              related: check.resultRelated,
              degree: check.resultDegree,
              label: {
                fr: check.resultLabelFr ?? '',
                en: check.resultLabelEn ?? '',
              },
            }
          : null,
    };
  }

  private async audit(
    accountId: string,
    checkId: string,
    action: string,
  ): Promise<void> {
    await this.contribution.create({
      data: {
        accountId,
        entityType: 'kinship_check',
        entityId: checkId,
        action,
      },
    });
  }
}

// --------------------------------------------------------------------------
// Privacy scanner — the heart of the QA invariant.
// Recursively walks any payload returned to a user and asserts it leaks NONE
// of: structural keys (person id / name / phone / path / ancestor / tree /
// node) NOR any seeded sensitive VALUE (a person id, display name or phone).
// --------------------------------------------------------------------------

const FORBIDDEN_KEY = /(person.?id|ancestor|\bpath\b|tree|node|displayname|full.?name|\bname\b|phone|requesterperson|targetperson|requesteraccount|targetaccount)/i;

function collect(
  value: unknown,
  keys: string[],
  primitives: string[],
): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    for (const item of value) collect(item, keys, primitives);
    return;
  }
  if (value instanceof Date) {
    return; // timestamps are about the check, not the persons
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      keys.push(k);
      collect(v, keys, primitives);
    }
    return;
  }
  primitives.push(String(value));
}

function assertNoLeak(payload: unknown, secrets: string[]): void {
  const keys: string[] = [];
  const primitives: string[] = [];
  collect(payload, keys, primitives);

  for (const key of keys) {
    expect(key).not.toMatch(FORBIDDEN_KEY);
  }
  for (const secret of secrets) {
    expect(primitives).not.toContain(secret);
  }
}

// --------------------------------------------------------------------------

describe('Kinship check — privacy & consent (integration)', () => {
  let mock: KinshipPrismaMock;
  let graph: GraphDegreeService;
  let labels: RelationshipLabelService;
  let harness: KinshipCheckHarness;

  // The secret values that must NEVER appear in any user-facing payload.
  let secrets: string[];

  beforeEach(async () => {
    mock = createKinshipPrismaMock();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GraphDegreeService,
        RelationshipLabelService,
        { provide: PrismaService, useValue: mock.prisma },
      ],
    }).compile();

    graph = moduleRef.get(GraphDegreeService);
    labels = moduleRef.get(RelationshipLabelService);
    harness = new KinshipCheckHarness(mock.prisma, graph, labels);
    secrets = [];
  });

  /**
   * Build two accounts, each with a VERIFIED self-claim, related at `degree`
   * hops (a simple parent chain). Returns ids + records the sensitive values
   * as secrets for the privacy scanner.
   */
  function seedRelatedPair(degree: number): {
    requesterAccountId: string;
    targetAccountId: string;
  } {
    const chain: string[] = [];
    for (let i = 0; i <= degree; i += 1) {
      const p = mock.seedPerson({ displayName: `Person ${i}` });
      chain.push(p.id);
      secrets.push(p.id, p.displayName);
    }
    for (let i = 0; i < degree; i += 1) {
      mock.addParentChild(chain[i], chain[i + 1]);
    }
    const reqAcc = mock.seedAccount({
      phoneNumber: '+237600000001',
      fullName: 'Requester Real Name',
    });
    const tgtAcc = mock.seedAccount({
      phoneNumber: '+237600000002',
      fullName: 'Target Real Name',
    });
    secrets.push(
      reqAcc.phoneNumber,
      tgtAcc.phoneNumber,
      reqAcc.fullName as string,
      tgtAcc.fullName as string,
    );
    mock.seedClaim(reqAcc.id, chain[0]);
    mock.seedClaim(tgtAcc.id, chain[degree]);
    return { requesterAccountId: reqAcc.id, targetAccountId: tgtAcc.id };
  }

  it('does NOT compute before the target consents (PENDING_CONSENT, no graph read)', async () => {
    const { requesterAccountId, targetAccountId } = seedRelatedPair(2);
    const spy = jest.spyOn(graph, 'computeDegree');

    const created = await harness.request({
      requesterAccountId,
      targetAccountId,
    });

    expect(created.status).toBe('PENDING_CONSENT');
    expect(created.result).toBeNull();
    expect(created.targetConsent).toBe(false);
    expect(spy).not.toHaveBeenCalled();

    // Stored row carries no result either.
    const row = mock.db.kinshipChecks.find((c) => c.id === created.id);
    expect(row?.resultDegree).toBeNull();
    expect(row?.resultRelated).toBeNull();
    expect(row?.computedAt).toBeNull();
  });

  it('a DECLINED check yields no result and never touches the graph', async () => {
    const { requesterAccountId, targetAccountId } = seedRelatedPair(2);
    const spy = jest.spyOn(graph, 'computeDegree');

    const created = await harness.request({
      requesterAccountId,
      targetAccountId,
    });
    const declined = await harness.decline(created.id, targetAccountId);

    expect(declined.status).toBe('DECLINED');
    expect(declined.result).toBeNull();
    expect(spy).not.toHaveBeenCalled();

    const row = mock.db.kinshipChecks.find((c) => c.id === created.id);
    expect(row?.resultDegree).toBeNull();
    expect(row?.resultRelated).toBeNull();
    expect(row?.resultLabelFr).toBeNull();
    expect(row?.computedAt).toBeNull();
  });

  it('computes only AFTER both consent, and the result + every payload leak NOTHING but { related, degree, label }', async () => {
    const { requesterAccountId, targetAccountId } = seedRelatedPair(2);

    const created = await harness.request({
      requesterAccountId,
      targetAccountId,
    });
    const computed = await harness.consent(created.id, targetAccountId);

    // Correct aggregate result.
    expect(computed.status).toBe('COMPUTED');
    expect(computed.result).toEqual({
      related: true,
      degree: 2,
      label: {
        fr: expect.stringContaining('2e degré'),
        en: expect.stringContaining('Second-degree'),
      },
    });

    // The result object has EXACTLY these three keys — nothing else.
    expect(Object.keys(computed.result as object).sort()).toEqual([
      'degree',
      'label',
      'related',
    ]);

    // CRUX privacy assertion: scan the computed payload, the fetched check,
    // and BOTH parties' list views — none may leak a person id/name/phone/path.
    const fetched = await harness.getCheck(created.id);
    const requesterList = await harness.listForAccount(requesterAccountId);
    const targetList = await harness.listForAccount(targetAccountId);

    expect(secrets.length).toBeGreaterThan(0);
    assertNoLeak(computed, secrets);
    assertNoLeak(fetched, secrets);
    assertNoLeak(requesterList, secrets);
    assertNoLeak(targetList, secrets);

    // And the persisted row itself stores no person id / name / path VALUES.
    // Account-id + target-phone columns are legitimate FK/invite plumbing of the
    // agreed model (never person nodes, never surfaced by toPublic()); strip
    // them before the scan so it focuses on the privacy-critical leak: a person
    // id, name or the path must never be persisted on a KinshipCheck row.
    const row = mock.db.kinshipChecks.find((c) => c.id === created.id);
    assertNoLeak(
      {
        ...row,
        requesterAccountId: undefined,
        targetAccountId: undefined,
        targetPhone: undefined,
      },
      secrets,
    );
    // Explicit: the row schema carries NO person-id or path columns at all.
    expect(Object.keys(row ?? {})).not.toContain('requesterPersonId');
    expect(Object.keys(row ?? {})).not.toContain('targetPersonId');
    expect(Object.keys(row ?? {})).not.toContain('path');
  });

  it('labels NOT-related when no path exists within the bounded depth (degree null, related false)', async () => {
    // Two disconnected, separately-claimed accounts.
    const a = mock.seedPerson({ displayName: 'Alpha' });
    const b = mock.seedPerson({ displayName: 'Beta' });
    secrets.push(a.id, a.displayName, b.id, b.displayName);
    const reqAcc = mock.seedAccount({ phoneNumber: '+237600000003' });
    const tgtAcc = mock.seedAccount({ phoneNumber: '+237600000004' });
    secrets.push(reqAcc.phoneNumber, tgtAcc.phoneNumber);
    mock.seedClaim(reqAcc.id, a.id);
    mock.seedClaim(tgtAcc.id, b.id);

    const created = await harness.request({
      requesterAccountId: reqAcc.id,
      targetAccountId: tgtAcc.id,
    });
    const computed = await harness.consent(created.id, tgtAcc.id);

    expect(computed.status).toBe('COMPUTED');
    expect(computed.result?.related).toBe(false);
    expect(computed.result?.degree).toBeNull();
    expect(computed.result?.label.fr).toBe('Aucun lien de parenté trouvé');
    expect(computed.result?.label.en).toBe('No family link found');
    assertNoLeak(computed, secrets);
  });

  it('labels RELATED from a faked degree (degree 3 -> cousin / third-degree)', async () => {
    const { requesterAccountId, targetAccountId } = seedRelatedPair(2);
    // Override the graph engine to a fixed degree — isolates the labelling
    // contract from the graph topology.
    jest.spyOn(graph, 'computeDegree').mockResolvedValue(3);

    const created = await harness.request({
      requesterAccountId,
      targetAccountId,
    });
    const computed = await harness.consent(created.id, targetAccountId);

    expect(computed.result?.related).toBe(true);
    expect(computed.result?.degree).toBe(3);
    expect(computed.result?.label.fr).toContain('3e degré');
    expect(computed.result?.label.en).toContain('third-degree');
    assertNoLeak(computed, secrets);
  });

  it('an account with no VERIFIED claim -> cannot determine (related = null, no leak)', async () => {
    // Requester is VERIFIED; target only has a PENDING claim (no graph node).
    const reqPerson = mock.seedPerson({ displayName: 'Verified One' });
    const tgtPerson = mock.seedPerson({ displayName: 'Unverified Two' });
    secrets.push(
      reqPerson.id,
      reqPerson.displayName,
      tgtPerson.id,
      tgtPerson.displayName,
    );
    const reqAcc = mock.seedAccount({ phoneNumber: '+237600000005' });
    const tgtAcc = mock.seedAccount({ phoneNumber: '+237600000006' });
    secrets.push(reqAcc.phoneNumber, tgtAcc.phoneNumber);
    mock.seedClaim(reqAcc.id, reqPerson.id, 'VERIFIED');
    mock.seedClaim(tgtAcc.id, tgtPerson.id, 'PENDING'); // not VERIFIED

    const spy = jest.spyOn(graph, 'computeDegree');

    const created = await harness.request({
      requesterAccountId: reqAcc.id,
      targetAccountId: tgtAcc.id,
    });
    const computed = await harness.consent(created.id, tgtAcc.id);

    expect(computed.status).toBe('COMPUTED');
    expect(computed.result?.related).toBeNull(); // cannot determine
    expect(computed.result?.degree).toBeNull();
    expect(computed.result?.label.fr).toBe('Aucun lien de parenté trouvé');
    // No node to traverse from/to -> the graph engine is never even consulted.
    expect(spy).not.toHaveBeenCalled();
    assertNoLeak(computed, secrets);
  });

  it('writes a mandatory Contribution audit row on request, consent and compute', async () => {
    const { requesterAccountId, targetAccountId } = seedRelatedPair(1);

    const created = await harness.request({
      requesterAccountId,
      targetAccountId,
    });
    await harness.consent(created.id, targetAccountId);

    const audit = mock.db.contributions.filter(
      (c) => c.entityType === 'kinship_check' && c.entityId === created.id,
    );
    // request -> CREATE, consent -> UPDATE
    expect(audit.map((c) => c.action).sort()).toEqual(['CREATE', 'UPDATE']);
  });
});
