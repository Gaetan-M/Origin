import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';

/// Phone number input with the country dialing prefix on the left.
class OriginPhoneInput extends StatelessWidget {
  const OriginPhoneInput({
    super.key,
    required this.controller,
    this.errorText,
    this.autofocus = false,
    this.onChanged,
    this.countryCode = '+237',
    this.flagEmoji = '🇨🇲', // CM
    this.label,
  });

  final TextEditingController controller;
  final String? errorText;
  final bool autofocus;
  final ValueChanged<String>? onChanged;
  final String countryCode;
  final String flagEmoji;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (label != null) ...<Widget>[
          Text(
            label!,
            style: OriginTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
        ],
        DecoratedBox(
          decoration: BoxDecoration(
            color: OriginColors.offWhite,
            borderRadius: BorderRadius.circular(OriginRadius.md),
            border: Border.all(
              color: errorText != null
                  ? OriginColors.error
                  : OriginColors.border,
              width: errorText != null ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Row(
                  children: <Widget>[
                    Text(flagEmoji, style: const TextStyle(fontSize: 22)),
                    const SizedBox(width: 6),
                    Text(
                      countryCode,
                      style: OriginTextStyles.bodyMedium.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 1,
                height: 28,
                color: OriginColors.border,
              ),
              Expanded(
                child: TextField(
                  controller: controller,
                  autofocus: autofocus,
                  keyboardType: TextInputType.phone,
                  inputFormatters: <TextInputFormatter>[
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(15),
                  ],
                  onChanged: onChanged,
                  decoration: const InputDecoration(
                    hintText: '6 12 34 56 78',
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 18,
                    ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    fillColor: Colors.transparent,
                    filled: true,
                  ),
                  style: OriginTextStyles.bodyLarge.copyWith(
                    fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
                  ),
                ),
              ),
            ],
          ),
        ),
        if (errorText != null) ...<Widget>[
          const SizedBox(height: 6),
          Text(
            errorText!,
            style: OriginTextStyles.caption.copyWith(color: OriginColors.error),
          ),
        ],
      ],
    );
  }
}
