import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/claim.dart';

class ClaimsApi {
  ClaimsApi(this._dio);

  final Dio _dio;

  Future<Claim> create({required String personId, String? evidence}) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/claims',
      data: <String, dynamic>{
        'personId': personId,
        if (evidence != null) 'evidence': evidence,
      },
    );
    return Claim.fromJson(res.data!);
  }

  Future<void> validate(String id) async {
    await _dio.post<dynamic>('/claims/$id/validate');
  }

  Future<void> dispute(String id, String reason) async {
    await _dio.post<dynamic>(
      '/claims/$id/dispute',
      data: <String, dynamic>{'reason': reason},
    );
  }

  Future<List<Claim>> pending() async {
    final res = await _dio.get<List<dynamic>>('/claims/pending');
    return (res.data ?? <dynamic>[])
        .map((e) => Claim.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Claim>> mine() async {
    final res = await _dio.get<List<dynamic>>('/claims/mine');
    return (res.data ?? <dynamic>[])
        .map((e) => Claim.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> cancel(String id) async {
    await _dio.delete<dynamic>('/claims/$id');
  }
}

final Provider<ClaimsApi> claimsApiProvider =
    Provider<ClaimsApi>((ref) => ClaimsApi(ref.watch(dioProvider)));
