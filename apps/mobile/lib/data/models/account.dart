import 'package:freezed_annotation/freezed_annotation.dart';

import 'package:origin_mobile/data/models/enums.dart';

part 'account.freezed.dart';
part 'account.g.dart';

/// Authenticated account — mirrors `model Account` (subset exposed by
/// `GET /accounts/me` and `GET /auth/me`).
///
/// Sensitive columns (`pinHash`, `bannedReason`, …) are intentionally not
/// reflected here.
@freezed
class Account with _$Account {
  const factory Account({
    required String id,
    required String phoneNumber,
    String? phoneCountryCode,
    String? phoneOperator,
    @Default(false) bool pinEnabled,
    @Default('fr') String languagePreference,
    @Default(false) bool dataSaverMode,
    @Default(false) bool largeTextMode,
    String? email,
    @Default(true) bool whatsappEnabled,
    @Default(true) bool isActive,
    AccountRole? role,
    String? fullName,
    DateTime? lastLoginAt,
    required DateTime createdAt,
    DateTime? updatedAt,
  }) = _Account;

  factory Account.fromJson(Map<String, dynamic> json) =>
      _$AccountFromJson(json);
}
