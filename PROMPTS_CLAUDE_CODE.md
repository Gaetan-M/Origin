# Guide des Prompts Claude Code — Origin

**Document compagnon** à utiliser avec `SPECIFICATION_PLATEFORME_GENEALOGIQUE.md`.

**Objectif :** Te guider pas à pas dans l'implémentation avec Claude Code via des prompts optimisés, séquentiels, et testés.

---

## Comment utiliser ce document

### Configuration initiale recommandée

1. **Installe Claude Code** : `npm install -g @anthropic-ai/claude-code`
2. **Crée un dossier projet vide** : `mkdir genealogie-cameroun && cd genealogie-cameroun`
3. **Initialise un repo git** : `git init`
4. **Copie le fichier SPEC** : place `SPECIFICATION_PLATEFORME_GENEALOGIQUE.md` à la racine, renomme-le en `SPEC.md` (plus court à référencer)
5. **Lance Claude Code** : `claude`
6. **Démarre par le Prompt 0** ci-dessous

### Règles d'or pour travailler avec Claude Code

- **Toujours référencer `@SPEC.md`** dans les prompts pour que Claude Code ait le contexte complet
- **Utiliser Plan Mode** (Shift+Tab deux fois) pour les prompts marqués 🏗️ (architecturaux)
- **Utiliser "think hard"** pour les prompts marqués 🧠 (complexes)
- **Valider après chaque étape** avant de passer à la suivante — si Claude Code a fait une erreur, corrige dans le CLAUDE.md pour éviter la récurrence
- **Ne pas chaîner plusieurs phases** dans un seul prompt — une étape à la fois
- **En cas de résultat médiocre** : utilise le prompt alternatif fourni, ou demande à Claude Code de revoir son approche

### Convention de marquage des prompts

- 🏗️ = utiliser Plan Mode (Shift+Tab Shift+Tab)
- 🧠 = ajouter "think hard" ou "ultrathink" dans le prompt
- ⚡ = prompt rapide, mode normal
- 🔄 = prompt itératif (à répéter plusieurs fois pour affiner)
- ✅ = prompt de vérification/validation

---

## Phase 0 — Setup initial

### Prompt 0.1 ⚡ — Création du CLAUDE.md fondamental

Ce fichier est LE plus important. Il donne à Claude Code le contexte persistant du projet à chaque session. On le crée en premier.

```
Crée un fichier CLAUDE.md à la racine du projet qui servira de mémoire persistante pour toutes les sessions futures de Claude Code.

Le fichier doit contenir :

## Contexte du projet
Plateforme généalogique camerounaise indépendante permettant aux utilisateurs de documenter leur arbre familial. Specs complètes dans @SPEC.md — à consulter systématiquement.

## Stack technique (non-négociable)
- Backend : NestJS + TypeScript strict, PostgreSQL 16+, Redis, Prisma ORM
- Mobile : Flutter (iOS + Android) avec Drift pour SQLite local
- Web/PWA : Next.js 15 + TypeScript + Tailwind + shadcn/ui
- Monorepo : Turborepo avec packages/apps structure
- Cloud : AWS af-south-1 (Cape Town)

## Conventions de code
- TypeScript : strict mode, pas de `any`, types explicites partout
- Nommage : camelCase variables/fonctions, PascalCase types/classes, snake_case colonnes DB
- Fichiers : kebab-case (user-service.ts, not UserService.ts)
- Commits : Conventional Commits (feat:, fix:, chore:, docs:, refactor:, test:)
- Langue : code en anglais, commentaires en anglais, UI utilisateur en français ET anglais

## Règles métier critiques
- Le graphe est UNIQUE et GLOBAL — jamais "plusieurs arbres", toujours une fenêtre sur le graphe unifié
- life_status (ALIVE/DECEASED/UNKNOWN) est OBLIGATOIRE sur toute Person
- Les CNI ne sont JAMAIS stockées en clair — hash SHA-256 + chiffrement KMS
- Les numéros de téléphone sont au format E.164 (+237...)
- Soft delete partout (deleted_at), jamais de DELETE physique
- Audit trail obligatoire (table contributions) pour toute modification

## Sécurité
- Jamais de secrets dans le code ou .env commit
- Variables d'env via AWS Secrets Manager en prod
- Validation d'entrée obligatoire (class-validator côté backend, form validators côté mobile)
- Rate limiting sur tous les endpoints publics
- HTTPS/TLS 1.3 partout, HSTS activé

## Structure du monorepo
/apps
  /api           - NestJS backend
  /mobile        - Flutter app
  /web           - Next.js PWA
  /admin         - Interface modération (phase 2)
/packages
  /shared-types  - Types TypeScript partagés API↔Web
  /config        - Configs partagées (ESLint, tsconfig, etc.)
/infrastructure
  /terraform     - IaC AWS
  /docker        - Docker Compose dev local
/docs
  SPEC.md        - Spécification complète
  CLAUDE.md      - Ce fichier

## Workflow
- Toujours créer une branche feature avant de coder : `feat/<description-courte>`
- Tests obligatoires pour toute logique métier (Jest backend, flutter_test mobile)
- Lint et format avant commit (husky + lint-staged)
- PR avec description claire, taille raisonnable (< 500 lignes idéalement)

## Commandes utiles (à maintenir à jour dans ce fichier au fur et à mesure)
- Démarrer dev local : `docker-compose up -d && npm run dev`
- Tests backend : `cd apps/api && npm test`
- Tests mobile : `cd apps/mobile && flutter test`
- Migrations DB : `cd apps/api && npx prisma migrate dev`

## Anti-patterns à éviter (voir section 21 de SPEC.md)
- Pas de champs father_id/mother_id directement sur Person — utiliser parent_child
- Pas de mot de passe utilisateur — OTP + PIN optionnel uniquement
- Pas d'email obligatoire — téléphone suffit
- Pas de modal "OK uniquement" — toujours bottom sheets avec options
- Pas d'erreurs techniques affichées à l'utilisateur

Confirme la création du fichier en affichant son contenu.
```

### Prompt 0.2 🏗️ — Structure du monorepo

```
Active Plan Mode (Shift+Tab deux fois si pas déjà fait).

Propose-moi un plan détaillé pour créer la structure monorepo Turborepo du projet, en suivant la structure décrite dans @CLAUDE.md. Le plan doit inclure :

1. L'initialisation de Turborepo avec les packages suivants :
   - apps/api (NestJS)
   - apps/mobile (Flutter) — note : Flutter ne sera pas dans le workspace npm mais partagera le repo
   - apps/web (Next.js 15 avec App Router)
   - packages/shared-types (package TypeScript partagé)
   - packages/config (ESLint, Prettier, tsconfig bases)

2. La configuration racine :
   - package.json avec workspaces
   - turbo.json avec pipelines appropriés
   - .gitignore complet (node_modules, .env, build/, dist/, .next/, .dart_tool/, etc.)
   - .editorconfig
   - .nvmrc avec Node 20 LTS
   - README.md initial

3. La configuration partagée :
   - packages/config/eslint-base.js
   - packages/config/prettier.config.js
   - packages/config/tsconfig.base.json
   - packages/config/tsconfig.node.json
   - packages/config/tsconfig.react.json

4. Les commandes disponibles au niveau racine :
   - `npm run dev` (tous les apps en parallèle)
   - `npm run build` (build de prod)
   - `npm run lint`
   - `npm run test`
   - `npm run format`

Ne commence pas à implémenter. Présente-moi le plan complet avec la liste exacte des fichiers à créer et leur contenu prévu. J'approuverai avant exécution.
```

Une fois le plan validé, sors de Plan Mode avec Shift+Tab et dis simplement : `Exécute le plan approuvé.`

### Prompt 0.3 ⚡ — Docker Compose pour dev local

```
Crée un fichier docker-compose.yml à la racine infrastructure/docker/ qui permette de lancer en local tous les services backend pour le développement :

Services à inclure :
1. postgres:16-alpine
   - Volume persistant pour données
   - Port 5432 exposé
   - Variables d'env : POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
   - Healthcheck avec pg_isready
   - Extensions pré-installées via script init : uuid-ossp, pg_trgm, fuzzystrmatch, unaccent, pgcrypto

2. redis:7-alpine
   - Volume persistant
   - Port 6379 exposé
   - Healthcheck

3. mailhog (pour tests emails en dev)
   - Port 8025 (UI) et 1025 (SMTP)

4. localstack (pour simuler S3 en dev)
   - Services: s3, kms
   - Port 4566
   - Volume persistant

Ajoute aussi :
- Un fichier .env.example à la racine du projet avec toutes les variables nécessaires documentées
- Un script infrastructure/docker/init-postgres.sh qui installe les extensions PostgreSQL
- Un Makefile à la racine avec les commandes : `make up`, `make down`, `make logs`, `make reset-db`, `make psql`
- Documentation dans infrastructure/docker/README.md expliquant comment lancer l'environnement local

Vérifie que docker-compose config valide le fichier sans erreur.
```

---

## Phase 1 — Base de données et types partagés

### Prompt 1.1 🏗️🧠 — Schéma Prisma complet

```
Active Plan Mode.

Consulte @SPEC.md section 6 (Modèle de données complet) et crée le schéma Prisma complet dans apps/api/prisma/schema.prisma.

Important :
- Utilise PostgreSQL comme datasource
- Active les extensions : uuid-ossp, pgcrypto, pg_trgm, fuzzystrmatch, unaccent
- Respecte EXACTEMENT les noms de tables, colonnes, types enum, contraintes et index de la section 6.2 du SPEC
- Convention Prisma : noms de modèles PascalCase (Account, Person, etc.) mais @@map vers snake_case pour les tables DB
- Les colonnes DB restent en snake_case via @map
- Tous les IDs en UUID avec default(dbgenerated("uuid_generate_v4()"))
- Les timestamps via @default(now()) et @updatedAt
- Les relations explicites avec onDelete approprié

Think hard sur ces points subtils :
1. La relation ParentChild doit être indépendante de Union (un enfant peut avoir un parent sans union enregistrée)
2. UnionPartner permet la polygamie (many-to-many Person ↔ Union)
3. Les Person ont 3 références possibles à Account (created_by, updated_by, claimed_by) — attention aux relations named
4. IdentityDocument : document_number_hash est UNIQUE par (document_type, document_number_hash) mais partiellement (seulement si deleted_at IS NULL)
5. Claim : un seul VERIFIED par Person à la fois (contrainte unique partielle)
6. MergeProposal : check constraint person_a_id < person_b_id pour éviter doublons

Présente-moi le plan :
- Liste complète des modèles à créer avec leurs champs
- Les enums à définir
- Les index à créer (certains via @@index, d'autres nécessiteront une migration SQL brute pour les index partiels et GIN trigram)
- Les contraintes check à ajouter via migration SQL brute

J'approuverai le plan avant exécution.
```

### Prompt 1.2 🧠 — Migration SQL brute pour index avancés

