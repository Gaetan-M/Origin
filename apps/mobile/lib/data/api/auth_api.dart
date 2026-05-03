import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/network/dio_client.dart';
import 'package:origin_mobile/data/models/account.dart';
import 'package:origin_mobile/data/models/enums.dart';

/// DTO returned by `POST /auth/otp/verify`.
class VerifyOtpResult {
  const VerifyOtpResult({
    required this.accessToken,
    required this.refreshToken,
    required this.account,
  });

  factory VerifyOtpResult.fromJson(Map<String, dynamic> json) {
    return VerifyOtpResult(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      account: Account.fromJson(json['account'] as Map<String, dynamic>),
    );
  }

  final String accessToken;
  final String refreshToken;
  final Account account;
}

/// REST client for the `/auth/*` endpoints.
class AuthApi {
  AuthApi(this._dio);

  final Dio _dio;

  Future<void> requestOtp({
    required String phoneNumber,
    required OtpChannel channel,
  }) async {
    await _dio.post<dynamic>(
      '/auth/otp/request',
      data: <String, dynamic>{
        'phoneNumber': phoneNumber,
        'channel': channel.name.toUpperCase(),
      },
    );
  }

  Future<VerifyOtpResult> verifyOtp({
    required String phoneNumber,
    required String code,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/auth/otp/verify',
      data: <String, dynamic>{
        'phoneNumber': phoneNumber,
        'code': code,
      },
    );
    return VerifyOtpResult.fromJson(res.data!);
  }

  Future<void> logout() async {
    await _dio.post<dynamic>('/auth/logout');
  }

  Future<Account> me() async {
    final res = await _dio.get<Map<String, dynamic>>('/auth/me');
    return Account.fromJson(res.data!);
  }
}

final Provider<AuthApi> authApiProvider =
    Provider<AuthApi>((ref) => AuthApi(ref.watch(dioProvider)));
