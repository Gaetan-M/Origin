import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/config/env.dart';
import 'package:origin_mobile/core/routing/app_router.dart';

// Theme & localizations — provided by Agent 2. See SHARED_CONTEXT.md.
import 'package:origin_mobile/core/localization/app_localizations.dart';
import 'package:origin_mobile/core/theme/app_theme.dart';

// Locale settings — provided by Agent 5.
import 'package:origin_mobile/features/settings/presentation/providers/locale_provider.dart';

/// Root widget of the Origin mobile application.
///
/// Owns the [MaterialApp.router] hookup and wires:
///   - the GoRouter from [appRouterProvider] (Agent 1)
///   - the light/dark themes from [lightTheme] / [darkTheme] (Agent 2)
///   - generated localisations from [AppLocalizations] (Agent 2)
///   - the user-selected [Locale] from [localeProvider] (Agent 5)
class OriginApp extends ConsumerWidget {
  const OriginApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final locale = ref.watch(localeProvider);

    return MaterialApp.router(
      title: Env.appName,
      debugShowCheckedModeBanner: false,
      theme: lightTheme,
      darkTheme: darkTheme,
      themeMode: ThemeMode.light,
      routerConfig: router,
      locale: locale ?? const Locale('fr'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
    );
  }
}
