import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/parent_child.dart';
import 'package:origin_mobile/data/models/person.dart';
import 'package:origin_mobile/data/models/union.dart';

class RelationshipsApi {
  RelationshipsApi(this._dio);

  final Dio _dio;

  Future<ParentChild> createParentChild(Map<String, dynamic> body) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/relationships/parent-child',
      data: body,
    );
    return ParentChild.fromJson(res.data!);
  }

  Future<void> deleteParentChild(String id) async {
    await _dio.delete<dynamic>('/relationships/parent-child/$id');
  }

  Future<Union> createUnion(Map<String, dynamic> body) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/relationships/unions',
      data: body,
    );
    return Union.fromJson(res.data!);
  }

  Future<Union> patchUnion(String id, Map<String, dynamic> body) async {
    final res = await _dio.patch<Map<String, dynamic>>(
      '/relationships/unions/$id',
      data: body,
    );
    return Union.fromJson(res.data!);
  }

  Future<void> deleteUnion(String id) async {
    await _dio.delete<dynamic>('/relationships/unions/$id');
  }

  Future<List<Person>> parentsOf(String personId) =>
      _personList('/relationships/parents/$personId');
  Future<List<Person>> childrenOf(String personId) =>
      _personList('/relationships/children/$personId');
  Future<List<Person>> siblingsOf(String personId) =>
      _personList('/relationships/siblings/$personId');
  Future<List<Person>> spousesOf(String personId) =>
      _personList('/relationships/spouses/$personId');

  Future<List<Union>> allUnionsOf(String personId) async {
    final res = await _dio.get<List<dynamic>>(
      '/relationships/all-unions/$personId',
    );
    return (res.data ?? <dynamic>[])
        .map((e) => Union.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Person>> _personList(String path) async {
    final res = await _dio.get<List<dynamic>>(path);
    return (res.data ?? <dynamic>[])
        .map((e) => Person.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

final Provider<RelationshipsApi> relationshipsApiProvider =
    Provider<RelationshipsApi>(
  (ref) => RelationshipsApi(ref.watch(dioProvider)),
);
