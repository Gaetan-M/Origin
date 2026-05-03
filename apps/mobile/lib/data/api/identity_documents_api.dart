import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/identity_document.dart';

class IdentityDocumentsApi {
  IdentityDocumentsApi(this._dio);

  final Dio _dio;

  Future<IdentityDocument> create(Map<String, dynamic> payload) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/identity-documents',
      data: payload,
    );
    return IdentityDocument.fromJson(res.data!);
  }

  Future<List<IdentityDocument>> forPerson(String personId) async {
    final res = await _dio.get<List<dynamic>>(
      '/identity-documents/person/$personId',
    );
    return (res.data ?? <dynamic>[])
        .map((e) => IdentityDocument.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<String> reveal(String id) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/identity-documents/$id/reveal',
    );
    return (res.data?['number'] as String?) ?? '';
  }

  Future<void> delete(String id) async {
    await _dio.delete<dynamic>('/identity-documents/$id');
  }
}

final Provider<IdentityDocumentsApi> identityDocumentsApiProvider =
    Provider<IdentityDocumentsApi>(
  (ref) => IdentityDocumentsApi(ref.watch(dioProvider)),
);
