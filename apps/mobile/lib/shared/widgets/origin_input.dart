import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';

/// Origin styled text input — wraps Material [TextField] with the design tokens.
class OriginInput extends StatelessWidget {
  const OriginInput({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.helperText,
    this.errorText,
    this.prefixIcon,
    this.suffixIcon,
    this.keyboardType,
    this.obscureText = false,
    this.maxLength,
    this.maxLines = 1,
    this.minLines,
    this.inputFormatters,
    this.onChanged,
    this.onSubmitted,
    this.autofocus = false,
    this.enabled = true,
    this.textCapitalization = TextCapitalization.sentences,
    this.textInputAction,
    this.eyebrow,
  });

  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final String? helperText;
  final String? errorText;
  final IconData? prefixIcon;
  final Widget? suffixIcon;
  final TextInputType? keyboardType;
  final bool obscureText;
  final int? maxLength;
  final int maxLines;
  final int? minLines;
  final List<TextInputFormatter>? inputFormatters;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool autofocus;
  final bool enabled;
  final TextCapitalization textCapitalization;
  final TextInputAction? textInputAction;
  final String? eyebrow;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (eyebrow != null) ...<Widget>[
          Text(
            eyebrow!.toUpperCase(),
            style: OriginTextStyles.micro.copyWith(
              color: OriginColors.ochreDark,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 6),
        ],
        if (label != null) ...<Widget>[
          Text(
            label!,
            style: OriginTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.w600,
              color: OriginColors.charcoal,
            ),
          ),
          const SizedBox(height: 6),
        ],
        TextField(
          controller: controller,
          decoration: InputDecoration(
            hintText: hint,
            helperText: helperText,
            errorText: errorText,
            prefixIcon: prefixIcon != null ? Icon(prefixIcon) : null,
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: enabled ? OriginColors.offWhite : OriginColors.sand,
            border: OutlineInputBorder(
              borderRadius:
                  BorderRadius.circular(OriginRadius.md),
              borderSide: const BorderSide(color: OriginColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius:
                  BorderRadius.circular(OriginRadius.md),
              borderSide: const BorderSide(color: OriginColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius:
                  BorderRadius.circular(OriginRadius.md),
              borderSide: const BorderSide(
                color: OriginColors.deepBlue,
                width: 2,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius:
                  BorderRadius.circular(OriginRadius.md),
              borderSide: const BorderSide(color: OriginColors.error),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius:
                  BorderRadius.circular(OriginRadius.md),
              borderSide: const BorderSide(
                color: OriginColors.error,
                width: 2,
              ),
            ),
          ),
          keyboardType: keyboardType,
          obscureText: obscureText,
          maxLength: maxLength,
          maxLines: obscureText ? 1 : maxLines,
          minLines: minLines,
          inputFormatters: inputFormatters,
          onChanged: onChanged,
          onSubmitted: onSubmitted,
          autofocus: autofocus,
          enabled: enabled,
          textCapitalization: textCapitalization,
          textInputAction: textInputAction,
          style: OriginTextStyles.body,
        ),
      ],
    );
  }
}