```
Prisma ne supporte pas nativement les index GIN trigram ni les index partiels complexes ni les check constraints. 

Think hard et crée une migration Prisma brute (via `npx prisma migrate dev --create-only`) dans apps/api/prisma/migrations/ qui ajoute tous les éléments suivants MANQUANTS par rapport au schéma Prisma :

1. Index GIN trigram :
   - idx_persons_name_trgm sur persons(normalized_name) gin_trgm_ops
   - idx_person_names_normalized_trgm sur person_names(normalized_full_name) gin_trgm_ops

2. Index partiels (WHERE clauses) :
   - idx_accounts_phone où deleted_at IS NULL
   - idx_accounts_active où deleted_at IS NULL
   - idx_claims_one_verified_per_person UNIQUE sur person_id WHERE status = 'VERIFIED'
   - idx_identity_docs_unique_hash UNIQUE sur (document_type, document_number_hash) WHERE deleted_at IS NULL
   - idx_parent_child_parent où deleted_at IS NULL
   - idx_parent_child_child où deleted_at IS NULL

3. Check constraints :
   - chk_deceased_coherent sur persons (voir SPEC section 6.2)

4. Fonctions PL/pgSQL :
   - normalize_name(TEXT) RETURNS TEXT
   - get_ancestors(UUID, INTEGER) RETURNS TABLE
   - get_descendants(UUID, INTEGER) RETURNS TABLE
   - update_updated_at_column() trigger function

5. Triggers :
   - trigger_<table>_updated_at sur toutes les tables avec updated_at

Vérifie que la migration s'exécute sans erreur sur une base vide :
`cd apps/api && npx prisma migrate reset --force && npx prisma migrate dev`

Affiche ensuite la sortie de `npx prisma db pull` pour confirmer que le schéma Prisma reste cohérent avec la DB.
```

### Prompt 1.3 ⚡ — Types TypeScript partagés

```
Génère le package packages/shared-types/ qui exporte tous les types partagés entre le backend API et le frontend web.

Structure :
- packages/shared-types/src/index.ts (réexports)
- packages/shared-types/src/entities/ (types des entités métier)
- packages/shared-types/src/enums/ (enums partagés)
- packages/shared-types/src/dtos/ (DTOs de requête/réponse API)

Les types doivent :
- Refléter les modèles Prisma mais sans les dépendances Prisma (types "pures")
- Inclure tous les enums définis dans le schema (LifeStatus, ClaimStatus, VerificationLevel, UnionType, UnionStatus, ParentRelationshipType, DocumentType, DocumentVerificationStatus, NameType, DatePrecision, NotificationType)
- Définir les DTOs principaux : CreatePersonDto, UpdatePersonDto, CreateUnionDto, CreateParentChildDto, LoginRequestDto, VerifyOtpDto, CreateClaimDto, etc.
- Utiliser Zod pour les schémas de validation (runtime validation)

Export les types ET les schémas Zod. Le fichier index.ts doit tout réexporter proprement.

Ajoute aussi :
- tsconfig.json qui extends packages/config/tsconfig.base.json
- package.json avec les bons scripts (build, lint, typecheck)
- Build le package avec `tsc` et vérifie qu'il compile sans erreur
```

---

## Phase 2 — Backend API : Authentification

### Prompt 2.1 🏗️ — Scaffolding NestJS

```
Active Plan Mode.

Initialise l'application NestJS dans apps/api/ avec la structure modulaire suivante :

src/
├── main.ts
├── app.module.ts
├── common/
│   ├── decorators/
│   ├── filters/          (exception filters)
│   ├── guards/           (auth guards)
│   ├── interceptors/     (logging, transform)
│   ├── pipes/            (validation)
│   └── middleware/
├── config/
│   ├── configuration.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── validation.schema.ts (Joi)
├── prisma/
│   └── prisma.service.ts
├── modules/
│   ├── auth/              (à créer prompt suivant)
│   ├── accounts/
│   ├── persons/
│   ├── relationships/
│   ├── claims/
│   ├── identity-documents/
│   ├── media/
│   ├── notifications/
│   ├── matching/
│   └── invitations/
└── health/
    └── health.controller.ts

Configuration requise :
- NestJS 10+ avec TypeScript strict
- @nestjs/config pour configuration par env
- @nestjs/throttler pour rate limiting
- nestjs-pino pour logging structuré JSON
- @nestjs/swagger pour doc API auto (OpenAPI)
- @nestjs/terminus pour health checks
- class-validator + class-transformer
- helmet pour sécurité HTTP headers
- compression middleware

main.ts doit :
- Activer ValidationPipe global avec whitelist + forbidNonWhitelisted
- Activer le logger Pino
- Configurer CORS (origins par env)
- Monter Swagger à /api/docs
- Préfixer toutes les routes avec /api/v1
- Activer graceful shutdown

Prépare le plan complet avec :
- package.json complet (toutes les dépendances nécessaires)
- Structure de fichiers exacte
- Contenu initial de chaque fichier critique
- Variables d'env à documenter dans .env.example

J'approuverai avant exécution.
```

### Prompt 2.2 🧠 — Module Auth avec OTP

```
Consulte @SPEC.md section 7 (Authentification) et implémente le module apps/api/src/modules/auth/ complet.

Think hard sur la sécurité et le rate limiting.

Composants à créer :

1. auth.module.ts
2. auth.controller.ts avec endpoints :
   - POST /auth/otp/request { phoneNumber, channel?: 'SMS'|'WHATSAPP' }
   - POST /auth/otp/verify { phoneNumber, code }
   - POST /auth/logout
   - POST /auth/refresh { refreshToken }
   - GET /auth/me (requiert JWT)
3. auth.service.ts avec la logique :
   - requestOtp : génération code 6 chiffres crypto-secure, hash SHA-256, storage en DB avec expiration 5 min
   - Rate limiting : max 3 OTP / 15min / numéro, max 10 / jour / numéro
   - Détection SIM swap : compare device_id récent
   - sendOtp : abstraction via OtpSenderService (stratégie WhatsApp → SMS → Voice)
   - verifyOtp : vérifie hash, max 3 tentatives, marque verified=true, crée ou récupère Account
   - issueTokens : JWT access (15 min) + refresh (90 jours), stockés via Prisma
4. dto/ :
   - request-otp.dto.ts avec validation E.164 pour phoneNumber
   - verify-otp.dto.ts avec validation 6 chiffres
5. strategies/ :
   - jwt.strategy.ts (passport-jwt)
6. guards/ :
   - jwt-auth.guard.ts
   - optional-jwt-auth.guard.ts (pour endpoints semi-publics)
7. services/ :
   - otp-sender.service.ts avec interface et 3 implémentations (WhatsAppSender, SmsSender, VoiceSender) injectées via factory
   - Pour l'instant, implémenter uniquement un MockOtpSender qui log le code dans la console (en dev)
8. decorators/ :
   - @CurrentAccount() pour récupérer l'Account courant dans les controllers
   - @Public() pour marquer les endpoints publics

Contraintes de sécurité non-négociables :
- OTP stocké en hash SHA-256 + salt (jamais en clair)
- Code OTP jamais loggé (utiliser un masquage dans logger)
- Tokens JWT signés avec RS256 (RSA asymétrique), clés dans variables d'env
- Rate limiting strict avec @nestjs/throttler
- IP et device_id tracés pour audit

Tests unitaires obligatoires avec Jest :
- test/auth.service.spec.ts avec mocks de PrismaService et OtpSender
- Couverture minimum : génération OTP, vérification OTP, rate limiting, expiration

Exécute les tests : `cd apps/api && npm test -- auth`
Vérifie que tout passe vert avant de me rendre le résultat.
```

### Prompt 2.3 ✅ — Test E2E du flow auth

```
Crée un test E2E complet du flow d'authentification dans apps/api/test/auth.e2e-spec.ts.

Le test doit :
1. Démarrer l'app avec une DB de test (Testcontainers ou DB dockerisée dédiée)
2. Vérifier les scénarios :
   a. Demander un OTP avec un numéro valide → 200, OTP log visible
   b. Demander un OTP avec numéro invalide → 400
   c. Dépasser le rate limit (4 OTP en < 15 min) → 429
   d. Vérifier un OTP valide → 200 + tokens retournés
   e. Vérifier un OTP expiré (attendre 5+ min ou manipuler DB) → 401
   f. Vérifier un OTP avec mauvais code (3 tentatives) → 401 puis 403
   g. Rafraîchir un token valide → 200
   h. Appeler /auth/me sans token → 401
   i. Appeler /auth/me avec token valide → 200 + données account
   j. Logout puis réutiliser le token → 401

Le test doit s'exécuter via `npm run test:e2e` et être totalement autonome (DB reset avant chaque test).

Montre-moi la sortie complète de l'exécution des tests.
```

---

## Phase 3 — Backend API : Person et relations

### Prompt 3.1 🧠 — Module Persons

```
Consulte @SPEC.md sections 6 (modèle de données) et 8 (statut vie/décès obligatoire).

Think hard sur la logique métier de création de Person, particulièrement :
- Le statut life_status est OBLIGATOIRE (constraint DB déjà en place, mais validation côté appli aussi)
- La cohérence des dates (deceased_assumed=true acceptable uniquement si life_status=DECEASED et pas de date précise)
- La normalisation des noms pour matching (normalize_name, soundex, metaphone calculés automatiquement)

Implémente le module apps/api/src/modules/persons/ :

1. persons.module.ts
2. persons.controller.ts avec endpoints :
   - POST /persons — créer Person (JWT requis)
   - GET /persons/:id — récupérer une Person (avec règles de visibilité selon relation avec caller)
   - PATCH /persons/:id — modifier (niveau 2 requis pour modifier ancêtres partagés)
   - DELETE /persons/:id — soft delete (créateur uniquement ou admin)
   - GET /persons/:id/family-tree?degrees=2 — récupérer voisinage
   - POST /persons/:id/photo — upload photo (via media service)
3. persons.service.ts :
   - create : valide le DTO, calcule normalized_name/soundex/metaphone via fonction SQL, insère avec Prisma, crée entrée Contribution (audit)
   - findOne : récupère Person avec règles de visibilité
   - update : valide permissions, track modifications dans Contribution
   - softDelete : applique deleted_at, ne casse pas les relations existantes
   - getFamilyTree : appelle fonction SQL get_family_neighborhood(id, degrees) et retourne DTO structuré
4. dto/ :
   - create-person.dto.ts avec validation stricte, life_status required, cohérence dates via @ValidateIf
   - update-person.dto.ts (partial, sauf life_status toujours présent)
   - person-response.dto.ts (sans données sensibles selon contexte)
   - family-tree-response.dto.ts (structure avec nodes + edges)
5. services/ :
   - name-normalizer.service.ts : wrapper qui appelle les fonctions PostgreSQL
   - visibility.service.ts : calcule si un Account peut voir une Person donnée selon relations et privacy_level

Règles de visibilité (voir SPEC section 16.4) :
- Person DECEASED depuis > 10 ans → public si is_public=true
- Person DECEASED < 10 ans → visible aux degrés ≤ 4 du caller
- Person ALIVE → visible aux degrés ≤ 2 du caller sauf opt-in
- Mineurs (< 18 ans) → visible parents uniquement

Tests unitaires Jest dans persons.service.spec.ts couvrant :
- Création avec life_status=ALIVE
- Création avec life_status=DECEASED et dates variées
- Création avec life_status=UNKNOWN + deceased_assumed (doit accepter)
- Création avec life_status=DECEASED sans aucune info de date + deceased_assumed=false → doit rejeter
- Normalisation des noms (accents, casse, espaces)
- Soft delete
- Règles de visibilité

Tests E2E dans persons.e2e-spec.ts pour les endpoints principaux.

Exécute et montre la sortie des tests.
```

