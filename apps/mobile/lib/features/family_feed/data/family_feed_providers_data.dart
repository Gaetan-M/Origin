// Low-level providers for the family-feed data layer (cache DAO + viewer id).
//
// Split from the presentation providers so the repository / sync handlers can
// depend on them without pulling in any Flutter/widget code.

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/storage/app_database_provider.dart';
import 'package:origin_mobile/features/auth/presentation/providers/auth_state_provider.dart';
import 'package:origin_mobile/features/family_feed/data/family_feed_cache_dao.dart';

/// DAO over the offline feed cache tables.
final Provider<FamilyFeedCacheDao> familyFeedCacheDaoProvider =
    Provider<FamilyFeedCacheDao>(
  (ref) => FamilyFeedCacheDao(ref.watch(appDatabaseProvider)),
);

/// The currently-authenticated account id, or `null` when not signed in.
///
/// Derived from the Agent-5 [authStateProvider] (`AsyncNotifier<AuthState>`).
final Provider<String?> currentAccountIdProvider = Provider<String?>((ref) {
  final authAsync = ref.watch(authStateProvider);
  final state = authAsync.valueOrNull;
  if (state is Authenticated) {
    return state.account.id;
  }
  return null;
});

/// Whether the viewer has enabled low-data mode (text/audio first, defer media).
final Provider<bool> feedDataSaverProvider = Provider<bool>((ref) {
  final authAsync = ref.watch(authStateProvider);
  final state = authAsync.valueOrNull;
  if (state is Authenticated) {
    return state.account.dataSaverMode;
  }
  return false;
});
