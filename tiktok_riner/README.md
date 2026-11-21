# tiktok_riner — décryptage de la candidature de Teddy Riner

Teddy Riner a annoncé sa candidature à la présidentielle de 2027 dans une vidéo publiée sur X le 9/11/2026, puis relayée par Brut. Cette vidéo la décortique phrase par phrase.

**Ligne éditoriale** : il a parfaitement le droit d'être candidat, c'est la démocratie. On ne s'oppose pas à sa candidature : on vérifie ce qu'il dit, et on attend son programme.

Caractéristiques de la vidéo :

- format 1080x1920, durée 2 min 34 ;
- **fond blanc, couleurs bleu-blanc-rouge** : dégradés blancs, texte bleu nuit, mots-clés en rouge, encadrés bleus, cadre tricolore autour des extraits, bandes tricolores en haut et en bas ;
- logo Canal Rouge en version claire (`appliquer_logo(arr, clair=True)`) ;
- voix fr-FR-HenriNeural (edge-tts), débit +8 %.

## Rendu

1. Copie la vidéo d'origine dans `build/src/source.mp4`.
2. Lance les commandes :

```bash
python3 generer_voix_edge.py
python3 montage_riner.py --voice-file build/voix_edge.wav
```

## Ce qu'il dit, et ce qu'on vérifie

| Extrait (temps dans l'original) | Analyse | Source |
|---|---|---|
| « Je suis candidat à l'élection présidentielle de 2027 » (25,9 – 28,6 s) | C'est son droit en démocratie | — |
| « On vit côte à côte… face à face » (0 – 4,6 s) | Citation non attribuée de **Gérard Collomb**, ministre de l'Intérieur d'E. Macron, le 3/10/2018 | CNews ; Lyon Capitale ; vie-publique |
| « La France s'effondre sous le poids de la dette » (42,0 – 50,5 s) | Constat juste : **119 % du PIB** (3 595,5 Md€), un record. Aucune solution proposée | Insee, Informations rapides n° 239, 29/09/2026 |
| « Le caddie… la rue laissée aux voyous… l'autorité a disparu » (50,5 – 65,0 s) | Alimentation **+21 %** entre janvier 2021 et décembre 2024 (indice 81,4 → 98,7). Sécurité en 2025 : homicides stables (975), violences physiques +5 %, vols avec arme −8 % | Insee, IPC ; SSMSI, « Insécurité et délinquance en 2025 » |
| « Ceux qui se lèvent tôt… payer pour tout le monde » (67,9 – 74,6 s) | Reprise de « la France qui se lève tôt » de Nicolas Sarkozy (2007) | INA |
| « Le bon réseau, le bon nom ou la bonne couleur » (78,0 – 86,4 s) | Vrai sujet : **−31,5 %** de rappels pour un nom d'origine maghrébine, à CV égal | Dares / IPP, étude par testing, 2021 |
| « Le combat a toujours fait partie de moi » (98,1 – 103,1 s) | 11 titres mondiaux et 5 médailles d'or olympiques. Mais gouverner, c'est un autre combat | Wikipédia « Teddy Riner » |
| « Bon sens, fermeté, justice » (129,5 – 135,5 s) | **0 mesure concrète**, aucun chiffre, aucun calendrier | Analyse de la vidéo |
| — | Prochaine étape : **500 parrainages** d'élus (au moins 30 départements) | vie-publique.fr, loi du 6/11/1962, art. 3 |

## Choix éditoriaux

- La vidéo reconnaît ce qui est juste : la dette, le coût de l'alimentation, les discriminations, le palmarès.
- Le ton n'est jamais moqueur envers la personne.
- La conclusion : « Qu'un citoyen se lance, c'est sain en démocratie. On attend le programme, et on jugera sur pièces. »
