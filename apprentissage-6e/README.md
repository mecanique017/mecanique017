# 📚 Mission 6e : apprendre le français en s'amusant

Application web d'apprentissage pour un élève de **6e** (programme officiel de français, cycle 3). Elle propose des leçons courtes et visuelles, des exercices variés **générés à l'infini**, de la progression façon jeu (XP, niveaux, badges, série de jours) et un retour toujours bienveillant.

## 🚀 Lancer l'application en local

Il faut **Node.js 18 ou plus récent**.

```bash
cd apprentissage-6e
npm install        # installe le SDK officiel Claude (seule dépendance)
npm start          # → http://127.0.0.1:3000
```

Sans clé API, tout fonctionne déjà avec le **moteur hors ligne**, qui génère des exercices à l'infini. La clé active en plus l'IA générative.

### Utiliser l'application sur une tablette (même Wi-Fi)

Dans `.env`, mettez `HOST=0.0.0.0`, relancez, puis ouvrez `http://<IP-de-l-ordinateur>:3000` sur la tablette.

## 📱 Installer sur iPhone / iPad

L'application est une **PWA** (application web installable) : elle s'installe depuis Safari, s'ouvre en plein écran et fonctionne **hors ligne**.

1. **Publier** : une fois cette branche fusionnée dans `main`, GitHub Pages la sert à l'adresse
   **https://garage-mecanique17.fr/apprentissage-6e/** (la page n'est pas indexée par Google : `noindex`).
2. **Installer** : sur l'iPhone, ouvrez cette adresse dans **Safari** → bouton **Partager** (carré avec flèche ⬆︎) → **« Sur l'écran d'accueil »** → **Ajouter**. L'icône « Mission 6e » apparaît comme une vraie appli.
3. **Activer l'IA (facultatif)** : dans l'appli, onglet **👪 Parents** → « Clé API sur cet appareil » → collez la clé `sk-ant-…` → **Activer l'IA**. La clé est testée puis enregistrée **uniquement sur ce téléphone** (jamais dans l'export de progression). Conseil : créez une clé dédiée avec une **limite de dépenses** sur platform.claude.com.

> La progression est stockée dans l'iPhone. Pensez à l'**exporter** de temps en temps (espace Parents) pour la sauvegarder.
> Après une mise à jour du code, incrémentez `VERSION` dans `public/sw.js` pour que les appareils installés se mettent à jour.

## 🔑 Configurer la clé API sur ordinateur (serveur Node)

1. Créez une clé sur <https://platform.claude.com/>, rubrique **API Keys**.
2. Copiez le modèle de configuration : `cp .env.example .env`
3. Ouvrez `.env` et collez la clé : `ANTHROPIC_API_KEY=sk-ant-...`
4. Relancez : `npm start`. Le terminal affiche `✨ Génération IA activée`.

| Variable | Rôle | Défaut |
|---|---|---|
| `ANTHROPIC_API_KEY` | Clé API Claude (reste sur le serveur, jamais envoyée au navigateur) | — |
| `AI_MODEL` | Modèle utilisé. Pour réduire les coûts : `claude-sonnet-5-5` ou `claude-haiku-5-5` | `claude-opus-5-5` |
| `AI_EFFORT` | `low` (rapide), `medium`, `high` | `low` |
| `AI_RATE_LIMIT_PER_HOUR` | Plafond de générations par heure (protection des coûts) | `60` |
| `PORT` / `HOST` | Adresse d'écoute | `3000` / `127.0.0.1` |

L'espace **Parents** de l'application indique si l'IA est active.

## 🧠 Fonctionnalités

**Programme couvert (12 chapitres)**

| Domaine | Chapitres |
|---|---|
| Grammaire | Nature des mots (8 classes) · Fonctions (sujet, COD, COI, attribut, CC de lieu, temps, manière) |
| Orthographe | Accords dans le GN (féminin, pluriels en -x/-aux) · Accord sujet-verbe (sujet inversé, éloigné, pronom écran) · Homophones (a/à, et/est, son/sont, on/ont, ou/où, ces/ses) · Dictées flash |
| Conjugaison | Présent · Imparfait et passé simple (et leur emploi dans le récit) · Futur simple |
| Vocabulaire | Champs lexicaux, familles de mots, préfixes, contraires, synonymes, nuances d'intensité |
| Lecture | Figures de style (comparaison, métaphore, personnification, énumération) · Compréhension de 3 textes originaux |

**Six types d'exercices** : QCM, texte à trous (saisie libre avec clavier d'accents, ou liste de mots), remise en ordre, identification (clic sur les mots), vrai/faux avec justification, dictée lue par la synthèse vocale du navigateur.

