# TikTok : « La macronie d'Attal, déboisée » (satire sourcée, point de vue LFI)

Vidéo verticale 1080×1920 de 89,3 s, générée par `montage_attal.py`. Elle reprend le même moteur que `tiktok_rn/` et `tiktok_lr/`, avec :
- **Couleurs :** fond sombre bleu nuit et violet, mots-clés en bleu clair, punchlines sur pavé jaune vif.
- **Nouveaux gags :** la balance du « en même temps », la sirène d'ambulance, l'autoroute vers l'extrême droite.
- **Synchronisation améliorée :** le script lit d'abord tout le texte avec espeak-ng, dont il connaît les fins de phrases. Il aligne ensuite cette lecture sur la vraie voix (alignement DTW), ce qui place chaque coupure au bon endroit, même quand le texte contient beaucoup de phrases courtes.

`tiktok_attal_leger.mp4` est une version allégée pour téléphone.

```bash
ffmpeg -i voix_off_source_elevenlabs.mp3 -af atempo=1.04 build/voix.wav
python3 montage_attal.py --voice-file build/voix.wav
```

## Sources

| Affirmation | Source |
|---|---|
| Suppression de l'ISF, remplacé par l'IFI | Loi n°2017-1837 de finances pour 2018 |
| Retraite à 64 ans adoptée par 49.3 | Gouvernement Borne, 16/03/2023 |
| Des millions de personnes dans la rue | Manifestation du 7/03/2023 : 1,28 M selon l'Intérieur, 3,5 M selon la CGT |
| 107,5 Md€ versés aux actionnaires du CAC 40 (dividendes et rachats d'actions) | La Tribune et Lettre Vernimmen, 2025 |
| Taux de pauvreté de 15,4 % (9,8 millions de personnes), plus haut depuis 1996 | Insee Première n°2063, juillet 2025 |
| Loi immigration adoptée avec les voix du RN ; « victoire idéologique » selon Marine Le Pen | Parlement, 19/12/2023 ; Le Monde, 20/12/2023 |

**Nuance :** le gouvernement a fait valoir que la loi immigration aurait été adoptée même sans les voix du RN. Le script dit seulement « adoptée avec les voix du RN », ce qui est exact.
