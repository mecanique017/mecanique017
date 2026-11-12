# tiktok_reaction — Réaction : l'ambulancier insulté

Cette vidéo réagit à un extrait filmé par un ambulancier et publié par Les Spectateurs (@spectateursfr). Pendant un transport, l'ambulancier est la cible d'insultes racistes de son patient. Il reste calme et professionnel : « que tu sois raciste ou pas, je vais jusqu'au bout de ma mission… le même protocole avec tout le monde ».

- **Style par défaut désormais** : fond blanc et couleurs bleu-blanc-rouge, logo Canal Rouge en version claire.
- Format : 1080x1920, durée 1 min 39.

## Rendu

1. Copie la vidéo d'origine dans `build/src/source.mp4`.
2. Lance les commandes :

```bash
python3 generer_voix_edge.py
python3 montage_reaction.py --voice-file build/voix_edge.wav
```

## Extraits (droit de citation)

| Temps dans l'original | Propos |
|---|---|
| 0,0 – 6,6 s | Les insultes du patient |
| 17,9 – 23,3 s | « Je vais le mettre sur le compte de la maladie » |
| 26,7 – 35,35 s | « Je suis un soignant… que tu sois raciste ou pas, je vais jusqu'au bout de ma mission » |
| 42,7 – 49,6 s | « Aujourd'hui c'est un […] qui va te transporter » (insulte masquée dans l'étiquette) |
| 58,2 – 68,5 s | « Français, Arabe, Asiatique, blanc, noir… le même protocole avec tout le monde » |

## Sources

| Fait | Source |
|---|---|
| Environ 700 000 victimes d'injures racistes par an, 125 000 de menaces, et seulement 45 000 plaintes | SSMSI, Interstats Analyse n° 15 (2026), enquête « Cadre de vie et sécurité » |
| 9 700 crimes et délits racistes enregistrés en 2025 (+5 %) | SSMSI, 25/03/2026 ; DILCRAH |
| 18 822 atteintes aux personnes signalées en milieu de santé en 2024, principalement commises par des patients | ONVS, rapport 2025 (données 2023-2024) ; MACSF |
| Marine Le Pen : « Il n'y a pas de discrimination en France » (CBS) | franceinfo, 09/11/2026 |

## Choix

- Le patient n'est ni nommé ni ciblé ; l'ambulancier lui-même évoque la maladie.
- L'insulte raciste n'est jamais écrite par nous à l'écran.
