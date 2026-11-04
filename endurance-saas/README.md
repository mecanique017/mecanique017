# Endurance SaaS — Performance & Coaching

Plateforme de suivi et de planification pour athlètes d'endurance.

## Stack
- **Next.js 16** (App Router, `src/`, TypeScript, Cache Components)
- **Tailwind CSS v4** + **shadcn/ui** (style new-york, thème neutre, mode sombre)
- **Supabase** (`@supabase/ssr`) — auth + base de données
- Zod, Lucide, Recharts, clsx / tailwind-merge / CVA

## Démarrage
```bash
cd endurance-saas
npm install
cp .env.example .env.local   # puis renseigner les clés
npm run dev                  # http://localhost:3000
```

> Les variables `NEXT_PUBLIC_*` sont intégrées **au build** : les définir avant `npm run build` (et sur l'hébergeur).

## Structure
```
src/
├── app/
│   ├── (auth)/          layout partagé + login/ + register/
│   ├── (dashboard)/     dashboard/ (protégé) + actions.ts (déconnexion)
│   ├── auth/callback/   échange du code (confirmation email / OAuth)
│   └── layout.tsx, page.tsx, globals.css (tokens shadcn)
├── components/
│   ├── ui/              composants shadcn → npx shadcn@latest add <composant>
│   └── auth/            FormField, FormAlert
├── lib/
│   ├── supabase/
│   │   ├── client.ts    client navigateur
│   │   ├── server.ts    client Server Components / Server Actions
│   │   └── proxy.ts     rafraîchissement de session + protection des routes
│   ├── auth-errors.ts   traduction FR des erreurs Supabase Auth
│   └── utils.ts         cn()
├── proxy.ts             proxy Next 16 (ex-middleware) → updateSession
└── types/database.ts    types Supabase (à régénérer)
```

## Authentification
- Inscription email + mot de passe, confirmation par email via `/auth/callback`
- Connexion, déconnexion (Server Action), dashboard protégé
- `src/proxy.ts` : `/dashboard*` sans session → `/login` ; `/login` ou `/register` connecté → `/dashboard`
- Paramètre `next` du callback limité aux chemins internes (pas de redirection ouverte)

**Configuration Supabase** (Dashboard → Authentication → URL Configuration) :
- *Site URL* : `http://localhost:3000` (puis l'URL de prod)
- *Redirect URLs* : `http://localhost:3000/auth/callback` et `https://<domaine>/auth/callback`

Régénérer les types après création du schéma :
```bash
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

## Notes
- Next.js 16 renomme `middleware.ts` en `proxy.ts`. Sans variables Supabase définies, le proxy laisse passer (dev local sans compte).
- Avec Cache Components, toute lecture de session (`cookies()`) doit être placée derrière un `<Suspense>` (voir `dashboard/page.tsx`).
- `ANTHROPIC_API_KEY` et `STRIPE_SECRET_KEY` : **serveur uniquement**, jamais préfixées `NEXT_PUBLIC_`.
