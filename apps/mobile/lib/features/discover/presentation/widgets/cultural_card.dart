import 'package:flutter/material.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/discover/domain/cultural_content_item.dart';
import 'package:origin_mobile/features/discover/domain/cultural_enums.dart';
import 'package:origin_mobile/features/discover/presentation/i18n/discover_strings.dart';

/// Visual treatment (icon + accent colours) for a content type.
class _TypeMeta {
  const _TypeMeta(this.icon, this.background, this.foreground);
  final IconData icon;
  final Color background;
  final Color foreground;
}

_TypeMeta _typeMeta(CulturalContentType type) {
  switch (type) {
    case CulturalContentType.language:
      return const _TypeMeta(
          Icons.translate, OriginColors.forestGreen50, OriginColors.forestGreen);
    case CulturalContentType.recipe:
      return const _TypeMeta(
          Icons.restaurant_menu, OriginColors.ochre50, OriginColors.ochreDark);
    case CulturalContentType.tale:
      return const _TypeMeta(
          Icons.auto_stories, OriginColors.terracotta50, OriginColors.terracotta);
    case CulturalContentType.proverb:
      return const _TypeMeta(
          Icons.format_quote, OriginColors.forestGreen50, OriginColors.forestGreen);
    case CulturalContentType.rite:
      return const _TypeMeta(
          Icons.auto_awesome, OriginColors.ochre50, OriginColors.ochreDark);
    case CulturalContentType.custom:
      return const _TypeMeta(
          Icons.account_balance, OriginColors.ash50, OriginColors.ash700);
    case CulturalContentType.music:
      return const _TypeMeta(
          Icons.music_note, OriginColors.terracotta50, OriginColors.terracotta);
    case CulturalContentType.other:
      return const _TypeMeta(
          Icons.local_offer_outlined, OriginColors.sand, OriginColors.textSecondary);
  }
}

const int _bodyPreviewLimit = 280;

/// A single cultural-heritage card in the discovery feed.
///
/// Shows the content-type accent, a "Vérifié" authority badge when the content
/// comes from a verified cultural authority, the title, an expandable body
/// preview, and meta facet chips (language / ethnic group / region).
class CulturalCard extends StatefulWidget {
  const CulturalCard({
    super.key,
    required this.item,
    required this.strings,
  });

  final CulturalContentItem item;
  final DiscoverStrings strings;

  @override
  State<CulturalCard> createState() => _CulturalCardState();
}

class _CulturalCardState extends State<CulturalCard> {
  bool _expanded = false;

  static const List<String> _monthsFr = <String>[
    'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
  ];
  static const List<String> _monthsEn = <String>[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  String _formatDate(DateTime date, bool isFr) {
    final d = date.toLocal();
    final month = (isFr ? _monthsFr : _monthsEn)[d.month - 1];
    return '${d.day} $month ${d.year}';
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final strings = widget.strings;
    final meta = _typeMeta(item.contentType);

    final body = item.body ?? '';
    final isLong = body.length > _bodyPreviewLimit;
    final shownBody = (_expanded || !isLong)
        ? body
        : '${body.substring(0, _bodyPreviewLimit).trimRight()}…';

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
          // ── Header: type avatar + byline + type chip ──
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: meta.background,
                  shape: BoxShape.circle,
                ),
                child: Icon(meta.icon, color: meta.foreground, size: 20),
              ),
              const SizedBox(width: OriginSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Flexible(
                          child: Text(
                            item.bylineName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: OriginTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        if (item.isVerified) ...<Widget>[
                          const SizedBox(width: 6),
                          _VerifiedBadge(strings: strings),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _formatDate(item.createdAt, strings.isFr),
                      style: OriginTextStyles.micro,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: OriginSpacing.sm),
              _TypeChip(
                label: strings.contentTypeLabel(item.contentType),
                meta: meta,
              ),
            ],
          ),

          // ── Title ──
          const SizedBox(height: OriginSpacing.md),
          Text(
            item.title,
            style: OriginTextStyles.sectionTitle.copyWith(
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),

          // ── Body ──
          if (body.isNotEmpty) ...<Widget>[
            const SizedBox(height: 6),
            Text(
              shownBody,
              style: OriginTextStyles.body.copyWith(
                color: OriginColors.textSecondary,
              ),
            ),
            if (isLong)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: GestureDetector(
                  onTap: () => setState(() => _expanded = !_expanded),
                  child: Text(
                    _expanded ? strings.readLess : strings.readMore,
                    style: OriginTextStyles.caption.copyWith(
                      color: OriginColors.forestGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
          ],

          // ── Meta facets ──
          if (item.metaBits.isNotEmpty) ...<Widget>[
            const SizedBox(height: OriginSpacing.md),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: <Widget>[
                for (final bit in item.metaBits) _MetaChip(label: bit),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _VerifiedBadge extends StatelessWidget {
  const _VerifiedBadge({required this.strings});

  final DiscoverStrings strings;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: strings.verifiedAuthority,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: OriginColors.forestGreen50,
          borderRadius: BorderRadius.circular(OriginRadius.full),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.verified,
                size: 12, color: OriginColors.forestGreen),
            const SizedBox(width: 3),
            Text(
              strings.verified,
              style: OriginTextStyles.micro.copyWith(
                color: OriginColors.forestGreen700,
                fontWeight: FontWeight.w700,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TypeChip extends StatelessWidget {
  const _TypeChip({required this.label, required this.meta});

  final String label;
  final _TypeMeta meta;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: meta.background,
        borderRadius: BorderRadius.circular(OriginRadius.full),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(meta.icon, size: 12, color: meta.foreground),
          const SizedBox(width: 4),
          Text(
            label,
            style: OriginTextStyles.micro.copyWith(
              color: meta.foreground,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: OriginColors.sand,
        borderRadius: BorderRadius.circular(OriginRadius.full),
      ),
      child: Text(
        label,
        style: OriginTextStyles.micro.copyWith(
          color: OriginColors.textSecondary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