### Prompt 3.2 🧠 — Module Relationships (ParentChild + Union)

```
Consulte @SPEC.md section 6.

Implémente le module apps/api/src/modules/relationships/ qui gère :

1. Les relations parent-enfant (table parent_child)
2. Les unions/mariages (tables unions + union_partners)

Endpoints :

POST /relationships/parent-child
  body: { parentId, childId, relationshipType, unionId? }
  Règles :
  - Empêcher cycles (parent ne peut pas être descendant de l'enfant)
  - Empêcher doublons (unique constraint déjà en DB)
  - Vérifier cohérence dates si possible (parent né avant enfant)
  - Parent doit être plus âgé (tolérance 12 ans minimum si dates connues)

DELETE /relationships/parent-child/:id (soft delete)

POST /relationships/unions
  body: { unionType, status, startDate?, partners: [{personId, role, wifeRank?}] }
  Règles :
  - Minimum 2 partners
  - Polygamie : un homme (role=HUSBAND) peut avoir plusieurs Union actives avec différentes wife_rank
  - Une femme ne peut avoir qu'une Union ACTIVE à la fois (déclenche un warning, pas une erreur dure — respect des cas réels)

PATCH /relationships/unions/:id

POST /relationships/unions/:id/partners (ajouter partner à une union existante)

DELETE /relationships/unions/:id/partners/:partnerId

GET /relationships/parents/:personId → liste des parents de la personne
GET /relationships/children/:personId → liste des enfants
GET /relationships/siblings/:personId → dérivé (enfants des parents, sauf la personne elle-même)
GET /relationships/spouses/:personId → partenaires des unions actuelles
GET /relationships/all-unions/:personId → toutes les unions (passées et présentes)

Service avec logique métier stricte :
- relationships.service.ts
- Détection de cycles via requête récursive Prisma
- Détection de doublons
- Track de tout changement dans Contribution

DTOs avec validation class-validator.

Tests unitaires + E2E couvrant :
- Création relation parent-enfant standard
- Rejet cycle (A parent de B, puis B parent de A → doit échouer)
- Création union monogame
- Création union polygame (1 homme, 3 femmes avec wifeRank 1, 2, 3)
- Ajout d'enfant à une union existante
- Récupération du voisinage familial complet

Exécute les tests et montre la sortie.
```

### Prompt 3.3 🧠 — Fonction get_family_neighborhood

```
La fonction SQL get_family_neighborhood(person_uuid, max_degrees) mentionnée dans @SPEC.md section 6.2 n'a été qu'esquissée. Implémente-la complètement.

Think hard sur la logique :
- Degré 1 = parents + enfants + conjoint(s)
- Degré 2 = grands-parents + petits-enfants + fratrie (via parents) + oncles/tantes (fratrie des parents) + neveux/nièces (enfants de la fratrie)
- Degré 3 = arrière-grands-parents + arrière-petits-enfants + cousins germains (enfants des oncles/tantes) + grands-oncles/tantes
- Etc.

Crée une migration Prisma `add_family_neighborhood_function` qui :

1. Définit le type de retour FamilyNeighbor :
   - person_id UUID
   - relationship_label TEXT (ex: 'PARENT', 'CHILD', 'SPOUSE', 'SIBLING', 'GRANDPARENT', 'UNCLE_AUNT', 'COUSIN', etc.)
   - degree INTEGER
   - path UUID[] (chemin dans le graphe jusqu'à cette personne)

2. Implémente la fonction PL/pgSQL get_family_neighborhood(person_uuid UUID, max_degrees INTEGER DEFAULT 2)
   qui retourne TABLE(person_id UUID, relationship_label TEXT, degree INTEGER, path UUID[])

Stratégie :
- Utiliser CTE récursives
- Commencer par la personne elle-même
- Explorer en largeur via parent_child et union_partners
- Étiqueter correctement chaque relation selon la nature du lien
- Éviter cycles (vérifier path)
- Respecter la limite max_degrees

3. Crée aussi une fonction helper get_person_with_neighborhood(person_uuid UUID, max_degrees INTEGER) qui retourne un JSON complet avec toutes les données (noms, photos, life_status) des personnes du voisinage, structuré pour affichage direct par le frontend.

Teste la fonction avec un dataset de test que tu crées dans apps/api/prisma/seed-test-family.ts :
- Crée 4 générations d'une famille polygame fictive (30+ persons)
- Lance get_family_neighborhood sur la 3ème génération, degrees=2
- Vérifie que le résultat inclut bien : parents, grands-parents, fratrie, oncles/tantes, cousins, enfants (s'il en a), conjoint(s)

Montre la sortie du test.
```

---

## Phase 4 — Backend API : Claims, Matching, Identity

### Prompt 4.1 🧠 — Module Matching (moteur de dédoublonnage)

```
Consulte @SPEC.md section 9 (Moteur de matching et dédoublonnage).

Think hard sur l'algorithme en deux phases (blocking + scoring) et les pondérations des signaux.

Implémente apps/api/src/modules/matching/ :

1. matching.module.ts
2. matching.service.ts :
   - findCandidates(person: Partial<Person> & { parentsHints?, villageHint?, ethnicityHint? }): Promise<MatchCandidate[]>
     → Phase 1 : blocking via requête SQL avec pg_trgm similarity + soundex
     → Retourne max 100 candidats
   - scoreMatch(candidate: Person, target: Partial<Person>): MatchScore
     → Phase 2 : calcul des scores par signal
     → Retourne { finalScore, signals: { nameScore, phoneticScore, dateScore, parentScore, locationScore } }
   - findDuplicates(personId: string): Promise<MergeCandidate[]>
     → Utilisé par job nocturne
3. matching.controller.ts (pour tests et admin) :
   - POST /matching/search { name, birthYear?, village?, parentName? } → candidats
   - GET /matching/duplicates/:personId → candidats de fusion
4. algorithms/ :
   - levenshtein.ts
   - jaro-winkler.ts
   - date-proximity.ts (calcul de proximité entre dates floues)
   - phonetic.ts (wrapper soundex/metaphone)

Pondérations (à respecter strictement) :
```
final_score =
    0.30 * name_similarity_score +
    0.15 * phonetic_similarity_score +
    0.20 * date_proximity_score +
    0.15 * parent_overlap_score +
    0.10 * location_match_score +
    0.10 * other_signals_score
```

Seuils de décision :
- score >= 0.90 : auto_match = true
- 0.70 <= score < 0.90 : suggest_to_user = true
- score < 0.70 : ignore

BONUS déterministe : si même CNI hash trouvé → score = 0.95 automatique, skip autres calculs.

5. Tests unitaires Jest avec dataset fixture :
   - tests/fixtures/matching-fixtures.ts avec 20 Person synthétiques (vrais noms camerounais : Mbarga, Ngoue, Ebossongo, etc.)
   - Tests couvrant :
     * Match exact (score > 0.95)
     * Match fort avec variation orthographique du nom (score 0.80-0.90)
     * Match moyen avec parents communs (score 0.70-0.80)
     * Non-match évident (score < 0.30)
     * Match par CNI (score = 0.95 via bonus)

Exécute tests et montre la sortie.
```

### Prompt 4.2 🧠 — Module Claims et vérification

```
Consulte @SPEC.md sections 7 (auth), 9 (matching), 10 (niveaux de vérification).

Implémente apps/api/src/modules/claims/ :

Endpoints :

1. POST /claims { personId } — Un Account revendique être une Person
   Règles :
   - Empêcher un Account de claimer 2 Persons différentes (limite 1 claim VERIFIED)
   - Si la Person a déjà un claim VERIFIED par un autre Account → créer avec status=DISPUTED
   - Sinon → status=PENDING si pas de créateur ou status=PENDING_VERIFICATION
   - Notifier le créateur originel de la Person pour validation

2. POST /claims/:id/validate (Account proche validant)
   Règles :
   - Le validator doit être lié à la Person (degré ≤ 2)
   - Ajouter dans validated_by_account_ids
   - Si validation_count >= 1 (créateur) OU >= 2 (proches vérifiés) → passer en VERIFIED
   - Mettre à jour Person.claimed_by_account_id et claim_verified_at

3. POST /claims/:id/dispute { reason } (Account contestant)
   Règles :
   - Le contestant doit être lié à la Person
   - Status du claim passe à DISPUTED
   - Crée une VerificationRequest pour modération

4. GET /claims/pending — Claims en attente liés à l'Account courant (à valider)

5. GET /claims/mine — Claims de l'Account courant

6. DELETE /claims/:id — Annuler son propre claim

Service :
- claims.service.ts avec la logique de validation progressive
- Intégration avec NotificationsService pour alerter les validators
- Audit trail complet dans Contribution

Calcul automatique du verification_level :
- 0 UNVERIFIED : aucun claim
- 1 SELF_DECLARED : claim PENDING
- 2 COMMUNITY_VERIFIED : claim VERIFIED + ≥ 2 validators proches
- 3 DOCUMENT_DECLARED : + IdentityDocument avec verification_status=SELF_DECLARED
- 4 DOCUMENT_VERIFIED : + IdentityDocument avec verification_status=DOCUMENT_VERIFIED
- 5 ADMIN_VERIFIED : + validation admin explicite

Implémente recalculateVerificationLevel(personId) qui met à jour Person.verification_level après tout changement.

Tests E2E :
- Scénario complet : Jean-Paul crée une Person pour Thérèse, Thérèse s'inscrit et claim, Jean-Paul valide, la mère de Thérèse (déjà Account) valide → level passe à 2
- Scénario conflit : Account A et Account B claiment la même Person → DISPUTED
- Scénario refus : créateur ne valide pas dans les 30 jours → claim expire

Montre les résultats des tests.
```

### Prompt 4.3 🧠 — Module IdentityDocuments avec chiffrement

