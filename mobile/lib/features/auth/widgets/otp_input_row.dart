import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'auth_styles.dart';

class OtpInputRow extends StatefulWidget {
  const OtpInputRow({
    super.key,
    required this.onChanged,
    this.length = 6,
  });

  final ValueChanged<String> onChanged;
  final int length;

  @override
  State<OtpInputRow> createState() => _OtpInputRowState();
}

class _OtpInputRowState extends State<OtpInputRow> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final code = _controller.text;
    return GestureDetector(
      onTap: () => _focusNode.requestFocus(),
      behavior: HitTestBehavior.opaque,
      child: Stack(
        children: [
          Opacity(
            opacity: 0,
            child: TextField(
              controller: _controller,
              focusNode: _focusNode,
              keyboardType: TextInputType.number,
              maxLength: widget.length,
              autofocus: true,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: (value) {
                setState(() {});
                widget.onChanged(value);
              },
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.length, (index) {
              final char = index < code.length ? code[index] : '';
              return Container(
                width: 44,
                height: 48,
                margin: EdgeInsets.only(right: index == widget.length - 1 ? 0 : 8),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: authFieldBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: _focusNode.hasFocus && index == code.length
                        ? Colors.white38
                        : Colors.transparent,
                  ),
                ),
                child: Text(
                  char,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
