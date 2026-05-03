import 'package:flutter_test/flutter_test.dart';
import 'package:origin_mobile/core/utils/formatters.dart';

void main() {
  group('Formatters.phoneE164', () {
    test('normalises a Cameroon local number with default country code', () {
      expect(Formatters.phoneE164('612345678'), '+237612345678');
    });

    test('keeps an already-formatted E.164 number', () {
      expect(Formatters.phoneE164('+237612345678'), '+237612345678');
    });

    test('strips spaces, dashes and parentheses', () {
      expect(Formatters.phoneE164('+237 6 12-34-56 78'), '+237612345678');
    });

    test('converts 00 international prefix', () {
      expect(Formatters.phoneE164('00237612345678'), '+237612345678');
    });

    test('returns null on empty input', () {
      expect(Formatters.phoneE164(''), isNull);
      expect(Formatters.phoneE164('   '), isNull);
    });
  });

  group('Formatters.ageFromBirth', () {
    test('returns null when birth is null', () {
      expect(Formatters.ageFromBirth(null), isNull);
    });

    test('computes age from birth date', () {
      final twentyYearsAgo = DateTime.now().subtract(
        const Duration(days: 365 * 20 + 5),
      );
      expect(Formatters.ageFromBirth(twentyYearsAgo), 20);
    });
  });
}
