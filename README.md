# Origin

Plateforme digitale indépendante permettant aux utilisateurs de documenter, préserver et explorer leur arbre généalogique familial. Origin est initialement orienté Cameroun mais la plateforme n'est pas restreinte à un seul pays.

## Prérequis

- Node.js 20+ (voir `.nvmrc`)
- npm 10+
- Docker & Docker Compose (pour le développement local)
- Flutter 3.x (pour l'app mobile uniquement)

## Installation

```bash
npm install
```

## Commandes

```bash
npm run dev        # Démarre tous les services en mode développement
npm run build      # Build de tous les packages et apps
npm run lint       # Lint de tout le code
npm run test       # Exécute tous les tests
npm run format     # Formate tout le code avec Prettier
npm run typecheck  # Vérifie les types TypeScript
```

## Structure du monorepo

```
apps/
  api/       — Backend NestJS
  web/       — Frontend Next.js (PWA)
  mobile/    — App Flutter (iOS + Android)
  admin/     — Interface modération (phase 2)
packages/
  config/    — Configs partagées (ESLint, TypeScript, Prettier)
  shared-types/ — Types TypeScript partagés API <-> Web
infrastructure/
  terraform/ — Infrastructure as Code (AWS)
  docker/    — Docker Compose pour dev local
docs/        — Documentation additionnelle
```

## Stack technique

- **Backend**: NestJS + TypeScript, PostgreSQL, Redis, Prisma ORM
- **Web/PWA**: Next.js 15 + Tailwind CSS + shadcn/ui
- **Mobile**: Flutter (Dart) avec Drift pour SQLite local
- **Monorepo**: Turborepo
- **Cloud**: AWS af-south-1 (Cape Town)
