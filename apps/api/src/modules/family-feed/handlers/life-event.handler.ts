import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, NotificationType, VisibilityScope } from '@prisma/client';
import type {
  LifeEventRecordedEvent,
  LifeEventKind,
} from '@origin/shared-types';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventPublisher } from '../../../eventing/event-publisher';
import { NotificationsService } from '../../notifications/notifications.service';
import { FamilyFeedService } from '../family-feed.service';

/**
 * Default family-graph radius used to decide who gets notified about a life
 * event when the LifeEvent itself does not pin an explicit `visibleMaxDegree`.
 * Kept small: fan-out notifications are a write amplifier, so we only reach the
 * close family neighbourhood by default.
 */
const DEFAULT_NOTIFY_DEGREE = 2;

/**
 * Hard cap on the number of recipients a single life event may notify. Protects
 * against pathological hubs in the global graph turning one mutation into a
 * notification storm. Beyond this the fan-out is silently truncated (the feed
 * post itself remains visible to everyone in scope via the pull-based feed).
 */
const MAX_NOTIFY_RECIPIENTS = 200;

/** Maps a life-event kind to the FeedPost `post_type` discriminator. */
const POST_TYPE_BY_KIND: Record<LifeEventKind, string> = {
  birth: 'LIFE_EVENT_BIRTH',
  death: 'LIFE_EVENT_DEATH',
  union: 'LIFE_EVENT_UNION',
};

/** Maps a life-event kind to the most specific notification type available. */
const NOTIFICATION_TYPE_BY_KIND: Record<LifeEventKind, NotificationType> = {
  birth: NotificationType.NEW_FAMILY_MEMBER,
  death: NotificationType.DECEASE_REPORTED,
  union: NotificationType.OTHER,
};

/** Bilingual (FR / EN) notification copy per life-event kind. */
const NOTIFICATION_COPY_BY_KIND: Record<
  LifeEventKind,
  { title: string; body: string }
> = {
  birth: {
    title: 'Nouvelle naissance dans la famille / New birth in the family',
    body: 'Un nouvel événement de naissance a été ajouté. / A new birth event was added.',
  },
  death: {
    title: 'Décès signalé dans la famille / A death has been reported',
    body: 'Un décès a été signalé dans votre famille. / A death has been reported in your family.',
  },
  union: {
    title: 'Nouvelle union dans la famille / New union in the family',
    body: 'Une nouvelle union a été enregistrée. / A new union was recorded.',
  },
};

/**
 * Shape passed to {@link FamilyFeedService.createPost}. Declared here so the
 * fan-out handler and the feed service agree on the contract even though they
 * are authored independently.
 */
export interface CreateFeedPostInput {
  /** Source life event this post announces. */
  lifeEventId: string;
  /** Account credited as the author (the actor that recorded the event). */
  authorAccountId: string;
  /**
   * Visibility OWNER personId — for a life-event post this is the primary
   * person the event is about. Drives FAMILY-scope degree checks downstream.
   */
  subjectPersonId: string | null;
  /** Discriminator (e.g. 'LIFE_EVENT_BIRTH'). */
  postType: string;
  /** Optional human-readable body. */
  body: string | null;
  /** Scope inherited from the life event. */
  visibilityScope: VisibilityScope;
  /** Degree cap inherited from the life event (null = use platform default). */
  visibleMaxDegree: number | null;
}

/**
 * S-018b — Fan-out handler.
 *
 * Subscribes to {@link LifeEventRecordedEvent} and, for each event, materialises
 * a single FeedPost (via {@link FamilyFeedService.createPost}) and notifies the
 * relevant close-family accounts.
 *
 * Idempotency: the underlying transport is at-least-once, so the same event may
 * be delivered more than once. We treat the existence of a non-deleted FeedPost
 * for the life event as the idempotency key and skip the whole side-effect on
 * replay. A unique constraint on `feed_posts.life_event_id` (see INTEGRATION
 * NEEDED) hardens this against concurrent duplicate delivery, in which case the
 * P2002 below is swallowed.
 */
@Injectable()
export class LifeEventHandler implements OnModuleInit {
  private readonly logger = new Logger(LifeEventHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: EventPublisher,
    private readonly familyFeed: FamilyFeedService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Wire the subscription once the module is initialised. Kept out of the
   * constructor so the handler is trivially unit-testable by calling
   * {@link handleLifeEventRecorded} directly.
   */
  onModuleInit(): void {
    this.publisher.subscribe<LifeEventRecordedEvent>(
      'life-event.recorded',
      (event) => this.handleLifeEventRecorded(event),
    );
  }

  /**
   * Core fan-out routine. Safe to invoke multiple times for the same event.
   */
  async handleLifeEventRecorded(event: LifeEventRecordedEvent): Promise<void> {
    const { lifeEventId, kind } = event.payload;

    // --- Idempotency gate: one FeedPost per life event. ---------------------
    const existingPost = await this.prisma.feedPost.findFirst({
      where: { lifeEventId, deletedAt: null },
      select: { id: true },
    });
    if (existingPost) {
      this.logger.debug(
        `Skipping replay for life event ${lifeEventId}: FeedPost ${existingPost.id} already exists`,
      );
      return;
    }

    // The LifeEvent carries the authoritative owner + visibility settings.
    const lifeEvent = await this.prisma.lifeEvent.findFirst({
      where: { id: lifeEventId, deletedAt: null },
      select: {
        primaryPersonId: true,
        visibilityScope: true,
        visibleMaxDegree: true,
        createdByAccountId: true,
      },
    });
    if (!lifeEvent) {
      this.logger.warn(
        `Life event ${lifeEventId} not found (or deleted); nothing to fan out`,
      );
      return;
    }

    const authorAccountId = event.actorId ?? lifeEvent.createdByAccountId;
    const copy = NOTIFICATION_COPY_BY_KIND[kind];

    let postId: string;
    try {
      const post = await this.familyFeed.createPost({
        lifeEventId,
        authorAccountId,
        subjectPersonId: lifeEvent.primaryPersonId,
        postType: POST_TYPE_BY_KIND[kind],
        body: copy.body,
        visibilityScope: lifeEvent.visibilityScope,
        visibleMaxDegree: lifeEvent.visibleMaxDegree,
      });
      postId = post.id;
    } catch (error) {
      // Concurrent duplicate delivery won the create race — treat as success.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.debug(
          `FeedPost for life event ${lifeEventId} created concurrently; skipping`,
        );
        return;
      }
      throw error;
    }

