import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Bilingual (FR/EN) relationship label produced by the kinship compute step.
 * This is the ONLY human-readable result ever surfaced to either party.
 */
export interface KinshipResultLabel {
  fr: string;
  en: string;
}

interface InitiatedParams {
  /** Account that should be notified that a check targets them. */
  targetAccountId: string;
  /** The KinshipCheck id, used only for routing (never a person id). */
  checkId: string;
}

interface ConsentDecisionParams {
  /** The original requester, who is waiting on the target's decision. */
  requesterAccountId: string;
  checkId: string;
  /** true => target consented, false => target declined. */
  consented: boolean;
}

interface ComputedParams {
  requesterAccountId: string;
  targetAccountId: string;
  checkId: string;
  /** Aggregate relationship label. NEVER contains a name, id, or path. */
  label: KinshipResultLabel;
  /** Whether the two accounts are related through the global graph. */
  related: boolean;
}

const RELATED_ENTITY_TYPE = 'kinship_check';

/**
 * Thin injectable helper (NOT a module) wrapping {@link NotificationsService}
 * for the "Sommes-nous parents ?" / "Are we related?" flow.
 *
 * PRIVACY INVARIANT: every notification produced here describes ONLY that a
 * check happened or its aggregate result label. It MUST NEVER reference the
 * other party's name, phone, relatives, ancestors, tree, or the graph path.
 * The `relatedEntityId` carried on each notification is the KinshipCheck id —
 * never a person id or the counterpart account's private data.
 */
@Injectable()
export class KinshipNotifyHelper {
  private readonly logger = new Logger(KinshipNotifyHelper.name);

  constructor(private readonly notifications: NotificationsService) {}

  /**
   * (a) Tell the target that someone wants to check their family link with
   * them. The requester's identity is intentionally NOT disclosed: the target
   * consents to the *check*, not to a specific person.
   */
  async notifyCheckInitiated(params: InitiatedParams): Promise<void> {
    await this.notifications.createNotification({
      accountId: params.targetAccountId,
      notificationType: 'OTHER',
      title:
        'Quelqu’un souhaite vérifier votre lien de parenté / Someone wants to check your family link',
      body:
        'Une personne propose de vérifier, en toute confidentialité, si vous avez un lien de parenté. ' +
        'Aucune information sur vos familles respectives ne sera partagée — uniquement le lien éventuel. ' +
        'Vous devez donner votre accord pour lancer la vérification.\n' +
        'Someone proposes to privately check whether you share a family link. ' +
        'No information about either family is shared — only the possible link. ' +
        'Your consent is required before any check runs.',
      relatedEntityType: RELATED_ENTITY_TYPE,
      relatedEntityId: params.checkId,
      actionUrl: `/kinship/respond?check=${params.checkId}`,
      pushExternal: true,
    });
    this.logger.log(`Kinship check initiated notification sent (check=${params.checkId})`);
  }

  /**
   * (b) Tell the requester whether the target consented or declined. We reveal
   * only the decision, nothing about the target.
   */
  async notifyConsentDecision(params: ConsentDecisionParams): Promise<void> {
    const title = params.consented
      ? 'Votre vérification de parenté a été acceptée / Your kinship check was accepted'
      : 'Votre vérification de parenté a été refusée / Your kinship check was declined';

    const body = params.consented
      ? 'La personne a donné son accord. Le résultat sera disponible sous peu.\n' +
        'The person consented. The result will be available shortly.'
      : 'La personne n’a pas souhaité procéder à la vérification.\n' +
        'The person chose not to proceed with the check.';

    await this.notifications.createNotification({
      accountId: params.requesterAccountId,
      notificationType: 'OTHER',
      title,
      body,
      relatedEntityType: RELATED_ENTITY_TYPE,
      relatedEntityId: params.checkId,
      actionUrl: `/kinship/${params.checkId}`,
    });
    this.logger.log(
      `Kinship consent decision notification sent (check=${params.checkId}, consented=${params.consented})`,
    );
  }

  /**
   * (c) Tell BOTH parties that the result is ready, carrying ONLY the aggregate
   * label. Sent identically to each side — neither learns anything about the
   * other beyond the shared relationship label.
   */
  async notifyComputed(params: ComputedParams): Promise<void> {
    const title =
      'Résultat de votre vérification de parenté / Your kinship check result';

    const resultLine = params.related
      ? `Lien détecté : ${params.label.fr} / Link found: ${params.label.en}`
      : `Aucun lien de parenté détecté / ${params.label.en}`;

    const body =
      `${resultLine}\n` +
      'Aucune autre information n’est partagée entre les deux participants.\n' +
      'No other information is shared between the two participants.';

    await Promise.all([
      this.notifications.createNotification({
        accountId: params.requesterAccountId,
        notificationType: 'OTHER',
        title,
        body,
        relatedEntityType: RELATED_ENTITY_TYPE,
        relatedEntityId: params.checkId,
        actionUrl: `/kinship/${params.checkId}`,
      }),
      this.notifications.createNotification({
        accountId: params.targetAccountId,
        notificationType: 'OTHER',
        title,
        body,
        relatedEntityType: RELATED_ENTITY_TYPE,
        relatedEntityId: params.checkId,
        actionUrl: `/kinship/${params.checkId}`,
      }),
    ]);

    this.logger.log(
      `Kinship computed notification sent to both parties (check=${params.checkId}, related=${params.related})`,
    );
  }
}