```
Consulte @SPEC.md sections 7 (CNI) et 16 (sécurité).

Think hard sur la sécurité : hash SHA-256, chiffrement AES-256-GCM via KMS, last4 en clair, jamais de log du numéro complet.

Implémente apps/api/src/modules/identity-documents/ :

Endpoints :

1. POST /identity-documents
   body: { personId, documentType, documentNumber, issueDate?, expiryDate?, issuingAuthority? }
   Process :
   - Normaliser le numéro (supprimer espaces, tirets, etc.)
   - Calculer hash SHA-256 avec sel dérivé de l'Account (permet détection doublons inter-Account sans révéler le numéro)
   - Extraire les 4 derniers chiffres en clair
   - Chiffrer le numéro complet via KMS (AES-256-GCM)
   - Sauvegarder dans DB avec verification_status=SELF_DECLARED
   - Si hash existe déjà pour ce document_type → flagger duplicate, créer MergeProposal
   - Ne JAMAIS logger le numéro complet

2. GET /identity-documents/person/:personId
   - Retourne les documents masqués : { type, last4, verificationStatus, issueDate, ... }
   - Seul le propriétaire (claim verified) peut voir le numéro complet (via endpoint dédié avec re-auth)

3. GET /identity-documents/:id/reveal (re-auth OTP requise)
   - Uniquement pour le propriétaire
   - Déchiffre via KMS
   - Retourne le numéro complet
   - Log l'accès dans audit

4. POST /identity-documents/:id/upload-scan
   - Upload d'une photo de la CNI (via MediaService)
   - Stockage chiffré S3 avec lifecycle 90 jours
   - Trigger OCR (job asynchrone)
   - Crée VerificationRequest pour revue humaine

5. POST /identity-documents/:id/verify (admin uniquement)
   - Change verification_status à DOCUMENT_VERIFIED
   - Recalcule verification_level de la Person

6. DELETE /identity-documents/:id
   - Soft delete
   - Déclenche suppression du scan S3 immédiatement (pas de grace period)

Services :
- identity-documents.service.ts
- encryption.service.ts : wrapper KMS avec injection pour tests (MockKmsService en dev)
- document-validator.service.ts :
  - Valide format CNI camerounaise (9-10 chiffres)
  - Valide cohérence dates (émission après naissance, âge minimum 18 ans à l'émission)

Pour le dev local : utiliser LocalStack KMS (déjà dans docker-compose).

Variables d'env à ajouter :
- KMS_KEY_ID
- DOCUMENT_HASH_SALT_BASE (secret, différent par environnement)

Tests :
- Chiffrement/déchiffrement round-trip
- Détection de duplicate par hash
- Validation format CNI camerounaise
- Validation cohérence dates
- Refus d'accès au numéro complet si pas owner

Exécute les tests et montre la sortie.
```

---

## Phase 5 — Backend API : Invitations, Media, Notifications

### Prompt 5.1 ⚡ — Module Invitations

```
Consulte @SPEC.md section 14.2 (flow invitation).

Implémente apps/api/src/modules/invitations/ :

Endpoints :

1. POST /invitations
   body: { targetPersonId?, targetPhoneNumber?, relationshipHint }
   Process :
   - Générer token cryptographiquement sûr (64 caractères base64url)
   - Signer avec HMAC-SHA256 (secret env)
   - Expiration 90 jours
   - Stocker en DB
   - Retourner le lien complet : https://app.genealogie.cm/join?invite=<token>

2. GET /invitations/verify/:token
   - Public (pas d'auth requise)
   - Retourne les infos pré-remplies (Person cible si applicable)
   - N'incrémente pas used_at (juste une lecture)

3. POST /invitations/consume
   body: { token }
   Requiert JWT (le user vient de faire OTP)
   Process :
   - Valider le token (signature, expiration, non-utilisé)
   - Si target_person_id fourni : créer un Claim PENDING pour le nouvel Account sur cette Person
   - Notifier l'inviter que la personne a rejoint
   - Marquer le token comme used

4. GET /invitations/mine — liste des invitations envoyées par l'Account courant (avec statut)

5. DELETE /invitations/:id — révoquer une invitation non utilisée

Service :
- invitations.service.ts
- Génération du message pré-rédigé pour WhatsApp/SMS :
  * Français : "Salut [Prénom], je suis sur Nkap et j'ai ajouté notre famille. Rejoins-moi : [lien]"
  * Anglais : "Hi [FirstName], I'm on Nkap and I've added our family. Join me: [link]"

Tests E2E du flow complet :
- Alice invite Bob avec target_phone
- Bob reçoit le lien, ouvre /verify → voit qui l'invite
- Bob fait OTP, consume le token
- Alice reçoit notification
- Le token ne peut plus être réutilisé

Montre les résultats.
```

### Prompt 5.2 ⚡ — Module Media

```
Implémente apps/api/src/modules/media/ pour gérer l'upload et la distribution de fichiers.

Endpoints :

1. POST /media/upload-url
   body: { fileName, mimeType, purpose: 'PROFILE_PHOTO' | 'DOCUMENT_SCAN' | 'MEMORIAL_MEDIA' }
   Retourne : { uploadUrl (S3 presigned PUT), mediaId, expiresIn }
   
2. POST /media/:id/confirm
   Confirmer l'upload terminé, déclencher post-traitement :
   - Si PROFILE_PHOTO : trigger job de resize (3 tailles : 96px, 256px, 1024px)
   - Si DOCUMENT_SCAN : trigger job OCR + marquer is_encrypted=true
   - Update DB avec dimensions, file_size_bytes
   
3. GET /media/:id — redirige vers CloudFront CDN URL (pour photos publiques)
4. GET /media/:id/private — stream direct avec auth (pour scans privés)
5. DELETE /media/:id — soft delete + trigger suppression S3

Service :
- media.service.ts avec @aws-sdk/client-s3
- image-processor.service.ts avec sharp pour resize
- Pour scans CNI : chiffrement côté serveur avant upload (KMS)

En dev local, utiliser LocalStack S3 au lieu d'AWS S3 réel.

Configuration buckets :
- genealogie-photos-public (profil, mémorial) → public via CloudFront
- genealogie-documents-private (scans CNI) → privé, lifecycle 90 jours, SSE-KMS

Tests :
- Upload photo profil complet (presigned → PUT → confirm → GET)
- Upload document privé (chiffrement vérifié en S3)
- Suppression avec cleanup S3

Montre les résultats.
```

### Prompt 5.3 ⚡ — Module Notifications

```
Consulte @SPEC.md section 18 (support utilisateur, rappels WhatsApp).

Implémente apps/api/src/modules/notifications/ :

Endpoints :

1. GET /notifications — liste paginée des notifications du caller
2. POST /notifications/:id/mark-read
3. POST /notifications/mark-all-read
4. GET /notifications/unread-count
5. PATCH /notifications/preferences { pushEnabled, whatsappEnabled, smsEnabled, emailEnabled }

Service :
- notifications.service.ts :
  - send(accountId, notificationType, data): Promise<void>
  - Logique de routage : push > whatsapp > sms selon préférences Account et urgence
- senders/ :
  - push-sender.service.ts (Firebase Cloud Messaging — mock en dev)
  - whatsapp-sender.service.ts (Meta Business API — mock en dev)
  - sms-sender.service.ts (Africa's Talking — mock en dev)

Templates de notifications (à définir dans notifications-templates.ts) :

- INVITATION_RECEIVED : "Ton cousin [Nom] t'a invité dans l'arbre familial"
- CLAIM_REQUEST : "[Nom] prétend être le profil que tu as créé. Confirmer ?"
- CLAIM_VALIDATED : "Ton profil a été validé par [Nom] !"
- MERGE_PROPOSAL : "On a trouvé un possible doublon pour [Nom]. Vérifier ?"
- MODIFICATION_SUGGESTED : "[Nom] propose une modification sur [Personne]"
- NEW_FAMILY_MEMBER : "[Nom] a rejoint l'arbre familial !"
- DECEASE_REPORTED : "La famille partage le décès de [Nom]" (version respectueuse)
- BIRTHDAY_REMINDER : "Aujourd'hui c'est l'anniversaire de [Nom]"
- MEMORIAL_REMINDER : "Il y a [N] ans, [Nom] nous quittait"
- DOCUMENT_VERIFIED : "Ton document d'identité a été vérifié avec succès"

Chaque template bilingue (fr + en) selon la préférence de l'Account.

Queue BullMQ pour envois asynchrones :
- Queue "notifications-dispatch"
- Retry avec backoff exponentiel (max 5 tentatives)
- Dead letter queue pour investigations

Tests :
- Envoi d'une notif via tous les canaux (mock)
- Routage selon préférences
- Comportement si aucun canal disponible

Montre les résultats.
```

---

## Phase 6 — Mobile Flutter : Setup et Auth

### Prompt 6.1 🏗️ — Scaffolding Flutter

```
Active Plan Mode.

Consulte @SPEC.md sections 11.1 (stack mobile), 12 (UX), 13 (design system).

Plan pour initialiser l'app Flutter dans apps/mobile/ :

1. flutter create avec configuration :
   - org: cm.genealogie.nkap (adapter si autre nom)
   - Android minSdkVersion 23 (Android 6.0+, couvre 95% des téléphones camerounais)
   - iOS min 13.0
   - Support bilingue fr/en

2. Structure folders :
   lib/
   ├── main.dart
   ├── app.dart (MaterialApp + theme + router)
   ├── core/
   │   ├── config/
   │   ├── constants/
   │   ├── errors/
   │   ├── network/ (Dio client + interceptors)
   │   ├── storage/ (secure storage + SharedPreferences)
   │   ├── theme/ (ThemeData + colors + typography)
   │   └── utils/
   ├── data/
   │   ├── datasources/ (API remote + local SQLite)
   │   ├── models/ (serializable via freezed/json_serializable)
   │   └── repositories/ (pattern repository)
   ├── domain/
   │   ├── entities/ (pures, sans dépendance framework)
   │   ├── repositories/ (interfaces)
   │   └── usecases/
   ├── presentation/
   │   ├── screens/
   │   │   ├── splash/
   │   │   ├── onboarding/
   │   │   ├── auth/
   │   │   ├── home/
   │   │   ├── tree/
   │   │   ├── person/
   │   │   ├── profile/
   │   │   └── settings/
   │   ├── widgets/ (composants réutilisables)
   │   ├── blocs/ (flutter_bloc)
   │   └── routes/ (go_router config)
   └── l10n/ (ARB files fr + en)

3. Dépendances (pubspec.yaml) :
   - flutter_bloc, bloc, equatable (state management)
   - go_router (navigation)
   - dio (HTTP)
   - freezed, freezed_annotation, json_annotation (immutable data)
   - drift, drift_dev (SQLite local)
   - flutter_secure_storage (tokens)
   - shared_preferences (préférences non sensibles)
   - image_picker, flutter_image_compress
   - google_mlkit_text_recognition (OCR CNI)
   - firebase_messaging (push notifications)
   - connectivity_plus (détection online/offline)
   - intl, flutter_localizations (i18n)
   - cached_network_image (cache images)
   - flutter_svg (illustrations SVG)
   - url_launcher (ouverture WhatsApp, SMS)
   - permission_handler
   - device_info_plus
   - package_info_plus
   - sentry_flutter (monitoring)

4. Configuration :
   - analysis_options.yaml strict (flutter_lints + rules supplémentaires)
   - .vscode/launch.json avec flavors dev/staging/prod
   - Build flavors : dev, staging, prod (avec bundle IDs différents)
   - .env.dev, .env.staging, .env.prod (via flutter_dotenv)

5. Design system initial :
   - lib/core/theme/app_colors.dart avec la palette de @SPEC.md section 13.1
   - lib/core/theme/app_typography.dart avec Inter font, échelle typographique
   - lib/core/theme/app_spacing.dart (base 4px)
   - lib/core/theme/app_theme.dart (ThemeData light + éventuellement dark)

6. Widgets de base :
   - lib/presentation/widgets/primary_button.dart (56px, rond, feedback haptique)
   - lib/presentation/widgets/secondary_button.dart (48px)
   - lib/presentation/widgets/input_field.dart (56px, label au-dessus)
   - lib/presentation/widgets/profile_avatar.dart (cercle, fallback initiales colorées)
   - lib/presentation/widgets/bottom_sheet_base.dart
   - lib/presentation/widgets/loading_indicator.dart (feuilles qui bougent, pas spinner)

Présente le plan complet. J'approuverai.
```

