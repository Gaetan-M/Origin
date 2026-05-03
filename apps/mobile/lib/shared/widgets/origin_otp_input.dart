import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';
import 'package:origin_mobile/core/theme/origin_text_styles.dart';

/// OTP input that displays N boxed slots auto-advancing as the user types.
class OriginOtpInput extends StatefulWidget {
  const OriginOtpInput({
    super.key,
    required this.length,
    required this.onChanged,
    this.onCompleted,
    this.errorText,
    this.enabled = true,
    this.autofocus = true,
  });

  final int length;
  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onCompleted;
  final String? errorText;
  final bool enabled;
  final bool autofocus;

  @override
  State<OriginOtpInput> createState() => _OriginOtpInputState();
}

class _OriginOtpInputState extends State<OriginOtpInput> {
  late final TextEditingController _controller;
  late final FocusNode _focus;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController();
    _focus = FocusNode();
    if (widget.autofocus) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _focus.requestFocus();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    final clean = value.replaceAll(RegExp(r'[^0-9]'), '');
    if (clean != value) {
      _controller.value = TextEditingValue(
        text: clean,
        selection: TextSelection.collapsed(offset: clean.length),
      );
    }
    widget.onChanged(clean);
    if (clean.length == widget.length) {
      widget.onCompleted?.call(clean);
    }
  }

  @override
  Widget build(BuildContext context) {
    final value = _controller.text;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        GestureDetector(
          onTap: () => _focus.requestFocus(),
          child: Stack(
            children: <Widget>[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List<Widget>.generate(widget.length, (i) {
                  final char = i < value.length ? value[i] : '';
                  final filled = char.isNotEmpty;
                  return Expanded(
                    child: Container(
                      margin: EdgeInsets.only(
                        right: i == widget.length - 1 ? 0 : 8,
                      ),
                      height: 56,
                      decoration: BoxDecoration(
                        color: filled
                            ? OriginColors.offWhite
                            : OriginColors.sand,
                        borderRadius:
                            BorderRadius.circular(OriginRadius.md),
                        border: Border.all(
                          color: widget.errorText != null
                              ? OriginColors.error
                              : (filled
                                  ? OriginColors.deepBlue
                                  : OriginColors.border),
                          width: filled ? 2 : 1,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        char,
                        style: OriginTextStyles.hero.copyWith(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  );
                }),
              ),
              Positioned.fill(
                child: Opacity(
                  opacity: 0,
                  child: TextField(
                    controller: _controller,
                    focusNode: _focus,
                    autofocus: widget.autofocus,
                    enabled: widget.enabled,
                    keyboardType: TextInputType.number,
                    maxLength: widget.length,
                    inputFormatters: <TextInputFormatter>[
                      FilteringTextInputFormatter.digitsOnly,
                    ],
                    onChanged: _onChanged,
                    decoration: const InputDecoration(
                      counterText: '',
                      border: InputBorder.none,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (widget.errorText != null) ...<Widget>[
          const SizedBox(height: 8),
          Text(
            widget.errorText!,
            style: OriginTextStyles.caption.copyWith(color: OriginColors.error),
          ),
        ],
      ],
    );
  }
}
