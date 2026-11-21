# tiktok_reponse2 — « Le programme LFI, fantaisiste ? On vérifie »

Cette vidéo répond au TikTok de @limmigr.bledard, qui présente le programme 2027 de Jean-Luc Mélenchon (L'Avenir en commun, publié le 6/11/2026) comme « fantaisiste » et demande « d'où sortira l'argent ».

- Format : 1080x1920, durée 2 min 04, logo Canal Rouge sur toutes les images.
- Voix : edge-tts fr-FR-HenriNeural, débit +8 %.

## Fichiers

| Fichier | Rôle |
|---|---|
| `montage_programme.py` | Le montage complet : script découpé, sous-titres cinétiques, cartes, sources, extraits, musique, effets sonores et logo |
| `generer_voix_edge.py` | La voix off, séquence par séquence (dans `build/voix_edge.wav`) |
| `timings.txt` | Le découpage temps par temps |
| `voix_off_programme.mp3` | La voix off finale |
| `tiktok_programme_lfi_reponse(_leger).mp4` | La vidéo (non versionnée) |

## Rendu

1. Copie la vidéo d'origine dans `build/src/source.mp4`.
2. Lance les commandes :

```bash
python3 generer_voix_edge.py
python3 montage_programme.py --voice-file build/voix_edge.wav
```

## Extraits cités (droit de citation)

| Temps dans l'original | Propos |
|---|---|
| 8,16 – 18,52 s | « 3 jours d'arrêt maladie autodéclaré… les patrons seront en PLS » |
| 63,20 – 70,56 s | « plafond de 12 millions pour les héritages… ils ont un gros problème avec les richesses » |
| 157,44 – 170,86 s | « de l'ordre fantaisiste… d'où sortira l'argent… il n'y a pas de sous » |

## Sources

| Affirmation | Source |
|---|---|
| Au Royaume-Uni, jusqu'à 7 jours d'arrêt maladie sans certificat | GOV.UK, « Taking sick leave » (self-certification) |
| Retraite à 60 ans en France de 1982 à 2010 | Ordonnance n° 82-270 du 26/03/1982 (Légifrance) ; vie-publique.fr, chronologie des réformes |
| 61 entreprises ont testé la semaine de 4 jours, 56 l'ont gardée | Le Nouvel Obs, 21/02/2023 (test britannique de 2022) |
| Couvre-feu à Orly depuis 1968 | Décision ministérielle du 4/04/1968 ; arrêté du 4/07/2025 (Légifrance) |
| La France a reconnu l'État de Palestine le 22/09/2025 | France Diplomatie, « Comprendre la reconnaissance par la France de l'État de Palestine » |
| L'Assemblée a condamné le massacre du 17 octobre 1961 | Assemblée nationale, résolution T.A. n° 273 du 28/03/2024 |
| 12 M€, c'est plus de 670 ans de SMIC | Calcul : 12 000 000 / (1 477,93 € × 12), SMIC net au 1/06/2026 (service-public.fr) |
| 211 Md€ d'aides publiques aux entreprises en 2023 | Sénat, commission d'enquête, rapport n° 808, 8/07/2025 (Public Sénat, vie-publique) |
| 107 Md€ versés aux actionnaires du CAC 40 en 2025 | Lettre Vernimmen ; Alternatives Économiques |
| 1 076 Md€ pour les 500 plus grandes fortunes | Challenges, classement 2026 |
| Taxe Zucman : environ 1 800 foyers, 15 à 25 Md€ par an selon son auteur | Assemblée nationale, rapport n° 930 ; Wikipédia « Taxe Zucman » |
| Contenu du programme 2027 | LCP, 6/11/2026, « Ce qui change dans le nouveau programme de Jean-Luc Mélenchon » |

## Choix d'honnêteté

- Le rendement de la taxe Zucman est présenté comme l'estimation **de son auteur**, car il est contesté : certains travaux l'évaluent autour de 5 Md€.
- La vidéo critique les arguments de l'auteur, pas sa personne.
