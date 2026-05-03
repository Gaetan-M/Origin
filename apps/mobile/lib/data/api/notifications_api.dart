import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/notification_dto.dart';
import 'package:origin_mobile/data/models/paginated.dart';

class NotificationsApi {
  NotificationsApi(this._dio);

  final Dio _dio;

  Future<Paginated<NotificationDto>> list({
    int page = 1,
    int limit = 20,
  }) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/notifications',
      queryParameters: <String, dynamic>{'page': page, 'limit': limit},
    );
    return Paginated<NotificationDto>.fromJson(
      res.data!,
      (Object? json) =>
          NotificationDto.fromJson(json! as Map<String, dynamic>),
    );
  }

  Future<void> markRead(String id) async {
    await _dio.post<dynamic>('/notifications/$id/mark-read');
  }

  Future<void> markAllRead() async {
    await _dio.post<dynamic>('/notifications/mark-all-read');
  }

  Future<int> unreadCount() async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/notifications/unread-count',
    );
    return (res.data?['count'] as int?) ?? 0;
  }
}

final Provider<NotificationsApi> notificationsApiProvider =
    Provider<NotificationsApi>(
  (ref) => NotificationsApi(ref.watch(dioProvider)),
);
