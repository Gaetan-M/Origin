import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';

/// Square grid of remote photo URLs.
class PhotoGrid extends StatelessWidget {
  const PhotoGrid({super.key, required this.urls, this.onTap});

  final List<String> urls;
  final void Function(int index)? onTap;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 6,
        mainAxisSpacing: 6,
      ),
      itemCount: urls.length,
      itemBuilder: (context, index) {
        return GestureDetector(
          onTap: onTap == null ? null : () => onTap!(index),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(OriginRadius.sm),
            child: CachedNetworkImage(
              imageUrl: urls[index],
              fit: BoxFit.cover,
              placeholder: (_, __) => Container(
                color: OriginColors.sand,
              ),
              errorWidget: (_, __, ___) => Container(
                color: OriginColors.sand,
                child: const Icon(
                  Icons.broken_image_outlined,
                  color: OriginColors.textMuted,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