### Prompt 6.2 🧠 — Flow d'authentification OTP

```
Consulte @SPEC.md section 14.1 (user journey — écrans 3 et 4) et section 7 (auth).

Think hard sur l'UX : auto-remplissage OTP Android via SMS Retriever, transitions fluides, feedback haptique.

Implémente le flow complet d'authentification Flutter :

1. Screen SplashScreen (lib/presentation/screens/splash/splash_screen.dart)
   - Logo + animation courte
   - Vérifie token existant → redirige vers home si valide, onboarding sinon

2. Screen OnboardingScreen (lib/presentation/screens/onboarding/onboarding_screen.dart)
   - Écran unique (pas de swipe multi-pages)
   - Illustration famille
   - Texte : "Retrouve et sauvegarde l'histoire de ta famille."
   - 3 mini-points avec icônes
   - Bouton "C'est parti"

3. Screen PhoneInputScreen (lib/presentation/screens/auth/phone_input_screen.dart)
   - Champ téléphone avec indicatif +237 pré-rempli (sélecteur de pays pour diaspora)
   - Clavier numérique auto-ouvert
   - Détection opérateur auto (par préfixe) avec affichage logo discret
   - Validation format E.164 en temps réel
   - Bouton "Recevoir le code"

4. Screen OtpVerificationScreen (lib/presentation/screens/auth/otp_verification_screen.dart)
   - 6 cases numériques avec PinCodeTextField
   - Auto-remplissage via sms_autofill package (Android SMS Retriever)
   - Compte à rebours 30s avant "Renvoyer le code"
   - Bouton "Je n'ai pas reçu le code" → bottom sheet avec options (renvoyer SMS, WhatsApp, appeler assistant)
   - Transition automatique à 6 chiffres (pas de bouton Valider)
   - Animation de succès avec haptic feedback

5. AuthBloc (lib/presentation/blocs/auth/auth_bloc.dart) :
   - Events : RequestOtp, VerifyOtp, Logout, Refresh, CheckAuth
   - States : AuthInitial, AuthLoading, AuthOtpSent, AuthAuthenticated, AuthError
   - Persistance des tokens via flutter_secure_storage
   - Auto-refresh du token en arrière-plan avant expiration

6. AuthRepository (lib/data/repositories/auth_repository_impl.dart) :
   - Appels API via Dio
   - Gestion erreurs (réseau, rate limit 429, OTP invalide 401)
   - Retry automatique sur erreurs réseau transitoires

7. Configuration sms_autofill :
   - AndroidManifest.xml : permission RECEIVE_SMS optionnelle (pas nécessaire avec SMS Retriever API)
   - Application hash injecté dans les SMS côté backend pour auto-fill

Important pour UX :
- Langue française par défaut, toggle EN accessible
- Retour haptique sur validation OTP réussie
- Messages d'erreur humains : "Ça n'a pas marché, réessaie" (jamais technique)
- Si rate limited → "Attends encore X minutes avant de réessayer"
- Offline : détection via connectivity_plus, message adapté
- Typographie grande (18-20px body) respectée

Tests :
- Widget tests pour chaque screen
- Bloc tests pour AuthBloc (tous les events/states)

Livre le code complet, lance `flutter analyze` et `flutter test` et montre la sortie.
```

### Prompt 6.3 🧠 — Écran d'identification (matching silencieux)

```
Consulte @SPEC.md section 14.1 écrans 5 et 6 (identification et matching silencieux).

Think hard sur la psychologie utilisateur : moment où on demande le nom, animation discrète pendant recherche, présentation des candidats de façon non anxiogène.

Implémente :

1. Screen NameInputScreen (lib/presentation/screens/auth/name_input_screen.dart)
   - Après OTP validé avec succès, pas de compte existant
   - Titre doux : "Comment t'appelles-tu ?"
   - Champ unique "Nom complet"
   - Accepte les noms avec/sans accents, casse variable
   - Bouton "Continuer"
   - Auto-save en local pour reprendre si interruption

2. Screen IdentityMatchingScreen (lib/presentation/screens/auth/identity_matching_screen.dart)
   - Animation douce 1-2 secondes (widget AnimatedLeaves, pas CircularProgressIndicator)
   - Pendant l'animation : appel API POST /matching/search
   - 3 états possibles :
     
     A. Match fort unique :
        - Texte : "On a peut-être trouvé ton profil"
        - Carte grande et visuelle avec :
          * Photo (ou initiales colorées)
          * Nom complet
          * Année naissance approximative
          * "Fils/Fille de [parents]"
          * "Village [village]"
          * "Ajouté(e) par [créateur]"
        - Deux gros boutons : "Oui c'est moi" (vert, primary) / "Non, ce n'est pas moi" (gris, secondary)
     
     B. Plusieurs candidats (2-3) :
        - Texte : "On a trouvé plusieurs personnes, laquelle es-tu ?"
        - Stack de cartes scrollable
        - Bouton "Aucune d'elles" en bas (lien discret)
     
     C. Aucun match :
        - Message bref : "Bienvenue ! Créons ton profil"
        - Transition directe vers écran suivant (pas de bouton)

3. IdentityMatchingBloc :
   - Events : SearchCandidates, ConfirmMatch, RejectMatch
   - States : SearchingMatches, MatchesFound, NoMatchFound, MatchConfirmed
   - Sur ConfirmMatch : créer un Claim via API → succès → naviguer vers HomeScreen
   - Sur RejectMatch ou NoMatch : naviguer vers PhotoCaptureScreen

4. Widget CandidateCard :
   - Réutilisable
   - Design chaleureux avec photo ronde
   - Highlighting subtil au tap
   - Indicateur de score de match masqué (on n'affiche pas "92% sûr" à Thérèse, mais on peut montrer des indicateurs visuels subtils)

Gestion erreurs :
- Si l'API échoue, afficher un écran d'erreur doux avec option "Réessayer" et "Créer nouveau profil"
- Timeout 10 secondes max sur la recherche

Tests widgets couvrant les 3 états.

Livre le code et montre `flutter analyze`.
```

---

## Phase 7 — Mobile Flutter : Création d'arbre

### Prompt 7.1 🧠 — Flow ajout papa/maman avec life_status obligatoire

```
Consulte @SPEC.md section 8 (life_status obligatoire, UX respectueuse) et section 14.1 écran 8.

CRITICAL : le statut vie/décès est OBLIGATOIRE. Langage "Avec nous" / "Nous a quittés" (jamais "Vivant/Décédé"). Option "Je ne sais pas vraiment" apparaît UNIQUEMENT après hésitation.

Think hard sur les micro-interactions et la psychologie respectueuse.

Implémente :

1. Screen AddParentScreen (lib/presentation/screens/person/add_parent_screen.dart)
   Flow en 3 micro-étapes :
   
   Étape A — NameStep :
   - Titre : "Comment s'appelle ton papa ?" / "Comment s'appelle ta maman ?" (selon paramètre)
   - Champ unique
   - Bouton "Continuer" (activé quand champ non vide)
   
   Étape B — LifeStatusStep :
   - Titre : "[Prénom] est-il encore parmi nous ?" / "[Prénom] est-elle encore parmi nous ?" (adapter genre)
   - Deux grandes cartes côte à côte :
     * 🌿 "Avec nous" (fond vert doux, icône feuille)
     * 🕊️ "Nous a quittés" (fond gris doux, icône colombe)
   - Tap sur carte → navigation auto
   - Détection hésitation :
     * Si utilisateur reste > 10 secondes sans tap
     * OU tap sur une carte puis revient en arrière sans valider
     → Apparition discrète d'un lien : "Je ne sais pas vraiment — c'est un ancêtre lointain"
     → Tap sur ce lien ouvre un bottom sheet explicatif + bouton "C'est un ancêtre mémoire"
     → Si confirmé : life_status=DECEASED, deceased_assumed=true, skip étape C
   
   Étape C (seulement si "Nous a quittés" sans deceased_assumed) — DeceasedDateStep :
   - Titre : "En quelle année nous a-t-il/elle quittés ?"
   - Sous-titre : "Si tu ne sais pas précisément, choisis approximativement."
   - Options visuelles :
     * Boutons rapides : "Cette année", "L'an dernier", "Il y a 2 ans"
     * Grille de décennies : "années 2010", "années 2000", "années 90", "années 80", "années 70", "avant 1970"
     * Bouton "Je ne sais pas vraiment" (acceptable ici)
     * Lien discret "Saisir une date précise" → ouvre date picker

2. AddPersonBloc :
   - Events : SetName, SetLifeStatus, SetDeceasedDate, ToggleAncestorMode, SubmitPerson
   - Model AddPersonFormModel avec validation :
     * name required
     * life_status required (ALIVE, DECEASED, ou UNKNOWN avec deceased_assumed=true)
     * Si DECEASED et !deceased_assumed : au moins un champ de date (précise, année, décennie, ou text)
   - Submit : appel API POST /persons + création ParentChild relation

3. Widgets spécifiques :
   - LifeStatusCard (carte interactive grande et visuelle)
   - DecadeSelector (grille de décennies)
   - HesitationDetector (widget invisible qui track les interactions et émet un event après 10s)
   - AncestorMemoryBottomSheet

4. Animations :
   - Transition Hero entre micro-étapes (même "carte" qui s'adapte)
   - Feedback haptique sur sélection life_status
   - Animation d'apparition du lien "ancêtre lointain" (fade in doux, pas brusque)
   - Confettis discrets après submit réussi

Tests widgets :
- Flow complet "papa vivant"
- Flow complet "papa décédé avec année connue"
- Flow complet "ancêtre mémoire"
- Détection hésitation + apparition lien
- Validation formulaire bloquant submit si life_status manquant

Livre le code, exécute tests, montre sortie.
```

### Prompt 7.2 ⚡ — Flow fratrie + première vue d'arbre

