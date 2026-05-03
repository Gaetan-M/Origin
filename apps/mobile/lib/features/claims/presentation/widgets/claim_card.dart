import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/data/models/claim.dart';

class ClaimCard extends StatelessWidget {
  const ClaimCard({super.key, required this.claim, this.onTap});

  final Claim claim;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: OriginColors.offWhite,
      borderRadius: BorderRadius.circular(OriginRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: <Widget>[
              const Icon(
                Icons.handshake_outlined,
                color: OriginColors.terracotta,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Demande sur ${claim.personId}',
                  style: OriginTextStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Icon(
                Icons.chevron_right,
                color: OriginColors.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
