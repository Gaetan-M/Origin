import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/invitation.dart';

class InvitationsApi {
  InvitationsApi(this._dio);

  final Dio _dio;

  Future<Invitation> create({
    String? targetPhoneNumber,
    String? targetPersonId,
    String? relationshipHint,
    String channel = 'sms',
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/invitations',
      data: <String, dynamic>{
        if (targetPhoneNumber != null) 'targetPhoneNumber': targetPhoneNumber,
        if (targetPersonId != null) 'targetPersonId': targetPersonId,
        if (relationshipHint != null) 'relationshipHint': relationshipHint,
        'channel': channel,
      },
    );
    return Invitation.fromJson(res.data!);
  }

  Future<Invitation> verify(String token) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/invitations/verify/$token',
    );
    return Invitation.fromJson(res.data!);
  }

  Future<void> consume(String token) async {
    await _dio.post<dynamic>(
      '/invitations/consume',
      data: <String, dynamic>{'token': token},
    );
  }

  Future<List<Invitation>> mine() async {
    final res = await _dio.get<List<dynamic>>('/invitations/mine');
    return (res.data ?? <dynamic>[])
        .map((e) => Invitation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> delete(String id) async {
    await _dio.delete<dynamic>('/invitations/$id');
  }
}

final Provider<InvitationsApi> invitationsApiProvider =
    Provider<InvitationsApi>(
  (ref) => InvitationsApi(ref.watch(dioProvider)),
);
