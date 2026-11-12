# TikTok : « Les Républicains, déboisés » (satire sourcée, point de vue LFI, bleu-blanc-rouge)

Vidéo verticale 1080×1920 de 90,7 s, générée par `montage_lr.py`. Le script repart du moteur de `tiktok_rn/` avec trois changements :
- une palette tricolore ;
- une musique avec une horloge qui fait tic-tac ;
- de nouveaux gags : photocopieuse, boussole qui s'affole, frise chronologique, tronçonneuse.

`tiktok_lr_leger.mp4` est une version allégée, plus facile à télécharger sur téléphone.

```bash
ffmpeg -i voix_off_source_elevenlabs.mp3 build/voix.wav
python3 montage_lr.py --voice-file build/voix.wav
```

## Sources

| Affirmation | Source |
|---|---|
| Retailleau lie l'immigration aux violences du 17/10 | L'Opinion, 19/10/2026 |
| « La droite et le RN parlent déjà d'une même voix » sur l'immigration | franceinfo, édito politique du 18/06/2026 |
| Alliance Ciotti–RN | Législatives anticipées de juin 2024 (presse) |
| 4,78 % au 1er tour de la présidentielle 2022 (V. Pécresse) | Conseil constitutionnel, 10/04/2022 |
| Bouclier fiscal | Loi TEPA du 21/08/2007 |
| Âge légal de départ à la retraite porté à 62 ans | Loi n°2010-1330 du 9/11/2010 |
| Un fonctionnaire sur deux non remplacé | RGPP (2007-2012) |
| 500 000 postes de fonctionnaires supprimés | Programme présidentiel de F. Fillon, 2017 |
| Retraite à 64 ans adoptée au Sénat (193 pour, 114 contre) | Sénat, 16/03/2023 |
| Taxe Zucman : 5 députés Droite républicaine contre | Assemblée nationale, scrutin n°8859 du 16/10/2026 |
