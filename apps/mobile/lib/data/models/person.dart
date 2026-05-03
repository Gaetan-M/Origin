import 'package:freezed_annotation/freezed_annotation.dart';

import 'package:origin_mobile/data/models/enums.dart';
import 'package:origin_mobile/data/models/person_name.dart';

part 'person.freezed.dart';
part 'person.g.dart';

/// Full Person mirror — pulls from `model Person` plus the related rows the
/// backend sometimes ships in the same payload (notably `names` from
/// `GET /persons/:id` and the photo URL when materialized server-side).
///
/// Many fields are nullable because individual endpoints select different
/// projections (the lightweight `findMine` excludes most metadata).
@freezed
class Person with _$Person {
  const factory Person({
    required String id,
    required String displayName,
    String? normalizedName,
    String? gender,
    @Default(LifeStatus.unknown) LifeStatus lifeStatus,
    @Default(false) bool deceasedAssumed,
    DateTime? birthDate,
    @Default(DatePrecision.unknown) DatePrecision birthDatePrecision,
    int? birthYearApproximate,
    String? birthDateText,
    DateTime? deceasedDate,
    @Default(DatePrecision.unknown) DatePrecision deceasedDatePrecision,
    int? deceasedYearApproximate,
    String? deceasedDateText,
    String? birthPlace,
    String? birthRegion,
    String? birthCountry,
    String? deceasedPlace,
    String? deceasedRegion,
    String? deceasedCountry,
    String? currentResidencePlace,
    String? currentResidenceCountry,
    String? ethnicity,
    String? villageOrigin,
    String? chefferie,
    String? biography,
    String? occupation,
    String? phoneNumber,
    String? primaryPhotoId,
    @Default(false) bool hasPhoto,
    /// URL or path to the primary photo. The backend currently exposes a
    /// streaming endpoint at `GET /media/:id/file`; consumers can build the
    /// final URL from `primaryPhotoId` when this field is null.
    String? photoUrl,
    @Default(VerificationLevel.unverified) VerificationLevel verificationLevel,
    double? confidenceScore,
    String? createdByAccountId,
    String? updatedByAccountId,
    String? claimedByAccountId,
    DateTime? claimVerifiedAt,
    @Default(false) bool isPublic,
    @Default(1) int privacyLevel,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? deletedAt,

    /// Names variants. Populated by `GET /persons/:id`, omitted on list
    /// endpoints.
    @Default(<PersonName>[]) List<PersonName> names,
  }) = _Person;

  factory Person.fromJson(Map<String, dynamic> json) =>
      _$PersonFromJson(json);
}
