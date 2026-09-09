# Carrieres RDC API

API Express + PostgreSQL pour le site Carrieres RDC.

## Variables

Copier `.env.example` vers `.env`, puis renseigner `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`.

### Connecter Neon

1. Dans Neon, ouvrir le projet puis la page `Connect`.
2. Sélectionner la branche et la base concernées, puis copier la chaîne `Pooled connection`.
3. Coller cette URI dans `server/.env` comme valeur de `DATABASE_URL` et conserver `sslmode=require`.
4. Si le mot de passe contient des caractères spéciaux (`@`, `:`, `/`, `#`, etc.), les encoder dans l'URI.
5. Vérifier la connexion depuis `server` :

```powershell
node check-db.mjs
```

Le serveur crée automatiquement les tables au premier démarrage. Il n'est pas nécessaire d'installer le SDK Neon : l'application utilise directement PostgreSQL avec le package `pg`.

Ne jamais placer `DATABASE_URL`, le mot de passe Supabase ou `JWT_SECRET` dans le dossier `site` ou dans une variable `NEXT_PUBLIC_*`.

## Lancer

```powershell
npm install
npm start
```

Au premier démarrage, les tables sont créées automatiquement. Le serveur écoute sur `PORT`.
