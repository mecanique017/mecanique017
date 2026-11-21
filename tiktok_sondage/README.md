# TikTok : « Sondages 2027 : rien n'est joué » (point de vue LFI)

Vidéo verticale 1080×1920 d'environ 1 min 30. Le commentaire animé alterne avec 2 courts extraits LCI (sondage Ifop-Fiducial des 27-29 octobre 2026).

**Voix off gratuite et hors ligne :** Kokoro (voix française « ff_siwis »), générée par `generer_voix_kokoro.py`. La première version utilisait Piper (`generer_voix_piper.py`), dont la voix « Gilles » était trop peu compréhensible. Pour la remplacer par ta propre voix, enregistre le texte de `script_voix_off_sondage.txt` en laissant environ 1 seconde de silence entre chaque phrase, puis relance :

```bash
python3 montage_sondage.py --voice-file ma_voix.m4a
```

## Les arguments et leurs sources

| Affirmation | Source |
|---|---|
| Un sondage Ifop porte sur environ 1 000 personnes, interrogées en ligne avec la méthode des quotas | Note Ifop de juillet 2026 : 984 inscrits, questionnaire auto-administré en ligne |
| Une chance sur 50 000 d'être interrogé | Calcul : 1 000 personnes sur environ 49 millions d'inscrits |
| Marge d'erreur d'environ 3 points | Ordre de grandeur classique pour un échantillon de 1 000 personnes, à 95 % de confiance |
| Zemmour à 17-18 % en octobre 2021, puis 7,07 % au 1er tour | BFMTV (06/10/2021) ; Conseil constitutionnel |
| Fillon, favori fin 2016, éliminé avec 20,01 % | Conseil constitutionnel, 2017 |
| Mélenchon autour de 17 % dans les derniers sondages de 2022, puis 21,95 % | Liste des sondages 2022 (Wikipédia) ; Conseil constitutionnel |
| 421 420 voix d'écart avec Le Pen en 2022 | Libération, 11/04/2022 |
| Environ 6 voix par bureau de vote | Calcul : 421 420 voix pour environ 70 000 bureaux |
| Mélenchon 2e dans toutes les hypothèses, 1er à gauche | Ifop, baromètre vague 7 (20/10/2026) ; sondage LCI du 27-29/10/2026 |
| Abstention de 26,31 % au 1er tour 2022, soit près de 13 millions d'inscrits | Ministère de l'Intérieur |

## Ce que la vidéo ne dit volontairement pas
- **Elle n'affirme pas que Mélenchon « sera sûrement président ».** Le même baromètre Ifop le donne à 32 % contre 68 % face à Le Pen au second tour. Une affirmation de certitude serait démontée immédiatement. Le message est plutôt : les sondages se trompent souvent, et la mobilisation peut tout changer.
- **Elle ne présente pas le fait de n'avoir jamais été sondé comme une preuve de trucage.** C'est statistiquement normal. La vidéo en fait un argument exact : environ 1 000 personnes interrogées pour 49 millions d'électeurs.
