# Carrières RDC

Site public : fichiers HTML/CSS/JavaScript servis par Vercel.

API : `server/`, Express + PostgreSQL, à déployer sur Render.

## Déploiement de l’API sur Render

1. Créer une base **PostgreSQL** sur Render et copier son `Internal Database URL`.
2. Créer un **Web Service** depuis ce dépôt GitHub.
3. Renseigner `server` comme **Root Directory**.
4. Build command : `npm install`.
5. Start command : `npm start`.
6. Ajouter les variables :
   - `DATABASE_URL` : URL PostgreSQL Render.
   - `JWT_SECRET` : une longue chaîne aléatoire.
   - `ADMIN_EMAIL` : votre adresse admin.
   - `ADMIN_PASSWORD` : votre mot de passe admin.
   - `FRONTEND_URL` : URL Vercel du site.

L’URL obtenue ressemblera à `https://carrieres-rdc-api.onrender.com`.

## Déploiement du site sur Vercel

1. Importer le dépôt `JeanVecko/Site-carriere` dans Vercel.
2. Laisser le répertoire racine à la racine du dépôt.
3. Après création du service Render, modifier `api-config.js` :

```js
window.CARRIERES_API_URL = 'https://carrieres-rdc-api.onrender.com/api';
```

4. Pousser cette modification sur GitHub. Vercel redéploiera automatiquement.

## Développement local de l’API

Dans PowerShell :

```powershell
cd server
npm install
Copy-Item .env.example .env
npm start
```

La base PostgreSQL doit être accessible via `DATABASE_URL`. Les tables sont créées automatiquement au premier démarrage.
