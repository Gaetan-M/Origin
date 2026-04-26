# CLAUDE.md — Mémoire persistante du projet Origin

## Contexte du projet
Origin — plateforme généalogique indépendante (orientée Cameroun initialement) permettant aux utilisateurs de documenter leur arbre familial. Specs complètes dans SPEC.md — à consulter systématiquement.

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
```
/apps
  /api           - NestJS backend
  /mobile        - Flutter app
  /web           - Next.js PWA
  /admin         - Interface modération (phase 2)
/packages
  /shared-types  - Types TypeScript partagés API<->Web
  /config        - Configs partagées (ESLint, tsconfig, etc.)
/infrastructure
  /terraform     - IaC AWS
  /docker        - Docker Compose dev local
/docs
  SPEC.md        - Spécification complète
  CLAUDE.md      - Ce fichier
```

## Workflow
- Toujours créer une branche feature avant de coder : `feat/<description-courte>`
- Tests obligatoires pour toute logique métier (Jest backend, flutter_test mobile)
- Lint et format avant commit (husky + lint-staged)
- PR avec description claire, taille raisonnable (< 500 lignes idéalement)

## Commandes utiles (à maintenir à jour au fur et à mesure)
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
