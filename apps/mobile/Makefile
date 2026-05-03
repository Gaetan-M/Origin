.PHONY: setup run test coverage analyze format gen gen-watch clean apk-debug apk-release bundle-release l10n help

help:
	@echo "Origin mobile — targets:"
	@echo "  setup           pub get + l10n + codegen"
	@echo "  run             flutter run (debug)"
	@echo "  test            flutter test"
	@echo "  coverage        flutter test with coverage"
	@echo "  analyze         flutter analyze + format check"
	@echo "  format          dart format ."
	@echo "  gen             build_runner one-shot"
	@echo "  gen-watch       build_runner watch"
	@echo "  l10n            flutter gen-l10n"
	@echo "  clean           flutter clean"
	@echo "  apk-debug       flutter build apk --debug"
	@echo "  apk-release     flutter build apk --release"
	@echo "  bundle-release  flutter build appbundle --release"

setup:
	flutter pub get
	flutter gen-l10n
	dart run build_runner build --delete-conflicting-outputs

run:
	flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1

test:
	flutter test

coverage:
	flutter test --coverage
	@echo "lcov report at coverage/lcov.info"

analyze:
	flutter analyze
	dart format --output=none --set-exit-if-changed .

format:
	dart format .

gen:
	dart run build_runner build --delete-conflicting-outputs

gen-watch:
	dart run build_runner watch --delete-conflicting-outputs

l10n:
	flutter gen-l10n

clean:
	flutter clean

apk-debug:
	flutter build apk --debug

apk-release:
	flutter build apk --release

bundle-release:
	flutter build appbundle --release
