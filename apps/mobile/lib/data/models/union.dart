import 'package:freezed_annotation/freezed_annotation.dart';

import 'package:origin_mobile/data/models/enums.dart';
import 'package:origin_mobile/data/models/union_partner.dart';

part 'union.freezed.dart';
part 'union.g.dart';

/// Mirror of `model Union` — declared marriage / equivalent partnership
/// between two or more persons.
@freezed
class Union with _$Union {
  const factory Union({
    required String id,
    @Default(UnionType.unknown) UnionType unionType,
    @Default(UnionStatus.unknown) UnionStatus status,
    DateTime? startDate,
    @Default(DatePrecision.unknown) DatePrecision startDatePrecision,
    int? startYearApproximate,
    String? startDateText,
    DateTime? endDate,
    @Default(DatePrecision.unknown) DatePrecision endDatePrecision,
    int? endYearApproximate,
    String? endReason,
    String? place,
    String? notes,
    String? createdByAccountId,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? deletedAt,
    @Default(<UnionPartner>[]) List<UnionPartner> partners,
  }) = _Union;

  factory Union.fromJson(Map<String, dynamic> json) => _$UnionFromJson(json);
}