```
Consulte @SPEC.md section 14.1 écrans 10 et 11.

Implémente :

1. Screen AddSiblingsScreen (lib/presentation/screens/person/add_siblings_screen.dart)
   - Titre : "Tu as combien de frères et sœurs ?"
   - Compteur visuel +/- (gros boutons tactiles)
   - À chaque incrément, apparition d'une carte vide "Frère/Sœur 1", etc.
   - Tap sur carte → mini-form : nom + life_status (même widget que AddParentScreen étape B/C)
   - Bouton persistant "C'est bon pour l'instant" (permet skip sans perdre progress)

2. Screen FamilyTreeFirstViewScreen (lib/presentation/screens/tree/family_tree_first_view_screen.dart)
   - Animation d'apparition des nœuds et liens
   - Vue radiale simple : utilisateur au centre, parents au-dessus, fratrie à côté, enfants en-dessous (si ajoutés)
   - Overlay : "Voilà ton arbre ! Continue à l'enrichir."
   - Deux boutons : "Continuer à remplir" / "Explorer mon arbre"

3. Widget FamilyTreeRadialView (réutilisable) :
   - Utiliser CustomPainter pour rendu Canvas performant
   - Support pan + pinch zoom
   - Rendu des nœuds :
     * Cercle avec photo (ou initiales colorées)
     * Vivants : bordure verte, photo couleur
     * Décédés : bordure grise, filtre sépia sur photo
     * Ancêtres mémoire : silhouette stylisée
   - Liens :
     * Trait plein pour parent-enfant
     * Trait double pour union
   - Tap sur nœud → ouvre PersonDetailBottomSheet (à créer prompt suivant)

Pour cette première version, implémente un layout radial simple (pas besoin de layout automatique complexe type Reingold-Tilford tout de suite — on itérera).

Tests widgets et un golden test sur le rendu radial simple.

Livre le code, montre résultat.
```

### Prompt 7.3 ⚡ — Fiche détaillée Person (bottom sheet)

```
Implémente le widget PersonDetailBottomSheet et l'écran associé.

Contenu du bottom sheet (slide depuis le bas, pas nouvelle page) :
- Photo en grand (160px)
- Nom complet
- Si DECEASED : dates de vie (ex "1945 — 2020") + symbole respectueux
- Relation avec le caller (ex "Ton papa", "Ta grand-mère")
- Village d'origine, ethnie (si visible)
- Bouton "Voir plus" → ouvre fiche complète en page

Actions disponibles (selon permissions) :
- Si Person ALIVE non claimée : bouton "Inviter" (priorité WhatsApp)
- Si créateur : bouton "Modifier"
- Si proche (degré ≤ 2) : bouton "Suggérer modification"
- Bouton "Ajouter une relation" (papa, maman, conjoint, enfant, fratrie)
- Si ALIVE : bouton discret "Signaler un décès" (très discret)
- Si DECEASED : bouton "Laisser un souvenir" (mémorial)

Fiche complète (FullPersonScreen) :
- Header avec photo + infos principales
- Section "Famille" (parents, conjoint(s), enfants, fratrie)
- Section "Biographie" (si renseignée)
- Section "Souvenirs" (pour décédés : messages et photos laissés par proches)
- Section "Documents" (masqués, seul le propriétaire voit les détails)

Le bouton "Inviter" :
- Ouvre bottom sheet avec deux boutons :
  * WhatsApp (priorité) : ouvre WhatsApp via url_launcher avec message pré-rédigé
  * SMS : ouvre app SMS native
- Appel API POST /invitations pour créer le token avant ouverture

Le bouton "Signaler un décès" :
- Modal respectueux (pas anxiogène)
- Texte : "Signaler le décès de [Nom]. Cette information sera visible par la famille. Merci de saisir avec soin."
- Champ date + champ circonstances optionnel
- Validation → appel API PATCH /persons/:id avec life_status=DECEASED en status pending
- Feedback : "Merci. La famille sera notifiée pour confirmation."

Livre le code avec tests widgets.
```

---

## Phase 8 — Mobile Flutter : Visualisation avancée

### Prompt 8.1 🧠 — Vue radiale complète avec zoom et interactions

```
La vue radiale simple du prompt 7.2 est suffisante pour l'MVP. Maintenant on l'améliore.

Think hard sur la performance (Canvas vs widgets, dirty regions, lazy loading) et l'UX (gestures, recentrage).

Implémente la version avancée de FamilyTreeRadialView :

1. Layout radial intelligent :
   - Cercle 0 : la Person sélectionnée (disque 160px)
   - Cercle 1 : parents (haut), conjoint(s) (côté), enfants (bas), fratrie (côté opposé)
   - Cercle 2 : grands-parents, oncles/tantes, cousins, neveux, petits-enfants
   - Cercle 3+ : apparition au zoom

2. Interactions :
   - Pan avec inertie
   - Pinch zoom (min 0.5x, max 3x)
   - Zoom progressif fait apparaître les cercles de degrés supérieurs
   - Double tap → zoom sur un nœud (recentrage)
   - Long press → menu contextuel rapide (modifier, ajouter relation, inviter)
   - Tap simple → ouvre PersonDetailBottomSheet

3. Nœuds vides suggestifs :
   - Afficher emplacements pointillés pour relations manquantes évidentes
   - Ex : si parents du père non renseignés, emplacements "Grand-père paternel" et "Grand-mère paternelle" en pointillés
   - Tap → pré-ouverture de AddParentScreen avec contexte

4. Boutons d'action flottants :
   - Bouton + principal (ajouter une personne liée à celle au centre)
   - Bouton Recentrer (retour sur soi-même)
   - Bouton Mode Liste (toggle vers ListFamilyView)

5. Performance :
   - CustomPainter avec cache des positions calculées
   - Repaint uniquement sur pan/zoom (ShouldRepaint intelligent)
   - Images avec cached_network_image + LRU cache
   - Lazy loading des cercles 3+ (seulement fetch via API quand zoom le fait apparaître)

6. Mode Liste alternatif (ListFamilyView) :
   - Pour utilisateurs qui se perdent dans le radial
   - Sections : Ascendants (parents, grands-parents, etc.), Descendants, Famille étendue
   - Tri par proximité de degré
   - Même interaction tap → PersonDetailBottomSheet

Tests :
- Golden tests pour différents états (peu de personnes, beaucoup, avec vides)
- Tests d'interaction (tap, long press, pan, zoom)
- Benchmark performance : rendu 50 personnes doit tenir 60fps sur Android entry-level

Livre le code et résultats des tests.
```

### Prompt 8.2 🧠 — Mode offline avec Drift

```
Consulte @SPEC.md sections 12.1 (principes UX), 11.1 (Drift).

Think hard sur la synchronisation : conflit resolution, ordre des opérations, gestion des échecs.

Implémente le support offline complet avec Drift (SQLite) :

1. Setup Drift :
   - lib/data/datasources/local/app_database.dart avec tables miroirs simplifiées :
     * LocalAccounts, LocalPersons, LocalUnions, LocalParentChild, LocalClaims
     * SyncQueue (opérations en attente de sync)
     * LastSyncTimestamps (pour delta sync)

2. Repository avec stratégie offline-first :
   - Tous les reads d'abord depuis DB locale, retour immédiat
   - Puis fetch API en arrière-plan, mise à jour DB locale, notification UI
   - Tous les writes d'abord en DB locale + SyncQueue
   - Service SyncService qui vide la SyncQueue quand connectivity est disponible

3. SyncService :
   - Singleton avec isolate dédié pour ne pas bloquer UI
   - Écoute connectivity_plus
   - À chaque retour online :
     * Push : envoie les opérations en attente dans l'ordre FIFO
     * En cas d'échec (409 conflict, 404 not found après delete distant) : stratégie de résolution
     * Pull : fetch les nouveautés depuis le serveur (timestamp based)
   - Retry avec backoff exponentiel

4. Conflict resolution :
   - Last-write-wins par défaut
   - Pour opérations critiques (claims, décès) : marquer en "pending conflict", notifier l'utilisateur, laisser choisir manuellement

5. UI :
   - Badge discret "En attente de sync" si SyncQueue non vide
   - Icône réseau dans header indique online/offline
   - Jamais de spinner infini : feedback immédiat après action locale
   - Message discret "Sauvegardé localement, sera synchronisé" si offline

6. Mode économe de données :
   - Setting toggle dans Paramètres
   - Si activé : images en basse résolution, sync manuelle uniquement
   - Permet à Thérèse (bundle data limité) de contrôler sa consommation

Tests :
- Test scénario : créer 5 persons offline, rétablir connexion, vérifier sync complète
- Test conflit : modifier même Person online sur 2 devices offline, vérifier résolution
- Test crash : kill app au milieu d'une sync, relancer, vérifier reprise

Livre le code et résultats.
```

---

## Phase 9 — CNI, OCR, et features avancées

### Prompt 9.1 🧠 — Saisie CNI avec OCR mobile

```
Consulte @SPEC.md section 14.3 (flow CNI) et 7 (CNI sécurité).

Think hard sur le UX progressif : la CNI N'EST JAMAIS demandée au début, uniquement après quelques jours d'usage OU au moment d'une action qui en bénéficie.

Implémente :

1. Trigger "Renforcer ton profil" :
   - Badge doux dans le profil utilisateur après 3 jours d'usage
   - Modal contextuel lors de validation d'un claim : "Pour valider ce profil, renforce le tien d'abord"
   - Jamais bloquant

2. Screen AddIdentityDocumentScreen :
   - Titre : "Ton numéro de CNI (facultatif)"
   - Deux options visuelles :
     * Champ de saisie manuelle
     * Gros bouton "Scanner ma CNI" (appareil photo)
   - Rassurances visibles (icônes + texte) :
     * 🔒 Chiffré, jamais visible par d'autres
     * 🚫 Aucun lien avec l'État
     * ✋ Tu peux le retirer quand tu veux
   - Boutons "Pas maintenant" et "Enregistrer" de même poids visuel (aucun culpabilisant)

3. Flow Scanner CNI :
   - Screen CameraOcrScreen avec overlay rectangle pour cadrer la CNI
   - Utiliser google_mlkit_text_recognition (offline, gratuit, performant sur Android entry-level)
   - Capture → preview → traitement OCR
   - Parser le texte extrait :
     * Regex pour numéro CNI camerounaise (9-10 chiffres)
     * Extraction nom, prénom, date naissance, date émission
   - Écran de confirmation :
     * Pré-remplir les champs avec données OCR
     * L'utilisateur peut corriger avant validation
   - Bouton "Conserver la photo de ma CNI pour vérification" (opt-in explicite, case non pré-cochée)
   - Si opt-in : upload chiffré S3 (via PUT presigned du backend)

4. Service IdentityDocumentService (côté mobile) :
   - hashLocally() : hash SHA-256 avec sel (pour matching rapide offline)
   - submitDocument() : envoie au backend, reçoit document_id
   - revealFullNumber() : requiert re-auth OTP, déchiffre côté serveur

5. OCR parser dédié :
   - lib/core/services/cameroon_cni_parser.dart
   - Gère les deux formats CNI (ancienne et biométrique)
   - Gestion erreurs si qualité photo insuffisante

Tests :
- Unit tests du parser avec 10 photos CNI de test (dataset fictif créé manuellement)
- Widget tests du flow complet
- Test de réalisation sans OCR (saisie manuelle)
- Test d'erreur gracieuse si photo illisible

Livre le code et résultats.
```

