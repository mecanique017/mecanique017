# tiktok_viral — « Kassovitz : la phrase choc… et ce qu'on ne vous montre pas »

Il s'agit d'une vidéo TikTok verticale (1080x1920, 30 fps) construite autour de l'extrait RMC « Les Grandes Gueules » du 5 novembre 2026, fourni par l'utilisateur.

## Angle

Toute la presse a repris « les casseurs sont nécessaires ». La vidéo montre la phrase avec le son d'origine, puis ce qu'il dit aussi dans la même émission (« je condamne toutes les violences »). Elle pose ensuite sa vraie question, chiffres à l'appui : le pouvoir écoute-t-il la rue quand elle reste calme ?

## Sources

| Affirmation | Source |
|---|---|
| Propos de M. Kassovitz, citation complète | L'Indépendant, 05/11/2026 ; HuffPost, 05/11/2026 |
| 7 mars 2023 : 1,28 million (Intérieur), 3,5 millions (CGT) | Ouest-France, 07/03/2023 ; Wikipédia |
| 16 mars 2023 : 49.3 sur la réforme des retraites | vie-publique.fr |
| 10/12/2018 : +100 € au smic, environ 10 Md€ par an | vie-publique.fr ; La finance pour tous, 12/12/2018 |
| 5 novembre 2026 : 1,6 M (CGT), 575 000 (Beauvau) | La Dépêche, 05/11/2026 |

## Ce que la vidéo ne fait pas

- Elle ne fait pas l'apologie de la casse. La conclusion dit « Casser n'est pas une solution ».
- Elle n'attribue aucune phrase hors du son d'origine ou des articles cités.
- Les accusations de violences policières restent dans la bouche de M. Kassovitz : elles sont présentées comme son point de vue.

## Rendu

```bash
python3 generer_voix_edge.py                          # voix off (edge-tts, Henri) -> build/voix_edge.wav
# (secours hors ligne : python3 generer_voix_kokoro.py /chemin/vers/kokoro -> build/voix_kokoro.wav)
python3 montage_viral.py --voice-file build/voix_edge.wav
```

La vidéo source (`build/src/source.mp4`) et les MP4 ne sont pas versionnés, car ils contiennent des extraits TV de tiers.
