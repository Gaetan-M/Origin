import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_spacing.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';
import 'package:origin_mobile/features/explore/domain/tourism_enums.dart';
import 'package:origin_mobile/features/explore/domain/tourism_place.dart';
import 'package:origin_mobile/features/explore/presentation/i18n/tourism_strings.dart';

/// A single tourism / heritage place card. PROVENANCE is always shown —
/// official data is a cited SOURCE, never authority over the family graph.
class PlaceCard extends StatefulWidget {
  const PlaceCard({super.key, required this.place});

  final TourismPlace place;

  @override
  State<PlaceCard> createState() => _PlaceCardState();
}

class _PlaceCardState extends State<PlaceCard> {
  static const int _descPreviewLimit = 240;

  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final strings = TourismStrings.of(context);
    final place = widget.place;
    final meta = _categoryMeta(place.category);

    final description = place.description ?? '';
    final isLong = description.length > _descPreviewLimit;
    final shownDescription = _expanded || !isLong
        ? description
        : '${description.substring(0, _descPreviewLimit).trimRight()}…';

    return Container(
      decoration: BoxDecoration(
        color: OriginColors.offWhite,
        borderRadius: BorderRadius.circular(OriginRadius.lg),
        border: Border.all(color: OriginColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          if (place.mediaUrl != null && place.mediaUrl!.isNotEmpty)
            CachedNetworkImage(
              imageUrl: place.mediaUrl!,
              height: 150,
              width: double.infinity,
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(
                height: 150,
                color: OriginColors.sand,
              ),
              errorWidget: (_, __, ___) => Container(
                height: 150,
                color: OriginColors.sand,
                child: const Icon(Icons.image_not_supported_outlined,
                    color: OriginColors.textMuted),
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(OriginSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                _header(strings, meta),
                if (description.isNotEmpty) ...<Widget>[
                  const SizedBox(height: OriginSpacing.sm),
                  Text(
                    shownDescription,
                    style: OriginTextStyles.body
                        .copyWith(color: OriginColors.textSecondary),
                  ),
                  if (isLong)
                    TextButton(
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(0, 32),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        alignment: Alignment.centerLeft,
                      ),
                      onPressed: () => setState(() => _expanded = !_expanded),
                      child: Text(
                        _expanded ? strings.readLess : strings.readMore,
                        style: OriginTextStyles.caption.copyWith(
                          color: OriginColors.forestGreen,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                ],
                const SizedBox(height: OriginSpacing.sm),
                _provenance(strings),
                const SizedBox(height: OriginSpacing.sm),
                _footer(strings),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _header(TourismStrings strings, _CategoryMeta meta) {
    final place = widget.place;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: meta.background,
            shape: BoxShape.circle,
          ),
          child: Icon(meta.icon, size: 20, color: meta.foreground),
        ),
        const SizedBox(width: OriginSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Expanded(
                    child: Text(
                      place.name,
                      style: OriginTextStyles.bodyLarge
                          .copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: OriginSpacing.sm),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: meta.background,
                      borderRadius: BorderRadius.circular(OriginRadius.full),
                    ),
                    child: Text(
                      strings.categoryLabel(place.category),
                      style: OriginTextStyles.micro.copyWith(
                        color: meta.foreground,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
              if (place.region != null && place.region!.isNotEmpty) ...<Widget>[
                const SizedBox(height: 2),
                Row(
                  children: <Widget>[
                    const Icon(Icons.place_outlined,
                        size: 13, color: OriginColors.textMuted),
                    const SizedBox(width: 3),
                    Flexible(
                      child: Text(
                        place.region!,
                        style: OriginTextStyles.caption
                            .copyWith(color: OriginColors.textMuted),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _provenance(TourismStrings strings) {
    final place = widget.place;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(OriginSpacing.sm),
      decoration: BoxDecoration(
        color: OriginColors.sand,
        borderRadius: BorderRadius.circular(OriginRadius.md),
        border: Border.all(color: OriginColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Wrap(
            spacing: 6,
            runSpacing: 4,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              Text(
                '${strings.sourceLabel} :',
                style: OriginTextStyles.caption
                    .copyWith(fontWeight: FontWeight.w700),
              ),
              Text(
                strings.sourceLabelFor(place.source),
                style: OriginTextStyles.caption.copyWith(
                  color: OriginColors.forestGreen,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (place.verified)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: OriginColors.forestGreen50,
                    borderRadius: BorderRadius.circular(OriginRadius.full),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      const Icon(Icons.verified_outlined,
                          size: 12, color: OriginColors.forestGreen),
                      const SizedBox(width: 3),
                      Text(
                        strings.verified,
                        style: OriginTextStyles.micro.copyWith(
                          color: OriginColors.forestGreen,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          if (place.sourceRef != null && place.sourceRef!.isNotEmpty) ...<Widget>[
            const SizedBox(height: 4),
            Text(
              place.sourceRef!,
              style: OriginTextStyles.micro
                  .copyWith(color: OriginColors.textMuted),
            ),
          ],
          const SizedBox(height: 4),
          Text(
            strings.provenanceHint,
            style: OriginTextStyles.micro.copyWith(
              color: OriginColors.textMuted,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }

  Widget _footer(TourismStrings strings) {
    final place = widget.place;
    final date = DateFormat.yMMMd(
      Localizations.localeOf(context).toString(),
    ).format(place.createdAt.toLocal());

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: <Widget>[
        Text(
          date,
          style:
              OriginTextStyles.micro.copyWith(color: OriginColors.textMuted),
        ),
        if (place.hasGeo)
          TextButton.icon(
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              minimumSize: const Size(0, 32),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            onPressed: _openMap,
            icon: const Icon(Icons.open_in_new,
                size: 14, color: OriginColors.forestGreen),
            label: Text(
              strings.viewOnMap,
              style: OriginTextStyles.caption.copyWith(
                color: OriginColors.forestGreen,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _openMap() async {
    final place = widget.place;
    final lat = place.latitude;
    final lng = place.longitude;
    if (lat == null || lng == null) return;
    final uri = Uri.parse(
      'https://www.openstreetmap.org/?mlat=$lat&mlon=$lng#map=14/$lat/$lng',
    );
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  _CategoryMeta _categoryMeta(TourismCategory category) {
    switch (category) {
      case TourismCategory.heritage:
      case TourismCategory.chefferie:
        return const _CategoryMeta(
          Icons.account_balance_outlined,
          OriginColors.ochre50,
          OriginColors.ochreDark,
        );
      case TourismCategory.nature:
        return const _CategoryMeta(
          Icons.forest_outlined,
          OriginColors.forestGreen50,
          OriginColors.forestGreen,
        );
      case TourismCategory.culture:
        return const _CategoryMeta(
          Icons.theater_comedy_outlined,
          OriginColors.terracotta50,
          OriginColors.terracotta,
        );
      case TourismCategory.museum:
        return const _CategoryMeta(
          Icons.museum_outlined,
          OriginColors.sand,
          OriginColors.textSecondary,
        );
      case TourismCategory.religious:
        return const _CategoryMeta(
          Icons.church_outlined,
          OriginColors.forestGreen50,
          OriginColors.forestGreen,
        );
      case TourismCategory.other:
        return const _CategoryMeta(
          Icons.place_outlined,
          OriginColors.sand,
          OriginColors.textSecondary,
        );
    }
  }
}

class _CategoryMeta {
  const _CategoryMeta(this.icon, this.background, this.foreground);

  final IconData icon;
  final Color background;
  final Color foreground;
}