    await this.fanOutNotifications({
      kind,
      lifeEventId,
      postId,
      primaryPersonId: lifeEvent.primaryPersonId,
      involvedPersonIds: event.payload.personIds,
      maxDegree: lifeEvent.visibleMaxDegree ?? DEFAULT_NOTIFY_DEGREE,
      actorAccountId: event.actorId,
      title: copy.title,
      body: copy.body,
    });
  }

  /**
   * Notifies the close-family accounts of the persons involved in the event.
   * Each notification failure is isolated (logged, never rethrown) so a single
   * bad recipient cannot abort the rest of the fan-out or the source mutation.
   */
  private async fanOutNotifications(args: {
    kind: LifeEventKind;
    lifeEventId: string;
    postId: string;
    primaryPersonId: string | null;
    involvedPersonIds: string[];
    maxDegree: number;
    actorAccountId: string | null;
    title: string;
    body: string;
  }): Promise<void> {
    const seeds = new Set<string>(args.involvedPersonIds);
    if (args.primaryPersonId) {
      seeds.add(args.primaryPersonId);
    }
    if (seeds.size === 0) {
      return;
    }

    const recipientAccountIds = await this.collectRecipientAccountIds(
      [...seeds],
      args.maxDegree,
      args.actorAccountId,
    );

    const notificationType = NOTIFICATION_TYPE_BY_KIND[args.kind];
    for (const accountId of recipientAccountIds) {
      try {
        await this.notifications.createNotification({
          accountId,
          notificationType,
          title: args.title,
          body: args.body,
          relatedEntityType: 'feed_post',
          relatedEntityId: args.postId,
          actionUrl: `/feed/${args.postId}`,
        });
      } catch (error) {
        this.logger.error(
          `Failed to notify account ${accountId} for life event ${args.lifeEventId}: ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * Bounded breadth-first expansion over the global family graph (ParentChild +
   * UnionPartner edges) starting from `seedPersonIds`, collecting every account
   * that has claimed a person within `maxDegree` hops. Mirrors the traversal in
   * GraphDegreeService but gathers a *set* of reachable persons in one pass
   * rather than a pairwise degree, which is what fan-out needs.
   *
   * The actor account (if any) is excluded — you do not get notified about your
   * own action.
   */
  private async collectRecipientAccountIds(
    seedPersonIds: string[],
    maxDegree: number,
    actorAccountId: string | null,
  ): Promise<string[]> {
    const visited = new Set<string>(seedPersonIds);
    let frontier: string[] = [...seedPersonIds];

    for (let depth = 0; depth < maxDegree && frontier.length > 0; depth += 1) {
      const neighbours = await this.getNeighbours(frontier);
      const next: string[] = [];
      for (const personId of neighbours) {
        if (!visited.has(personId)) {
          visited.add(personId);
          next.push(personId);
        }
      }
      frontier = next;
    }

    if (visited.size === 0) {
      return [];
    }

    const claimedPersons = await this.prisma.person.findMany({
      where: {
        id: { in: [...visited] },
        deletedAt: null,
        claimedByAccountId: { not: null },
      },
      select: { claimedByAccountId: true },
    });

    const accountIds = new Set<string>();
    for (const person of claimedPersons) {
      if (
        person.claimedByAccountId &&
        person.claimedByAccountId !== actorAccountId
      ) {
        accountIds.add(person.claimedByAccountId);
      }
    }

    return [...accountIds].slice(0, MAX_NOTIFY_RECIPIENTS);
  }

  /**
   * Returns persons adjacent to ANY person in `personIds` via a non-deleted
   * parent/child or union-partner edge. Batched per frontier level.
   */
  private async getNeighbours(personIds: string[]): Promise<Set<string>> {
    const [childrenEdges, parentEdges, partnerships] = await Promise.all([
      this.prisma.parentChild.findMany({
        where: { parentId: { in: personIds }, deletedAt: null },
        select: { childId: true },
      }),
      this.prisma.parentChild.findMany({
        where: { childId: { in: personIds }, deletedAt: null },
        select: { parentId: true },
      }),
      this.prisma.unionPartner.findMany({
        where: { personId: { in: personIds }, union: { deletedAt: null } },
        select: { unionId: true },
      }),
    ]);

    const neighbours = new Set<string>();
    for (const edge of childrenEdges) {
      neighbours.add(edge.childId);
    }
    for (const edge of parentEdges) {
      neighbours.add(edge.parentId);
    }

    const unionIds = [...new Set(partnerships.map((p) => p.unionId))];
    if (unionIds.length > 0) {
      const coPartners = await this.prisma.unionPartner.findMany({
        where: { unionId: { in: unionIds } },
        select: { personId: true },
      });
      for (const partner of coPartners) {
        neighbours.add(partner.personId);
      }
    }

    return neighbours;
  }
}
