import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/storage/kv_store.dart';

const String _kLocaleKey = 'app_locale_v1';

/// Notifier persisting the user's preferred [Locale] in the local KV store.
class LocaleNotifier extends Notifier<Locale?> {
  @override
  Locale? build() {
    // Hydrate asynchronously — UI rebuilds when [_load] completes.
    Future.microtask(_load);
    return null;
  }

  Future<void> _load() async {
    final kv = ref.read(kvStoreProvider);
    final raw = await kv.getString(_kLocaleKey);
    if (raw == null || raw.isEmpty) return;
    state = Locale(raw);
  }

  Future<void> setLocale(Locale locale) async {
    state = locale;
    await ref.read(kvStoreProvider).setString(_kLocaleKey, locale.languageCode);
  }

  Future<void> clear() async {
    state = null;
    await ref.read(kvStoreProvider).remove(_kLocaleKey);
  }
}

final NotifierProvider<LocaleNotifier, Locale?> localeProvider =
    NotifierProvider<LocaleNotifier, Locale?>(LocaleNotifier.new);
