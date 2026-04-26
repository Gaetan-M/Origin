# Environnement Docker pour le développement local

## Prérequis

- Docker Desktop (ou Docker Engine + Docker Compose)

## Services

| Service     | Port(s)    | Description                          |
|-------------|------------|--------------------------------------|
| PostgreSQL  | 5432       | Base de données principale           |
| Redis       | 6379       | Cache et sessions                    |
| MailHog     | 8025, 1025 | UI mail (8025) + SMTP (1025)         |
| LocalStack  | 4566       | Simulation AWS (S3, KMS)             |

## Commandes

Depuis la racine du projet :

```bash
# Copier les variables d'environnement
cp .env.example .env

# Lancer tous les services
make up

# Voir les logs
make logs

# Arreter les services
make down

# Reset complet de la base de donnees
make reset-db

# Acceder a PostgreSQL CLI
make psql

# Acceder a Redis CLI
make redis-cli
```

## Extensions PostgreSQL

Les extensions suivantes sont installees automatiquement au premier demarrage :

- `uuid-ossp` — Generation de UUIDs
- `pgcrypto` — Fonctions cryptographiques
- `pg_trgm` — Recherche trigram (similarite de texte)
- `fuzzystrmatch` — Soundex, Levenshtein
- `unaccent` ��� Suppression des accents pour la normalisation
