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
│   │                      activities/[id] (détail + courbes + coach IA), activities/import (.fit),
│   │                      calendar (séances prévues), plan (plan IA), wellness (VFC, sommeil),
│   │                      integrations (Polar), coach (athlètes / coachs), coach/[athleteId],
│   │                      invitations/[token], profile (paramètres + notifications)
│   ├── offline/         page hors-ligne (service worker)
│   ├── manifest.ts      manifeste PWA (installation, raccourcis)
│   ├── pricing/         page Tarifs (prix lus dans Stripe)
│   ├── auth/callback/   échange du code (confirmation email / OAuth)
│   ├── api/activities/[id]/analyze/  analyse IA d'une séance (POST)
│   ├── api/activities/import/        import d'un fichier .fit (POST multipart)
│   ├── api/stripe/checkout/          création d'une session de paiement (POST)
│   ├── api/stripe/webhook/           synchronisation de l'abonnement (Stripe → Supabase)
│   ├── api/stripe/portal/            portail client Stripe (changer d'offre, résilier)
│   ├── api/polar/                    connect, callback (OAuth), sync, disconnect
│   ├── api/cron/daily | weekly       tâches planifiées (Vercel Cron, vercel.json)
│   ├── api/email/unsubscribe/        désinscription signée (lien + un clic RFC 8058)
│   ├── api/reports/monthly/          bilan mensuel PDF (soi-même ou athlète suivi)
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
│   ├── training/planned.ts  validation auto des séances prévues
│   ├── training/wellness.ts relevés de bien-être, référence de VFC sur 7 jours
│   ├── fit/parse-fit.ts     lecture des fichiers .fit + tracé GPS (serveur uniquement)
│   ├── fit/archive.ts       extraction .zip / .fit.gz dans le navigateur (fflate)
│   ├── fit/import.ts        enregistrement d'une séance .fit / .gpx / .tcx (import manuel et Polar)
│   ├── fit/parse-track.ts   lecture des .gpx et .tcx (fast-xml-parser)
│   ├── coach.ts             invitations (jeton haché), athlètes suivis, coachs
│   ├── reports/             données et rendu PDF du bilan mensuel (@react-pdf/renderer)
│   ├── polar/client.ts      API Polar AccessLink v3
│   ├── polar/sync.ts        synchronisation séances + VFC nocturne
│   ├── email/               envoi (Resend), modèles, liens de désinscription
│   ├── training/fatigue.ts  règles d'alerte fatigue
│   ├── cron.ts              authentification des tâches planifiées
│   ├── training/recalc.ts   recalcul du TSS après changement de FTP / seuil
│   ├── ai/plan.ts           génération et contrôle d'un plan d'entraînement
│   ├── dates.ts         opérations sur les jours (semaines, lundi…)
│   ├── plans.ts         offres et quotas du coach IA (source unique)
│   ├── coach-quota.ts   quotas IA (journal ai_usage, écrit par le serveur uniquement)
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
Exécuter les migrations **dans l'ordre** dans le SQL Editor Supabase (ou `supabase db push`) :
1. `supabase/migrations/20261104000000_initial_schema.sql`
2. `supabase/migrations/20261104010000_phase6.sql` (journal `ai_usage`, puissance normalisée, origine des séances)
3. `supabase/migrations/20261104020000_phase7.sql` (connexion Polar, préférences de notification)
4. `supabase/migrations/20261104030000_phase8.sql` (espace coach, formats .gpx / .tcx)

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

## Phase 5 : import, calendrier, bien-être
- **Import .fit** (`/dashboard/activities/import`) : glisser-déposer de plusieurs fichiers (Garmin, Wahoo, Coros, Polar, Suunto…). Le fichier est analysé côté serveur avec `fit-file-parser` (licence MIT), puis il est **supprimé** : seuls le résumé et une courbe allégée (720 points maximum, dans `raw_telemetry`) sont conservés. Le TSS vélo utilise la **puissance normalisée** (NP). Un doublon (même heure de départ) est refusé ; 4 Mo maximum par fichier.
- **Profil de la séance** : FC, puissance, allure (course) ou vitesse, sur des graphiques séparés avec un curseur synchronisé.
- **Calendrier** (`/dashboard/calendar`) : semaine du lundi au dimanche, séances prévues (durée, TSS visé, consignes), bilan prévu / réalisé. **Automatisation** : une séance saisie ou importée valide la séance prévue du même jour et du même sport.
- **Bien-être** (`/dashboard/wellness`) : VFC, FC au repos, sommeil et fatigue ressentie, une ligne par jour dans `daily_metrics`. Courbe de VFC sur 30 jours avec sa moyenne sur 7 jours. **Le coach IA en tient compte** : VFC comparée à la référence des 7 jours précédents.

> Les colonnes `atl`, `ctl` et `tsb` de `daily_metrics` ne sont pas utilisées : la charge est recalculée depuis les séances.

## Phase 6 : archives, parcours, recalcul, plan IA
- **Import d'archives** : un `.zip` d'export Garmin Connect (zip imbriqués) ou de « Télécharger mes données » Strava (`.fit.gz`) est décompressé **dans le navigateur**, puis chaque `.fit` est envoyé séparément. Les `.gpx` et `.tcx` sont signalés comme ignorés. 500 Mo maximum par archive.
- **Parcours** : tracé GPS en SVG (500 points maximum), avec départ, arrivée et échelle, **sans fond de carte** : aucune requête vers un service tiers, la position reste dans l'application. Une boucle affiche un repère combiné.
- **Recalcul du TSS** : case à cocher dans le profil ; les séances des 90 derniers jours sont recalculées avec la nouvelle FTP ou FC seuil (NP pour le vélo).
- **Plan d'entraînement IA** (`/dashboard/plan`) : objectif, date, 1 à 4 semaines, jours disponibles, sports, volume maximal. Le coach part de la CTL / ATL / TSB, du volume des 4 dernières semaines et du bien-être du jour. La réponse est **contrôlée** : dates dans la période et sur un jour disponible, une séance par jour, durées et TSS bornés. On relit le plan avant de l'ajouter au calendrier (badge « IA »).
- **Correctif quotas** : le quota du coach comptait les lignes de `coach_insights`, que l'utilisateur peut supprimer, ce qui remettait le compteur à zéro. Il compte désormais `ai_usage`, en lecture seule pour l'utilisateur. **`SUPABASE_SERVICE_ROLE_KEY` est maintenant nécessaire au coach IA.**

### Pourquoi pas de synchronisation Strava
La [Politique API Strava](https://www.strava.com/legal/api_policy) (en vigueur au 1er juin 2026) :
- **§ 5.3** interdit d'utiliser les données Strava, **y compris les données dérivées**, dans le fonctionnement d'une application d'IA, « ingestion dans une fenêtre de contexte » comprise. Le coach et le plan IA seraient en infraction.
- Interdit de conserver les données Strava **plus de 7 jours**, ce qui est incompatible avec une CTL sur 42 jours.

L'import de l'export **fait par l'utilisateur lui-même** (sans l'API) reste possible et est pris en charge. Pour une synchronisation automatique, étudier les API constructeurs (Garmin Connect Developer Program, Wahoo, Polar AccessLink, Coros) et **vérifier leurs conditions sur l'IA avant intégration**.

## Phase 7 : Polar, e-mails, application installable
### Synchronisation Polar
- **Configuration** : créer un client sur https://admin.polaraccesslink.com, déclarer l'URL de redirection `https://<domaine>/api/polar/callback`, puis renseigner `POLAR_CLIENT_ID` et `POLAR_CLIENT_SECRET`.
- **Connexion** (`/dashboard/integrations`) : OAuth avec `state` anti-CSRF, puis enregistrement de l'utilisateur auprès d'AccessLink. **Consentement explicite obligatoire** à l'envoi des données au coach IA (licence Polar § 3.1.1 : pas de transmission à un tiers sans permission du membre).
- **Ce qui est synchronisé** : les séances des 30 derniers jours, téléchargées en `.fit` et analysées comme un import (NP, tracé, TSS) ; la **VFC nocturne** (Nightly Recharge) des 3 derniers jours, sans écraser une saisie manuelle. Chaque nuit (tâche planifiée) et à la demande.
- **Jeton d'accès** dans `polar_connections` : **aucun accès utilisateur** (RLS sans politique, privilèges retirés), lecture par le serveur uniquement.
- **Déconnexion** : désenregistrement chez Polar et suppression du jeton (§ 3.3) ; suppression des séances Polar en option.
- **Pas de webhooks Polar** : la documentation ne précise pas sur quelles données porte la signature. À ajouter quand ce point sera vérifié auprès de Polar.

### Notifications par e-mail (Resend)
- **Désactivées par défaut** (consentement RGPD), à activer dans le profil : **résumé hebdomadaire** le lundi (bilan, CTL, séances prévues) et **alerte fatigue**.
- **Règles d'alerte** (`lib/training/fatigue.ts`) : TSB < −40 seul, ou au moins deux signaux parmi TSB < −30, VFC 15 % sous la référence, fatigue ressentie ≥ 8. Au plus une alerte tous les 3 jours.
- **Désinscription** : lien signé (HMAC) dans chaque e-mail, plus l'en-tête `List-Unsubscribe` en un clic (RFC 8058, exigé par Gmail et Yahoo).
- **Tâches planifiées** (`vercel.json`) : `/api/cron/daily` à 5 h UTC (synchronisation Polar puis alertes) et `/api/cron/weekly` le lundi à 5 h 30 UTC, protégées par `CRON_SECRET`.
- **Domaine d'envoi** : à vérifier dans Resend (SPF, DKIM) pour `EMAIL_FROM`.

### Application installable (PWA)
- **Manifeste** avec icônes (dont « maskable ») et raccourcis « Bien-être du matin », « Nouvelle séance », « Calendrier ». Installation depuis le navigateur ; sur iOS : Partager → « Sur l'écran d'accueil ».
- **Service worker** minimal : page hors-ligne et fichiers statiques. **Aucune page authentifiée n'est mise en cache**, pour ne pas laisser de données personnelles sur un appareil partagé.
- **En-têtes de sécurité** : `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, CSP sur `sw.js`.

## Phase 8 : espace coach, bilan PDF, .gpx / .tcx
### Espace coach (`/dashboard/coach`, offre Premium, 20 athlètes)
- **Invitation par e-mail** : le jeton est envoyé une seule fois et **seul son SHA-256 est stocké**. Valable 14 jours. Si l'e-mail n'est pas configuré, le lien est affiché au coach.
- **Acceptation** par l'athlète après un **consentement détaillé** (séances y compris Polar, bien-être, analyses, programme). Le compte doit être celui de l'adresse invitée. Refus possible.
- **Accès du coach** (RLS, fonction `is_coach_of`) :
  - en lecture : séances, bien-être, analyses et programme de ses athlètes ;
  - en écriture : uniquement les séances prévues qu'il a lui-même créées (`created_by`) ;
  - **pas d'accès** au profil complet : la fonction `coached_athletes()` ne renvoie que les colonnes sportives, jamais l'abonnement ni la facturation.
- **Fin du suivi** par l'un ou l'autre, avec **effet immédiat**.
- Vue coach : tableau des athlètes (CTL / ATL / TSB, état, alerte de fatigue, dernière séance), fiche d'un athlète (indicateurs, courbes, séances en lecture seule, bien-être, programme, ajout de séances, bilan PDF).
- L'analyse IA d'une séance reste **réservée à son propriétaire**, même si le coach peut la lire.
- Connexion avec retour à la page demandée (`/login?next=…`), limité aux chemins internes.

### Bilan mensuel PDF (`/api/reports/monthly?month=AAAA-MM[&athlete=id]`)
Résumé (séances, durée, distance, TSS, CTL de début et de fin, TSB), courbes CTL / ATL du mois, TSS par semaine, détail par sport, bien-être moyen, analyses IA et liste des séances. Accessible depuis le tableau de bord (mois en cours et précédent) et depuis la fiche d'un athlète pour son coach.

### Import .gpx / .tcx
Exports Strava, Garmin, Suunto, Komoot… Lecture côté serveur, convertie dans le même format de points que le `.fit` : NP, tracé, courbes et TSS identiques.
- **Temps en mouvement** : les pauses de plus de 30 s sont exclues.
- **Dénivelé** : seuil de 3 m pour filtrer le bruit GPS.
- **Sport** : celui du fichier ; à défaut, déduit de la vitesse moyenne (plus de 16 km/h → vélo).
- **Gros fichiers** : ils sont compressés en gzip par le navigateur avant l'envoi, et le serveur limite la décompression à 50 Mo.
- **Archives** : les `.gpx`, `.tcx` et leurs `.gz` sont aussi lus dans les `.zip`.

## Offres et quotas (`lib/plans.ts`)
| Offre | Analyses de séance du coach IA / mois |
|---|---|
| Gratuit | 3 |
| Pro | 30 |
| Premium | illimité |

Plans d'entraînement IA par mois : Gratuit 1, Pro 4, Premium illimité. Espace coach : Premium (20 athlètes).

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
- `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POLAR_CLIENT_SECRET`, `RESEND_API_KEY`, `CRON_SECRET` : **serveur uniquement**, jamais préfixées `NEXT_PUBLIC_`.
