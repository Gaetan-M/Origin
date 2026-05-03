import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:origin_mobile/core/theme/origin_colors.dart';
import 'package:origin_mobile/core/theme/origin_radius.dart';

/// PIN entry — boxed dots, hides the digit but shows progress.
class OriginPinInput extends StatefulWidget {
  const OriginPinInput({
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
  State<OriginPinInput> createState() => _OriginPinInputState();
}

class _OriginPinInputState extends State<OriginPinInput> {
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
    if (clean.length == widget.length) widget.onCompleted?.call(clean);
  }

  @override
  Widget build(BuildContext context) {
    final value = _controller.text;
    return GestureDetector(
      onTap: () => _focus.requestFocus(),
      child: Stack(
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List<Widget>.generate(widget.length, (i) {
              final filled = i < value.length;
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 8),
                width: 18,
                height: 18,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: filled
                      ? OriginColors.deepBlue
                      : OriginColors.sand,
                  border: Border.all(
                    color: widget.errorText != null
                        ? OriginColors.error
                        : OriginColors.border,
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
                obscureText: true,
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
    );
  }
}

// OriginRadius is exported by the theme package — kept as an unused import-safe
// reference for future PIN box styling.
const double _kPinSlotRadius = OriginRadius.sm;
// Used by tests to assert a stable design token; mark it as referenced.
double get pinSlotRadiusForTests => _kPinSlotRadius;
