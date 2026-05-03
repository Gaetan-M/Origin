import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';

class KinshipProbeApi {
  KinshipProbeApi(this._dio);

  final Dio _dio;

  Future<Map<String, dynamic>> send({
    required String targetAccountId,
    String? suggestedRelationship,
    String? notes,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/kinship-probe',
      data: <String, dynamic>{
        'targetAccountId': targetAccountId,
        if (suggestedRelationship != null)
          'suggestedRelationship': suggestedRelationship,
        if (notes != null) 'notes': notes,
      },
    );
    return res.data ?? <String, dynamic>{};
  }

  Future<List<Map<String, dynamic>>> incoming(String requesterAccountId) async {
    final res = await _dio.get<List<dynamic>>(
      '/kinship-probe/incoming/$requesterAccountId',
    );
    return (res.data ?? <dynamic>[])
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }
}

final Provider<KinshipProbeApi> kinshipProbeApiProvider =
    Provider<KinshipProbeApi>(
  (ref) => KinshipProbeApi(ref.watch(dioProvider)),
);
