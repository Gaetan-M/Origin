# Origin — Spécification Complète

**Version :** 1.0
**Date :** Avril 2026
**Objectif du document :** Spécification fonctionnelle et technique exhaustive destinée à l'implémentation via Claude Code.

---

## Table des matières

1. [Vision et objectifs du projet](#1-vision-et-objectifs-du-projet)
2. [Personas utilisateurs](#2-personas-utilisateurs)
3. [Spécificités du contexte camerounais](#3-spécificités-du-contexte-camerounais)
4. [Architecture générale du système](#4-architecture-générale-du-système)
5. [Modèle conceptuel : le graphe unifié](#5-modèle-conceptuel--le-graphe-unifié)
6. [Modèle de données complet](#6-modèle-de-données-complet)
7. [Authentification et identité](#7-authentification-et-identité)
8. [Gestion du statut vie/décès (obligatoire)](#8-gestion-du-statut-viedécès-obligatoire)
9. [Moteur de matching et dédoublonnage](#9-moteur-de-matching-et-dédoublonnage)
10. [Niveaux de vérification](#10-niveaux-de-vérification)
11. [Stack technique](#11-stack-technique)
12. [Spécification UX/UI détaillée](#12-spécification-uxui-détaillée)
13. [Design system](#13-design-system)
14. [User journey complet](#14-user-journey-complet)
15. [Visualisation de l'arbre généalogique](#15-visualisation-de-larbre-généalogique)
16. [Sécurité et conformité légale](#16-sécurité-et-conformité-légale)
17. [Stratégies de peuplement](#17-stratégies-de-peuplement)
18. [Support utilisateur](#18-support-utilisateur)
19. [Modèle économique](#19-modèle-économique)
20. [Roadmap d'implémentation](#20-roadmap-dimplémentation)
21. [Anti-patterns à éviter](#21-anti-patterns-à-éviter)
22. [Métriques de succès](#22-métriques-de-succès)
23. [Tests utilisateurs terrain](#23-tests-utilisateurs-terrain)

---

## 1. Vision et objectifs du projet

### 1.1 Mission

Construire une plateforme digitale **indépendante** (non liée au gouvernement camerounais) permettant aux Camerounais de documenter, préserver et explorer leur arbre généalogique familial, en tenant compte des spécificités culturelles locales (polygamie, oralité, diversité ethnique, variations de noms).

### 1.2 Objectifs principaux

- Permettre à un utilisateur, après une authentification simple (téléphone + OTP), d'accéder à son arbre généalogique étendu au moins jusqu'au 2ème degré.
- Supporter la croissance organique de l'arbre sur plusieurs générations via contributions manuelles collaboratives.
- Préserver le patrimoine généalogique camerounais, particulièrement celui transmis oralement.
- Fonctionner dans un environnement à connectivité limitée, sur téléphones Android entry-level.
- Être utilisable par des personnes peu familières avec le digital (personnes âgées, zones rurales).

### 1.3 Valeurs fondamentales

- **Indépendance totale** vis-à-vis du gouvernement et de tout tiers politique.
- **Respect culturel** : l'app reflète les structures familiales camerounaises authentiques.
- **Honneur aux ancêtres** : les personnes décédées sont mémorisées, pas reléguées.
- **Confidentialité** : les données sensibles sont protégées par défaut.
- **Inclusivité** : accessible aux ruraux, âgés, peu lettrés, diaspora.

---

## 2. Personas utilisateurs

### 2.1 Persona 1 : Mama Thérèse (58 ans, Bafoussam)

- Revendeuse au marché.
- Smartphone Android Tecno entry-level.
- Utilise WhatsApp et Facebook, ne distingue pas navigateur et app.
- Connexion data irrégulière (bundles journaliers MTN).
- Craint de "gâter" son téléphone en appuyant sur les mauvais boutons.
- Français basique, alphabétisation fonctionnelle limitée.
- **Rôle clé :** détient la mémoire généalogique de sa famille élargie.

### 2.2 Persona 2 : Jean-Paul (34 ans, Douala)

- Cadre, à l'aise digitalement.
- iPhone ou Android haut de gamme, connexion fibre/4G stable.
- **Rôle clé :** "digital champion" familial, installera l'app pour sa mère Thérèse et fera le support.

### 2.3 Persona 3 : Grand-papa Ebenezer (78 ans, village)

- Pas de smartphone, téléphone à touches.
- Parle principalement langue locale + français approximatif.
- **Rôle clé :** source généalogique orale critique, n'utilisera jamais l'app directement. Son profil sera géré par un proche.

### 2.4 Persona 4 : Aïcha (22 ans, étudiante, Yaoundé)

- Totalement à l'aise digitalement.
- Smartphone moyenne gamme, budget data serré.
- **Rôle clé :** utilisatrice sociale, partagera l'app avec ses amis et son arbre sur les réseaux.

### 2.5 Persona 5 : Cousin Eric (42 ans, Bruxelles — diaspora)

- iPhone, connexion haut débit.
- Bien rémunéré, prêt à payer pour des fonctionnalités premium.
- **Rôle clé :** moteur d'adoption familiale, poussera ses proches au Cameroun à s'inscrire.

### 2.6 Implications design

L'UX doit servir les cinq personas simultanément, avec une **priorité aux plus fragiles** (Thérèse, Ebenezer). Si le flow fonctionne pour Thérèse, il fonctionnera pour tous.

---

## 3. Spécificités du contexte camerounais

### 3.1 Structures familiales

- **Polygamie légale** : un homme peut avoir plusieurs épouses simultanées, avec enfants de chacune. Le modèle de données doit gérer cela nativement.
- **Remariages** : fréquents, avec enfants de plusieurs unions.
- **Adoption coutumière** : enfants élevés par un oncle/tante ou grand-parent, reconnus comme enfants dans la pratique.
- **Enfants hors mariage reconnus** : situations fréquentes, doivent être représentables sans jugement.
- **Structures ethniques variables** : Bamilékés et Bassas patrilinéaires, certains groupes du Sud avec nuances matrilinéaires, relations oncle maternel/neveu (avunculaires) parfois centrales.

### 3.2 Oralité et dates floues

- Au-delà de 2-3 générations en zone rurale, la mémoire est orale.
- Dates de naissance approximatives : "l'année de la grande sécheresse", "pendant la guerre du Biafra", "vers 1945", "années 1930", "avant indépendance".
- Le système doit accepter ces formats flous nativement.

### 3.3 Variations de noms

- La même personne peut apparaître comme "Mbarga Jean", "Jean Mbarga", "Jean-Baptiste Mbarga Essomba" selon les documents.
- Les Bamilékés ont un nom "de pays" + nom civil.
- Différences de romanisation entre zones francophone et anglophone.
- Noms traditionnels + noms civils + surnoms + noms d'épouse coexistent.

### 3.4 Documents d'identité

- **CNI biométrique** : émise depuis 2016 par la DGSN, 9-10 chiffres + QR code.
- **Ancienne CNI** : formats variables des années 90-2000.
- **Taux de possession adulte** : ~60-70%, avec beaucoup de CNI expirées.
- **Pas d'API officielle de vérification CNI** — contrainte lourde.
- **Mineurs** : acte de naissance uniquement, non centralisé nationalement.
- **Diaspora** : passeports camerounais ou étrangers.

### 3.5 Acteurs traditionnels pertinents

- **Chefferies traditionnelles** (chefs de 1er, 2ème, 3ème degré) : tiennent souvent des registres familiaux.
- **Églises** : registres de baptême catholiques depuis 1890+, archives de l'EEC, CPE.
- **Universités** : départements d'anthropologie et d'histoire de Yaoundé I, Dschang, Douala.

### 3.6 Contexte technique

- Majorité d'accès via téléphone Android entry-level.
- Connexion instable, bundles data limités.
- 70%+ des utilisateurs smartphones sont sur WhatsApp.
- Électricité intermittente (impact sur fréquence de charge).
- Zones francophone et anglophone (bilinguisme critique).

### 3.7 Risques sensibles à anticiper

- Discrimination ethnique (Anglophones/Francophones, Nord/Sud).
- Conflits d'héritage déclenchés par révélations familiales.
- Revendications de descendance de chefferies (très sensible).
- Accusations de sorcellerie basées sur liens familiaux.
- Fraude d'identité si CNI non protégées.

---

## 4. Architecture générale du système

### 4.1 Vue haute niveau

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTS                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Mobile Flutter│  │ PWA Next.js  │  │ Bot WhatsApp     │  │
│  │ (iOS/Android) │  │ (Desktop/Web)│  │ (notifications)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────┘  │
└─────────┼──────────────────┼─────────────────────┼──────────┘
          │                  │                     │
          └──────────────────┼─────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  API Gateway    │
                    │  (nginx / ALB)  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐       ┌─────▼────┐        ┌────▼─────┐
    │  Auth    │       │  Core    │        │  Media   │
    │  Service │       │  Service │        │  Service │
    │ (NestJS) │       │ (NestJS) │        │ (NestJS) │
    └────┬─────┘       └─────┬────┘        └────┬─────┘
         │                   │                   │
         │          ┌────────┼────────┐          │
         │          │        │        │          │
    ┌────▼──────────▼──┐  ┌──▼───┐ ┌──▼──┐  ┌───▼────┐
    │  PostgreSQL      │  │Redis │ │ S3  │  │ OpenSearch
    │  (base primaire) │  │(cache│ │(file│  │ (search)│
    └──────────────────┘  │ OTP) │ │stor)│  └─────────┘
                          └──────┘ └─────┘
         │
    ┌────▼──────────────┐
    │  Workers / Jobs   │
    │  - Matching batch │
    │  - Notifications  │
    │  - Sync offline   │
    │  - OCR            │
    └───────────────────┘
```

### 4.2 Composants principaux

- **Clients** : Flutter (mobile iOS/Android), Next.js PWA (desktop/web), bot WhatsApp officiel (via Meta Business API).
- **API Gateway** : nginx ou ALB AWS, termine TLS, route vers services.
- **Auth Service** : gestion OTP, sessions, JWT, CNI et documents d'identité.
- **Core Service** : CRUD Person/Union/Relations, moteur de matching, arbre graph queries.
- **Media Service** : upload/stockage/redimensionnement photos et scans.
- **PostgreSQL** : base relationnelle principale, hébergée sur AWS RDS (multi-AZ).
- **Redis** : cache, stockage OTP temporaires, session tokens.
- **S3** : stockage objets (photos, scans CNI chiffrés).
- **OpenSearch** : indexation noms avec analyzers custom francophone/anglophone.
- **Workers** : jobs asynchrones (Bull/BullMQ sur Redis) pour matching batch, notifications, OCR, synchro offline.

### 4.3 Hébergement recommandé

- **Priorité 1 :** AWS région Cape Town (af-south-1) pour latence Afrique.
- **Alternative budget :** OVH Strasbourg ou Scaleway Paris.
- **À éviter :** hébergement on-premise au Cameroun (instabilité électrique, connectivité, sécurité physique).

---

## 5. Modèle conceptuel : le graphe unifié

### 5.1 Principe fondamental

**Il n'y a qu'UN SEUL graphe global** contenant toutes les personnes. Pas de "plusieurs arbres". Chaque utilisateur voit une **fenêtre personnalisée** centrée sur sa propre Person, étendue à N degrés.

C'est le concept "One World Tree" utilisé par FamilySearch. Quand deux familles se découvrent un lien, elles ne "fusionnent pas" leurs arbres — elles **découvrent** que leurs fenêtres se chevauchent dans le graphe global.

### 5.2 Nature du graphe

- **DAG** (graphe orienté acyclique), pas un arbre au sens strict.
- Relations multiples : parent/enfant, conjoint(s), fratrie (dérivée), etc.
- Un nœud (Person) peut avoir 2 parents, plusieurs conjoints (polygamie), plusieurs enfants.

### 5.3 Degrés de parenté

- **Degré 0** : soi-même.
- **Degré 1** : parents, enfants, conjoint(s).
- **Degré 2** : grands-parents, petits-enfants, fratrie, oncles/tantes, neveux/nièces, beaux-parents, beaux-enfants.
- **Degré 3** : arrière-grands-parents, cousins germains, grands-oncles/tantes, petit-neveux/nièces, etc.

Accès initial au **2ème degré** par défaut (couvre 20-30 personnes, appréhendable visuellement).

---

## 6. Modèle de données complet

### 6.1 Vue d'ensemble des entités

| Entité | Description |
|--------|-------------|
| `Account` | Compte utilisateur authentifié (téléphone + OTP) |
| `Person` | Nœud dans le graphe généalogique |
| `PersonName` | Noms multiples d'une personne (civil, traditionnel, surnom, etc.) |
| `Union` | Mariage ou union (neutre : coutumier, civil, religieux, union libre) |
| `UnionPartner` | Liaison N-N entre Person et Union (permet polygamie) |
| `ParentChild` | Relation parent → enfant (indépendante d'Union) |
| `Claim` | Revendication d'un Account d'être une Person |
| `IdentityDocument` | Documents d'identité (CNI, passeport, acte de naissance, etc.) |
| `Contribution` | Historique des contributions (audit trail) |
| `Source` | Preuves / sources (documents scannés, témoignages audio) |
| `InvitationToken` | Tokens d'invitation signés |
| `VerificationRequest` | Requêtes de vérification en attente |
| `MergeProposal` | Propositions de fusion de Person suspectées doublons |
| `Notification` | Notifications utilisateur |

### 6.2 Schéma SQL PostgreSQL détaillé

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Trigram matching
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch"; -- Soundex, Levenshtein, Metaphone
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- Suppression accents
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- Hashing et encryption

-- ============================================================
-- TYPES ENUM
-- ============================================================

CREATE TYPE life_status AS ENUM ('ALIVE', 'DECEASED', 'UNKNOWN');

CREATE TYPE claim_status AS ENUM (
  'PENDING',           -- Revendication créée, en attente
  'PENDING_VERIFICATION', -- En attente de validation communautaire
  'VERIFIED',          -- Validée
  'REJECTED',          -- Rejetée
  'DISPUTED'           -- En conflit (plusieurs claims concurrents)
);

CREATE TYPE verification_level AS ENUM (
  'UNVERIFIED',        -- Niveau 0
  'SELF_DECLARED',     -- Niveau 1 : OTP passé
  'COMMUNITY_VERIFIED',-- Niveau 2 : validé par proches
  'DOCUMENT_DECLARED', -- Niveau 3 : CNI saisie
  'DOCUMENT_VERIFIED', -- Niveau 4 : scan vérifié
  'ADMIN_VERIFIED'     -- Niveau 5 : vérifié admin
);

CREATE TYPE union_type AS ENUM (
  'CUSTOMARY',   -- Mariage coutumier
  'CIVIL',       -- Mariage civil
  'RELIGIOUS',   -- Mariage religieux
  'FREE_UNION',  -- Union libre
  'UNKNOWN'      -- Type indéterminé
);

CREATE TYPE union_status AS ENUM (
  'ACTIVE',      -- Union en cours
  'ENDED',       -- Union terminée (séparation)
  'WIDOWED',     -- Veuvage
  'UNKNOWN'
);

CREATE TYPE parent_relationship_type AS ENUM (
  'BIOLOGICAL',         -- Parent biologique
  'CUSTOMARY_ADOPTIVE', -- Adoption coutumière
  'LEGAL_ADOPTIVE',     -- Adoption légale
  'PRESUMED',           -- Parent présumé (info incertaine)
  'STEP'                -- Beau-parent
);

CREATE TYPE document_type AS ENUM (
  'CNI_CAMEROUN',
  'PASSPORT_CAMEROUN',
  'PASSPORT_FOREIGN',
  'ACTE_NAISSANCE',
  'CARTE_CONSULAIRE',
  'PERMIS_CONDUIRE',
  'CARTE_ELECTEUR',
  'CARTE_SCOLAIRE',
  'OTHER'
);

CREATE TYPE document_verification_status AS ENUM (
  'UNVERIFIED',
  'SELF_DECLARED',
  'COMMUNITY_VERIFIED',
  'DOCUMENT_VERIFIED',
  'ADMIN_VERIFIED',
  'DISPUTED'
);

CREATE TYPE name_type AS ENUM (
  'CIVIL',         -- Nom civil officiel
  'TRADITIONAL',   -- Nom traditionnel / de pays
  'NICKNAME',      -- Surnom
  'MARRIED',       -- Nom d'épouse
  'RELIGIOUS',     -- Nom religieux / baptême
  'FORMER'         -- Ancien nom
);

CREATE TYPE date_precision AS ENUM (
  'EXACT',         -- Date précise connue
  'MONTH',         -- Mois connu, jour inconnu
  'YEAR',          -- Année connue
  'DECADE',        -- Décennie connue
  'APPROXIMATE',   -- Approximation libre
  'UNKNOWN'        -- Inconnue
);

CREATE TYPE notification_type AS ENUM (
  'INVITATION_RECEIVED',
  'CLAIM_REQUEST',
  'CLAIM_VALIDATED',
  'MERGE_PROPOSAL',
  'MODIFICATION_SUGGESTED',
  'NEW_FAMILY_MEMBER',
  'DECEASE_REPORTED',
  'BIRTHDAY_REMINDER',
  'MEMORIAL_REMINDER',
  'DOCUMENT_VERIFIED',
  'OTHER'
);

-- ============================================================
-- TABLE : Account
-- ============================================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) UNIQUE NOT NULL, -- Format E.164 : +237...
  phone_country_code VARCHAR(5) NOT NULL DEFAULT '+237',
  phone_operator VARCHAR(20), -- 'MTN', 'ORANGE', 'CAMTEL', 'NEXTTEL', etc.

  pin_hash VARCHAR(255), -- PIN 4 chiffres optionnel, bcrypt
  pin_enabled BOOLEAN DEFAULT FALSE,

  language_preference VARCHAR(5) DEFAULT 'fr', -- 'fr', 'en', 'pidgin'
  data_saver_mode BOOLEAN DEFAULT FALSE,
  large_text_mode BOOLEAN DEFAULT FALSE, -- Mode "grand-mère"

  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  last_login_device_id VARCHAR(255),

  email VARCHAR(255), -- Optionnel
  whatsapp_enabled BOOLEAN DEFAULT TRUE,

  is_active BOOLEAN DEFAULT TRUE,
  is_banned BOOLEAN DEFAULT FALSE,
  banned_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_accounts_phone ON accounts(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_active ON accounts(is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE : Person (cœur du graphe)
-- ============================================================

CREATE TABLE persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Nom principal dénormalisé (pour perf de recherche)
  display_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL, -- lowercase, unaccent, trim
  name_soundex VARCHAR(10),               -- Pour matching phonétique
  name_metaphone VARCHAR(20),             -- Matching phonétique amélioré

  gender VARCHAR(1) CHECK (gender IN ('M', 'F', 'O', 'U')), -- U = Unknown, O = Other

  -- STATUT VIE/DÉCÈS (OBLIGATOIRE)
  life_status life_status NOT NULL DEFAULT 'UNKNOWN',
  deceased_assumed BOOLEAN DEFAULT FALSE, -- TRUE si ancêtre lointain par inférence

  -- Dates (flexibles)
  birth_date DATE, -- Date précise si connue
  birth_date_precision date_precision DEFAULT 'UNKNOWN',
  birth_year_approximate INTEGER, -- Ex: 1960, 1945
  birth_date_text VARCHAR(100), -- "avant indépendance", "année de la sécheresse"

  deceased_date DATE,
  deceased_date_precision date_precision DEFAULT 'UNKNOWN',
  deceased_year_approximate INTEGER,
  deceased_date_text VARCHAR(100),

  -- Lieux
  birth_place VARCHAR(255),
  birth_region VARCHAR(100), -- Région du Cameroun
  birth_country VARCHAR(100) DEFAULT 'Cameroun',

  deceased_place VARCHAR(255),
  deceased_region VARCHAR(100),
  deceased_country VARCHAR(100),

  current_residence_place VARCHAR(255), -- Pour les vivants
  current_residence_country VARCHAR(100),

  -- Contexte culturel
  ethnicity VARCHAR(100),          -- Ethnie (champ privé)
  village_origin VARCHAR(255),     -- Village d'origine (important culturellement)
  chefferie VARCHAR(255),          -- Chefferie d'appartenance

  -- Biographie
  biography TEXT, -- Brève bio (< 500 mots)
  occupation VARCHAR(255),

  -- Média
  primary_photo_id UUID,           -- FK vers media
  has_photo BOOLEAN DEFAULT FALSE,

  -- Vérification et qualité
  verification_level verification_level DEFAULT 'UNVERIFIED',
  confidence_score NUMERIC(3,2) DEFAULT 0.0, -- 0.0 à 1.0

  -- Création et modification
  created_by_account_id UUID REFERENCES accounts(id),
  updated_by_account_id UUID REFERENCES accounts(id),

  -- Claim (quel Account représente cette personne ?)
  claimed_by_account_id UUID REFERENCES accounts(id),
  claim_verified_at TIMESTAMPTZ,

  -- Confidentialité
  is_public BOOLEAN DEFAULT FALSE, -- Visible publiquement (ancêtres décédés anciens)
  privacy_level INTEGER DEFAULT 1, -- 1=famille directe, 2=étendue, 3=public

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Contrainte : si décédé, deceased_date_precision ne peut pas être UNKNOWN sans raison
  -- (on tolère UNKNOWN pour ancêtres anciens uniquement si deceased_assumed = TRUE)
  CONSTRAINT chk_deceased_coherent CHECK (
    life_status != 'DECEASED' OR
    deceased_date IS NOT NULL OR
    deceased_year_approximate IS NOT NULL OR
    deceased_date_text IS NOT NULL OR
    deceased_assumed = TRUE
  )
);

CREATE INDEX idx_persons_name_trgm ON persons USING gin (normalized_name gin_trgm_ops);
CREATE INDEX idx_persons_soundex ON persons(name_soundex);
CREATE INDEX idx_persons_metaphone ON persons(name_metaphone);
CREATE INDEX idx_persons_birth_year ON persons(birth_year_approximate);
CREATE INDEX idx_persons_village ON persons(village_origin);
CREATE INDEX idx_persons_claimed ON persons(claimed_by_account_id);
CREATE INDEX idx_persons_life_status ON persons(life_status);
CREATE INDEX idx_persons_created_by ON persons(created_by_account_id);

-- ============================================================
-- TABLE : PersonName (noms multiples)
-- ============================================================

CREATE TABLE person_names (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,

  name_type name_type NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  middle_names VARCHAR(255),

  normalized_full_name VARCHAR(255) NOT NULL,
  soundex_code VARCHAR(10),
  metaphone_code VARCHAR(20),

  is_primary BOOLEAN DEFAULT FALSE,
  used_from_date DATE,
  used_until_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_person_names_person ON person_names(person_id);
CREATE INDEX idx_person_names_normalized_trgm ON person_names USING gin (normalized_full_name gin_trgm_ops);

-- ============================================================
-- TABLE : Union (mariages / unions)
-- ============================================================

CREATE TABLE unions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  union_type union_type NOT NULL DEFAULT 'UNKNOWN',
  status union_status DEFAULT 'UNKNOWN',

  start_date DATE,
  start_date_precision date_precision DEFAULT 'UNKNOWN',
  start_year_approximate INTEGER,
  start_date_text VARCHAR(100),

  end_date DATE,
  end_date_precision date_precision DEFAULT 'UNKNOWN',
  end_year_approximate INTEGER,
  end_reason VARCHAR(50), -- 'SEPARATION', 'DIVORCE', 'WIDOW', 'OTHER'

  place VARCHAR(255),
  notes TEXT,

  created_by_account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- TABLE : UnionPartner (liaison Person ↔ Union, supporte polygamie)
-- ============================================================

CREATE TABLE union_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  union_id UUID NOT NULL REFERENCES unions(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,

  role VARCHAR(50), -- 'HUSBAND', 'WIFE', 'PARTNER', etc.
  wife_rank INTEGER, -- Pour polygamie : 1ère, 2ème, 3ème femme

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(union_id, person_id)
);

CREATE INDEX idx_union_partners_union ON union_partners(union_id);
CREATE INDEX idx_union_partners_person ON union_partners(person_id);

-- ============================================================
-- TABLE : ParentChild (relation parent-enfant, indépendante d'Union)
-- ============================================================

CREATE TABLE parent_child (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,

  relationship_type parent_relationship_type NOT NULL DEFAULT 'BIOLOGICAL',

  -- Union optionnelle dans laquelle cet enfant est né
  -- NULL si enfant hors union ou union inconnue
  union_id UUID REFERENCES unions(id) ON DELETE SET NULL,

  confidence NUMERIC(3,2) DEFAULT 1.0,
  notes TEXT,

  created_by_account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Empêche doublons de relation
  UNIQUE(parent_id, child_id, relationship_type)
);

CREATE INDEX idx_parent_child_parent ON parent_child(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_parent_child_child ON parent_child(child_id) WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE : Claim (revendication d'identité)
-- ============================================================

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,

  status claim_status NOT NULL DEFAULT 'PENDING',
  verification_level verification_level DEFAULT 'SELF_DECLARED',

  -- Qui a validé
  validated_by_account_ids UUID[] DEFAULT '{}',
  validation_count INTEGER DEFAULT 0,

  -- Contestation
  disputed_by_claim_id UUID REFERENCES claims(id),
  dispute_reason TEXT,

  evidence TEXT, -- Justification libre par l'utilisateur

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  UNIQUE(account_id, person_id) -- Un Account ne peut claimer la même Person qu'une fois
);

CREATE INDEX idx_claims_account ON claims(account_id);
CREATE INDEX idx_claims_person ON claims(person_id);
CREATE INDEX idx_claims_status ON claims(status);

-- Un seul claim VERIFIED par Person à la fois
CREATE UNIQUE INDEX idx_claims_one_verified_per_person
  ON claims(person_id) WHERE status = 'VERIFIED';

-- ============================================================
-- TABLE : IdentityDocument (documents d'identité multiples)
-- ============================================================

CREATE TABLE identity_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,

  document_type document_type NOT NULL,

  -- Numéro stocké de façon sécurisée
  document_number_hash VARCHAR(64) NOT NULL, -- SHA-256(number + salt)
  document_number_last4 VARCHAR(4),          -- 4 derniers en clair pour UX
  document_number_encrypted TEXT,            -- Chiffré via KMS, accès restreint

  issuing_authority VARCHAR(255),
  issuing_place VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,

  scan_file_id UUID, -- Référence vers media (scan chiffré en S3)
  scan_expires_at TIMESTAMPTZ, -- Suppression automatique du scan (90 jours par défaut)

  verification_status document_verification_status DEFAULT 'SELF_DECLARED',
  verified_by_account_id UUID REFERENCES accounts(id),
  verified_at TIMESTAMPTZ,
  ocr_extracted_data JSONB, -- Données extraites par OCR

  added_by_account_id UUID REFERENCES accounts(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_identity_docs_person ON identity_documents(person_id);
CREATE INDEX idx_identity_docs_hash ON identity_documents(document_number_hash);
CREATE INDEX idx_identity_docs_type ON identity_documents(document_type);

-- Unicité : un même numéro de document ne peut pas être associé à deux Person différentes
CREATE UNIQUE INDEX idx_identity_docs_unique_hash
  ON identity_documents(document_type, document_number_hash)
  WHERE deleted_at IS NULL;

-- ============================================================
-- TABLE : Contribution (audit trail)
-- ============================================================

CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id),

  entity_type VARCHAR(50) NOT NULL, -- 'person', 'union', 'parent_child', etc.
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'VALIDATE', 'MERGE'

  field_name VARCHAR(100),     -- Si UPDATE, quel champ
  old_value JSONB,
  new_value JSONB,

  note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contributions_account ON contributions(account_id);
CREATE INDEX idx_contributions_entity ON contributions(entity_type, entity_id);
CREATE INDEX idx_contributions_created ON contributions(created_at DESC);

-- ============================================================
-- TABLE : Source (preuves / sources)
-- ============================================================

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
  union_id UUID REFERENCES unions(id) ON DELETE CASCADE,

  source_type VARCHAR(50), -- 'DOCUMENT_SCAN', 'AUDIO_TESTIMONY', 'CHURCH_REGISTER', 'CHIEFTAINCY_REGISTER', 'FAMILY_BOOK', 'OTHER'
  title VARCHAR(255),
  description TEXT,

  media_file_id UUID, -- Référence vers media
  audio_transcript TEXT, -- Pour témoignages oraux

  added_by_account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_sources_person ON sources(person_id);
CREATE INDEX idx_sources_union ON sources(union_id);

-- ============================================================
-- TABLE : Media (fichiers)
-- ============================================================

CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  file_type VARCHAR(20) NOT NULL, -- 'IMAGE', 'AUDIO', 'DOCUMENT_SCAN'
  mime_type VARCHAR(50),
  file_size_bytes BIGINT,

  s3_bucket VARCHAR(100) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  cdn_url VARCHAR(500),

  is_encrypted BOOLEAN DEFAULT FALSE, -- TRUE pour scans CNI
  encryption_key_id VARCHAR(100),    -- Référence vers KMS

  width INTEGER, -- Pour images
  height INTEGER,
  duration_seconds INTEGER, -- Pour audio

  uploaded_by_account_id UUID REFERENCES accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Pour scans temporaires
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_media_account ON media(uploaded_by_account_id);
CREATE INDEX idx_media_expires ON media(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- TABLE : InvitationToken
-- ============================================================

CREATE TABLE invitation_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(64) UNIQUE NOT NULL, -- Token cryptographiquement signé

  inviter_account_id UUID NOT NULL REFERENCES accounts(id),
  target_person_id UUID REFERENCES persons(id), -- Person pré-créée si applicable
  target_phone_number VARCHAR(20), -- Si invitation par numéro

  relationship_hint VARCHAR(100), -- "cousin", "neveu", etc.

  used_at TIMESTAMPTZ,
  used_by_account_id UUID REFERENCES accounts(id),

  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitation_token ON invitation_tokens(token);
CREATE INDEX idx_invitation_inviter ON invitation_tokens(inviter_account_id);
CREATE INDEX idx_invitation_phone ON invitation_tokens(target_phone_number);

-- ============================================================
-- TABLE : VerificationRequest (file de modération)
-- ============================================================

CREATE TABLE verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  request_type VARCHAR(50) NOT NULL, -- 'DOCUMENT_SCAN', 'CLAIM_VALIDATION', 'DEATH_REPORT', 'MERGE_DISPUTE'
  related_entity_type VARCHAR(50),
  related_entity_id UUID,

  submitted_by_account_id UUID REFERENCES accounts(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'
  priority INTEGER DEFAULT 5, -- 1 (urgent) à 10

  assigned_moderator_id UUID REFERENCES accounts(id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,

  data JSONB -- Données spécifiques à la requête
);

CREATE INDEX idx_verif_status_priority ON verification_requests(status, priority);
CREATE INDEX idx_verif_submitted_by ON verification_requests(submitted_by_account_id);

-- ============================================================
-- TABLE : MergeProposal (propositions de fusion de doublons)
-- ============================================================

CREATE TABLE merge_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  person_a_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  person_b_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,

  match_score NUMERIC(3,2) NOT NULL, -- 0.0 à 1.0
  matching_signals JSONB, -- Détails du matching

  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'

  proposed_by VARCHAR(20), -- 'AUTO' ou 'USER' ou 'ADMIN'
  proposed_by_account_id UUID REFERENCES accounts(id),

  reviewed_by_account_ids UUID[] DEFAULT '{}',
  accepted_by_account_ids UUID[] DEFAULT '{}',
  rejected_by_account_ids UUID[] DEFAULT '{}',

  resolved_at TIMESTAMPTZ,
  resolved_into_person_id UUID REFERENCES persons(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (person_a_id < person_b_id) -- Empêche doublons de proposition
);

CREATE INDEX idx_merge_status ON merge_proposals(status);
CREATE INDEX idx_merge_persons ON merge_proposals(person_a_id, person_b_id);

-- ============================================================
-- TABLE : Notification
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  notification_type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,

  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  action_url VARCHAR(500),

  channels VARCHAR(20)[] DEFAULT '{"push"}', -- 'push', 'sms', 'whatsapp', 'email'
  sent_at TIMESTAMPTZ,

  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_account ON notifications(account_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- TABLE : OtpRequest (audit OTP + rate limiting)
-- ============================================================

CREATE TABLE otp_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(64) NOT NULL, -- SHA-256 du code OTP
  channel VARCHAR(20) NOT NULL, -- 'SMS', 'WHATSAPP', 'VOICE'

  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  ip_address INET,
  device_id VARCHAR(255),

  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_requests(phone_number, created_at DESC);
CREATE INDEX idx_otp_expires ON otp_requests(expires_at) WHERE verified = FALSE;

-- ============================================================
-- FONCTIONS : Triggers de mise à jour
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur toutes les tables pertinentes
CREATE TRIGGER trigger_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_persons_updated_at BEFORE UPDATE ON persons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_unions_updated_at BEFORE UPDATE ON unions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_parent_child_updated_at BEFORE UPDATE ON parent_child FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_claims_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_identity_docs_updated_at BEFORE UPDATE ON identity_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FONCTION : Normalisation de noms (pour matching)
-- ============================================================

CREATE OR REPLACE FUNCTION normalize_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(unaccent(trim(name)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- REQUÊTES RÉCURSIVES : Exploration du graphe
-- ============================================================

-- Récupérer tous les ancêtres d'une personne jusqu'à N générations
CREATE OR REPLACE FUNCTION get_ancestors(
  person_uuid UUID,
  max_generations INTEGER DEFAULT 5
) RETURNS TABLE (
  ancestor_id UUID,
  generation INTEGER,
  path UUID[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    SELECT pc.parent_id AS ancestor_id, 1 AS generation, ARRAY[person_uuid, pc.parent_id] AS path
    FROM parent_child pc
    WHERE pc.child_id = person_uuid AND pc.deleted_at IS NULL

    UNION ALL

    SELECT pc.parent_id, a.generation + 1, a.path || pc.parent_id
    FROM parent_child pc
    JOIN ancestors a ON pc.child_id = a.ancestor_id
    WHERE pc.deleted_at IS NULL
      AND a.generation < max_generations
      AND NOT pc.parent_id = ANY(a.path) -- Évite cycles
  )
  SELECT a.ancestor_id, a.generation, a.path FROM ancestors a;
END;
$$ LANGUAGE plpgsql;

-- Récupérer tous les descendants
CREATE OR REPLACE FUNCTION get_descendants(
  person_uuid UUID,
  max_generations INTEGER DEFAULT 5
) RETURNS TABLE (
  descendant_id UUID,
  generation INTEGER,
  path UUID[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE descendants AS (
    SELECT pc.child_id AS descendant_id, 1 AS generation, ARRAY[person_uuid, pc.child_id] AS path
    FROM parent_child pc
    WHERE pc.parent_id = person_uuid AND pc.deleted_at IS NULL

    UNION ALL

    SELECT pc.child_id, d.generation + 1, d.path || pc.child_id
    FROM parent_child pc
    JOIN descendants d ON pc.parent_id = d.descendant_id
    WHERE pc.deleted_at IS NULL
      AND d.generation < max_generations
      AND NOT pc.child_id = ANY(d.path)
  )
  SELECT d.descendant_id, d.generation, d.path FROM descendants d;
END;
$$ LANGUAGE plpgsql;

-- Récupérer voisinage d'une personne (ancêtres + descendants + conjoints + fratrie)
-- jusqu'à N degrés (utilisé pour l'affichage d'arbre)
CREATE OR REPLACE FUNCTION get_family_neighborhood(
  person_uuid UUID,
  max_degrees INTEGER DEFAULT 2
) RETURNS TABLE (
  person_id UUID,
  relationship_type TEXT,
  degree INTEGER
) AS $$
-- Implémentation détaillée : combine ancêtres, descendants, fratrie et conjoints
-- selon les définitions de degré de parenté
BEGIN
  -- Logique à détailler lors de l'implémentation
  -- 1. Récupérer ancêtres jusqu'à max_degrees
  -- 2. Pour chaque ancêtre, récupérer descendants (→ fratrie, cousins, etc.)
  -- 3. Récupérer conjoints de chaque personne
  -- 4. Calculer le degré exact pour chaque personne
  NULL;
END;
$$ LANGUAGE plpgsql;
```

### 6.3 Index critiques pour performance

Les index suivants sont essentiels pour la performance :

- `idx_persons_name_trgm` : recherche floue sur nom (GIN trigram)
- `idx_persons_soundex` : matching phonétique
- `idx_persons_metaphone` : matching phonétique amélioré
- `idx_persons_birth_year` : filtrage par décennie
- `idx_persons_village` : filtrage par village
- `idx_identity_docs_hash` : lookup CNI par hash
- `idx_parent_child_parent` / `idx_parent_child_child` : parcours du graphe

---

## 7. Authentification et identité

### 7.1 Principe

Authentification **sans mot de passe** : téléphone + OTP. PIN 4 chiffres optionnel pour actions sensibles uniquement.

### 7.2 Flux OTP

**Étape 1 : Saisie du numéro**
- Champ avec indicatif +237 pré-rempli.
- Détection automatique de l'opérateur par préfixe (MTN, Orange, Camtel, Nexttel).
- Validation du format E.164.

**Étape 2 : Envoi de l'OTP**
- Génération d'un code 6 chiffres aléatoire cryptographiquement sûr.
- Hash SHA-256 stocké en base (`otp_requests.otp_hash`).
- Expiration : 5 minutes.
- Envoi via canaux (par ordre de priorité) :
  1. WhatsApp (via Meta Business API) — coût quasi nul.
  2. SMS (via Africa's Talking, fallback sur Twilio).
  3. Voice call avec lecture du code (dernier recours).

**Étape 3 : Vérification**
- Maximum 3 tentatives par OTP.
- Auto-remplissage sur Android via SMS Retriever API (pas besoin d'ouvrir les SMS).
- Transition instantanée dès saisie complète (pas de bouton "Valider").

### 7.3 Rate limiting OTP

- **3 tentatives / 15 minutes / numéro**.
- **10 OTP / jour / numéro**.
- **5 OTP / heure / IP**.
- Détection de SIM swap : si numéro change de device récemment, re-vérification renforcée.

### 7.4 Sessions

- JWT signé avec clé rotative.
- Durée de session par défaut : 90 jours.
- Refresh token avec rotation.
- Re-auth OTP requise pour :
  - Changement de numéro de téléphone
  - Suppression définitive de compte
  - Accès aux documents d'identité sensibles
  - Modifications d'ancêtres sensibles (chefs, etc.)

### 7.5 PIN optionnel

- 4 chiffres, stocké via bcrypt (`pin_hash`).
- Proposé en option dans les paramètres.
- Utilisé pour réouverture rapide de l'app sans OTP.
- Demandé pour certaines actions sensibles si activé.

### 7.6 Déconnexion

- Sur tous les devices (révocation tokens).
- Historique de connexions visible (IP, device, date).

---

## 8. Gestion du statut vie/décès (obligatoire)

### 8.1 Principe fondamental

Le statut vie/décès est **obligatoire** pour toute Person créée. Raisons :

1. **Information toujours connue** par la personne qui ajoute (contrairement aux dates).
2. **Structurant pour le graphe** : calculs démographiques, règles de visibilité.
3. **Culturellement aligné** : les ancêtres décédés sont honorés, pas ignorés.
4. **Légalement critique** : droits RGPD différents vivants/décédés.
5. **Débloque fonctionnalités** : notifications, mémorial, visualisation.

### 8.2 Valeurs possibles

- `ALIVE` : vivant (avec nous).
- `DECEASED` : décédé (nous a quittés).
- `UNKNOWN` : utilisable uniquement pour ancêtres très anciens avec `deceased_assumed = true`.

### 8.3 UX de saisie

**Langage humain et respectueux** — jamais "vivant/décédé" cliniquement :
- 🌿 **"Il est avec nous"** (vivant)
- 🕊️ **"Il nous a quittés"** (décédé)

**Interaction en 1 tap** sur deux grandes cartes visuelles, pas de toggle, pas de menu déroulant.

### 8.4 Échappatoire honnête pour ancêtres anciens

L'option "Je ne sais pas vraiment" **N'APPARAÎT PAS** par défaut. Elle apparaît **uniquement si l'utilisateur hésite** :
- Après 10 secondes d'inactivité sur l'écran, OU
- Après 2 taps successifs sur les options sans valider.

Alors un petit lien discret apparaît : *"Je ne sais pas vraiment — c'est un ancêtre lointain"*.

Au clic, explication : *"Si c'est un ancêtre très ancien et qu'on peut raisonnablement supposer qu'il n'est plus parmi nous, on l'inscrit comme ancêtre mémoire"* → bouton **"C'est un ancêtre mémoire"** → `life_status = DECEASED` + `deceased_assumed = true`.

### 8.5 Date de décès

Si `DECEASED`, écran additionnel **unique** :

> **"En quelle année nous a-t-il quittés ?"**
> *"Si tu ne sais pas précisément, choisis approximativement."*

Options proposées (sélecteur visuel rapide) :
- **"Cette année"** / **"L'an dernier"** / **"Il y a 2 ans"** (pour décès récents)
- Décennies : "années 2010", "années 2000", "années 90", "années 80", "années 70", "avant 1970"
- **"Je ne sais pas vraiment"** (acceptable ici)
- Lien **"Saisir une date précise"** → date picker complet

### 8.6 Traitement visuel différencié

**Personnes vivantes** :
- Photo couleur.
- Cercle avec bordure colorée vive.
- Nom en noir.

**Personnes décédées** :
- Photo avec filtre sépia/noir-blanc léger.
- Petit symbole discret (colombe, feuille, étoile).
- Dates de vie affichées (ex : "1945 — 2020").

**Ancêtres mémoire** (`deceased_assumed = true`) :
- Silhouette stylisée si pas de photo.
- Traitement visuel encore plus sobre.
- Indication discrète "Ancêtre mémoire".

### 8.7 Règles métier liées au statut

- Le bouton "Inviter cette personne" **n'apparaît jamais** sur un profil `DECEASED` (bloqué UI + serveur).
- Les claims sur une Person `DECEASED` déclenchent un workflow spécifique ("gardien de mémoire" plutôt que propriétaire).
- Notifications anniversaires uniquement pour `ALIVE`.
- Notifications commémoratives pour `DECEASED`.

### 8.8 Transition vivant → décédé (décès signalé)

**Workflow de signalement :**

1. Bouton discret *"Signaler un décès"* sur la fiche de la personne (pas mis en avant).
2. Écran respectueux : *"Signaler le décès de [Nom]"* + champ date + option "circonstances".
3. Le changement entre en **pending 48h**.
4. Notification à 2-3 proches vérifiés (conjoint, enfants, parents) pour confirmation.
5. Si la personne a un compte actif, elle reçoit une alerte immédiate et peut annuler en 1 tap.
6. Après validation ou expiration des 48h sans contestation → transition effective.

**Notification respectueuse** aux proches (pas *"X est mort !"*) :
> *"La famille partage le décès de X. Tu peux laisser un mot de souvenir."*

**Espace mémorial** : la fiche devient un espace où les proches peuvent laisser messages, photos, anecdotes.

### 8.9 Protection contre abus

- Changement vers `DECEASED` nécessite consensus (2-3 proches) OU délai de 7 jours sans contestation.
- La personne elle-même (si Account) peut annuler en 1 tap.
- Audit trail complet.
- Détection d'anomalies : Account qui change 10+ statuts en `DECEASED` rapidement → flag modération.
- Transition `DECEASED → ALIVE` : extrêmement rare, validation manuelle modérateur obligatoire.

---

## 9. Moteur de matching et dédoublonnage

### 9.1 Objectif

Détecter automatiquement quand deux Person dans le graphe représentent probablement le même individu, et proposer la fusion.

### 9.2 Signaux de matching

#### Signaux forts (haute valeur discriminante)

| Signal | Score |
|--------|-------|
| Même CNI (hash déterministe) | +0.95 (match quasi-certain) |
| Même numéro de téléphone lié | +0.85 |
| Nom exact + date naissance exacte + lieu | +0.80 |

#### Signaux moyens

| Signal | Score |
|--------|-------|
| Nom phonétique proche + année naissance ± 2 ans + village | +0.40 |
| Même nom des deux parents | +0.50 |
| Nom + date naissance décennie + ethnie | +0.25 |
| Conjoint commun identifié | +0.30 |

#### Signaux faibles

| Signal | Score |
|--------|-------|
| Juste nom + prénom similaires | +0.10 |
| Juste village commun | +0.05 |
| Juste âge approximatif | +0.05 |

### 9.3 Pipeline en deux phases

**Phase 1 — Blocking (réduction rapide)**

Objectif : passer d'un million de Person à ~100 candidats en millisecondes.

Clés de blocking utilisées :
- Premières 3 lettres du nom normalisé
- Soundex du prénom
- Décennie de naissance
- Région/village si disponible

Requête SQL type :

```sql
SELECT p.id, p.display_name, p.birth_year_approximate, p.village_origin
FROM persons p
WHERE p.deleted_at IS NULL
  AND (
    p.name_soundex = $soundex_new
    OR substring(p.normalized_name, 1, 3) = substring($normalized_new, 1, 3)
    OR similarity(p.normalized_name, $normalized_new) > 0.4
  )
  AND (
    p.birth_year_approximate BETWEEN $year_new - 3 AND $year_new + 3
    OR p.birth_year_approximate IS NULL
  )
LIMIT 100;
```

**Phase 2 — Scoring détaillé**

Sur les candidats, calcul d'un score composite avec les algorithmes :

- **Levenshtein distance** normalisée sur noms.
- **Jaro-Winkler** pour prénoms.
- **Différence temporelle** sur dates (avec tolérance flou).
- **Overlap des parents déclarés**.
- **Overlap des conjoints**.
- **Cohérence géographique** (même village, région).

Pondération finale via formule :

```
final_score =
    0.30 * name_similarity_score +
    0.15 * phonetic_similarity_score +
    0.20 * date_proximity_score +
    0.15 * parent_overlap_score +
    0.10 * location_match_score +
    0.10 * other_signals_score
```

### 9.4 Seuils de décision

- **final_score >= 0.90** : match automatique, proposition de fusion forte.
- **0.70 <= final_score < 0.90** : zone grise, proposition à l'utilisateur avec validation manuelle.
- **final_score < 0.70** : ignoré (évite faux positifs).

**Principe critique :** mieux vaut un faux négatif (match raté → fusion manuelle plus tard) qu'un faux positif (fusion de deux personnes différentes → pollution du graphe).

### 9.5 Exécution du matching

**En temps réel :**
- À chaque création de Person par un utilisateur.
- Résultats proposés immédiatement dans l'UI.

**En batch nocturne :**
- Job de re-scan complet hebdomadaire pour détecter doublons apparus.
- Priorité aux Person créées dans la semaine.
- Génération de `MergeProposal` en base pour modération.

### 9.6 Workflow de fusion

1. `MergeProposal` créée (auto ou par utilisateur).
2. Notification aux contributeurs originaux des deux Person.
3. Interface de revue :
   - Affichage côte à côte des deux profils.
   - Champ par champ : "Lequel garder ?".
   - Conservation de l'historique (`Contribution`).
4. Validation par contributeurs originaux OU par modérateur.
5. Fusion technique :
   - Création d'une nouvelle Person "survivante" avec les meilleures données.
   - Redirection des relations (`parent_child`, `unions`, `claims`, etc.) vers la survivante.
   - Marquage de l'autre Person comme `deleted_at = NOW()` avec `merged_into = survivor_id`.
6. Trace immuable dans `merge_proposals.resolved_at` et `resolved_into_person_id`.

---

## 10. Niveaux de vérification

### 10.1 Système en couches

| Niveau | Nom | Description |
|--------|-----|-------------|
| 0 | UNVERIFIED | Person ajoutée, aucun claim |
| 1 | SELF_DECLARED | Claim avec OTP passé |
| 2 | COMMUNITY_VERIFIED | Validé par créateur originel OU 2+ proches vérifiés |
| 3 | DOCUMENT_DECLARED | CNI/document officiel saisi, non vérifié visuellement |
| 4 | DOCUMENT_VERIFIED | Scan uploadé, OCR concordant, revue humaine |
| 5 | ADMIN_VERIFIED | Vérifié manuellement par équipe (chefs, personnalités) |

### 10.2 Calcul du niveau

Le niveau final d'une Person est déduit automatiquement des :
- Claims actifs et leur statut.
- Documents d'identité présents et leur vérification.
- Validations communautaires enregistrées.

### 10.3 Fonctionnalités débloquées par niveau

- **Niveau 2 requis** pour modifier des données sur des ancêtres partagés.
- **Niveau 3 requis** pour contester un Claim.
- **Niveau 4 requis** pour créer des Person "sensibles" (personnalités publiques, chefs).

### 10.4 Affichage visuel

Badge discret sur la fiche personne :
- Niveau 1-2 : indicateur gris/neutre.
- Niveau 3 : badge "Document déclaré" (bleu clair).
- Niveau 4 : badge "Identité vérifiée" (vert).
- Niveau 5 : badge "Vérification admin" (doré).

---

## 11. Stack technique

### 11.1 Mobile

**Framework : Flutter (Dart)**

Justification :
- Performance native critique pour visualisation d'arbre (CustomPainter/Canvas).
- Une base de code iOS + Android.
- Excellent support offline (Drift pour SQLite).
- Bibliothèques matures pour OCR (Google ML Kit).

**Packages clés :**
- `flutter_bloc` ou `riverpod` : state management.
- `drift` : SQLite local.
- `dio` : HTTP client.
- `freezed` : immutable data classes.
- `google_mlkit_text_recognition` : OCR CNI.
- `firebase_messaging` : push notifications.
- `image_picker` / `camera` : capture photos.
- `flutter_image_compress` : compression avant upload.
- `go_router` : navigation.
- `intl` : internationalisation fr/en.

### 11.2 Web / PWA

**Framework : Next.js 15 (React)**

Justification :
- PWA performante pour diaspora et desktop.
- SSR pour SEO des pages publiques (mémoriaux).
- Écosystème mature.

**Stack :**
- TypeScript strict.
- Tailwind CSS + shadcn/ui.
- TanStack Query pour fetching.
- Zustand pour state.
- D3.js ou vis-network pour visualisation arbre.

### 11.3 Backend

**Framework : NestJS (TypeScript)**

Justification :
- Structure modulaire mature.
- Écosystème complet (auth, queues, validation).
- TypeScript de bout en bout (partage de types avec frontend).

**Architecture :**
- Monorepo avec Nx ou Turborepo.
- Microservices logiques (auth, core, media, notifications).
- Déploiement initial monolithique avec séparation possible.

**Packages clés :**
- `@nestjs/typeorm` ou `prisma` : ORM.
- `@nestjs/bull` ou `bullmq` : jobs asynchrones.
- `@nestjs/passport` + `passport-jwt` : auth.
- `class-validator` + `class-transformer` : validation.
- `@nestjs/swagger` : documentation API.
- `@nestjs/throttler` : rate limiting.
- `nestjs-pino` : logging structuré.

### 11.4 Base de données

**Primaire : PostgreSQL 16+** (AWS RDS Multi-AZ)

Extensions requises :
- `uuid-ossp`, `pg_trgm`, `fuzzystrmatch`, `unaccent`, `pgcrypto`

**Cache : Redis 7+** (AWS ElastiCache)
- OTP temporaires.
- Sessions.
- Cache de lecture (voisinages d'arbre fréquents).

**Recherche : OpenSearch** (AWS OpenSearch Service)
- Analyzers custom fr/en.
- Index noms avec n-grammes.

**Stockage fichiers : S3 + CloudFront**
- Bucket principal : photos profil.
- Bucket chiffré : scans CNI (lifecycle 90 jours).
- Lambda pour redimensionnement automatique.

**Graph DB (optionnel, phase 3) : Neo4j ou AgensGraph**
- Uniquement si dépassement 500k nœuds.
- Synchronisation PostgreSQL → Neo4j via CDC (Debezium).

### 11.5 Services tiers

| Service | Usage | Priorité |
|---------|-------|----------|
| Africa's Talking | SMS OTP | Haute |
| Meta WhatsApp Business API | WhatsApp OTP & notifications | Haute |
| Twilio | Fallback SMS | Moyenne |
| AWS KMS | Gestion clés chiffrement | Haute |
| AWS SES | Emails (facultatif) | Faible |
| AWS Textract | OCR avancé backend (fallback) | Moyenne |
| Stripe / Paystack / Orange Money API | Paiements premium | Phase 2 |
| Sentry | Monitoring erreurs | Haute |
| Datadog ou Grafana Cloud | Monitoring infra | Haute |
| Cloudflare | CDN / DDoS protection | Haute |

### 11.6 Infrastructure

**Hébergement : AWS région af-south-1 (Cape Town)**

- ECS Fargate ou EKS pour conteneurs backend.
- RDS Multi-AZ pour PostgreSQL.
- ElastiCache Redis.
- S3 + CloudFront.
- Route 53 pour DNS.
- Certificate Manager pour TLS.
- Secrets Manager pour secrets.
- VPC avec subnets publics/privés.
- WAF pour protection applicative.

**IaC : Terraform** pour toute l'infrastructure.

**CI/CD : GitHub Actions**
- Lint + tests sur PR.
- Build et push images ECR.
- Déploiement automatique staging sur merge `develop`.
- Déploiement manuel production avec approbation.

---

## 12. Spécification UX/UI détaillée

### 12.1 Principes directeurs

1. **Une seule action par écran**, grosse, évidente.
2. **Visuel avant texte** : illustrations, photos, icônes.
3. **Langage parlé camerounais**, pas français académique.
4. **Progressivité extrême** : demander minimum au début.
5. **Tolérance massive aux erreurs** : accepter formats flous.
6. **Réversibilité totale** : tout annulable.
7. **Mode offline par défaut** : actions locales + sync arrière-plan.
8. **Aide contextuelle non intrusive**.
9. **Récompense visuelle immédiate** : animations, badges.
10. **Design pour gros doigts, petit écran, soleil dehors** : boutons 60px, contraste élevé, typo 18-20px.

### 12.2 Langage cible

Remplacer systématiquement les termes techniques/administratifs par du langage naturel :

| ❌ Éviter | ✅ Préférer |
|----------|------------|
| "Enregistrer un ascendant paternel" | "Ajouter ton papa" |
| "Votre réseau généalogique" | "Ta famille" |
| "Veuillez identifier cette personne" | "C'est qui ?" |
| "Vivant / Décédé" | "Avec nous / Nous a quittés" |
| "Confirmer l'action" | "C'est bon" |
| "Erreur de validation" | "Ça n'a pas marché, réessaie" |

### 12.3 Modes d'accessibilité

- **Mode économe de données** : photos basse résolution, sync manuelle.
- **Mode "grand-mère"** : taille des textes et boutons +30%, écrans simplifiés.
- **Mode sombre** : phase 2, pas prioritaire.

### 12.4 Patterns de saisie

**Formulaires découpés :** jamais plus d'1 champ par écran pour les flows critiques. Une barre de progression en haut.

**Auto-advance :** transition automatique quand un champ est complet (ex : 6 chiffres d'OTP).

**Clavier adapté :** numérique pour téléphone/OTP/CNI, texte pour noms.

**Champs date tolérants :** sélecteurs rapides "cette année", "l'an dernier", "décennie", ou date précise.

### 12.5 Micro-interactions

- **Retour haptique** court sur actions importantes (validation OTP, ajout personne).
- **Son discret** "plop" sur ajout personne (désactivable, jamais à l'ouverture).
- **Animations** d'apparition des liens d'arbre, croissance de feuilles.
- **Confettis** sur complétion du premier degré d'arbre.

---

## 13. Design system

### 13.1 Palette de couleurs

**Couleurs principales (inspiration chaleureuse africaine, sans cliché) :**

```
Vert forêt (vivant)    #2D7A4B  - Personnes vivantes, actions positives
Terre cuite (chaleur)  #C8663B  - Accents, call-to-action secondaires
Ocre doré              #D9A441  - Éléments culturels, badges
Bleu profond           #1E3A5F  - Actions primaires, navigation
Gris cendre (mémoire)  #6B6B6B  - Personnes décédées (neutre respectueux)
Sable clair            #F5EFE0  - Backgrounds
Blanc cassé            #FAFAF5  - Cards
Noir charbon           #1A1A1A  - Texte principal
```

**Couleurs fonctionnelles :**
- Succès : `#2D7A4B` (vert forêt)
- Erreur : `#C8453B` (rouge brique, pas rouge pur agressif)
- Attention : `#D9A441` (ocre)
- Info : `#1E3A5F` (bleu profond)

**Contraste minimum WCAG AA** partout (4.5:1 pour texte, 3:1 pour UI).

### 13.2 Typographie

**Police principale : Inter** (open source, excellent rendu Android entry-level)

Alternative pour touche locale : **Manrope** ou **Lexend**.

**Échelle typographique :**
- Hero : 32px / bold
- Titre écran : 24px / semibold
- Titre section : 20px / semibold
- Body large : 18px / regular (défaut)
- Body : 16px / regular
- Caption : 14px / regular
- Micro : 12px / regular

**Line-height :** 1.5 pour body, 1.3 pour titres.

### 13.3 Spacing (base 4px)

```
xs  : 4px
sm  : 8px
md  : 16px
lg  : 24px
xl  : 32px
2xl : 48px
3xl : 64px
```

### 13.4 Composants de base

**Buttons :**
- Hauteur minimale : 56px (primary), 48px (secondary).
- Border radius : 12px.
- Padding horizontal : 24px.
- Feedback tactile obligatoire.

**Cards :**
- Border radius : 16px.
- Padding : 16px.
- Shadow subtile.
- Background : blanc cassé.

**Input fields :**
- Hauteur : 56px.
- Border radius : 12px.
- Padding : 16px.
- Label au-dessus, pas en placeholder (accessibilité).

**Photos de profil :**
- Cercles.
- Tailles : 40px (inline), 64px (liste), 96px (card), 160px (hero).
- Fallback : initiales sur fond coloré selon hash du nom.

### 13.5 Iconographie

**Source :** Phosphor Icons ou Lucide Icons (open source, style cohérent).

Taille par défaut : 24px, 32px pour actions principales.

### 13.6 Illustrations

Style **plat moderne**, représentation africaine authentique (peaux, vêtements, contextes camerounais reconnaissables). Commander à un illustrateur camerounais plutôt qu'utiliser des banques génériques.

---

## 14. User journey complet

### 14.1 Flow 1 : Inscription sans invitation (persona Thérèse)

**Écran 1 — Splash / Accueil**
- Logo + illustration famille multi-générationnelle.
- Bouton unique : **"Commencer"**.
- Petit lien : *"Déjà un compte ? Se connecter"*.

**Écran 2 — Proposition de valeur**
- Illustration douce.
- Texte unique : *"Retrouve et sauvegarde l'histoire de ta famille."*
- 3 mini-points avec icônes : *"Gratuit et simple"*, *"Ton histoire reste privée"*, *"Ta famille avec toi partout"*.
- Bouton : **"C'est parti"**.

**Écran 3 — Numéro de téléphone**
- Champ avec +237 pré-rempli.
- Clavier numérique auto-ouvert.
- Détection opérateur automatique (affichage logo discret).
- Bouton : **"Recevoir le code"**.
- Mention CGU discrète.

**Écran 4 — Saisie OTP**
- 6 cases numériques.
- Auto-remplissage via SMS Retriever.
- Compte à rebours visible.
- Bouton *"Je n'ai pas reçu le code"* avec options : renvoyer SMS / essayer WhatsApp / appeler assistant.
- Transition auto à 6 chiffres complets.

**Écran 5 — Nom**
- *"Comment t'appelles-tu ?"*
- Champ unique "Nom complet".
- Bouton **"Continuer"**.

**Écran 6 — Matching silencieux**
- Animation discrète 1-2 sec.
- Cas A (match fort) : *"On a peut-être trouvé ton profil"* + carte + **"Oui c'est moi"** / **"Non"**.
- Cas B (plusieurs) : *"Laquelle es-tu ?"* + 2-3 cartes + *"Aucune d'elles"*.
- Cas C (aucun) : passage écran 7.

**Écran 7 — Photo**
- *"Une photo de toi ?"*
- Boutons **"Prendre une photo"** / **"Choisir dans la galerie"** / lien *"Plus tard"*.

**Écran 8 — Ajout premier parent (papa)**

Sous-écran 8a : *"Comment s'appelle ton papa ?"* + champ nom + **"Continuer"**.

Sous-écran 8b : *"[Nom] est-il encore parmi nous ?"*
- 🌿 **"Avec nous"** / 🕊️ **"Nous a quittés"**

Sous-écran 8c (si décédé) : *"En quelle année environ ?"* + sélecteur décennies + option *"Je ne sais pas"*.

**Écran 9 — Ajout maman** (même séquence que 8).

**Écran 10 — Fratrie**
- *"Tu as combien de frères et sœurs ?"*
- Compteur +/- visuel.
- Génération de cartes vides à compléter une par une.
- Bouton persistant **"C'est bon pour l'instant"**.

**Écran 11 — Première vue d'arbre**
- Animation d'apparition.
- Toi au centre, parents au-dessus, fratrie à côté.
- Texte : *"Voilà ton arbre ! Continue à l'enrichir."*
- Boutons : **"Continuer à remplir"** / **"Explorer mon arbre"**.

**Écran 12 — Proposition d'invitation**
- *"[Jean-Paul, neveu] pourrait continuer à enrichir l'arbre. Veux-tu l'inviter ?"*
- Boutons : **"Inviter par WhatsApp"** (priorité) / **"Inviter par SMS"** / *"Plus tard"*.
- Clic WhatsApp → ouverture WhatsApp avec message pré-rédigé.

### 14.2 Flow 2 : Inscription avec invitation (cas idéal)

1. Réception lien WhatsApp : *"Ton cousin Paul t'a ajouté à l'arbre familial. Rejoins-le ici : [lien]"*.
2. Clic → app s'ouvre ou redirige vers téléchargement.
3. Écran : *"Paul t'a invité dans l'arbre de la famille Mopi"* + photos de quelques membres.
4. OTP (écrans 3-4 du flow 1).
5. Confirmation : *"Paul t'a ajouté comme son cousin. Confirme-tu être Gaetan Daryl Ngniawo Mopi, né vers 1992 ?"* → **"Oui c'est moi"**.
6. Claim créé automatiquement, notification à Paul pour validation.
7. Accès immédiat à l'arbre déjà peuplé par Paul.

### 14.3 Flow 3 : Ajout CNI (différé)

**Déclenchement :** après quelques jours d'usage OU au moment d'une action qui en bénéficie.

Écran :
- *"Renforcer ton profil"* (optionnel).
- Champ numéro OU bouton **"Scanner ma CNI"**.
- Rassurances : 🔒 *"Chiffré, jamais visible"* / 🚫 *"Aucun lien avec l'État"* / ✋ *"Retirable à tout moment"*.
- Boutons : **"Pas maintenant"** et **"Enregistrer"** (même poids visuel).

**Si scan :**
- Capture caméra avec overlay montrant le cadre CNI.
- OCR côté client (Google ML Kit).
- Pré-remplissage des champs extraits.
- Validation utilisateur.
- Upload scan chiffré en S3 (expiration 90 jours).

### 14.4 Flow 4 : Ajout d'un ancêtre décédé (sans beaucoup d'infos)

1. Depuis la fiche d'une Person, bouton **"+ Ajouter un parent"**.
2. *"Comment s'appelle-t-il ?"* + champ nom.
3. *"Il est avec nous ?"* → tap **"Nous a quittés"**.
4. Si hésitation → lien *"C'est un ancêtre lointain"* apparaît.
5. Si utilisateur le choisit : confirmation *"C'est un ancêtre mémoire"* → `deceased_assumed = true`.
6. Sinon : *"En quelle année ?"* → sélecteur décennies ou *"Je ne sais pas"*.
7. Ajout optionnel : village d'origine, ethnie, brève note.
8. Sauvegarde locale + sync arrière-plan.

### 14.5 Flow 5 : Signalement de décès

1. Depuis fiche Person `ALIVE`, bouton discret *"Signaler un décès"*.
2. Écran respectueux : *"Signaler le décès de [Nom]. Cette information sera visible par la famille. Merci de saisir avec soin."*
3. Champ date + champ circonstances optionnel.
4. Soumission → statut `pending_validation`.
5. Notifications à 2-3 proches vérifiés pour confirmation.
6. Si Person a Account : alerte immédiate à la personne avec possibilité d'annuler en 1 tap.
7. Délai 48h OU validations → transition effective.
8. Espace mémorial activé sur la fiche.

---

## 15. Visualisation de l'arbre généalogique

### 15.1 Vue principale : radiale centrée

**Principe :** l'utilisateur (ou la Person sélectionnée) au centre, cercles concentriques pour chaque degré.

- **Cercle 0** : la Person elle-même (grand disque, 160px).
- **Cercle 1** : parents (haut), conjoint(s) (côté), enfants (bas), fratrie (côtés).
- **Cercle 2** : grands-parents, oncles/tantes, cousins, neveux, petits-enfants.
- **Cercle 3+** : apparition progressive au zoom.

### 15.2 Interactions

- **Tap** sur une personne → bottom sheet avec fiche détaillée (slide par le bas, pas nouvelle page).
- **Long press** → options rapides (modifier, ajouter relation, inviter).
- **Pinch zoom** → passage d'un niveau à l'autre (1 → 2 → 3).
- **Pan** → déplacement libre (recentrage sur une autre personne possible).
- **Bouton "+" flottant** toujours visible → ajouter une personne liée au nœud central.
- **Bouton "Recentrer"** → retour à soi.

### 15.3 Rendu visuel des nœuds

**Vivants :**
- Photo couleur ronde.
- Bordure verte.
- Nom lisible en dessous.
- Âge actuel calculé.

**Décédés :**
- Photo sépia ou silhouette.
- Bordure grise douce.
- Petit symbole (colombe/feuille).
- Années de vie (ex : 1945-2020).

**Ancêtres mémoire (assumés) :**
- Silhouette stylisée.
- Traitement encore plus sobre.
- Label "Ancêtre mémoire".

### 15.4 Nœuds vides suggestifs

Afficher des emplacements pointillés là où des personnes sont évidemment manquantes :
- "Grand-père paternel" en pointillés si parents du père non renseignés.
- Tap → écran d'ajout avec contexte pré-rempli.

Guide l'utilisateur vers la complétion sans le forcer.

### 15.5 Liens visuels

- Trait plein : relation parent-enfant.
- Trait double : union (mariage).
- Trait pointillé : relation adoptive/présumée.
- Codes couleur selon le type.

### 15.6 Mode liste alternatif

Pour les utilisateurs qui se perdent dans la vue radiale :
- Bouton toggle *"Voir comme liste"*.
- Liste hiérarchique (ascendants, descendants, famille étendue).
- Tri par proximité.

### 15.7 Performance

- Chargement lazy des nœuds selon zoom.
- Cache Redis des voisinages fréquents (TTL 1h).
- Rendu Canvas (CustomPainter) pour gros arbres.
- Pagination des générations très profondes.

---

## 16. Sécurité et conformité légale

### 16.1 Cadre légal camerounais

- **Loi n° 2010/012** relative à la cybersécurité et la cybercriminalité.
- **Loi n° 2010/013** sur les communications électroniques.
- **ANTIC** (Agence Nationale des Technologies de l'Information et de la Communication) : régulateur.

**Obligations :**
- Déclaration du traitement à l'ANTIC.
- Politique de confidentialité bilingue (fr/en).
- Droit d'accès, rectification, effacement (RGPD-like).
- Notification de fuite sous 72h.

### 16.2 Chiffrement

**En transit :**
- TLS 1.3 minimum partout.
- HSTS activé.
- Certificate pinning sur mobile.

**Au repos :**
- PostgreSQL : Transparent Data Encryption (RDS).
- S3 : SSE-KMS obligatoire.
- Backups : chiffrés automatiquement.

**Données sensibles (CNI, passeports) :**
- Numéros : hash SHA-256 + sel + chiffrement AES-256 (clé KMS dédiée).
- Scans : chiffrés avec clé par document, accès audit.
- Jamais loggés en clair.

### 16.3 Gestion des secrets

- AWS Secrets Manager pour tous les secrets applicatifs.
- Rotation automatique des clés KMS.
- Pas de secrets dans le code, variables d'env uniquement en local dev.

### 16.4 Règles de visibilité

| Statut | Visibilité par défaut |
|--------|-----------------------|
| Person `DECEASED` depuis 10+ ans | Public (après opt-in famille) |
| Person `DECEASED` < 10 ans | Famille étendue (degré ≤ 4) |
| Person `ALIVE` | Famille directe (degré ≤ 2) sauf opt-in |
| Mineurs (< 18 ans) | Profil masqué, géré par parent |
| Ethnie, religion, opinions | Privés, jamais indexés public |

### 16.5 Consentement

- Case à cocher non pré-cochée à l'inscription pour CGU/confidentialité.
- Consentement explicite et spécifique pour saisie CNI.
- Consentement pour conservation scan CNI (durée configurable).
- Journalisation des consentements (audit).

### 16.6 Droit à l'effacement

- Suppression de compte en 1 action dans paramètres.
- Grace period 30 jours (annulable).
- Suppression effective : Account + Claims + Photos personnelles.
- Person reste (patrimoine familial) mais anonymisée si demandé explicitement.

### 16.7 Export de données

- Export GEDCOM standard.
- Export PDF personnalisé.
- Export JSON brut.
- Accessible en 1 action dans paramètres.

### 16.8 Modération et signalements

- Bouton "Signaler" sur chaque Person et chaque contribution.
- Motifs : diffamation, harcèlement, fausse information, violation vie privée, autre.
- File de modération avec priorité.
- Équipe modérateurs régionaux (francophones, anglophones, multilingues).

### 16.9 CGU et limitations légales

**Mentions explicites dans les CGU :**
- La plateforme n'a **pas valeur de preuve légale** d'état civil.
- Les données généalogiques sont des contributions communautaires, sujettes à erreur.
- La plateforme décline toute responsabilité dans les conflits d'héritage.
- Modération best-effort, pas exhaustive.

### 16.10 Plan de réponse incidents

- Monitoring Sentry + Datadog 24/7.
- Alerting automatique sur anomalies (pics d'erreur, fuites suspectées).
- Procédure documentée de notification ANTIC et utilisateurs sous 72h.
- Simulations trimestrielles.

---

## 17. Stratégies de peuplement

### 17.1 Stratégie 1 : Croissance virale familiale (moteur principal)

- À chaque nouvel utilisateur, incitation forte à ajouter parents (obligatoire pour progresser), fratrie, enfants, conjoint(s).
- Pour débloquer 3ème degré, inviter au moins 1 membre de la famille.
- Invitations pré-personnalisées WhatsApp/SMS.
- Effet réseau : chaque utilisateur amène 2-5 nouveaux utilisateurs.

### 17.2 Stratégie 2 : Champions de village/quartier

- Identifier 1-2 personnes clés par localité (enseignants retraités, infirmières, catéchistes).
- Formation + tablette ou forfait data.
- Rémunération au volume (ex : 500 FCFA par Person vérifiée).
- Cible initiale : 3-5 villages pilotes.
- Objectif : 200-500 entrées par champion par mois.

### 17.3 Stratégie 3 : Partenariats chefferies traditionnelles

- Approche chefs supérieurs (1er degré) avec proposition de digitalisation gratuite de leurs archives.
- En échange : autorisation de publier (avec leur branding).
- Cibles prioritaires : chefferies Bamiléké, Grand Nord, Sawa.
- Apport : corpus initial + légitimité culturelle.

### 17.4 Stratégie 4 : Partenariats Églises et paroisses

- Registres de baptême catholiques depuis 1890+.
- Archidiocèses de Yaoundé, Douala, Bafoussam comme cibles prioritaires.
- Ensuite EEC, CPE, autres dénominations.
- Proposition : digitalisation gratuite + interface pour leurs archives.

### 17.5 Stratégie 5 : Diaspora comme tête de pont

- Lancement via Camerounais à l'étranger (Paris, Bruxelles, Montréal, Washington, Dubaï).
- Canaux : groupes Facebook diaspora, associations ethniques (Laakam, etc.).
- Plus connectés, plus solvables, fortement motivés par préservation patrimoine.
- Ils poussent la famille au pays à s'inscrire.

### 17.6 Stratégie 6 : Universités

- Partenariat avec départements d'anthropologie et d'histoire (Yaoundé I, Dschang, Douala).
- Stages rémunérés pour étudiants M1/M2 : collecte généalogies dans leurs villages.
- Bénéfice mutuel : données pour la plateforme, mémoire/expérience pour étudiants.
- Possibilité de co-signer des papiers académiques.

### 17.7 Stratégie 7 : Événements "Généalogie Day"

- Présence aux obsèques familiales (réunions généalogiques spontanées naturelles).
- Présence aux fêtes traditionnelles : Ngondo (Sawa), Nguon (Bamoun), Medumba, etc.
- Stand de collecte avec champions locaux.
- Incitations immédiates (remise de carnet imprimé personnalisé par exemple).

### 17.8 Planification géographique

**Phase 1 (mois 1-6) :** 3-5 villages pilotes + 2 villes diaspora.
**Phase 2 (mois 7-12) :** extension régionale Ouest et Littoral (zones Bamiléké densément peuplées par diaspora).
**Phase 3 (année 2) :** Grand Nord, Sud, Est.
**Phase 4 :** expansion pays voisins (Gabon, Congo, Tchad).

---

## 18. Support utilisateur

### 18.1 Bouton "Aide" flottant permanent

Toujours visible en bas à droite, jamais caché. Au tap, trois options :

1. **"Appelle-moi"** : l'utilisateur laisse son numéro, rappel dans 5 min par agent.
2. **"WhatsApp"** : ouverture chat support.
3. **"Guide vidéo"** : bibliothèque de vidéos courtes (< 1 min).

### 18.2 Vidéos WhatsApp courtes

Produire une centaine de vidéos de 15-45 secondes couvrant toutes les actions courantes :
- "Comment ajouter ton papa"
- "Comment inviter ton cousin"
- "Comment changer ta photo"
- etc.

Format vertical 9:16, voix off en français simple, sous-titres, identification visuelle de l'app.

### 18.3 Agents régionaux

Dans villages pilotes, les champions locaux deviennent support local (langue locale). Formation :
- 1 journée initiale.
- Manuel papier illustré.
- Groupe WhatsApp privé avec l'équipe produit.

### 18.4 FAQ vocale (phase 2)

Bouton *"Pose ta question"* avec enregistrement vocal en langue locale. Transcription + routage vers support humain pertinent. Critique pour ruraux peu alphabétisés.

### 18.5 Rappels WhatsApp plutôt que push

Les notifications push sont souvent désactivées au Cameroun. Un bot WhatsApp officiel pour rappels :
- *"Jean-Paul a ajouté une nouvelle personne à ton arbre !"*
- *"Aujourd'hui c'est l'anniversaire de ta tante Marie."*
- *"5 personnes ont rejoint l'arbre de la famille Mopi cette semaine."*

### 18.6 Centre d'aide in-app

Accessible depuis Paramètres :
- FAQ textuelle courte.
- Glossaire visuel.
- Liens directs WhatsApp.
- Tutoriels vidéo intégrés.

---

## 19. Modèle économique

### 19.1 Freemium

**Gratuit :**
- Arbre jusqu'à 2 degrés.
- 10 Person créées.
- Fonctionnalités de base.
- Visualisation et édition.

**Premium (cibles prioritaires : diaspora) :**
- Arbre illimité.
- Export PDF/GEDCOM.
- Livre familial imprimable.
- Mémorial enrichi avec médias illimités.
- Recherche avancée.
- Prix indicatif : 5-10 €/mois ou 50 €/an.

### 19.2 Pack Famille

- Compte famille premium partagé (jusqu'à 10 utilisateurs).
- Branding familial personnalisé.
- Prix : 100-300 €/an.

### 19.3 Services chefferies / associations

- Interface dédiée pour gestion d'archives communautaires.
- Prix : 100-500 €/an selon taille.

### 19.4 Services ponctuels

- Livre généalogique imprimé A3/A4 : 30-100 € selon complexité.
- Arbre imprimable A0 grand format : 50-150 €.
- Recherche assistée par expert : 100-500 €.

### 19.5 Partenariats B2B

- Pompes funèbres : ils collectent beaucoup d'info généalogique pour obsèques, partenariat API.
- Compagnies d'assurance vie : vérification bénéficiaires.

### 19.6 Principe

**Pas de publicité ciblée.** Incompatible avec la confiance sur données sensibles. Revenu par utilité perçue, pas par exploitation.

### 19.7 Prix adaptés au marché local

Pour utilisateurs au Cameroun, tarifs ajustés (ex : abonnement premium 2-3 € équivalent FCFA). Paiement via Mobile Money (MTN, Orange) indispensable.

---

## 20. Roadmap d'implémentation

### Phase 0 : Recherche utilisateur (1-2 mois)

**Objectifs :**
- 30-50 entretiens qualitatifs (Douala, village, diaspora).
- Validation du problème et du consentement à payer.
- Identification des préoccupations culturelles spécifiques.

**Livrables :**
- Rapport de recherche utilisateur.
- Personas affinés.
- Parcours d'usage validés.
- Wireframes Figma basse fidélité.

### Phase 1 : MVP (3-4 mois)

**Scope fonctionnel :**
- Auth téléphone + OTP (SMS via Africa's Talking, WhatsApp via Meta).
- Création de Person avec statut vie/décès obligatoire.
- Relations parent/enfant/conjoint/fratrie.
- Visualisation d'arbre 2 degrés (vue radiale simple).
- Invitation famille par WhatsApp/SMS.
- Recherche par nom (matching trigram + soundex).
- Photos de profil.
- Mode offline basique (SQLite local + sync).

**Stack :**
- Flutter mobile (iOS + Android).
- NestJS backend.
- PostgreSQL + Redis.
- S3 + CloudFront.
- AWS af-south-1.

**Cible utilisateurs :**
- 500 utilisateurs diaspora (acquisition ciblée).
- 2 villages pilotes (Bafoussam, Bafang par ex.).

**Livrables :**
- App publiée Play Store + App Store.
- Backend en production.
- Onboarding de 2 champions locaux.
- Documentation technique complète.

### Phase 2 : Consolidation (mois 5-8)

**Scope additionnel :**
- Dédoublonnage automatique (batch nocturne).
- Merge assisté avec UI détaillée.
- Upload photos et documents avec chiffrement.
- OCR CNI (Google ML Kit côté mobile).
- Mode offline avancé avec sync intelligent.
- Intégration WhatsApp Business (notifications).
- PWA Next.js pour desktop/web.
- Mode "grand-mère" (accessibilité +30%).
- Multilingue fr/en complet.

**Cible utilisateurs :**
- 5 000 utilisateurs.
- 5 villages pilotes actifs.
- Programme Champions étendu.

### Phase 3 : Croissance (mois 9-12)

**Scope additionnel :**
- Partenariats chefferies (interface dédiée).
- Partenariats Églises (import registres).
- Abonnement premium avec paiement Mobile Money.
- Export GEDCOM/PDF/livre imprimable.
- Mémorial enrichi.
- Bot WhatsApp officiel pour notifications.
- FAQ vocale (enregistrements).

**Cible utilisateurs :**
- 50 000 utilisateurs.
- Présence dans 3 régions.

### Phase 4 : Expansion (année 2)

**Scope additionnel :**
- Migration (optionnelle) vers Neo4j pour graphe.
- Expansion régionale (Gabon, Congo, Tchad).
- Intégration DNA (import MyHeritage, 23andMe).
- API publique pour chercheurs/généalogistes.
- Features communautaires (groupes ethniques, livre de famille auto).
- Marketplace d'experts généalogistes.

**Cible utilisateurs :**
- 500 000 utilisateurs.
- 5 pays.

---

## 21. Anti-patterns à éviter

### 21.1 Anti-patterns UX

- ❌ **Mot de passe** à créer. Juste OTP + PIN optionnel.
- ❌ **Formulaires longs** avec 10 champs par écran.
- ❌ **Modals "OK" uniquement**. Utiliser bottom sheets avec options.
- ❌ **Forcer les mises à jour d'app**. Opt-in sauf critique.
- ❌ **Émojis culturellement spécifiques** non universels (🥑, etc.).
- ❌ **Erreurs techniques affichées**. Messages humains toujours.
- ❌ **Email obligatoire**. 40% de la cible n'en a pas.
- ❌ **Dark mode prioritaire**. Contraste moins bon au soleil, cible âgée perdue.
- ❌ **Tutoriel d'onboarding long** que personne ne lit.
- ❌ **Notifications intrusives** multiples par jour.
- ❌ **Spinner infini** sans feedback de sync.

### 21.2 Anti-patterns techniques

- ❌ **Modèle avec `father_id` + `mother_id`** en colonnes Person. Utiliser `parent_child` séparé.
- ❌ **CNI stockée en clair**. Hash + chiffrement KMS.
- ❌ **Mots de passe hashés avec MD5 ou SHA-1**. bcrypt/argon2 uniquement.
- ❌ **Logs contenant OTP ou CNI**. Filtrer systématiquement.
- ❌ **Requêtes récursives sans limite de profondeur**. Toujours plafonner (max_generations).
- ❌ **Matching automatique agressif** avec seuil bas. Faux positifs détruisent le graphe.
- ❌ **Absence d'audit trail**. Chaque modification doit être traçable.
- ❌ **Absence de soft delete**. Toujours `deleted_at` pour récupération.
- ❌ **Secrets dans le code** ou variables d'env en production.

### 21.3 Anti-patterns produit

- ❌ **Stocker religion/ethnie en clair et indexées**. Potentiel arme discrimination.
- ❌ **Valeur de preuve légale** revendiquée. Toujours clarifier dans CGU.
- ❌ **Monétisation publicitaire**. Incompatible confiance.
- ❌ **Modération exclusivement automatique**. Humains indispensables.
- ❌ **Ignorer l'oralité**. Prévoir enregistrement audio de témoignages.

---

## 22. Métriques de succès

### 22.1 Métriques d'acquisition

- Taux d'installation après exposition.
- Taux de complétion onboarding (**cible : > 70%** entre installation et arbre à 5 personnes).
- Coût d'acquisition par utilisateur (CAC).

### 22.2 Métriques d'engagement

- Taux de chute par écran de flow d'inscription.
- Temps moyen pour ajouter la première personne (**cible : < 3 minutes**).
- Taux de retour J+7 (**cible : > 40%**).
- Taux de retour J+30 (**cible : > 25%**).
- Nombre de Person ajoutées par utilisateur actif (médiane et moyenne).
- Nombre d'invitations envoyées par utilisateur actif.

### 22.3 Métriques de qualité

- Taux de Person vérifiées (niveau 2+).
- Taux de doublons détectés et résolus.
- Taux de faux positifs en matching (< 1%).
- Densité du graphe (liens par nœud).

### 22.4 Métriques de rétention virale

- K-factor (nouveaux utilisateurs invités par utilisateur).
- Cycle de viralité (temps moyen invitation → inscription).

### 22.5 Métriques business

- Taux de conversion freemium → premium.
- ARPU (Average Revenue Per User).
- Churn mensuel.
- LTV (Lifetime Value).

### 22.6 Métriques de fiabilité

- Uptime API (**cible : 99.5%**).
- Latence P95 API (**cible : < 300ms**).
- Taux de succès OTP (**cible : > 95%**).
- Temps de résolution d'incidents.

### 22.7 Métriques de support

- Temps de première réponse support (**cible : < 2h**).
- Taux de résolution premier contact (**cible : > 70%**).
- Score de satisfaction support (CSAT).

---

## 23. Tests utilisateurs terrain

### 23.1 Principe

**Ne rien coder sans test utilisateur sur la cible.** Les assumptions de designer éclairé sont souvent fausses pour Thérèse et Ebenezer.

### 23.2 Vague 1 : Prototype Figma

**Avant toute ligne de code.**

- 15-20 personnes testées.
- 3 profils : jeune urbain, adulte urbain, adulte rural.
- Protocole : observation silencieuse, pas de guidance.
- Mesurer : hésitations, abandons, malentendus.

### 23.3 Vague 2 : MVP fonctionnel

**Avant la mise en production publique.**

- 50-100 personnes dans villages pilotes.
- Présence physique ou visio de l'équipe.
- Mesurer taux de complétion, temps par écran, points de chute.

### 23.4 Observations continues

- Sessions d'observation mensuelles avec utilisateurs divers.
- Analyse des tickets de support pour détecter points friction.
- Enregistrement de sessions (avec consentement) via tools comme Smartlook.

### 23.5 Critères de succès des tests

- Taux de complétion onboarding > 70%.
- Temps moyen à la première Person ajoutée < 3 min.
- Aucun abandon sur les 3 premiers écrans.
- Understanding des concepts clés (arbre, invitation, degré).

---

## Annexe A : Glossaire technique

- **OTP** : One-Time Password, code à usage unique pour authentification.
- **CNI** : Carte Nationale d'Identité camerounaise.
- **DAG** : Directed Acyclic Graph, graphe orienté sans cycles.
- **GEDCOM** : format standard d'échange généalogique.
- **KMS** : Key Management Service (AWS).
- **OCR** : Optical Character Recognition.
- **PWA** : Progressive Web App.
- **RGPD** : Règlement Général sur la Protection des Données (équivalent ANTIC au Cameroun).
- **Soundex/Metaphone** : algorithmes de matching phonétique.
- **Trigram** : unité de 3 caractères consécutifs, utilisée pour matching flou.

---

## Annexe B : Contacts clés et ressources

- **ANTIC** (Cameroun) : déclaration traitement données, cybersécurité.
- **Africa's Talking** : fournisseur SMS Afrique.
- **Meta Business** : WhatsApp Business API.
- **DGSN** : Délégation Générale à la Sûreté Nationale (émission CNI, pas d'API).
- **Google ML Kit** : OCR mobile offline.
- **AWS Cape Town** : région d'hébergement recommandée.

---

## Annexe C : Priorités d'implémentation pour Claude Code

**Ordre recommandé pour Claude Code :**

1. **Setup infrastructure** : monorepo NestJS + Flutter, PostgreSQL local, Docker Compose.
2. **Schéma DB** : migrations pour toutes les tables décrites section 6.
3. **Auth service** : OTP + JWT + rate limiting.
4. **Person CRUD** : création, modification, suppression soft.
5. **Relations** : parent_child, unions, union_partners.
6. **Flutter core** : splash, onboarding, flow OTP.
7. **Flow création arbre** : ajout papa → maman → fratrie avec statut vie/décès obligatoire.
8. **Visualisation radiale simple** : Canvas, 2 degrés.
9. **Matching basique** : trigram + soundex sur nom.
10. **Invitations WhatsApp/SMS** : tokens signés + deep links.
11. **Claims** : revendication + validation communautaire.
12. **CNI** : IdentityDocument avec hash + chiffrement.
13. **OCR CNI** : Google ML Kit intégration.
14. **Mode offline** : Drift SQLite + sync.
15. **Notifications** : push + WhatsApp bot.
16. **PWA Next.js** : version web.
17. **Monitoring** : Sentry, Datadog, logs structurés.

---

**Fin de la spécification v1.0**

*Ce document est vivant et sera mis à jour au fur et à mesure des apprentissages terrain.*
