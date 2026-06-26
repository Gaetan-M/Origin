import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/kinship_check/domain/kinship_check.dart';
import 'package:origin_mobile/features/kinship_check/presentation/i18n/kinship_check_strings.dart';
import 'package:origin_mobile/features/kinship_check/presentation/providers/kinship_check_providers.dart';
import 'package:origin_mobile/features/kinship_check/presentation/widgets/kinship_result_card.dart';
import 'package:origin_mobile/shared/widgets/origin_button.dart';

/// A single incoming/outgoing kinship check. Shows the counterparty (name only
/// for informed consent), a status badge, the consent/decline/cancel actions
/// where applicable, and the privacy-safe result once computed.
///
/// Mirrors the row in apps/web/src/components/kinship/checks-list.tsx.
class KinshipCheckRow extends ConsumerStatefulWidget {
  const KinshipCheckRow({
    super.key,
    required this.check,
    required this.strings,
  });

  final KinshipCheckView check;
  final KinshipStrings strings;

  @override
  ConsumerState<KinshipCheckRow> createState() => _KinshipCheckRowState();
}

class _KinshipCheckRowState extends ConsumerState<KinshipCheckRow> {
  bool _busy = false;

  KinshipStrings get _s => widget.strings;
  KinshipCheckView get _check => widget.check;

  Future<void> _run(Future<bool> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    final ok = await action();
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      ScaffoldMessenger.of(context)
        ..clearSnackBars()
        ..showSnackBar(
          SnackBar(
            content: Text(_s.actionError),
            backgroundColor: OriginColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final check = _check;
    final isIncoming = check.direction == KinshipCheckDirection.incoming;
    final notifier = ref.read(kinshipChecksControllerProvider.notifier);

    final counterparty = check.counterpartyName?.isNotEmpty == true
        ? check.counterpartyName!
        : check.invitedByPhone
            ? _s.invitedByPhoneLabel
            : _s.someone;

    final showConsentActions =
        isIncoming && check.status == KinshipCheckStatus.pendingConsent;
    final showCancelAction =
        !isIncoming && check.status == KinshipCheckStatus.pendingConsent;
    final showResult =
        check.status == KinshipCheckStatus.computed && check.result != null;

    final bool usePhoneIcon =
        check.invitedByPhone && (check.counterpartyName?.isEmpty ?? true);

    return Container(
      decoration: BoxDecoration(
        color: OriginColors.offWhite,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: OriginColors.border),
      ),
      padding: const EdgeInsets.all(OriginSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Container(
                width: 38,
                height: 38,
                decoration: const BoxDecoration(
                  color: OriginColors.sand,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  usePhoneIcon ? Icons.phone_outlined : Icons.person_outline,
                  size: 18,
                  color: OriginColors.textMuted,
                ),
              ),
              const SizedBox(width: OriginSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      isIncoming ? _s.requestedBy : _s.sentTo,
                      style: OriginTextStyles.micro
                          .copyWith(color: OriginColors.textMuted),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      counterparty,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: OriginTextStyles.bodyMedium
                          .copyWith(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: OriginSpacing.sm),
              _StatusBadge(
                label: _s.statusLabel(check.status, check.direction),
                status: check.status,
              ),
            ],
          ),

          if (showConsentActions) ...<Widget>[
            const SizedBox(height: OriginSpacing.md),
            Text(
              _s.consentBody,
              style: OriginTextStyles.caption
                  .copyWith(color: OriginColors.textSecondary),
            ),
            const SizedBox(height: OriginSpacing.sm),
            Row(
              children: <Widget>[
                Expanded(
                  child: OriginButton.primary(
                    label: _busy ? _s.consenting : _s.consent,
                    isLoading: _busy,
                    onPressed: _busy
                        ? null
                        : () => _run(() => notifier.consent(check.id)),
                  ),
                ),
                const SizedBox(width: OriginSpacing.sm),
                Expanded(
                  child: OriginButton.secondary(
                    label: _s.decline,
                    onPressed: _busy
                        ? null
                        : () => _run(() => notifier.decline(check.id)),
                  ),
                ),
              ],
            ),
          ],

          if (showCancelAction) ...<Widget>[
            const SizedBox(height: OriginSpacing.sm),
            Align(
              alignment: Alignment.centerLeft,
              child: OriginButton.ghost(
                label: _s.cancel,
                icon: Icons.close_rounded,
                onPressed: _busy
                    ? null
                    : () => _run(() => notifier.cancel(check.id)),
              ),
            ),
          ],

          if (showResult) ...<Widget>[
            const SizedBox(height: OriginSpacing.md),
            KinshipResultCard(result: check.result!, strings: _s),
          ],
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.label, required this.status});

  final String label;
  final KinshipCheckStatus status;

  @override
  Widget build(BuildContext context) {
    final (Color fg, Color bg) = _colors(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(OriginRadius.full),
      ),
      child: Text(
        label,
        style: OriginTextStyles.micro.copyWith(
          color: fg,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  (Color, Color) _colors(KinshipCheckStatus status) {
    switch (status) {
      case KinshipCheckStatus.computed:
        return (OriginColors.forestGreen700, OriginColors.forestGreen50);
      case KinshipCheckStatus.consented:
        return (OriginColors.deepBlue, OriginColors.deepBlue50);
      case KinshipCheckStatus.declined:
      case KinshipCheckStatus.expired:
      case KinshipCheckStatus.cancelled:
        return (OriginColors.ash700, OriginColors.ash50);
      case KinshipCheckStatus.pendingConsent:
      case KinshipCheckStatus.unknown:
        return (OriginColors.ochre700, OriginColors.ochre50);
    }
  }
}