**Pédagogie bienveillante**
- Après une première erreur, l'élève reçoit un **indice** et peut réessayer (une mini-relance). Un message signale quand seuls les accents sont faux.
- Après la deuxième erreur, l'application montre la bonne réponse et explique **pourquoi**. L'exercice part dans « **À revoir** ».
- On gagne toujours des XP, même en se trompant (XP d'effort).
- La difficulté s'adapte toute seule : niveau facile, moyen ou difficile selon la maîtrise de chaque notion.

**Jeu** : XP, 8 niveaux à titre, 16 badges, série de jours 🔥, objectif quotidien 🎯, bonus de combo et de série parfaite, confettis.

**Génération illimitée**
1. **Moteur local paramétrable** (hors ligne) : il combine un moteur de conjugaison complet (1er et 2e groupes, -ger/-cer, 10 verbes irréguliers × 4 temps), des lexiques et des corpus de phrases annotées. Il produit plusieurs milliers d'exercices distincts.
2. **Moteur IA** (avec clé), qui propose :
   - des séries **inédites** sur n'importe quel chapitre ;
   - des **séries ciblées sur les erreurs** de l'élève (à partir des notions ratées) ;
   - de **nouveaux textes de lecture** avec leurs questions ;
   - de **nouvelles dictées** ;
   - dans l'**Atelier IA**, des **modules complets** (fiche de leçon et exercices) sur n'importe quelle demande, y compris dans d'autres matières : maths, histoire-géo, sciences, anglais, EMC.

   Les réponses de l'IA sont forcées en JSON (structured outputs), **validées** côté serveur puis côté client, et mises en **réserve locale** pour être rejouées hors ligne.

**Sauvegarde** : la progression est stockée dans le navigateur (`localStorage`) : profil, XP, maîtrise par notion, erreurs à revoir, modules créés, réserve d'exercices IA. L'espace Parents permet l'**export et l'import en JSON** (sauvegarde, changement d'appareil).

## 🏗️ Architecture

```
apprentissage-6e/
├── index.html                 # redirection vers public/ (adresse courte sur GitHub Pages)
├── server.js                  # Node.js : fichiers statiques + /api/health + /api/generate (proxy Claude)
├── .env.example               # configuration (clé API, modèle…)
├── public/
│   ├── index.html
│   ├── manifest.webmanifest   # PWA : nom, icônes, plein écran
│   ├── sw.js                  # service worker : fonctionnement hors ligne
│   ├── icons/                 # icônes (dont apple-touch-icon pour iPhone)
│   ├── css/styles.css         # interface responsive, thème clair/sombre, zones sûres iPhone
│   └── js/
│       ├── app.js             # routeur (#/…) et vues : accueil, leçon, atelier IA, parents…
│       ├── ui/
│       │   ├── dom.js         # mini-outils DOM sûrs (aucune injection HTML)
│       │   └── player.js      # lecteur de séries : 6 types, 2 essais, indices, fin de série
│       ├── core/
│       │   ├── exercise.js    # schéma, validation et correction des exercices (partagé avec le serveur)
│       │   ├── state.js       # progression, XP, série, maîtrise, « À revoir », export/import
│       │   ├── gamification.js# niveaux, badges, messages d'encouragement
│       │   ├── generator.js   # moteur local + appel IA (serveur ou clé sur l'appareil) + réserve
│       │   ├── ai-prompts.js  # consignes + schémas JSON de l'IA (partagé serveur / navigateur)
│       │   └── utils.js
│       └── content/
│           ├── index.js       # registre des matières et chapitres
│           └── francais/      # 1 fichier par chapitre : leçon + générateurs paramétrables
└── tests/
    ├── content.test.js        # 10 800 exercices générés et vérifiés (npm test)
    └── mock-claude.js         # faux serveur API pour tester la chaîne IA sans clé
```

**Choix techniques**
- **Zéro build** : HTML, CSS et JavaScript en modules ES natifs. Rien à compiler, facile à maintenir et à héberger.
- **Clé API côté serveur uniquement**. Le serveur ajoute aussi un plafond horaire, une limite de taille des requêtes et un nettoyage des entrées.
- **Un seul format d'exercice** pour le moteur local, l'IA et les modules. Le validateur (`core/exercise.js`) est commun au navigateur et au serveur.
- **Deux modes IA** : via le serveur Node (la clé reste sur l'ordinateur) ou, en site statique (GitHub Pages / iPhone), avec une clé enregistrée sur l'appareil qui appelle l'API Claude directement. Sans clé, le moteur hors ligne reste illimité.

## ➕ Ajouter du contenu

Un chapitre est un objet avec `lesson` et une liste de `generators(rng, niveau) → exercice`. Pour ajouter une notion :
1. créez `public/js/content/francais/ma-notion.js` en vous inspirant d'un chapitre existant ;
2. déclarez-le dans `public/js/content/index.js` ;
3. lancez `npm test` : chaque générateur est vérifié automatiquement.

Pour une **autre matière** (maths…), créez un dossier `content/maths/` et ajoutez une entrée dans `SUBJECTS`. On peut aussi passer simplement par l'Atelier IA.

## ✅ Tests

```bash
npm test                         # génère et corrige 10 800 exercices (tous les chapitres, 3 niveaux)
node tests/mock-claude.js &      # faux serveur API sur le port 3999
ANTHROPIC_API_KEY=test ANTHROPIC_BASE_URL=http://127.0.0.1:3999 npm start   # chaîne IA complète, sans coût
```

## 💡 Évolutions possibles
- Mode « défi chronométré » et duel entre frères et sœurs.
- Comptes multiples (plusieurs enfants) et synchronisation dans le cloud (Supabase ou Firebase).
- Rapport hebdomadaire envoyé aux parents par e-mail.
- Nouvelles matières en local : calcul mental, tables, fractions…
