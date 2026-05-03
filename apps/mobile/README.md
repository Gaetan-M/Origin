# Origin Mobile (Flutter)

Application mobile Flutter de la plateforme généalogique **Origin** (Cameroun).

## Prérequis

- Flutter 3.16+
- Dart 3.3+
- Android Studio (Android) / Xcode (iOS)

## Setup initial

Le dossier ne contient pas encore les shells natifs Android/iOS — `flutter create`
les ajoute sans toucher au code Dart existant :

```bash
cd apps/mobile
flutter create --org com.origin --project-name origin_mobile \
  -i swift -a kotlin --platforms=android,ios .
flutter pub get
flutter gen-l10n
dart run build_runner build --delete-conflicting-outputs
```

> Si `flutter create` propose d'écraser `pubspec.yaml`, refuser — le pubspec
> existant est la source de vérité.

## Commandes courantes

| Commande | Effet |
|---|---|
| `make setup` | pub get + l10n + codegen |
| `make run` | `flutter run` (Android emulator par défaut) |
| `make test` | `flutter test` |
| `make analyze` | `flutter analyze` + `dart format --set-exit-if-changed` |
| `make gen` | one-shot codegen freezed/riverpod/drift |
| `make gen-watch` | codegen en mode watch |
| `make apk-release` | build APK release |

## Variables d'environnement

L'app lit son URL backend via `--dart-define` :

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1   # Android emulator
flutter run --dart-define=API_BASE_URL=http://localhost:3000/api/v1  # iOS simulator
```

Variables disponibles :
- `API_BASE_URL` (défaut `http://10.0.2.2:3000/api/v1`)
- `ENABLE_LOGGING` (défaut `true` en debug)

## Architecture

Feature-first Clean Architecture *light*. Voir `.work/SHARED_CONTEXT.md` pour
les contrats inter-modules complets et les conventions.

```
lib/
├── main.dart                # Bootstrap + ProviderScope
├── app.dart                 # MaterialApp.router + theme + l10n
├── core/
│   ├── config/              # env, constants
│   ├── theme/               # tokens Origin (KenteBar, AdinkraRosette, OriginMark)
│   ├── routing/             # go_router + paths
│   ├── network/             # Dio + interceptors auth/refresh/logging
│   ├── storage/             # Drift database + secure storage
│   ├── localization/        # gen_l10n hookup
│   ├── error/               # AppFailure (sealed)
│   ├── sync/                # offline queue
│   └── utils/               # formatters, validators, Result
├── shared/widgets/          # Origin* widgets + brand decor
├── data/
│   ├── api/                 # Dio services par module backend
│   ├── models/              # DTOs freezed
│   └── local/               # repositories offline-first
├── l10n/                    # app_fr.arb, app_en.arb
└── features/
    ├── auth/                # OTP, PIN, splash
    ├── onboarding/          # "Plante ta graine"
    ├── home_shell/          # 5 tabs + FAB central terracotta
    ├── persons/             # CRUD + memorial card
    ├── relationships/       # parent-child, unions, polygamie
    ├── family_tree/         # vertical ghost-slots + radial
    ├── search/
    ├── matching/            # match suggestions, duplicates
    ├── kinship_probe/
    ├── merge/
    ├── claims/              # validate / dispute
    ├── invitations/         # WhatsApp share
    ├── family_codes/        # gradient forest card avec adinkra
    ├── notifications/
    ├── identity_documents/  # CNI/passeport
    ├── media/               # upload + grid
    └── settings/            # PIN, langue, accessibilité
```

## Stack

- **State** : `flutter_riverpod` 2.5 + `riverpod_annotation` (codegen)
- **Routing** : `go_router` 14
- **HTTP** : `dio` 5 + interceptors (auth, refresh JWT, logging)
- **Local DB** : `drift` 2.18 (offline-first)
- **Sécurité** : `flutter_secure_storage` (tokens + PIN)
- **Models** : `freezed` + `json_serializable`
- **i18n** : `gen_l10n` (fr/en)
- **Forms** : `flutter_form_builder`
- **Lint** : `very_good_analysis` 6

## Design system

Les tokens proviennent du design package Claude Design (`Origin Mobile.html`).
Voir `lib/core/theme/origin_colors.dart` pour la palette et
`lib/shared/widgets/{kente_bar,adinkra_rosette,origin_mark}.dart` pour les
primitives de décor brand.

Couleurs principales : forestGreen `#2D7A4B`, terracotta `#C8663B`, ochre
`#D9A441`, deepBlue `#1E3A5F`, sand `#F5EFE0`.

## Tests

```bash
make test                 # unit + widget
make coverage             # avec lcov.info
flutter test integration_test/   # integration
```

## i18n

Ajouter une chaîne :
1. Éditer `lib/l10n/app_fr.arb` ET `lib/l10n/app_en.arb` (mêmes clés).
2. `make l10n` régénère `lib/core/localization/gen/app_localizations.dart`.
3. Utiliser `context.l10n.maCleNouvelle` (extension `BuildContextL10n`).

## Troubleshooting

- **build_runner conflicts** : `dart run build_runner build --delete-conflicting-outputs`
- **drift schema bumps** : incrémenter `schemaVersion` dans `app_database.dart`
- **import cycles `package:origin_mobile/...`** : refactor vers `core/` ou `shared/`

## Spec & contexte

- `../../SPEC.md` — spécification produit complète
- `.work/SHARED_CONTEXT.md` — contrats inter-modules
- `../../CLAUDE.md` — règles projet
