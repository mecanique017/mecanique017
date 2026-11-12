# Mécanique 17 / Canal Rouge — consignes pour l'assistant

Ce dépôt contient le site du garage Mécanique 17 et les projets vidéo TikTok de la chaîne **Canal Rouge** (dossiers `tiktok_*`, `branding/`, `prompts_motion/`).

## Vidéos TikTok

Avant toute nouvelle vidéo, lire et appliquer **`prompts_motion/REGLES_CANAL_ROUGE.md`**. L'essentiel :

- **Accroche choc dès la première seconde.**
- **Durée de 60 à 90 secondes par défaut**, sauf durée demandée.
- **Fond blanc bleu-blanc-rouge**, avec le logo Canal Rouge en version claire sur toutes les images. Le moteur de référence est `tiktok_reaction/montage_reaction.py`.
- **Appel « abonne-toi et partage » au milieu de la vidéo** (vers 40 à 55 %), en plus de l'appel final.
- **Écriture inspirée de @enmarge.media** : citation exacte en ouverture, « on a fait le calcul » sur la vie courante, tutoiement, « qui paie ? », limite honnête, question finale (détail dans le fichier de règles, section 7).
- **Voix** : edge-tts `fr-FR-HenriNeural`, débit +8 %.
- **Faits vérifiés et sourcés à l'écran.** On critique des propos, pas des personnes : pas d'insulte, pas d'intention inventée.
- **À livrer avec la vidéo** :
  - le MP4 et sa version légère ;
  - une légende relue ;
  - 4 à 6 hashtags séparés par des espaces ;
  - le texte du commentaire épinglé avec les sources ;
  - le créneau de publication conseillé (12 h – 13 h 30 ou 18 h – 21 h 30).

## Façon de travailler

- L'utilisateur ne veut pas qu'on lui demande d'autorisation : aller au bout de la tâche et prévenir à la fin. Ne poser une question que si une information indispensable manque.
- Répondre en français, de façon directe et structurée.
- Commit et push sur la branche de travail à chaque livraison. Les MP4 et les dossiers `build/` restent hors dépôt.
