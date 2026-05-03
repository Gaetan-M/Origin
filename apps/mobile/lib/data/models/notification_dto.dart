import 'package:freezed_annotation/freezed_annotation.dart';

import 'package:origin_mobile/data/models/enums.dart';

part 'notification_dto.freezed.dart';
part 'notification_dto.g.dart';

/// Mirror of `model Notification`.
///
/// Named with the `Dto` suffix to avoid collisions with the
/// `dart:ui` / Flutter `Notification` class commonly imported by widgets.
@freezed
class NotificationDto with _$NotificationDto {
  const factory NotificationDto({
    required String id,
    required String accountId,
    required NotificationType notificationType,
    required String title,
    String? body,
    String? relatedEntityType,
    String? relatedEntityId,
    String? actionUrl,
    @Default(<String>['push']) List<String> channels,
    DateTime? sentAt,
    @Default(false) bool isRead,
    DateTime? readAt,
    DateTime? createdAt,
  }) = _NotificationDto;

  factory NotificationDto.fromJson(Map<String, dynamic> json) =>
      _$NotificationDtoFromJson(json);
}

@freezed
class UnreadCountResponse with _$UnreadCountResponse {
  const factory UnreadCountResponse({required int count}) = _UnreadCountResponse;

  factory UnreadCountResponse.fromJson(Map<String, dynamic> json) =>
      _$UnreadCountResponseFromJson(json);
}
