# Mise en ligne de la version d'essai (téléphone)

Objectif : l'application en ligne en HTTPS (indispensable pour l'installer sur un téléphone), avec un compte **Premium d'essai** et des données de démonstration. Comptez environ 20 minutes. Tout est gratuit : Supabase Free et Vercel Hobby.

> Sans clé Anthropic, Stripe, Polar ou Resend, ces fonctions s'affichent « non configuré » ou « Bientôt disponible ». Le reste fonctionne. On peut les ajouter plus tard sans rien réinstaller.

## 1. Base de données : Supabase
1. Créez un projet sur https://supabase.com/dashboard. Région **Europe (Paris ou Francfort)**, notez le mot de passe de la base.
2. **SQL Editor** → exécutez les fichiers de `supabase/migrations/` **dans l'ordre**, un par un (copier-coller puis *Run*) :
   1. `20261104000000_initial_schema.sql`
   2. `20261104010000_phase6.sql`
   3. `20261104020000_phase7.sql`
   4. `20261104030000_phase8.sql`
   5. `20261104040000_trial_demo.sql`
3. **Project Settings → API** : notez `Project URL`, la clé `anon public` et la clé `service_role`. **Gardez cette dernière secrète** : elle contourne toutes les règles d'accès.

## 2. Hébergement : Vercel
1. https://vercel.com/new → **Import** du dépôt GitHub `mecanique017/mecanique017`.
2. **Root Directory : `endurance-saas`** (important : le site du garage reste à la racine du dépôt).
3. **Environment Variables** (minimum pour l'essai) :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` |
| `NEXT_PUBLIC_SITE_URL` | l'adresse Vercel, ex. `https://endurance-saas.vercel.app` (à corriger après le 1er déploiement si besoin) |
| `CRON_SECRET` | une chaîne aléatoire (`openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` | *facultatif* : active le coach IA et les plans IA |

4. **Deploy**. Les variables `NEXT_PUBLIC_*` sont intégrées au build : après toute modification, faites **Redeploy**.

> Si vous testez depuis la branche de la PR avant la fusion : Vercel déploie aussi les branches (aperçu). Utilisez l'adresse de l'aperçu dans `NEXT_PUBLIC_SITE_URL` et dans les URL Supabase ci-dessous.

## 3. Lier Supabase à l'adresse du site
Supabase → **Authentication → URL Configuration** :
- **Site URL** : votre adresse Vercel
- **Redirect URLs** : `https://<adresse-vercel>/auth/callback`

## 4. Créer votre compte et activer l'essai Premium
1. Sur le téléphone, ouvrez l'adresse Vercel → **Commencer** → inscription → cliquez le lien reçu par e-mail.
   - E-mail non reçu : Supabase limite les envois avec son serveur par défaut. Pour l'essai, vous pouvez désactiver la confirmation (Authentication → Providers → Email → *Confirm email*), puis la réactiver avant le lancement.
2. Supabase → **SQL Editor** :
   ```sql
   SELECT public.grant_premium_trial('votre-adresse@exemple.fr', 30);
   ```
   Réponse attendue : `Essai Premium accordé à … jusqu'au …`. La fonction n'est appelable que depuis le SQL Editor ou le serveur, jamais depuis l'application. L'essai se termine seul à la date prévue (tâche de nuit).
3. Dans l'application : **Profil → Charger les données de démonstration** (12 semaines de séances, bien-être et programme). Elles se suppriment ensuite en un clic, sans toucher à vos vraies données.

## 5. Installer sur le téléphone
- **Android (Chrome)** : menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
- **iPhone (Safari)** : bouton **Partager** → **Sur l'écran d'accueil**.

L'icône « Endurance » apparaît. Un appui long dessus donne les raccourcis **Bien-être du matin**, **Nouvelle séance** et **Calendrier** (Android).

## 6. Que tester
- Tableau de bord, courbes, détail d'une séance (courbes et parcours), calendrier, bien-être du matin.
- **Importer** : un `.fit`, `.gpx` ou `.tcx` exporté de votre montre, ou une archive Garmin / Strava.
- **Plan IA** et **analyse de séance** (si `ANTHROPIC_API_KEY` est renseignée).
- **Coach** : invitez une seconde adresse ; le lien d'invitation s'affiche si les e-mails ne sont pas configurés.
- **Bilan PDF** du mois depuis le tableau de bord.
- Mode avion : la page « Pas de connexion » s'affiche.

## Plus tard (production)
Stripe (prix et webhook), Polar, Resend et domaine personnalisé : voir le `README.md`.
