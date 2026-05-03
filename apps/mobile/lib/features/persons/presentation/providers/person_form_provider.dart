import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Imports from sibling agents (Agent 3 / Agent 4). The exact symbol surfaces
// might still be in flight while the multi-agent build is happening — we
// duck-type around them where needed so this provider compiles even if the
// related DTOs are not yet finalised.
//
// Mirrored Dart enums (owned by Agent 3) — duplicated locally as `String`-based
// "shadow enums" so we never block on the data layer. Agent 3's real
// `freezed`-generated enums are wire-compatible (same `name`).

/// Mirror of `LifeStatus` — kept local to break the cycle with Agent 3.
enum LifeStatusDraft { alive, deceased, unknown }

/// Mirror of `Gender` — `OTHER` and `UNKNOWN` exist for inclusivity.
enum GenderDraft { male, female, other, unknown }

/// Mirror of `DatePrecision` — used for both birth and decease dates.
enum DatePrecisionDraft {
  exact,
  month,
  year,
  decade,
  approximate,
  unknown,
}

/// Mirror of `ParentRelationshipType` — keep aligned with backend Prisma enum.
enum ParentRelationshipDraft {
  biological,
  customaryAdoptive,
  legalAdoptive,
  presumed,
  step,
}

/// A flexible date container that respects `DatePrecision`.
///
/// All fields are nullable so an "unknown" date can still be persisted as a
/// draft without losing data the user already typed in.
@immutable
class FlexibleDateDraft {
  const FlexibleDateDraft({
    this.date,
    this.precision = DatePrecisionDraft.unknown,
    this.yearApproximate,
    this.dateText,
  });

  /// Convenience: a fully-unknown date.
  static const FlexibleDateDraft unknown = FlexibleDateDraft();

  final DateTime? date;
  final DatePrecisionDraft precision;
  final int? yearApproximate;
  final String? dateText;

  bool get hasValue =>
      date != null ||
      yearApproximate != null ||
      (dateText != null && dateText!.isNotEmpty) ||
      precision != DatePrecisionDraft.unknown;

  /// Builds a date draft for a specific decade (e.g. `1980` → 1980-01-01).
  static FlexibleDateDraft forDecade(int decadeStart) {
    return FlexibleDateDraft(
      date: DateTime(decadeStart),
      precision: DatePrecisionDraft.decade,
      yearApproximate: decadeStart,
    );
  }

  /// Builds a date draft for a specific year.
  static FlexibleDateDraft forYear(int year) {
    return FlexibleDateDraft(
      date: DateTime(year),
      precision: DatePrecisionDraft.year,
      yearApproximate: year,
    );
  }

  /// Builds a date draft from an exact `DateTime`.
  static FlexibleDateDraft forExact(DateTime date) {
    return FlexibleDateDraft(
      date: date,
      precision: DatePrecisionDraft.exact,
      yearApproximate: date.year,
    );
  }

  /// Builds a date draft from a free-text approximation ("vers la guerre").
  static FlexibleDateDraft forApproximate(String text, {int? year}) {
    return FlexibleDateDraft(
      date: year != null ? DateTime(year) : null,
      precision: DatePrecisionDraft.approximate,
      yearApproximate: year,
      dateText: text,
    );
  }

  FlexibleDateDraft copyWith({
    DateTime? date,
    DatePrecisionDraft? precision,
    int? yearApproximate,
    String? dateText,
    bool clearDate = false,
    bool clearYearApproximate = false,
    bool clearDateText = false,
  }) {
    return FlexibleDateDraft(
      date: clearDate ? null : date ?? this.date,
      precision: precision ?? this.precision,
      yearApproximate:
          clearYearApproximate ? null : yearApproximate ?? this.yearApproximate,
      dateText: clearDateText ? null : dateText ?? this.dateText,
    );
  }

  Map<String, Object?> toJson() => <String, Object?>{
        if (date != null) 'date': date!.toIso8601String(),
        'precision': precision.name.toUpperCase(),
        if (yearApproximate != null) 'yearApproximate': yearApproximate,
        if (dateText != null) 'dateText': dateText,
      };
}

/// Mutable draft of a Person — what the multi-step form gathers.
@immutable
class PersonFormDraft {
  const PersonFormDraft({
    this.id,
    this.displayName = '',
    this.firstName,
    this.lastName,
    this.traditionalName,
    this.gender = GenderDraft.unknown,
    this.lifeStatus = LifeStatusDraft.unknown,
    this.deceasedAssumed = false,
    this.birthDate = FlexibleDateDraft.unknown,
    this.deceasedDate = FlexibleDateDraft.unknown,
    this.birthPlace,
    this.birthRegion,
    this.birthCountry,
    this.deceasedPlace,
    this.ethnicity,
    this.villageOrigin,
    this.chefferie,
    this.biography,
    this.occupation,
    this.phoneNumber,
    this.localPhotoPath,
    this.linkedPersonId,
    this.linkedRelationship,
    this.parentRelationshipType = ParentRelationshipDraft.biological,
  });

