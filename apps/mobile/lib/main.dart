import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:logger/logger.dart';

import 'package:origin_mobile/app.dart';
import 'package:origin_mobile/core/config/env.dart';

/// Application logger. Other modules should depend on this via DI; we keep
/// it as a top-level constant to make bootstrap-time logging trivial.
final Logger appLogger = Logger(
  level: Env.enableLogging ? Level.debug : Level.warning,
  filter: ProductionFilter(),
  printer: PrettyPrinter(
    methodCount: 0,
    errorMethodCount: 8,
    lineLength: 100,
    printEmojis: false,
    printTime: true,
  ),
);

Future<void> main() async {
  await runZonedGuarded<Future<void>>(
    () async {
      WidgetsFlutterBinding.ensureInitialized();

      // Surface uncaught Flutter framework errors through the logger.
      FlutterError.onError = (details) {
        FlutterError.presentError(details);
        appLogger.e(
          'FlutterError',
          error: details.exception,
          stackTrace: details.stack,
        );
      };

      // Handle errors raised outside the Flutter framework.
      PlatformDispatcher.instance.onError = (error, stack) {
        appLogger.e('PlatformError', error: error, stackTrace: stack);
        return true;
      };

      appLogger.i('Booting ${Env.appName} ${Env.appVersion}');

      runApp(
        const ProviderScope(
          child: OriginApp(),
        ),
      );
    },
    (error, stack) {
      appLogger.f('Uncaught zone error', error: error, stackTrace: stack);
    },
  );
}
