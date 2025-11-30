# BudgetOS

Application Web de gestion financière personnelle inspirée de Microsoft Money.

## Fonctionnalités

- **Multi-utilisateurs** : Authentification sécurisée avec sessions
- **Comptes bancaires** : Comptes courants, livrets, épargne
- **Cartes de crédit** : Débit immédiat et différé avec cycles personnalisables
- **Import bancaire** : CSV, Excel, QIF, QFX avec rapprochement automatique
- **Prévisions** : Trésorerie à 30/60/90 jours
- **Rapports** : Tableaux de bord et graphiques

## Prérequis

- Node.js >= 18.0.0
- npm >= 9.0.0

## Installation (Développement)

```bash
# Cloner le projet
git clone <repo-url>
cd budgetos

# Installer les dépendances
npm install

# Copier la configuration
cp .env.example .env

# Créer la base de données
npm run db:migrate

# (Optionnel) Insérer des données de test
npm run db:seed

# Démarrer le serveur
npm run dev
```

## Structure du projet

```
budgetos/
├── src/
│   ├── config/           # Configuration
│   ├── controllers/      # Contrôleurs API
│   ├── database/         # Migrations et seeds
│   ├── middleware/       # Middlewares Express
│   ├── models/           # Modèles de données
│   ├── routes/           # Routes API
│   ├── services/         # Logique métier
│   ├── utils/            # Utilitaires
│   ├── validators/       # Schémas de validation Zod
│   └── server.js         # Point d'entrée
├── client/               # Frontend React
├── data/                 # Base SQLite (dev)
├── uploads/              # Fichiers uploadés
└── tests/                # Tests
```

## API

L'API REST est disponible sous `/api/v1/`.

### Authentification

- `POST /api/v1/auth/register` - Inscription
- `POST /api/v1/auth/login` - Connexion
- `POST /api/v1/auth/logout` - Déconnexion
- `GET /api/v1/auth/me` - Profil utilisateur

### Comptes

- `GET /api/v1/accounts` - Liste des comptes
- `POST /api/v1/accounts` - Créer un compte
- `GET /api/v1/accounts/:id` - Détail d'un compte
- `PUT /api/v1/accounts/:id` - Modifier un compte
- `DELETE /api/v1/accounts/:id` - Supprimer un compte

### Transactions

- `GET /api/v1/transactions` - Liste des transactions
- `POST /api/v1/transactions` - Créer une transaction
- `PUT /api/v1/transactions/:id` - Modifier une transaction
- `DELETE /api/v1/transactions/:id` - Supprimer une transaction

### Cartes de crédit

- `GET /api/v1/credit-cards` - Liste des cartes
- `POST /api/v1/credit-cards` - Créer une carte
- `GET /api/v1/credit-cards/:id/cycles` - Cycles de facturation

### Import

- `POST /api/v1/import/upload` - Uploader un fichier
- `POST /api/v1/import/process` - Traiter l'import
- `GET /api/v1/import/reconcile` - Interface de rapprochement

## Sécurité

- Sessions HTTP avec cookies sécurisés
- Protection CSRF
- Rate limiting
- Helmet (headers de sécurité)
- Validation stricte des entrées (Zod)
- Hachage bcrypt des mots de passe
- Isolation des données par utilisateur

## Licence

MIT
