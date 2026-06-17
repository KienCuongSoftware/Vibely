import 'package:flutter/material.dart';

import 'auth_styles.dart';

class BirthDateFields extends StatelessWidget {
  const BirthDateFields({
    super.key,
    required this.month,
    required this.day,
    required this.year,
    required this.onMonthChanged,
    required this.onDayChanged,
    required this.onYearChanged,
  });

  final String? month;
  final String? day;
  final String? year;
  final ValueChanged<String?> onMonthChanged;
  final ValueChanged<String?> onDayChanged;
  final ValueChanged<String?> onYearChanged;

  static const _months = [
    '01', '02', '03', '04', '05', '06',
    '07', '08', '09', '10', '11', '12',
  ];

  @override
  Widget build(BuildContext context) {
    final years = List.generate(127, (i) => (2026 - i).toString());
    final days = List.generate(31, (i) => (i + 1).toString().padLeft(2, '0'));

    return Row(
      children: [
        Expanded(
          flex: 4,
          child: _dropdown(
            value: month,
            hint: 'Tháng',
            items: _months,
            onChanged: onMonthChanged,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 3,
          child: _dropdown(
            value: day,
            hint: 'Ngày',
            items: days,
            onChanged: onDayChanged,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 4,
          child: _dropdown(
            value: year,
            hint: 'Năm',
            items: years,
            onChanged: onYearChanged,
          ),
        ),
      ],
    );
  }

  Widget _dropdown({
    required String? value,
    required String hint,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return DropdownButtonFormField<String>(
      value: value != null && value.isNotEmpty ? value : null,
      hint: Text(hint, style: const TextStyle(color: Color(0xFF71717A), fontSize: 14)),
      dropdownColor: authFieldBg,
      style: const TextStyle(color: Colors.white, fontSize: 14),
      decoration: authInputDecoration(),
      items: items
          .map(
            (item) => DropdownMenuItem<String>(
              value: item,
              child: Text(item),
            ),
          )
          .toList(),
      onChanged: onChanged,
    );
  }
}
