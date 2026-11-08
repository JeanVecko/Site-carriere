# Carrières RDC

Plateforme d'offres d'emploi, d'annonces et d'appels d'offres pour la République démocratique du Congo.

Trois profils d'utilisateurs :

- **Candidat** : crée son profil, postule aux offres, reçoit des offres recommandées et des messages.
- **Recruteur** : crée une organisation, invite des membres, publie des offres et traite les candidatures reçues.
- **Admin** : publie des annonces, gère les comptes et les organisations, lit les messages de contact.

## Structure du dépôt

| Dossier   | Rôle | Technologies | Hébergement |
|-----------|------|--------------|-------------|
| `site/`   | Site public et tableaux de bord | Next.js 16, React 19, TypeScript | Vercel |
| `server/` | API REST | Node.js, Express, PostgreSQL Neon | Render |
| `LOGO/`   | Logo source | — | — |

Le site appelle l'API via `site/app/lib/api.ts`. Les tables PostgreSQL sont décrites dans `server/schema.sql` et créées automatiquement au démarrage de l'API.

## Développement local

Prérequis : Node.js 20 ou plus récent et une base PostgreSQL **Neon** (l'API utilise le pilote `@neondatabase/serverless`).

Tout se lance depuis la racine du dépôt :

```powershell
npm install    # installe les dépendances de server/ et de site/
npm run dev    # lance l'API et le site ensemble
```

Au premier `npm run dev`, le fichier `server/.env` est créé à partir de `.env.example`. Renseignez au minimum `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`, puis relancez `npm run dev`.

- Site : `http://localhost:3000`
- API : `http://localhost:10000/api/health`
- `Ctrl+C` arrête les deux.

Autres commandes (depuis la racine) :

| Commande | Effet |
|----------|-------|
| `npm run dev:api` | API seule |
| `npm run dev:site` | Site seul |
| `npm run build` | Build de production du site |
| `npm run lint` | Lint du site |
| `npm test` | Tests de l'API |

Pour vérifier la connexion à la base : `node server/check-db.mjs`, lancé depuis `server/`.

## Variables d'environnement

### API (`server/.env`)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | oui | Chaîne de connexion PostgreSQL. Avec Neon : la chaîne *Pooled connection*, en gardant `sslmode=require`. |
| `JWT_SECRET` | oui | Longue chaîne aléatoire servant à signer les sessions. |
| `ADMIN_EMAIL` | oui | Adresse du compte administrateur. |
| `ADMIN_PASSWORD` | oui | Mot de passe du compte administrateur. |
| `FRONTEND_URL` | oui en production | URL publique du site, utilisée dans les liens envoyés par e-mail (réinitialisation, invitations). Défaut : `http://localhost:3000`. |
| `API_PUBLIC_URL` | oui en production | URL publique de l'API, utilisée dans le lien de vérification d'e-mail. |
| `PORT` | non | Port d'écoute (défaut `10000`). |

Envoi d'e-mails : configurer **l'une** des deux options. Sans configuration, en développement, le contenu des e-mails est affiché dans la console de l'API.

- **SMTP (Gmail par défaut)** : `EMAIL_FROM_ADDRESS`, `EMAIL_APP_PASSWORD` (mot de passe d'application), et facultativement `EMAIL_FROM_NAME`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`.
- **Resend** : `RESEND_API_KEY` et `EMAIL_FROM`.

Ne jamais placer ces secrets dans `site/` ni dans une variable `NEXT_PUBLIC_*`.

### Site (Vercel ou `site/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CARRIERES_API_URL` | URL de l'API, se terminant par `/api`. Par défaut : `https://carrieres-rdc-api.onrender.com/api` en production, `http://localhost:10000/api` en développement. |
| `NEXT_PUBLIC_SITE_URL` | Adresse publique du site (liens canoniques, `sitemap.xml`). À définir si vous utilisez votre propre nom de domaine ; sinon l'adresse Vercel est utilisée. |
| `NEXT_PUBLIC_TIKTOK_URL` | Lien vers votre compte TikTok, affiché dans l'en-tête. |

## Déploiement

### API sur Render

1. Créer une base PostgreSQL sur Neon et copier la chaîne *Pooled connection*.
2. Créer un **Web Service** à partir de ce dépôt GitHub.
3. **Root Directory** : `server`.
4. **Build command** : `npm install` — **Start command** : `npm start`.
5. Renseigner les variables d'environnement de l'API listées ci-dessus.

L'URL obtenue ressemble à `https://carrieres-rdc-api.onrender.com`.

### Statistiques de fréquentation

- **Vues par offre** : chaque consultation d'une offre est comptée (une fois par visiteur et par offre toutes les 30 minutes, robots exclus). Les chiffres s'affichent dans `/admin`, à côté de chaque offre, avec le total en haut du panneau.
- **Visiteurs du site** : Vercel Web Analytics, sans cookies. À activer une fois dans Vercel : projet → onglet **Analytics** → **Enable**. Les statistiques (visiteurs, pages vues, pays, appareils, provenance) apparaissent ensuite dans ce même onglet. Rien n'est envoyé en développement local.

### Site sur Vercel

1. Importer le dépôt `JeanVecko/Site-carriere` dans Vercel.
2. **Root Directory** : `site` (framework détecté : Next.js).
3. Si l'URL de l'API diffère de la valeur par défaut, définir `NEXT_PUBLIC_CARRIERES_API_URL`.
4. Chaque push sur `main` redéploie le site automatiquement.
