# tiktok_cnews — « CNews : un musulman élu = un frère musulman ? »

Il s'agit d'une vidéo TikTok verticale (1080x1920, 30 fps) construite autour de l'extrait CNews du 4 novembre 2026, fourni par l'utilisateur. Dans cet extrait, Vincent Hervouët dit d'Abdul El-Sayed, nouveau sénateur du Michigan : « il est ultra à gauche, c'est quasiment un frère musulman qui vient d'être élu ».

## Sources

| Affirmation | Source |
|---|---|
| Premier sénateur musulman des États-Unis, élu le 3-4/11/2026 | Le Monde, 04/11/2026 ; BBC News, 04/11/2026 |
| 52,53 % contre 45,48 % pour Mike Rogers | Radio-Canada, 04/11/2026 (résultats préliminaires) |
| Né en 1984 à Rochester Hills, médecin épidémiologiste, directeur de la santé de Détroit en 2015 | BBC News |
| Programme : taxer les milliardaires pour financer une santé universelle | BBC News |
| Soutiens de Sanders, Ocasio-Cortez et Obama | BBC News |
| Accusation républicaine (lettre ouverte de 2012) ; il nie tout lien avec les Frères musulmans | BBC News |
| Trump : « du côté des terroristes » | BBC News |
| « Cette Amérique est assez grande pour nous tous » | BBC News, discours de victoire |

## Choix éditoriaux

- La vidéo mentionne honnêtement d'où vient l'accusation (la lettre de 2012) et précise qu'il la nie, au lieu de prétendre qu'elle sort de nulle part.
- La pétition « fermeture de CNews » affichée dans la vidéo d'origine n'est pas reprise, car elle n'a pas pu être vérifiée.

## Rendu

```bash
python3 generer_voix_edge.py                                   # voix off (edge-tts, Henri) -> build/voix_edge.wav
python3 montage_cnews.py --voice-file build/voix_edge.wav
```

La vidéo source et les MP4 ne sont pas versionnés (extraits TV de tiers).
