// Env required by ConfigModule's Joi schema must be set BEFORE AppModule is
// imported (mirrors auth.e2e-spec.ts). Secrets are >=32 chars so JwtStrategy's
// length guard passes at construction time.
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'e2e-test-access-secret-which-is-long-enough-0123456789';
process.env.JWT_REFRESH_SECRET = 'e2e-test-refresh-secret-which-is-long-enough-0123456789';
process.env.NODE_ENV = 'test';
process.env.AWS_KMS_KEY_ID = 'test-kms-key-id';
process.env.AWS_ENDPOINT_URL = 'http://localhost:4566';
process.env.THROTTLE_TTL = '1';
process.env.THROTTLE_LIMIT = '100000';

import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { createFeedPrismaMock, FeedPrismaMock } from './support/feed-prisma-mock';

// ---------------------------------------------------------------------------
// AGREED HTTP CONTRACT (Phase 1).
// These paths/field-names are the assumed REST surface for the life-events and
// feed-interaction controllers built by the other agents. They are centralised
// here so the integrator can align them in ONE place if the final controllers
// differ. See docs/PHASE1-TESTPLAN.md + the INTEGRATION NEEDED notes.
// ---------------------------------------------------------------------------
const API = '/api/v1';
const ROUTES = {
  recordLifeEvent: `${API}/life-events`,
  familyFeed: `${API}/family-feed`,
  reactions: (postId: string): string =>
    `${API}/family-feed/posts/${postId}/reactions`,
  comments: (postId: string): string =>
    `${API}/family-feed/posts/${postId}/comments`,
} as const;

// Header used by the test JwtAuthGuard override to impersonate an account.
const TEST_ACCOUNT_HEADER = 'x-test-account-id';

