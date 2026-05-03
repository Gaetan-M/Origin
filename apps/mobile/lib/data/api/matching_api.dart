import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/person.dart';

class MatchingApi {
  MatchingApi(this._dio);

  final Dio _dio;

  Future<List<Person>> search({
    required String query,
    Map<String, dynamic>? filters,
  }) async {
    final res = await _dio.post<List<dynamic>>(
      '/matching/search',
      data: <String, dynamic>{
        'query': query,
        if (filters != null) 'filters': filters,
      },
    );
    return (res.data ?? <dynamic>[])
        .map((e) => Person.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Person>> duplicates(String personId) async {
    final res = await _dio.get<List<dynamic>>(
      '/matching/duplicates/$personId',
    );
    return (res.data ?? <dynamic>[])
        .map((e) => Person.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Map<String, dynamic>> suggestion(String proposalId) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/matching/suggestions/$proposalId',
    );
    return res.data ?? <String, dynamic>{};
  }

  Future<void> resolve(String proposalId, {required String action}) async {
    await _dio.post<dynamic>(
      '/matching/suggestions/$proposalId/resolve',
      data: <String, dynamic>{'action': action},
    );
  }
}

final Provider<MatchingApi> matchingApiProvider =
    Provider<MatchingApi>((ref) => MatchingApi(ref.watch(dioProvider)));
