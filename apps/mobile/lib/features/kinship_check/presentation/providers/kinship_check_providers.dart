// Riverpod providers driving the "Sommes-nous parents ?" UI.
//
// This is an ONLINE-FIRST feature (no Drift cache): a single [AsyncNotifier]
// owns the incoming/outgoing overview, and the mutating actions (initiate,
// consent, decline, cancel) write through the API then re-fetch the overview so
// every row reflects the authoritative server state (incl. the privacy-safe
// computed result).
//
// Manual providers only — no @riverpod codegen.

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/features/kinship_check/data/kinship_check_api.dart';
import 'package:origin_mobile/features/kinship_check/domain/kinship_check.dart';

final AsyncNotifierProvider<KinshipChecksController, KinshipChecksOverview>
    kinshipChecksControllerProvider =
    AsyncNotifierProvider<KinshipChecksController, KinshipChecksOverview>(
  KinshipChecksController.new,
);

class KinshipChecksController extends AsyncNotifier<KinshipChecksOverview> {
  KinshipCheckApi get _api => ref.read(kinshipCheckApiProvider);

  @override
  Future<KinshipChecksOverview> build() => _api.getChecks();

  /// Re-fetches both lists, keeping the previous data visible while loading.
  Future<void> refresh() async {
    state = const AsyncValue<KinshipChecksOverview>.loading()
        .copyWithPrevious(state);
    state = await AsyncValue.guard(_api.getChecks);
  }

  /// Opens a new check by phone or family code. Returns true on success so the
  /// caller can surface a confirmation toast and reset its form.
  Future<bool> initiate(InitiateKinshipCheckInput input) async {
    try {
      await _api.initiate(input);
      await refresh();
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Target grants consent — the server computes the result after this call.
  Future<bool> consent(String id) => _runAndRefresh(() => _api.consent(id));

  /// Target declines — no computation occurs.
  Future<bool> decline(String id) => _runAndRefresh(() => _api.decline(id));

  /// Requester withdraws an outgoing check.
  Future<bool> cancel(String id) => _runAndRefresh(() => _api.cancel(id));

  Future<bool> _runAndRefresh(
    Future<KinshipCheckView> Function() action,
  ) async {
    try {
      await action();
      await refresh();
      return true;
    } catch (_) {
      return false;
    }
  }
}
