import 'package:origin_mobile/core/config/app_constants.dart';
import 'package:origin_mobile/core/utils/formatters.dart';

/// Form-field validators returning a French message on error or `null` when
/// the value is acceptable. Designed to plug into `flutter_form_builder`
/// (`FormFieldValidator<T>` is `String? Function(T?)`).
abstract final class Validators {
  /// Validates a required text field.
  static String? required(String? value, {String fieldName = 'Ce champ'}) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName est obligatoire';
    }
    return null;
  }

  /// Validates a phone number — accepts local or E.164 input as long as
  /// `Formatters.phoneE164` can normalise it.
  static String? phone(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Ton numéro est obligatoire';
    }
    final normalised = Formatters.phoneE164(value);
    if (normalised == null) {
      return 'Ce numéro ne semble pas correct';
    }
    return null;
  }

  /// Validates a one-time code (numeric, fixed length).
  static String? otp(String? value) {
    if (value == null || value.isEmpty) {
      return 'Tape le code reçu';
    }
    if (value.length != AppConstants.otpLength) {
      return 'Le code fait ${AppConstants.otpLength} chiffres';
    }
    if (!RegExp(r'^[0-9]+$').hasMatch(value)) {
      return 'Le code ne contient que des chiffres';
    }
    return null;
  }

  /// Validates a security PIN (numeric, fixed length).
  static String? pin(String? value) {
    if (value == null || value.isEmpty) {
      return 'Choisis un code à ${AppConstants.pinLength} chiffres';
    }
    if (value.length != AppConstants.pinLength) {
      return 'Le code fait ${AppConstants.pinLength} chiffres';
    }
    if (!RegExp(r'^[0-9]+$').hasMatch(value)) {
      return 'Le code ne contient que des chiffres';
    }
    if (RegExp(r'^(.)\1+$').hasMatch(value)) {
      return 'Évite un code trop simple (1111, 0000…)';
    }
    return null;
  }

  /// Validates a person name (first / last / display).
  static String? name(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Le nom est obligatoire';
    }
    final trimmed = value.trim();
    if (trimmed.length < 2) {
      return 'Le nom est trop court';
    }
    if (trimmed.length > 100) {
      return 'Le nom est trop long';
    }
    // Allow letters (incl. accents), spaces, apostrophes, hyphens.
    if (!RegExp(r"^[A-Za-zÀ-ÿ' \-]+$").hasMatch(trimmed)) {
      return 'Évite les chiffres et les caractères spéciaux';
    }
    return null;
  }

  /// Validates an optional email; returns `null` for empty.
  static String? optionalEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }
    final pattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    if (!pattern.hasMatch(value.trim())) {
      return "L'adresse email n'a pas l'air bonne";
    }
    return null;
  }

  /// Combines multiple validators, returning the first failure encountered.
  static String? Function(String?) compose(
    List<String? Function(String?)> validators,
  ) {
    return (value) {
      for (final v in validators) {
        final result = v(value);
        if (result != null) {
          return result;
        }
      }
      return null;
    };
  }

  // Curried aliases for usage like `Validators.phoneValidator`.
  static final String? Function(String?) phoneValidator = phone;
  static final String? Function(String?) otpValidator = otp;
  static final String? Function(String?) pinValidator = pin;
  static final String? Function(String?) nameValidator = name;

  /// Required-field validator with no custom field name.
  static String? requiredValidator(String? value) => required(value);
}
