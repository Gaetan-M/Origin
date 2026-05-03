import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/family_tree.dart';
import 'package:origin_mobile/data/models/paginated.dart';
import 'package:origin_mobile/data/models/person.dart';

/// REST client for the `/persons/*` endpoints.
class PersonsApi {
  PersonsApi(this._dio);

  final Dio _dio;

  Future<Person> create(Map<String, dynamic> payload) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/persons',
      data: payload,
    );
    return Person.fromJson(res.data!);
  }

  Future<Paginated<Person>> mine({int page = 1, int limit = 20}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/persons/mine',
      queryParameters: <String, dynamic>{'page': page, 'limit': limit},
    );
    return Paginated<Person>.fromJson(
      res.data!,
      (Object? json) => Person.fromJson(json! as Map<String, dynamic>),
    );
  }

  Future<Person> getById(String id) async {
    final res = await _dio.get<Map<String, dynamic>>('/persons/$id');
    return Person.fromJson(res.data!);
  }

  Future<Person> patch(String id, Map<String, dynamic> payload) async {
    final res = await _dio.patch<Map<String, dynamic>>(
      '/persons/$id',
      data: payload,
    );
    return Person.fromJson(res.data!);
  }

  Future<void> delete(String id) async {
    await _dio.delete<dynamic>('/persons/$id');
  }

  Future<FamilyTree> getFamilyTree(String id, {int degrees = 2}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/persons/$id/family-tree',
      queryParameters: <String, dynamic>{'degrees': degrees},
    );
    return FamilyTree.fromJson(res.data!);
  }
}

final Provider<PersonsApi> personsApiProvider =
    Provider<PersonsApi>((ref) => PersonsApi(ref.watch(dioProvider)));
