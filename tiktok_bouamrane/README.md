# tiktok_bouamrane — réponse à Karim Bouamrane

Karim Bouamrane est le maire PS de Saint-Ouen et il est candidat à la présidentielle de 2027. Cette vidéo répond, preuves à l'appui, à sa vidéo TikTok (@karimbouamrane73) dans laquelle il dit de Jean-Luc Mélenchon et de LFI :

- « il ne peut pas gagner » ;
- « il n'a jamais travaillé de sa vie » ;
- son projet est « irréaliste » ;
- ses soutiens sont des « petits bourgeois » et des « fils à papa » ;
- LFI est le « marchepied du RN ».

Caractéristiques de la vidéo :

- format 1080x1920, durée d'environ 2 minutes ;
- voix fr-FR-HenriNeural (edge-tts), débit +8 % ;
- logo Canal Rouge sur toutes les images ;
- extraits en 16:9 dans un encart, avec la citation en gros en dessous.

## Rendu

1. Copie la vidéo d'origine dans `build/src/source.mp4`.
2. Lance les commandes :

```bash
python3 generer_voix_edge.py
python3 montage_bouamrane.py --voice-file build/voix_edge.wav
```

## Extraits cités (droit de citation)

| Temps dans l'original | Propos |
|---|---|
| 0,00 – 8,44 s | « Il ne peut pas gagner, c'est l'assurance-vie du RN, son projet est irréaliste » |
| 16,96 – 23,14 s | « …arrêt maladie sans passer par un médecin. Il n'a jamais travaillé de sa vie. Il est complètement hors sol » |
| 69,98 – 75,80 s | « C'est des petits bourgeois » |
| 85,82 – 93,04 s | « …c'est souvent des fils à papa » |
| 102,88 – 110,96 s | « La France insoumise est le marchepied du RN » |

## Sources

| Affirmation | Source |
|---|---|
| En 2022, Le Pen a 8 133 828 voix et Mélenchon 7 712 520, soit 421 308 voix d'écart ; Hidalgo (PS) fait 1,75 % | Conseil constitutionnel, résultats du 1er tour 2022 ; info.gouv.fr |
| Bouamrane est crédité de 0,5 à 3 % | Le Parisien, 16/09/2026 (« crédité de 1 à 3 % ») ; OpinionWay, 22/10/2026 (0,5 %) |
| Mélenchon a été correcteur (imprimerie Néo-Typo, Besançon), ouvrier chez Maty (horlogerie), employé de station-service, surveillant, maître auxiliaire, professeur de français (CAPES, Lons-le-Saunier, 1976) et journaliste pigiste (Dépêches du Jura) | Wikipédia, « Jean-Luc Mélenchon », section biographie |
| Au Royaume-Uni, jusqu'à 7 jours d'arrêt maladie sans certificat | GOV.UK, « Taking sick leave » |
| Retraite à 60 ans de 1982 à 2010 | Ordonnance n° 82-270 du 26/03/1982 (Légifrance) |
| À Saint-Ouen-sur-Seine en 2022 : Mélenchon 51,82 %, Hidalgo 1,43 % | Ministère de l'Intérieur, archives des résultats, commune 93070 |
| En Seine-Saint-Denis en 2022 : Mélenchon 49,09 % | Ministère de l'Intérieur ; Le Monde, 20/04/2022 |
| La Seine-Saint-Denis a le taux de pauvreté le plus élevé de métropole | Insee, dossier complet du département 93 |
| En 2024, le NFP a fait 130 désistements contre 81 pour Ensemble | LCP, 03/07/2024 |

## Choix d'honnêteté

- On répond aux propos, pas à la personne.
- Le score de Bouamrane dans les sondages est donné sous forme de fourchette, avec ses deux sources.
