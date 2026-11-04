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
│   ├── (dashboard)/     layout (menu) + dashboard/ protégé :
│   │                      page (indicateurs + courbes), activities/new (saisie),
│   │                      activities/[id] (détail + coach IA), profile (paramètres)
│   ├── pricing/         page Tarifs (prix lus dans Stripe)
│   ├── auth/callback/   échange du code (confirmation email / OAuth)
│   ├── api/activities/[id]/analyze/  analyse IA d'une séance (POST)
│   ├── api/stripe/checkout/          création d'une session de paiement (POST)
│   ├── api/stripe/webhook/           synchronisation de l'abonnement (Stripe → Supabase)
│   ├── api/stripe/portal/            portail client Stripe (changer d'offre, résilier)
│   └── layout.tsx, page.tsx, globals.css (tokens shadcn)
├── components/
│   ├── ui/              composants shadcn → npx shadcn@latest add <composant>
│   ├── ui/field.tsx     champs de formulaire génériques (label, erreur, aide)
│   ├── dashboard/       KpiTiles, LoadChart (Recharts), ActivityList
│   ├── pricing/         PlanAction (paiement / portail)
│   └── auth/            FormField, FormAlert
├── lib/
│   ├── supabase/
│   │   ├── client.ts    client navigateur
│   │   ├── server.ts    client Server Components / Server Actions
│   │   ├── proxy.ts     rafraîchissement de session + protection des routes
│   │   └── admin.ts     client service role (serveur uniquement, contourne la RLS)
│   ├── training/metrics.ts  TSS, CTL / ATL / TSB (fonctions pures)
│   ├── training/load.ts     série de charge de l'utilisateur (depuis ses séances)
│   ├── plans.ts         offres et quotas du coach IA (source unique)
│   ├── coach-quota.ts   analyses consommées ce mois-ci
│   ├── stripe-prices.ts prix affichés, lus dans Stripe (cache 1 h)
│   ├── form-utils.ts    helpers Zod pour formulaires
│   ├── ai/coach.ts      analyse de séance par Claude (sortie JSON structurée)
│   ├── stripe.ts        client Stripe + correspondance offres / prix
│   ├── auth-errors.ts   traduction FR des erreurs Supabase Auth
│   └── utils.ts         cn()
├── proxy.ts             proxy Next 16 (ex-middleware) → updateSession
└── types/database.ts    types Supabase (alignés sur la migration)
supabase/migrations/     schéma SQL (tables, RLS, triggers)
```

## Authentification
- Inscription email + mot de passe, confirmation par email via `/auth/callback`
- Connexion, déconnexion (Server Action), dashboard protégé
- `src/proxy.ts` : `/dashboard*` sans session → `/login` ; `/login` ou `/register` connecté → `/dashboard`
- Paramètre `next` du callback limité aux chemins internes (pas de redirection ouverte)

**Configuration Supabase** (Dashboard → Authentication → URL Configuration) :
- *Site URL* : `http://localhost:3000` (puis l'URL de prod)
- *Redirect URLs* : `http://localhost:3000/auth/callback` et `https://<domaine>/auth/callback`

## Base de données
Exécuter `supabase/migrations/20261104000000_initial_schema.sql` dans le SQL Editor Supabase (ou `supabase db push`).

Tables : `profiles`, `daily_metrics`, `activities`, `planned_workouts`, `coach_insights`, toutes avec la RLS activée (chaque utilisateur ne voit et ne modifie que ses lignes). Un profil est créé automatiquement à l'inscription.

**Abonnement protégé :** l'utilisateur ne peut modifier que ses paramètres physiologiques. `subscription_tier`, `subscription_status` et `stripe_customer_id` ne sont modifiables que par le webhook Stripe (service role).

Régénérer les types après chaque changement de schéma :
```bash
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

## Charge d'entraînement (`lib/training/metrics.ts`)
- `calculateTSS` : puissance (IF = P / FTP) ou fréquence cardiaque (hrTSS, IF = (FC − FCrepos) / (FCseuil − FCrepos)). 1 h au seuil = 100 TSS.
- `computeTrainingLoadSeries` : CTL (42 j), ATL (7 j) et TSB jour par jour ; les jours sans séance comptent 0 TSS.

## Tableau de bord (Phase 4)
- **Indicateurs** : CTL, ATL (avec évolution sur 7 jours), TSB avec état de forme (icône + libellé), TSS de la semaine.
- **Courbes** sur 90 jours : CTL et ATL sur un graphique, TSB sur un second graphique synchronisé (jamais de double axe). Infobulle avec toutes les valeurs du jour et tableau des 14 derniers jours.
- **Charge calculée à la volée** à partir des séances (365 jours d'historique). La table `daily_metrics` reste disponible pour la VFC, le sommeil et la fatigue ressentie.
- **Saisie de séance** avec aperçu du TSS en direct ; le serveur le recalcule. Jours rattachés au fuseau `Europe/Paris` (`lib/training/load.ts`).
- **Profil** : paramètres de calcul (FC repos, seuil, max, FTP, VMA), avec les mêmes règles que la base de données.

## Offres et quotas (`lib/plans.ts`)
| Offre | Analyses du coach IA / mois |
|---|---|
| Gratuit | 3 |
| Pro | 30 |
| Premium | illimité |

Quotas à ajuster dans `lib/plans.ts`. Le quota est vérifié par l'API, pas seulement dans l'interface. Les prix ne sont pas écrits dans le code : la page Tarifs les lit dans Stripe. Tant que Stripe n'est pas configuré, elle affiche « — » et « Bientôt disponible ». Un abonné payant passe par le portail Stripe pour changer d'offre ou résilier, ce qui évite un second abonnement.

## Coach IA
`POST /api/activities/:id/analyze` lit la séance, le profil et la dernière charge connue, interroge Claude (`claude-opus-5-5`, sortie JSON validée par Zod), puis enregistre le résultat dans `coach_insights`. En cas de refus par les filtres de sécurité, l'API relance sur un modèle de repli (`fallbacks: "default"`).

## Paiement Stripe
1. Créer deux prix récurrents (Pro, Premium) dans Stripe et renseigner `STRIPE_PRICE_PRO` / `STRIPE_PRICE_PREMIUM`.
2. `POST /api/stripe/checkout` avec `{ "plan": "pro" }` renvoie l'URL de paiement.
3. Webhook Stripe → `https://<domaine>/api/stripe/webhook`, événements `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## Notes
- Next.js 16 renomme `middleware.ts` en `proxy.ts`. Sans variables Supabase définies, le proxy laisse passer (dev local sans compte).
- Avec Cache Components, toute lecture de session (`cookies()`) doit être placée derrière un `<Suspense>` (voir `dashboard/page.tsx`).
- `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY` et `SUPABASE_SERVICE_ROLE_KEY` : **serveur uniquement**, jamais préfixées `NEXT_PUBLIC_`.
