/**
 * Integration spec for the degree-bounded family-feed VISIBILITY invariant.
 *
 * This is the crux QA scenario of Phase 1: a FAMILY-scope post about a person
 * must surface in the feed of an IN-degree relative but stay invisible to an
 * OUT-of-degree user. It wires the REAL FamilyFeedService + REAL
 * GraphDegreeService together over an in-memory graph, so it validates the
 * actual production visibility/BFS code (not a re-implementation) and is
 * independent of any controller/HTTP wiring still being built by other agents.
 *
 * Graph built here (parent/child edges; degree = #hops):
 *
 *        p_grandparent (deg 2 from subject)
 *              |
 *           p_parent  (deg 1 from subject)   <-- IN-degree relative
 *              |
 *           p_subject (deg 0 — the post owner)
 *
 *        p_stranger (no path) <-- OUT-of-degree user
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { FamilyFeedService } from '../src/modules/family-feed/family-feed.service';
import { GraphDegreeService } from '../src/modules/authorization/graph-degree.service';
import { createFeedPrismaMock, FeedPrismaMock } from './support/feed-prisma-mock';

describe('Family feed visibility (integration)', () => {
  let mock: FeedPrismaMock;
  let feed: FamilyFeedService;

  // Person ids
  let subjectId: string;
  let parentId: string;
  let grandparentId: string;
  let strangerId: string;

  // Account ids (each claims exactly one person node)
  let accSubject: string;
  let accParent: string;
  let accGrandparent: string;
  let accStranger: string;

  beforeEach(async () => {
    mock = createFeedPrismaMock();

    // --- build the graph ---
    subjectId = mock.seedPerson({ displayName: 'Subject' }).id;
    parentId = mock.seedPerson({ displayName: 'Parent' }).id;
    grandparentId = mock.seedPerson({ displayName: 'Grandparent' }).id;
    strangerId = mock.seedPerson({ displayName: 'Stranger' }).id;

    mock.addParentChild(parentId, subjectId); // subject deg 1 from parent
    mock.addParentChild(grandparentId, parentId); // subject deg 2 from grandparent
    // stranger is intentionally disconnected.

    // --- accounts + verified self-claims ---
    accSubject = mock.seedAccount().id;
    accParent = mock.seedAccount().id;
    accGrandparent = mock.seedAccount().id;
    accStranger = mock.seedAccount().id;
    mock.seedClaim(accSubject, subjectId);
    mock.seedClaim(accParent, parentId);
    mock.seedClaim(accGrandparent, grandparentId);
    mock.seedClaim(accStranger, strangerId);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyFeedService,
        GraphDegreeService,
        { provide: PrismaService, useValue: mock.prisma },
        {
          // Fall back to the service default familyMaxDegree (5).
          provide: ConfigService,
          useValue: {
            get: <T>(_key: string, defaultValue?: T): T | undefined =>
              defaultValue,
          },
        },
      ],
    }).compile();

    feed = moduleRef.get(FamilyFeedService);
  });

  it('shows a FAMILY post to the subject themself (degree 0)', async () => {
    const post = await feed.createPost({
      authorAccountId: accSubject,
      subjectPersonId: subjectId,
      postType: 'life-event',
      body: 'Birth recorded',
    });

    const page = await feed.getFeedForAccount(accSubject);
    expect(page.items.map((i) => i.id)).toContain(post.id);
  });

  it('shows a FAMILY post to an IN-degree relative (parent, degree 1)', async () => {
    const post = await feed.createPost({
      authorAccountId: accSubject,
      subjectPersonId: subjectId,
      postType: 'life-event',
      body: 'Birth recorded',
    });

    const page = await feed.getFeedForAccount(accParent);
    expect(page.items.map((i) => i.id)).toContain(post.id);
  });

  it('HIDES a FAMILY post from an OUT-of-degree user (disconnected stranger)', async () => {
    const post = await feed.createPost({
      authorAccountId: accSubject,
      subjectPersonId: subjectId,
      postType: 'life-event',
      body: 'Birth recorded',
    });

    const page = await feed.getFeedForAccount(accStranger);
    expect(page.items.map((i) => i.id)).not.toContain(post.id);
    expect(page.items).toHaveLength(0);
  });

  it('respects a tighter per-post visibleMaxDegree (1 => excludes degree-2 grandparent)', async () => {
    const post = await feed.createPost({
      authorAccountId: accSubject,
      subjectPersonId: subjectId,
      postType: 'life-event',
      body: 'Close-family only',
      visibleMaxDegree: 1,
    });

    const parentPage = await feed.getFeedForAccount(accParent);
    expect(parentPage.items.map((i) => i.id)).toContain(post.id); // degree 1 — in

    const grandparentPage = await feed.getFeedForAccount(accGrandparent);
    expect(grandparentPage.items.map((i) => i.id)).not.toContain(post.id); // degree 2 — out
  });

  it('makes a PUBLIC post visible even to a disconnected stranger', async () => {
    const post = await feed.createPost({
      authorAccountId: accSubject,
      subjectPersonId: subjectId,
      postType: 'life-event',
      body: 'Public announcement',
      visibilityScope: 'PUBLIC' as never,
    });

    const page = await feed.getFeedForAccount(accStranger);
    expect(page.items.map((i) => i.id)).toContain(post.id);
  });

  it('keeps a PRIVATE_SELF post visible only to the subject', async () => {
    const post = await feed.createPost({
      authorAccountId: accSubject,
      subjectPersonId: subjectId,
      postType: 'life-event',
      body: 'Private note',
      visibilityScope: 'PRIVATE_SELF' as never,
    });

    const ownerPage = await feed.getFeedForAccount(accSubject);
    expect(ownerPage.items.map((i) => i.id)).toContain(post.id);

    const parentPage = await feed.getFeedForAccount(accParent);
    expect(parentPage.items.map((i) => i.id)).not.toContain(post.id);
  });

  it('returns an empty feed for an account with no verified self-claim (no graph position)', async () => {
    await feed.createPost({
      authorAccountId: accSubject,
      subjectPersonId: subjectId,
      postType: 'life-event',
      body: 'Birth recorded',
    });

    const unclaimedAccount = mock.seedAccount().id; // no claim row
    const page = await feed.getFeedForAccount(unclaimedAccount);
    expect(page.items).toHaveLength(0);
  });

  it('writes a mandatory Contribution audit row when a post is created', async () => {
    const post = await feed.createPost({
      authorAccountId: accSubject,
      subjectPersonId: subjectId,
      postType: 'life-event',
      body: 'Birth recorded',
    });

    const audit = mock.db.contributions.filter(
      (c) => c.entityType === 'feed_post' && c.entityId === post.id,
    );
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe('CREATE');
    expect(audit[0].accountId).toBe(accSubject);
  });
});