### Prompt 9.2 ⚡ — Bot WhatsApp pour notifications

```
Consulte @SPEC.md section 18.5 (rappels WhatsApp vs push).

Implémente le bot WhatsApp côté backend via Meta Business API :

1. Module WhatsAppBot dans apps/api/src/modules/whatsapp-bot/
2. Endpoints webhook :
   - POST /whatsapp/webhook (recevoir messages entrants de Meta)
   - GET /whatsapp/webhook (vérification Meta)

3. Commandes du bot :
   - "aide" / "help" : liste des commandes
   - "arbre" / "tree" : lien direct vers son arbre dans l'app
   - "inviter" / "invite" : génère un lien d'invitation personnalisé
   - "stop" : désactive notifications WhatsApp
   - "start" : réactive notifications

4. Envois automatiques (via NotificationsService avec canal WHATSAPP) :
   - Invitations familiales
   - Nouvelles personnes ajoutées à l'arbre
   - Anniversaires
   - Rappels commémoratifs (pour décédés)
   - Validations de claim

5. Templates de messages (compliance Meta Business) :
   - Définir et soumettre à Meta via Console les templates approuvés
   - Fallback sur messages session si template non disponible

6. Sécurité :
   - Vérification signature webhook Meta
   - Rate limiting des envois
   - Compliance Meta Business Policy (pas de spam, opt-in explicite)

En dev : utiliser un mock Meta API qui log les messages dans la console.

Configuration :
- Variables env : WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_VERIFY_TOKEN
- Documentation dans docs/whatsapp-bot-setup.md (procédure d'obtention des credentials Meta)

Tests E2E du flow webhook → commande → réponse.

Livre le code et documentation.
```

### Prompt 9.3 🧠 — Moteur de merge avec UI

```
Consulte @SPEC.md section 9.6 (workflow de fusion).

Think hard sur l'UX de fusion : deux profils côte à côte, champ par champ, conservation historique.

Implémente :

1. Backend : Module Merge dans apps/api/src/modules/merge/

Endpoints :
- GET /merge/proposals?status=PENDING — liste des propositions liées au caller
- GET /merge/proposals/:id — détail avec les deux Person et leur histoire
- POST /merge/proposals/:id/review { decisions: [{field, chosen: 'A'|'B'|'custom', customValue?}] }
  → Enregistre les choix
- POST /merge/proposals/:id/accept
  → Exécute la fusion atomiquement :
  * Crée la Person "survivante" avec les champs choisis
  * Redirige tous les parent_child, unions, union_partners, claims, identity_documents vers la survivante
  * Marque l'autre Person comme deleted_at=NOW(), merged_into=survivor_id
  * Préserve l'audit trail complet
- POST /merge/proposals/:id/reject { reason }

Service mergeService.service.ts avec transaction Prisma pour atomicité.

2. Mobile : Screen MergeReviewScreen

Interface :
- Titre : "On a trouvé deux profils qui pourraient être la même personne"
- Layout deux colonnes (ou tabs sur petit écran) :
  * Profil A : photos, nom, dates, relations, origine
  * Profil B : idem
- Pour chaque champ différent, sélecteur :
  * Radio A / Radio B / [Saisir valeur]
- Section résumé "Qu'est-ce qui va devenir la version finale"
- Bouton "Valider la fusion" avec confirmation
- Bouton "Ce ne sont pas la même personne" → rejette la proposition

3. Détection automatique en batch (déjà dans MatchingService du prompt 4.1) :
   - Job nocturne qui scanne les Person créées dans la semaine
   - Génère MergeProposals pour les candidats avec score >= 0.85
   - Notifie les contributeurs originaux

Tests :
- E2E scénario complet : deux users créent profiles en parallèle, matching détecte, notifs envoyées, l'un accepte, fusion exécutée, vérification intégrité
- Test de rollback si échec partiel (transaction)
- Test de rejet propre

Livre le code et résultats.
```

---

## Phase 10 — Tests, monitoring, déploiement

### Prompt 10.1 🏗️ — Configuration CI/CD GitHub Actions

```
Active Plan Mode.

Configure la CI/CD complète via GitHub Actions.

Workflows à créer dans .github/workflows/ :

1. ci-backend.yml :
   - Trigger : PR sur apps/api/**
   - Jobs :
     * Lint (ESLint)
     * TypeScript check (tsc --noEmit)
     * Tests unitaires (Jest) avec coverage
     * Tests E2E (avec Postgres + Redis en services GitHub)
     * Build (npm run build)
     * Audit sécurité (npm audit, snyk)

2. ci-mobile.yml :
   - Trigger : PR sur apps/mobile/**
   - Jobs :
     * flutter analyze
     * flutter test
     * flutter build apk --flavor dev (pour vérifier qu'il build)
     * Pas de build iOS en CI (trop coûteux, fait localement)

3. ci-web.yml :
   - Trigger : PR sur apps/web/**
   - Jobs :
     * Lint
     * Tests
     * Build Next.js
     * Lighthouse CI (performance web)

4. ci-monorepo.yml :
   - Trigger : PR sur packages/** ou changements racine
   - Jobs :
     * Lint tout le repo
     * Type check global
     * Vérifier cohérence versions

5. deploy-staging.yml :
   - Trigger : push sur develop
   - Jobs :
     * Build Docker image backend → push ECR staging
     * Deploy ECS staging (via Terraform apply)
     * Run migrations Prisma
     * Smoke tests E2E contre staging
     * Build Flutter APK staging, upload Firebase App Distribution

6. deploy-production.yml :
   - Trigger : tag v*.*.*
   - Approval manuelle obligatoire
   - Jobs similaires à staging mais sur production

Configuration associée :
- .github/dependabot.yml pour mises à jour sécurité
- .github/CODEOWNERS
- .github/PULL_REQUEST_TEMPLATE.md
- .github/ISSUE_TEMPLATE/ avec templates bug/feature

Secrets à documenter (à configurer dans GitHub Settings) :
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (IAM role dédié CI)
- DATABASE_URL (staging)
- SENTRY_DSN
- FIREBASE_SERVICE_ACCOUNT

Présente le plan complet. J'approuverai.
```

### Prompt 10.2 🏗️ — Infrastructure Terraform

```
Active Plan Mode.

Consulte @SPEC.md section 11.6 (infrastructure).

Configure l'infrastructure AWS complète via Terraform dans infrastructure/terraform/.

Structure :
```
infrastructure/terraform/
├── environments/
│   ├── staging/
│   └── production/
├── modules/
│   ├── networking/   (VPC, subnets, NAT)
│   ├── database/     (RDS PostgreSQL Multi-AZ)
│   ├── cache/        (ElastiCache Redis)
│   ├── compute/      (ECS Fargate + ALB)
│   ├── storage/      (S3 buckets + CloudFront)
│   ├── security/     (IAM, Secrets Manager, KMS)
│   ├── dns/          (Route53)
│   └── monitoring/   (CloudWatch, alarms)
├── shared/
│   └── backend.tf    (Terraform state S3 + DynamoDB lock)
└── README.md
```

Ressources à provisionner (pour staging d'abord) :

1. Networking :
   - VPC avec 2 AZs minimum
   - Subnets publics (ALB, NAT)
   - Subnets privés (ECS, RDS, ElastiCache)
   - NAT Gateway
   - Security Groups restrictifs

2. Database :
   - RDS PostgreSQL 16 db.t4g.small (staging), db.m6g.large (prod)
   - Multi-AZ pour prod
   - Backups automatiques 7 jours
   - Encryption at rest
   - Extensions: uuid-ossp, pg_trgm, fuzzystrmatch, unaccent, pgcrypto

3. Cache :
   - ElastiCache Redis 7 cache.t4g.micro (staging), cache.m6g.large (prod)
   - Encryption in transit et at rest

4. Compute :
   - ECS Cluster Fargate
   - Task definitions pour api (NestJS)
   - Service avec auto-scaling (2-10 tasks)
   - Application Load Balancer avec HTTPS (ACM cert)

5. Storage :
   - S3 Bucket photos publiques (avec CloudFront)
   - S3 Bucket documents privés (chiffrement SSE-KMS, lifecycle 90 jours)
   - S3 Bucket pour backups (versioning, cross-region replication pour prod)

6. Security :
   - KMS Keys dédiées (documents, backups)
   - Secrets Manager pour tous les secrets (DB URL, API keys)
   - IAM roles restrictifs (least privilege)
   - WAF sur ALB

7. Monitoring :
   - CloudWatch Logs pour ECS
   - CloudWatch Alarms (CPU, mémoire, 5xx, latence)
   - SNS Topic pour alerting email

Configuration critique :
- Région : af-south-1 (Cape Town)
- State Terraform dans S3 avec lock DynamoDB
- Variables sensibles via Parameter Store, jamais en .tfvars committed
- Outputs documentés

Présente le plan complet. Je veux voir l'architecture avant que tu génères 3000 lignes de HCL.
```

### Prompt 10.3 ⚡ — Monitoring et observabilité

```
Implémente l'observabilité complète :

1. Backend (apps/api) :
   - Intégration Sentry pour erreurs :
     * sentry-node + @sentry/nestjs
     * Capture exceptions automatique
     * Performance tracing (10% sample en prod)
     * Scrubbing des données sensibles (téléphones, CNI) avant envoi
   - Logging structuré Pino :
     * JSON en prod, pretty en dev
     * Correlation IDs sur chaque requête (middleware)
     * Niveaux appropriés (info, warn, error)
     * Jamais de données sensibles loggées
   - Métriques Prometheus :
     * Endpoint /metrics
     * Métriques custom : otp_requests_total, person_created_total, matching_duration_seconds, etc.
   - Health checks :
     * /health/live (liveness)
     * /health/ready (readiness, check DB + Redis)

2. Mobile (apps/mobile) :
   - Sentry Flutter pour crash reporting
   - Firebase Crashlytics en backup
   - Analytics minimaux (respect vie privée) :
     * Screens visités
     * Actions clés (ajout person, invitation envoyée)
     * PAS de données personnelles

3. Web (apps/web) :
   - Sentry React
   - Web Vitals tracking (LCP, FID, CLS)

4. Dashboards :
   - Grafana avec datasources CloudWatch + Prometheus
   - Dashboards clés :
     * API Health (uptime, latence P50/P95/P99, erreurs)
     * Business metrics (signups, persons created, invitations)
     * Database (connections, slow queries)
     * Mobile (crash-free users, active users)

5. Alerting :
   - PagerDuty ou Opsgenie
   - Règles critiques :
     * API 5xx rate > 1% sur 5 min → alerte
     * Latence P95 > 1s → warning
     * DB connections > 80% → warning
     * Disque S3 près de la limite → alerte

Documentation dans docs/monitoring.md expliquant comment accéder aux dashboards et interpréter les alertes.

Livre le code et doc.
```

