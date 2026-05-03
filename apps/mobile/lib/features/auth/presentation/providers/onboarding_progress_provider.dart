import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/storage/kv_store.dart';

/// Status of one of the user's parents inside the onboarding flow.
enum ParentLifeChoice { alive, deceased, unknown }

/// Draft data captured while filling the parents step (8a/8b/8c & 9).
class ParentDraft {
  const ParentDraft({
    this.fullName,
    this.lifeChoice,
    this.deathYearApprox,
  });

  /// Empty draft used as initial state.
  static const ParentDraft empty = ParentDraft();

  final String? fullName;
  final ParentLifeChoice? lifeChoice;

  /// Approximate decade-year (e.g. 1970) when the parent passed away.
  final int? deathYearApprox;

  bool get isComplete =>
      fullName != null &&
      fullName!.trim().isNotEmpty &&
      lifeChoice != null;

  ParentDraft copyWith({
    String? fullName,
    ParentLifeChoice? lifeChoice,
    int? deathYearApprox,
    bool clearDeathYear = false,
  }) {
    return ParentDraft(
      fullName: fullName ?? this.fullName,
      lifeChoice: lifeChoice ?? this.lifeChoice,
      deathYearApprox:
          clearDeathYear ? null : (deathYearApprox ?? this.deathYearApprox),
    );
  }

  Map<String, Object?> toJson() => <String, Object?>{
        'fullName': fullName,
        'lifeChoice': lifeChoice?.name,
        'deathYearApprox': deathYearApprox,
      };

  factory ParentDraft.fromJson(Map<String, Object?> json) {
    final lifeRaw = json['lifeChoice'] as String?;
    return ParentDraft(
      fullName: json['fullName'] as String?,
      lifeChoice: lifeRaw == null
          ? null
          : ParentLifeChoice.values.firstWhere(
              (e) => e.name == lifeRaw,
              orElse: () => ParentLifeChoice.unknown,
            ),
      deathYearApprox: json['deathYearApprox'] as int?,
    );
  }
}

/// Aggregate state of the onboarding flow.
///
/// Persists to the KV store so a user who closes the app mid-flow doesn't
/// lose their data.
class OnboardingProgress {
  const OnboardingProgress({
    this.phoneNumber,
    this.otpVerified = false,
    this.fullName,
    this.photoPath,
    this.father = ParentDraft.empty,
    this.mother = ParentDraft.empty,
    this.siblingsCount = 0,
  });

  static const OnboardingProgress empty = OnboardingProgress();

  final String? phoneNumber;
  final bool otpVerified;
  final String? fullName;
  final String? photoPath;
  final ParentDraft father;
  final ParentDraft mother;
  final int siblingsCount;

  bool get hasName => fullName != null && fullName!.trim().isNotEmpty;
  bool get hasPhoto => photoPath != null && photoPath!.isNotEmpty;

  OnboardingProgress copyWith({
    String? phoneNumber,
    bool? otpVerified,
    String? fullName,
    String? photoPath,
    bool clearPhoto = false,
    ParentDraft? father,
    ParentDraft? mother,
    int? siblingsCount,
  }) {
    return OnboardingProgress(
      phoneNumber: phoneNumber ?? this.phoneNumber,
      otpVerified: otpVerified ?? this.otpVerified,
      fullName: fullName ?? this.fullName,
      photoPath: clearPhoto ? null : (photoPath ?? this.photoPath),
      father: father ?? this.father,
      mother: mother ?? this.mother,
      siblingsCount: siblingsCount ?? this.siblingsCount,
    );
  }

  Map<String, Object?> toJson() => <String, Object?>{
        'phoneNumber': phoneNumber,
        'otpVerified': otpVerified,
        'fullName': fullName,
        'photoPath': photoPath,
        'father': father.toJson(),
        'mother': mother.toJson(),
        'siblingsCount': siblingsCount,
      };

  factory OnboardingProgress.fromJson(Map<String, Object?> json) {
    return OnboardingProgress(
      phoneNumber: json['phoneNumber'] as String?,
      otpVerified: (json['otpVerified'] as bool?) ?? false,
      fullName: json['fullName'] as String?,
      photoPath: json['photoPath'] as String?,
      father: json['father'] is Map
          ? ParentDraft.fromJson(
              Map<String, Object?>.from(json['father'] as Map))
          : ParentDraft.empty,
      mother: json['mother'] is Map
          ? ParentDraft.fromJson(
              Map<String, Object?>.from(json['mother'] as Map))
          : ParentDraft.empty,
      siblingsCount: (json['siblingsCount'] as int?) ?? 0,
    );
  }
}

/// Storage key used by the KV store.
const String _kOnboardingProgressKey = 'onboarding_progress_v1';

/// Riverpod controller for the onboarding flow.
final onboardingProgressProvider =
    NotifierProvider<OnboardingProgressNotifier, OnboardingProgress>(
  OnboardingProgressNotifier.new,
);

class OnboardingProgressNotifier extends Notifier<OnboardingProgress> {
  late final KvStore _kvStore;

  @override
  OnboardingProgress build() {
    _kvStore = ref.read(kvStoreProvider);
    // Lazy hydrate — don't block app boot. Initial state is empty; the
    // welcome screen calls [hydrate] when entered.
    return OnboardingProgress.empty;
  }

  /// Loads any persisted progress from the KV store.
  Future<void> hydrate() async {
    final raw = await _kvStore.getString(_kOnboardingProgressKey);
    if (raw == null || raw.isEmpty) {
      return;
    }
    try {
      final json = Map<String, Object?>.from(
        jsonDecode(raw) as Map<dynamic, dynamic>,
      );
      state = OnboardingProgress.fromJson(json);
    } catch (_) {
      // Corrupted blob — start over.
      await _kvStore.remove(_kOnboardingProgressKey);
    }
  }

  Future<void> _persist() async {
    await _kvStore.setString(
      _kOnboardingProgressKey,
      jsonEncode(state.toJson()),
    );
  }

  // ────────────── Setters used by individual screens ──────────────

  Future<void> setPhone(String phoneE164) async {
    state = state.copyWith(phoneNumber: phoneE164);
    await _persist();
  }

  Future<void> markOtpVerified() async {
    state = state.copyWith(otpVerified: true);
    await _persist();
  }

  Future<void> setFullName(String fullName) async {
    state = state.copyWith(fullName: fullName.trim());
    await _persist();
  }

  Future<void> setPhotoPath(String? path) async {
    state = state.copyWith(
      photoPath: path,
      clearPhoto: path == null,
    );
    await _persist();
  }

  Future<void> setFather(ParentDraft draft) async {
    state = state.copyWith(father: draft);
    await _persist();
  }

  Future<void> setMother(ParentDraft draft) async {
    state = state.copyWith(mother: draft);
    await _persist();
  }

  Future<void> setSiblingsCount(int count) async {
    state = state.copyWith(siblingsCount: count.clamp(0, 30));
    await _persist();
  }

  /// Wipes the persisted progress — call this when [AuthDoneScreen] succeeds.
  Future<void> clear() async {
    state = OnboardingProgress.empty;
    await _kvStore.remove(_kOnboardingProgressKey);
  }
}
