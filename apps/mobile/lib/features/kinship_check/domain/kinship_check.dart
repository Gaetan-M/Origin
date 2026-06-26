/// Domain models for the privacy-preserving "Sommes-nous parents ?"
/// (Are we related?) flow.
///
/// PRIVACY INVARIANT (non-negotiable): the computed [KinshipResult] payload may
/// ever only carry { related, degree, label }. It NEVER carries person ids,
/// names, ancestors, the graph path, the other user's tree, or a phone number.
/// The compute step reads the global graph internally (server-side) and
/// discards everything except the aggregate degree + a derived human label.
///
/// Plain immutable Dart classes (no freezed/codegen) with hand-written
/// fromJson/toJson — mirrors the web contract in
/// apps/web/src/lib/api/kinship-check.ts.
library;

/// Lifecycle of a kinship check.
enum KinshipCheckStatus {
  pendingConsent,
  consented,
  declined,
  computed,
  expired,
  cancelled,
  unknown;

  /// Wire value used by the API (SCREAMING_SNAKE_CASE).
  String get wireName {
    switch (this) {
      case KinshipCheckStatus.pendingConsent:
        return 'PENDING_CONSENT';
      case KinshipCheckStatus.consented:
        return 'CONSENTED';
      case KinshipCheckStatus.declined:
        return 'DECLINED';
      case KinshipCheckStatus.computed:
        return 'COMPUTED';
      case KinshipCheckStatus.expired:
        return 'EXPIRED';
      case KinshipCheckStatus.cancelled:
        return 'CANCELLED';
      case KinshipCheckStatus.unknown:
        return 'UNKNOWN';
    }
  }

  static KinshipCheckStatus fromWire(String? value) {
    switch ((value ?? '').toUpperCase()) {
      case 'PENDING_CONSENT':
        return KinshipCheckStatus.pendingConsent;
      case 'CONSENTED':
        return KinshipCheckStatus.consented;
      case 'DECLINED':
        return KinshipCheckStatus.declined;
      case 'COMPUTED':
        return KinshipCheckStatus.computed;
      case 'EXPIRED':
        return KinshipCheckStatus.expired;
      case 'CANCELLED':
        return KinshipCheckStatus.cancelled;
      default:
        return KinshipCheckStatus.unknown;
    }
  }
}

/// Whether the current account initiated this check or received it.
enum KinshipCheckDirection {
  incoming,
  outgoing;

  String get wireName =>
      this == KinshipCheckDirection.incoming ? 'incoming' : 'outgoing';

  static KinshipCheckDirection? fromWire(String? value) {
    switch ((value ?? '').toLowerCase()) {
      case 'incoming':
        return KinshipCheckDirection.incoming;
      case 'outgoing':
        return KinshipCheckDirection.outgoing;
      default:
        return null;
    }
  }
}

/// The ONLY result shape ever surfaced to a user. Bilingual labels are computed
/// server-side from the degree so the client never derives kinship from raw
/// data.
class KinshipResult {
  const KinshipResult({
    required this.related,
    required this.labelFr,
    required this.labelEn,
    this.degree,
  });

  final bool related;

  /// Relationship degree through the global graph, or null when unrelated.
  final int? degree;
  final String labelFr;
  final String labelEn;

  factory KinshipResult.fromJson(Map<String, dynamic> json) {
    return KinshipResult(
      related: json['related'] as bool? ?? false,
      degree: (json['degree'] as num?)?.toInt(),
      labelFr: json['labelFr'] as String? ??
          json['label_fr'] as String? ??
          json['label'] as String? ??
          '',
      labelEn: json['labelEn'] as String? ??
          json['label_en'] as String? ??
          json['label'] as String? ??
          '',
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'related': related,
      'degree': degree,
      'labelFr': labelFr,
      'labelEn': labelEn,
    };
  }
}

class KinshipCheckView {
  const KinshipCheckView({
    required this.id,
    required this.status,
    required this.direction,
    required this.invitedByPhone,
    required this.createdAt,
    this.counterpartyName,
    this.expiresAt,
    this.result,
  });

  final String id;
  final KinshipCheckStatus status;
  final KinshipCheckDirection direction;

  /// Display name of the counterparty — surfaced ONLY so a target can give
  /// informed consent ("X souhaite vérifier votre lien"). Never a phone, never
  /// a tree, never a person id. Null when the target was invited by a raw phone
  /// number and has not yet resolved to an account.
  final String? counterpartyName;

  /// True when this check was opened against a phone number not yet on Origin.
  final bool invitedByPhone;
  final DateTime createdAt;
  final DateTime? expiresAt;

  /// Present ONLY once status == COMPUTED and both parties consented.
  final KinshipResult? result;

  factory KinshipCheckView.fromJson(
    Map<String, dynamic> json, {
    KinshipCheckDirection? direction,
  }) {
    final rawResult = json['result'];
    return KinshipCheckView(
      id: json['id'] as String,
      status: KinshipCheckStatus.fromWire(
        json['status'] as String?,
      ),
      direction: direction ??
          KinshipCheckDirection.fromWire(json['direction'] as String?) ??
          KinshipCheckDirection.incoming,
      counterpartyName: json['counterpartyName'] as String? ??
          json['counterparty_name'] as String?,
      invitedByPhone: json['invitedByPhone'] as bool? ??
          json['invited_by_phone'] as bool? ??
          false,
      createdAt: _parseDate(json['createdAt'] ?? json['created_at']) ??
          DateTime.now().toUtc(),
      expiresAt: _parseDate(json['expiresAt'] ?? json['expires_at']),
      result: rawResult is Map<String, dynamic>
          ? KinshipResult.fromJson(rawResult)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'status': status.wireName,
      'direction': direction.wireName,
      'counterpartyName': counterpartyName,
      'invitedByPhone': invitedByPhone,
      'createdAt': createdAt.toIso8601String(),
      'expiresAt': expiresAt?.toIso8601String(),
      'result': result?.toJson(),
    };
  }

  static DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    return DateTime.tryParse(value.toString());
  }
}

/// Caller's incoming + outgoing checks (GET /kinship-checks response).
class KinshipChecksOverview {
  const KinshipChecksOverview({
    required this.incoming,
    required this.outgoing,
  });

  final List<KinshipCheckView> incoming;
  final List<KinshipCheckView> outgoing;

  bool get isEmpty => incoming.isEmpty && outgoing.isEmpty;

  factory KinshipChecksOverview.fromJson(Map<String, dynamic> json) {
    return KinshipChecksOverview(
      incoming: _parseList(
        json['incoming'],
        KinshipCheckDirection.incoming,
      ),
      outgoing: _parseList(
        json['outgoing'],
        KinshipCheckDirection.outgoing,
      ),
    );
  }

  static List<KinshipCheckView> _parseList(
    Object? raw,
    KinshipCheckDirection direction,
  ) {
    if (raw is! List<dynamic>) return const <KinshipCheckView>[];
    return raw
        .whereType<Map<String, dynamic>>()
        .map((json) => KinshipCheckView.fromJson(json, direction: direction))
        .toList();
  }
}

/// Body for POST /kinship-checks. Exactly one of [targetPhone] / [familyCode]
/// is expected to be set.
class InitiateKinshipCheckInput {
  const InitiateKinshipCheckInput({this.targetPhone, this.familyCode});

  /// E.164 phone number of the other party (e.g. +237...).
  final String? targetPhone;

  /// Existing reusable family code identifying the other party / branch.
  final String? familyCode;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      if (targetPhone != null) 'targetPhone': targetPhone,
      if (familyCode != null) 'familyCode': familyCode,
    };
  }
}