describe('Life-events -> Feed (e2e, HTTP layer)', () => {
  let app: INestApplication;
  let mock: FeedPrismaMock;

  // graph: grandparent -> parent -> subject ; stranger disconnected
  let subjectId: string;
  let parentId: string;
  let strangerId: string;
  let accAuthor: string; // subject's own account (records the events)
  let accParent: string; // in-degree relative
  let accStranger: string; // out-of-degree user

  beforeAll(async () => {
    mock = createFeedPrismaMock();

    subjectId = mock.seedPerson({ displayName: 'Subject', lifeStatus: 'ALIVE' }).id;
    parentId = mock.seedPerson({ displayName: 'Parent' }).id;
    strangerId = mock.seedPerson({ displayName: 'Stranger' }).id;
    mock.addParentChild(parentId, subjectId);

    accAuthor = mock.seedAccount({ phoneNumber: '+237600000001' }).id;
    accParent = mock.seedAccount({ phoneNumber: '+237600000002' }).id;
    accStranger = mock.seedAccount({ phoneNumber: '+237600000003' }).id;
    mock.seedClaim(accAuthor, subjectId);
    mock.seedClaim(accParent, parentId);
    mock.seedClaim(accStranger, strangerId);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mock.prisma)
      // Bypass real JWT/passport: derive request.user from a test header so we
      // can impersonate any seeded account without minting tokens.
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext): boolean => {
          const req = ctx.switchToHttp().getRequest();
          const accountId = req.headers[TEST_ACCOUNT_HEADER] as
            | string
            | undefined;
          if (!accountId) {
            return false;
          }
          const account = mock.db.accounts.get(accountId);
          req.user = {
            id: accountId,
            phoneNumber: account?.phoneNumber ?? '+237600000000',
            isActive: true,
            role: account?.role ?? 'USER',
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // -----------------------------------------------------------------------
  // Scenario 1: record a BIRTH -> a FeedPost is visible to an in-degree
  // relative but NOT to an out-of-degree user.
  // -----------------------------------------------------------------------
  describe('record birth -> family feed visibility', () => {
    it('records a birth and fans out a FAMILY feed post', async () => {
      const res = await request(app.getHttpServer())
        .post(ROUTES.recordLifeEvent)
        .set(TEST_ACCOUNT_HEADER, accAuthor)
        .send({
          kind: 'BIRTH',
          primaryPersonId: subjectId,
          occurredAt: '2020-01-15',
          datePrecision: 'EXACT',
        })
        .expect((r) => expect([200, 201]).toContain(r.status));

      expect(res.body.data).toBeDefined();

      // A feed post about the subject must now exist.
      const posts = mock.db.feedPosts.filter(
        (p) => p.subjectPersonId === subjectId,
      );
      expect(posts.length).toBeGreaterThanOrEqual(1);
    });

    it('surfaces the birth post in the IN-degree relative feed', async () => {
      const res = await request(app.getHttpServer())
        .get(ROUTES.familyFeed)
        .set(TEST_ACCOUNT_HEADER, accParent)
        .expect(200);

      const items = res.body.data.items as Array<{ subjectPersonId: string }>;
      expect(items.some((i) => i.subjectPersonId === subjectId)).toBe(true);
    });

    it('hides the birth post from an OUT-of-degree user', async () => {
      const res = await request(app.getHttpServer())
        .get(ROUTES.familyFeed)
        .set(TEST_ACCOUNT_HEADER, accStranger)
        .expect(200);

      const items = res.body.data.items as Array<{ subjectPersonId: string }>;
      expect(items.some((i) => i.subjectPersonId === subjectId)).toBe(false);
    });

    it('rejects an unauthenticated feed request', async () => {
      await request(app.getHttpServer()).get(ROUTES.familyFeed).expect(403);
    });
  });

  // -----------------------------------------------------------------------
  // Scenario 2: record a DEATH -> flips Person.life_status to DECEASED.
  // -----------------------------------------------------------------------
  describe('record death -> life_status flip', () => {
    it('flips the primary person life_status to DECEASED', async () => {
      expect(mock.db.persons.get(subjectId)?.lifeStatus).toBe('ALIVE');

      await request(app.getHttpServer())
        .post(ROUTES.recordLifeEvent)
        .set(TEST_ACCOUNT_HEADER, accAuthor)
        .send({
          kind: 'DEATH',
          primaryPersonId: subjectId,
          occurredAt: '2026-05-01',
          datePrecision: 'EXACT',
        })
        .expect((r) => expect([200, 201]).toContain(r.status));

      expect(mock.db.persons.get(subjectId)?.lifeStatus).toBe('DECEASED');
    });
  });

  // -----------------------------------------------------------------------
  // Scenario 3: reaction round-trips and is audited.
  // -----------------------------------------------------------------------
  describe('reaction round-trip + audit', () => {
    it('adds a reaction to a feed post and records an audit row', async () => {
      const post = mock.db.feedPosts.find(
        (p) => p.subjectPersonId === subjectId,
      );
      expect(post).toBeDefined();
      const postId = (post as { id: string }).id;

      await request(app.getHttpServer())
        .post(ROUTES.reactions(postId))
        .set(TEST_ACCOUNT_HEADER, accParent)
        .send({ reactionType: 'LOVE' })
        .expect((r) => expect([200, 201]).toContain(r.status));

      const reactions = mock.db.feedReactions.filter(
        (r) => r.feedPostId === postId && r.accountId === accParent,
      );
      expect(reactions).toHaveLength(1);
      expect(reactions[0].reactionType).toBe('LOVE');

      const audit = mock.db.contributions.filter(
        (c) => c.entityType === 'feed_reaction' && c.accountId === accParent,
      );
      expect(audit.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // Scenario 4: comment round-trips and is audited.
  // -----------------------------------------------------------------------
  describe('comment round-trip + audit', () => {
    it('adds a comment to a feed post and records an audit row', async () => {
      const post = mock.db.feedPosts.find(
        (p) => p.subjectPersonId === subjectId,
      );
      const postId = (post as { id: string }).id;

      const res = await request(app.getHttpServer())
        .post(ROUTES.comments(postId))
        .set(TEST_ACCOUNT_HEADER, accParent)
        .send({ body: 'Felicitations a la famille !' })
        .expect((r) => expect([200, 201]).toContain(r.status));

      expect(res.body.data).toBeDefined();

      const comments = mock.db.feedComments.filter(
        (c) => c.feedPostId === postId && c.accountId === accParent,
      );
      expect(comments).toHaveLength(1);
      expect(comments[0].body).toBe('Felicitations a la famille !');

      const audit = mock.db.contributions.filter(
        (c) => c.entityType === 'feed_comment' && c.accountId === accParent,
      );
      expect(audit.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects an empty comment body (validation)', async () => {
      const post = mock.db.feedPosts.find(
        (p) => p.subjectPersonId === subjectId,
      );
      const postId = (post as { id: string }).id;

      await request(app.getHttpServer())
        .post(ROUTES.comments(postId))
        .set(TEST_ACCOUNT_HEADER, accParent)
        .send({ body: '' })
        .expect(400);
    });
  });
});
