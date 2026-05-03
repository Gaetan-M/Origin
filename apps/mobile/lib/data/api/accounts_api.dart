import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/account.dart';

class AccountsApi {
  AccountsApi(this._dio);

  final Dio _dio;

  Future<Account> me() async {
    final res = await _dio.get<Map<String, dynamic>>('/accounts/me');
    return Account.fromJson(res.data!);
  }

  Future<Account> updateMe(Map<String, dynamic> payload) async {
    final res = await _dio.patch<Map<String, dynamic>>(
      '/accounts/me',
      data: payload,
    );
    return Account.fromJson(res.data!);
  }

  Future<void> setPin(String pin) async {
    await _dio.post<dynamic>(
      '/accounts/me/pin',
      data: <String, dynamic>{'pin': pin},
    );
  }

  Future<void> clearPin() async {
    await _dio.delete<dynamic>('/accounts/me/pin');
  }

  Future<void> deleteMe() async {
    await _dio.delete<dynamic>('/accounts/me');
  }

  Future<Map<String, dynamic>> stats() async {
    final res = await _dio.get<Map<String, dynamic>>('/accounts/me/stats');
    return res.data ?? <String, dynamic>{};
  }
}

final Provider<AccountsApi> accountsApiProvider =
    Provider<AccountsApi>((ref) => AccountsApi(ref.watch(dioProvider)));
