import 'package:flutter_test/flutter_test.dart';
import 'package:origin_mobile/core/utils/validators.dart';

void main() {
  group('Validators.required', () {
    test('rejects null and blanks', () {
      expect(Validators.required(null), isNotNull);
      expect(Validators.required(''), isNotNull);
      expect(Validators.required('   '), isNotNull);
    });

    test('accepts non-blank', () {
      expect(Validators.required('Mama Thérèse'), isNull);
    });
  });

  group('Validators.phone', () {
    test('rejects empty', () {
      expect(Validators.phone(''), isNotNull);
      expect(Validators.phone(null), isNotNull);
    });

    test('rejects garbage', () {
      expect(Validators.phone('abc'), isNotNull);
    });
  });

  group('Validators.otp', () {
    test('rejects wrong length', () {
      expect(Validators.otp('123'), isNotNull);
    });

    test('rejects non-numeric', () {
      expect(Validators.otp('12345a'), isNotNull);
    });

    test('accepts 6 digits', () {
      expect(Validators.otp('123456'), isNull);
    });
  });

  group('Validators.pin', () {
    test('rejects wrong length', () {
      expect(Validators.pin('12'), isNotNull);
    });

    test('accepts 4 digits', () {
      expect(Validators.pin('1234'), isNull);
    });
  });
}
