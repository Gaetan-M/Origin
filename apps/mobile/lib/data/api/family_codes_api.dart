import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/family_code.dart';
import 'package:origin_mobile/data/models/family_code_use.dart';

class FamilyCodesApi {
  FamilyCodesApi(this._dio);

  final Dio _dio;

  Future<FamilyCode> create({String? label, int? maxUses}) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/family-codes',
      data: <String, dynamic>{
        if (label != null) 'label': label,
        if (maxUses != null) 'maxUses': maxUses,
      },
    );
    return FamilyCode.fromJson(res.data!);
  }

  Future<List<FamilyCode>> mine() async {
    final res = await _dio.get<List<dynamic>>('/family-codes');
    return (res.data ?? <dynamic>[])
        .map((e) => FamilyCode.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<FamilyCodeUse>> uses(String id) async {
    final res = await _dio.get<List<dynamic>>('/family-codes/$id/uses');
    return (res.data ?? <dynamic>[])
        .map((e) => FamilyCodeUse.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> delete(String id) async {
    await _dio.delete<dynamic>('/family-codes/$id');
  }

  Future<void> redeem(String code) async {
    await _dio.post<dynamic>(
      '/family-codes/redeem',
      data: <String, dynamic>{'code': code},
    );
  }
}

final Provider<FamilyCodesApi> familyCodesApiProvider =
    Provider<FamilyCodesApi>(
  (ref) => FamilyCodesApi(ref.watch(dioProvider)),
);