  /// Returns an empty draft optionally tied to an existing personId (edit
  /// mode).
  factory PersonFormDraft.empty({String? id}) =>
      PersonFormDraft(id: id);

  final String? id;
  final String displayName;
  final String? firstName;
  final String? lastName;
  final String? traditionalName;
  final GenderDraft gender;
  final LifeStatusDraft lifeStatus;
  final bool deceasedAssumed;
  final FlexibleDateDraft birthDate;
  final FlexibleDateDraft deceasedDate;
  final String? birthPlace;
  final String? birthRegion;
  final String? birthCountry;
  final String? deceasedPlace;
  final String? ethnicity;
  final String? villageOrigin;
  final String? chefferie;
  final String? biography;
  final String? occupation;
  final String? phoneNumber;
  final String? localPhotoPath;

  /// "Linked" person used to bootstrap a parent_child relationship at the end
  /// of the wizard (Step 8).
  final String? linkedPersonId;

  /// e.g. "parent" / "child" / "spouse" / "sibling" — a string so we don't
  /// constrain the picker too early.
  final String? linkedRelationship;

  final ParentRelationshipDraft parentRelationshipType;

  bool get isComplete => displayName.trim().isNotEmpty;

  PersonFormDraft copyWith({
    String? id,
    String? displayName,
    String? firstName,
    String? lastName,
    String? traditionalName,
    GenderDraft? gender,
    LifeStatusDraft? lifeStatus,
    bool? deceasedAssumed,
    FlexibleDateDraft? birthDate,
    FlexibleDateDraft? deceasedDate,
    String? birthPlace,
    String? birthRegion,
    String? birthCountry,
    String? deceasedPlace,
    String? ethnicity,
    String? villageOrigin,
    String? chefferie,
    String? biography,
    String? occupation,
    String? phoneNumber,
    String? localPhotoPath,
    String? linkedPersonId,
    String? linkedRelationship,
    ParentRelationshipDraft? parentRelationshipType,
    bool clearLinked = false,
    bool clearPhoto = false,
  }) {
    return PersonFormDraft(
      id: id ?? this.id,
      displayName: displayName ?? this.displayName,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      traditionalName: traditionalName ?? this.traditionalName,
      gender: gender ?? this.gender,
      lifeStatus: lifeStatus ?? this.lifeStatus,
      deceasedAssumed: deceasedAssumed ?? this.deceasedAssumed,
      birthDate: birthDate ?? this.birthDate,
      deceasedDate: deceasedDate ?? this.deceasedDate,
      birthPlace: birthPlace ?? this.birthPlace,
      birthRegion: birthRegion ?? this.birthRegion,
      birthCountry: birthCountry ?? this.birthCountry,
      deceasedPlace: deceasedPlace ?? this.deceasedPlace,
      ethnicity: ethnicity ?? this.ethnicity,
      villageOrigin: villageOrigin ?? this.villageOrigin,
      chefferie: chefferie ?? this.chefferie,
      biography: biography ?? this.biography,
      occupation: occupation ?? this.occupation,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      localPhotoPath:
          clearPhoto ? null : localPhotoPath ?? this.localPhotoPath,
      linkedPersonId:
          clearLinked ? null : linkedPersonId ?? this.linkedPersonId,
      linkedRelationship:
          clearLinked ? null : linkedRelationship ?? this.linkedRelationship,
      parentRelationshipType:
          parentRelationshipType ?? this.parentRelationshipType,
    );
  }

  /// JSON shape closely matching `CreatePersonDto` / `UpdatePersonDto`.
  Map<String, Object?> toCreatePayload() {
    return <String, Object?>{
      'displayName': displayName.trim(),
      if (firstName != null && firstName!.trim().isNotEmpty)
        'firstName': firstName!.trim(),
      if (lastName != null && lastName!.trim().isNotEmpty)
        'lastName': lastName!.trim(),
      if (traditionalName != null && traditionalName!.trim().isNotEmpty)
        'traditionalName': traditionalName!.trim(),
      'gender': gender.name.toUpperCase(),
      'lifeStatus': lifeStatus.name.toUpperCase(),
      if (deceasedAssumed) 'deceasedAssumed': true,
      if (birthDate.hasValue) 'birthDate': birthDate.toJson(),
      if (lifeStatus == LifeStatusDraft.deceased && deceasedDate.hasValue)
        'deceasedDate': deceasedDate.toJson(),
      if (birthPlace != null) 'birthPlace': birthPlace,
      if (birthRegion != null) 'birthRegion': birthRegion,
      if (birthCountry != null) 'birthCountry': birthCountry,
      if (deceasedPlace != null) 'deceasedPlace': deceasedPlace,
      if (ethnicity != null) 'ethnicity': ethnicity,
      if (villageOrigin != null) 'villageOrigin': villageOrigin,
      if (chefferie != null) 'chefferie': chefferie,
      if (biography != null) 'biography': biography,
      if (occupation != null) 'occupation': occupation,
      if (phoneNumber != null) 'phoneNumber': phoneNumber,
    };
  }