---

## Phase 11 — Polish, accessibilité, tests utilisateurs

### Prompt 11.1 🧠 — Mode "grand-mère" et accessibilité

```
Consulte @SPEC.md section 12.3 (modes d'accessibilité) et 2 (persona Thérèse).

Think hard sur les persona Thérèse (58 ans, Bafoussam) et Ebenezer (78 ans).

Implémente le mode d'accessibilité complet :

1. Setting dans Paramètres mobile :
   - Toggle "Mode simplifié" (nom user-friendly de "grand-mère")
   - Description : "Textes plus grands, boutons plus visibles, moins d'options"

2. Impact si activé :
   - Textes +30% sur toute l'app (via theme override)
   - Boutons primary passent à 72px (au lieu de 56px)
   - Espacement +20% entre éléments
   - Contraste renforcé (noir sur blanc pur plutôt que gris)
   - Masquage des fonctionnalités avancées (statistiques, historique détaillé, etc.)
   - Animation ralenties (plus faciles à suivre visuellement)

3. Support lecteur d'écran :
   - Tous les widgets avec Semantics appropriés
   - Labels pour chaque bouton, image, icône
   - Ordre de lecture logique
   - Annonces pour changements d'état importants

4. Support zoom système :
   - Respect de MediaQuery.of(context).textScaleFactor
   - Layouts qui s'adaptent aux tailles de texte élevées

5. Navigation au contraste élevé :
   - Focus visible renforcé
   - Support navigation clavier (pour tablettes avec clavier)

6. Tests d'accessibilité :
   - Audit avec Flutter Accessibility Scanner
   - Tests de contraste WCAG AA partout
   - Tests avec TalkBack/VoiceOver

7. Widget showcase pour valider les adaptations :
   - Screen /dev/accessibility-showcase en dev uniquement
   - Affiche tous les composants avec et sans mode simplifié

Livre le code et résultats audit accessibilité.
```

### Prompt 11.2 ⚡ — Illustrations et assets

```
Les illustrations doivent être authentiques camerounaises, pas des génériques Unsplash.

Prépare la structure pour recevoir les illustrations :

1. Dossier apps/mobile/assets/illustrations/ avec placeholders :
   - onboarding_family.svg
   - empty_state_tree.svg
   - loading_leaves.svg (animation)
   - no_internet.svg
   - success_celebration.svg
   - memorial_candle.svg
   - ancestor_silhouette.svg
   - whatsapp_share.svg
   - etc.

2. Pour l'instant, utilise des illustrations libres de droits (unDraw, Humaaans) avec adaptation des couleurs pour correspondre à la palette (#2D7A4B, #C8663B, #D9A441, etc.).

3. Documentation dans docs/design/illustrations-brief.md pour commander à un illustrateur camerounais (quand budget le permet) :
   - Liste des 20 illustrations clés nécessaires
   - Brief créatif : représentations authentiques (peaux, vêtements, contextes), style plat moderne
   - Palette imposée
   - Format SVG optimisé
   - Licence : cession totale des droits

4. Flags de fonctionnalités (feature flags) :
   - Remote config (Firebase Remote Config)
   - Permet d'activer/désactiver des features par batch utilisateurs
   - Exemples : new_tree_view, merge_beta, ocr_enabled, etc.

5. Internationalisation complète :
   - Tous les strings dans lib/l10n/app_fr.arb et app_en.arb
   - Support pluriel (ICU)
   - Support genre (masculin/féminin pour "son papa" / "sa maman", etc.)
   - Plan futur : ajouter pidgin camerounais, fulfulde

Livre la structure complète, les assets placeholder, et la doc illustrateur.
```

### Prompt 11.3 ✅ — Suite de tests E2E complète

```
Crée une suite de tests E2E complète qui valide les scénarios utilisateurs critiques.

Pour le backend (apps/api/test/) :
- Scénario 1 : Inscription Jean-Paul → création de son profil → ajout de sa mère Thérèse → invitation Thérèse
- Scénario 2 : Thérèse s'inscrit avec le lien → vérifie OTP → confirme être la Person créée par Jean-Paul → claim validé
- Scénario 3 : Thérèse ajoute son père décédé depuis 20 ans (deceased_assumed=true)
- Scénario 4 : Détection doublon : un cousin crée aussi le père de Thérèse → match détecté → proposition de merge → accept → fusion propre
- Scénario 5 : Thérèse saisit sa CNI → verification_level passe à DOCUMENT_DECLARED
- Scénario 6 : Thérèse upload scan CNI → OCR → modérateur valide → verification_level passe à DOCUMENT_VERIFIED
- Scénario 7 : Jean-Paul signale le décès de son oncle → notification à 3 proches → validation → transition ALIVE → DECEASED
- Scénario 8 : Tentative de fraude : Account malveillant essaie de claim 5 Persons différentes → blocage automatique
- Scénario 9 : Rate limiting : 5 OTP en 5 min → blocage → attente → déblocage

Pour le mobile (apps/mobile/integration_test/) :
- Flow inscription sans invitation complet
- Flow inscription avec invitation (deep link)
- Flow ajout parent vivant
- Flow ajout parent décédé
- Flow ajout ancêtre mémoire (deceased_assumed)
- Flow signalement décès
- Navigation dans l'arbre (pan, zoom, tap)
- Mode offline : création person → passer online → vérifier sync

Chaque test :
- Assertions sur DB state (backend)
- Assertions sur API responses
- Assertions sur UI (mobile)
- Nettoyage après chaque test

Exécute la suite complète avec `npm run test:e2e` (backend) et `flutter test integration_test` (mobile).

Montre-moi le rapport complet.
```

---

## Guide de dépannage

### Si Claude Code se perd dans le contexte

```
Reprends le contexte depuis @CLAUDE.md et @SPEC.md. Ignore ce que tu pensais savoir, relis ces deux fichiers, et confirme-moi en 5 lignes ce que tu comprends du projet avant de continuer.
```

### Si Claude Code génère du code qui ne compile pas

```
Le code que tu as généré ne compile pas. Voici l'erreur :

[coller l'erreur exacte]

Ne refactor pas tout. Corrige uniquement cette erreur, explique la cause, et relance le build pour confirmer que ça marche.
```

### Si Claude Code ignore des règles de CLAUDE.md

```
Tu as ignoré la règle [X] de @CLAUDE.md. Mets à jour @CLAUDE.md pour rendre cette règle plus explicite, puis corrige le code pour qu'il respecte la règle.
```

### Si le résultat d'un prompt n'est pas satisfaisant

Alternatives à essayer dans l'ordre :

1. **Reformuler avec plus de contraintes** :
   ```
   Pas satisfait. Refais en respectant STRICTEMENT ces contraintes :
   - [contrainte 1]
   - [contrainte 2]
   - [contrainte 3]
   ```

2. **Demander un plan d'abord** :
   ```
   Active Plan Mode. Propose-moi 3 approches différentes pour [tâche], avec leurs trade-offs. Je choisirai avant exécution.
   ```

3. **Invoquer "ultrathink"** pour problèmes complexes :
   ```
   Ultrathink sur ce problème avant de coder. Les subtilités sont : [lister les pièges].
   ```

4. **Fragmenter en sous-prompts** :
   Au lieu d'un gros prompt, le découper en 3-5 plus petits et les enchaîner.

### Si un module a besoin d'une refactoring majeure

```
Le module [X] a des problèmes architecturaux majeurs :
- [problème 1]
- [problème 2]

Propose un plan de refactoring en plusieurs étapes de taille raisonnable (max 500 lignes de diff par étape). Ne refactor pas encore, montre-moi le plan d'abord.
```

---

## Ordre d'exécution recommandé

Pour un démarrage progressif et testable, voici l'ordre optimal :

**Jour 1-2 :** Phase 0 (setup complet)
**Jour 3-5 :** Phase 1 (DB + types)
**Jour 6-10 :** Phase 2 (Auth backend)
**Jour 11-15 :** Phase 3 (Persons + Relationships backend)
**Jour 16-18 :** Phase 4.1 (Matching) + 4.2 (Claims)
**Jour 19-21 :** Phase 5 (Invitations + Media + Notifications)

→ **Milestone backend MVP** : API fonctionnelle, testée, documentée. Déployable sur staging.

**Jour 22-25 :** Phase 6 (Flutter setup + Auth)
**Jour 26-30 :** Phase 7 (Création arbre mobile)
**Jour 31-34 :** Phase 8 (Visualisation + offline)

→ **Milestone mobile MVP** : App fonctionnelle sur Android, testable.

**Jour 35-38 :** Phase 9 (CNI + WhatsApp + Merge)
**Jour 39-42 :** Phase 10 (CI/CD + infra)
**Jour 43-45 :** Phase 11 (Polish + tests E2E)

→ **Milestone V1** : prêt pour pilote avec vrais utilisateurs.

Budget total réaliste si travail quotidien : **6-8 semaines pour MVP livrable** (solo developer utilisant Claude Code efficacement).

---

## Conseils finaux

1. **Commit souvent** : après chaque prompt qui donne un résultat stable, commit avec un message descriptif. Permet de rollback facilement si un prompt ultérieur casse quelque chose.

2. **Teste avant d'enchaîner** : ne lance jamais le prompt N+1 si N n'a pas été validé (tests passent, lint OK, build OK).

3. **Met à jour CLAUDE.md en continu** : à chaque apprentissage (erreur évitée, convention trouvée), ajoute-le dans CLAUDE.md. Le fichier doit grandir avec le projet.

4. **Fais des pauses** : après 2h avec Claude Code, ton jugement sur la qualité baisse. Fais des pauses pour rester critique.

5. **Mesure la qualité** : `npm run lint && npm run typecheck && npm test` après chaque phase. Ne laisse pas la dette technique s'accumuler.

6. **Documente les décisions** : crée un fichier `docs/decisions/` avec les choix architecturaux importants (ADRs — Architecture Decision Records).

7. **Test terrain continu** : dès la fin de la phase 8 (mobile MVP), fais tester à 5-10 vrais Camerounais (diaspora d'abord). Leurs retours sont plus précieux que 100 heures de polissage en solo.

8. **Ne fais pas tout faire à Claude Code** : certaines tâches (design illustrations, configuration Meta WhatsApp Business, négociation chefferies) demandent de l'intervention humaine. Ne bloque pas le projet dessus.

---

**Bonne chance ! Le projet est ambitieux mais très réalisable avec cette approche structurée.**

*N'hésite pas à revenir vers Claude (celui du chat, pas Claude Code) si tu bloques sur un concept ou si une phase demande à être repensée.*
