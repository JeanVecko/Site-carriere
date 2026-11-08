# Carrières RDC — site

Site public et tableaux de bord (candidat, recruteur, admin) en Next.js.

```powershell
npm install
npm run dev     # http://localhost:3000
npm run build   # build de production
npm run lint
```

- Pages : `app/<route>/page.tsx` ; composants : `app/components/` ; styles : `app/styles.css`.
- Accès à l'API et gestion de session : `app/lib/api.ts`.
- URL de l'API : variable `NEXT_PUBLIC_CARRIERES_API_URL` (voir le README à la racine du dépôt).