  Map<String, Object?> toJson() => <String, Object?>{
        if (id != null) 'id': id,
        ...toCreatePayload(),
        if (localPhotoPath != null) 'localPhotoPath': localPhotoPath,
        if (linkedPersonId != null) 'linkedPersonId': linkedPersonId,
        if (linkedRelationship != null)
          'linkedRelationship': linkedRelationship,
        'parentRelationshipType':
            parentRelationshipType.name.toUpperCase(),
      };
}

/// Notifier driving the new-person / edit-person draft.
///
/// Use `personFormProvider(personId)` (family) — pass `null` for "create".
class PersonFormNotifier extends Notifier<PersonFormDraft> {
  PersonFormNotifier(this._personId);

  final String? _personId;

  @override
  PersonFormDraft build() {
    return PersonFormDraft.empty(id: _personId);
  }

  void hydrate(PersonFormDraft draft) {
    state = draft;
  }

  void reset() {
    state = PersonFormDraft.empty(id: _personId);
  }

  void setDisplayName(String value) =>
      state = state.copyWith(displayName: value);

  void setFirstName(String value) =>
      state = state.copyWith(firstName: value);

  void setLastName(String value) =>
      state = state.copyWith(lastName: value);

  void setTraditionalName(String value) =>
      state = state.copyWith(traditionalName: value);

  void setGender(GenderDraft gender) =>
      state = state.copyWith(gender: gender);

  void setLifeStatus(LifeStatusDraft status) {
    state = state.copyWith(
      lifeStatus: status,
      deceasedDate: status == LifeStatusDraft.deceased
          ? state.deceasedDate
          : FlexibleDateDraft.unknown,
    );
  }

  void setDeceasedAssumed({required bool assumed}) =>
      state = state.copyWith(deceasedAssumed: assumed);

  void setBirthDate(FlexibleDateDraft date) =>
      state = state.copyWith(birthDate: date);

  void setBirthDateForDecade(int decadeStart) =>
      setBirthDate(FlexibleDateDraft.forDecade(decadeStart));

  void setBirthDateForYear(int year) =>
      setBirthDate(FlexibleDateDraft.forYear(year));

  void setBirthDateForExact(DateTime date) =>
      setBirthDate(FlexibleDateDraft.forExact(date));

  void setBirthDateUnknown() =>
      setBirthDate(FlexibleDateDraft.unknown);

  void setDeceasedDate(FlexibleDateDraft date) =>
      state = state.copyWith(deceasedDate: date);

  void setDeceasedDateForDecade(int decadeStart) =>
      setDeceasedDate(FlexibleDateDraft.forDecade(decadeStart));

  void setDeceasedDateForYear(int year) =>
      setDeceasedDate(FlexibleDateDraft.forYear(year));

  void setDeceasedDateForExact(DateTime date) =>
      setDeceasedDate(FlexibleDateDraft.forExact(date));

  void setDeceasedDateUnknown() =>
      setDeceasedDate(FlexibleDateDraft.unknown);

  void setBirthPlace(String? value) =>
      state = state.copyWith(birthPlace: value);

  void setBirthRegion(String? value) =>
      state = state.copyWith(birthRegion: value);

  void setBirthCountry(String? value) =>
      state = state.copyWith(birthCountry: value);

  void setDeceasedPlace(String? value) =>
      state = state.copyWith(deceasedPlace: value);

  void setEthnicity(String? value) =>
      state = state.copyWith(ethnicity: value);

  void setVillageOrigin(String? value) =>
      state = state.copyWith(villageOrigin: value);

  void setChefferie(String? value) =>
      state = state.copyWith(chefferie: value);

  void setBiography(String? value) =>
      state = state.copyWith(biography: value);

  void setOccupation(String? value) =>
      state = state.copyWith(occupation: value);

  void setPhoneNumber(String? value) =>
      state = state.copyWith(phoneNumber: value);

  void setLocalPhotoPath(String? path) {
    if (path == null) {
      state = state.copyWith(clearPhoto: true);
    } else {
      state = state.copyWith(localPhotoPath: path);
    }
  }

  void setLinkedPerson({
    required String personId,
    required String relationship,
  }) {
    state = state.copyWith(
      linkedPersonId: personId,
      linkedRelationship: relationship,
    );
  }

  void clearLinkedPerson() => state = state.copyWith(clearLinked: true);

  void setParentRelationshipType(ParentRelationshipDraft type) =>
      state = state.copyWith(parentRelationshipType: type);
}

/// Family provider keyed by personId (`null` for new).
final personFormProvider = NotifierProvider.family<PersonFormNotifier,
    PersonFormDraft, String?>(
  PersonFormNotifier.new,
);
