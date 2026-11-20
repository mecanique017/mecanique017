# TikTok : « CNews, BFM, RMC : le casting de la haine »

Vidéo verticale 1080×1920 d'environ 1 min 50, générée par `montage_medias.py`. Le commentaire animé (voix ElevenLabs) alterne avec 4 courts extraits de la vidéo fournie, diffusés avec leur son d'origine.

**La vidéo source n'est pas versionnée :** elle est placée dans `build/src/source.mp4`, qui est exclu du dépôt.

```bash
ffmpeg -i voix_off_source_elevenlabs.mp3 -af atempo=1.08 build/voix.wav
python3 montage_medias.py --voice-file build/voix.wav
```

## Extraits utilisés (vidéo source : compilation TikTok @trucdeouf2027)

| Extrait | Passage de la source | Contenu |
|---|---|---|
| 1 | 11,0 – 23,4 s | Archive : « …on est à majorité blanche et on doit le rester » |
| 2 | 53,0 – 63,8 s | Archive : « le Gabon blanc… le Japon maghrébin… pour que la France ressemble à la France » |
| 3 | 87,5 – 95,0 s | Archive : « la croissance d'une population par une autre est en cours… on va tous devenir métisses, et je trouve ça triste » |
| 4 | 76,5 – 87,0 s | Plateau RMC : « clochards avinés et autres punks à chiens sous crack… » |

**Ce qui n'est pas repris :** le passage du chroniqueur aux cheveux gris (identité et contexte non vérifiés) et le mème final.

**Droit de citation :** les extraits sont courts (7 à 12 s), cités pour la critique et le commentaire, et leur source est indiquée à l'écran.

## Sources des affirmations

| Affirmation | Source |
|---|---|
| Alice Cordier : militante identitaire, fondatrice et directrice du collectif Némésis | Wikipédia, « Alice Cordier » |
| Alice Cordier : invitée régulière de CNews | cnews.fr (2025-2026) |
| Juliette Briens : chroniqueuse RMC (« Estelle Midi ») | rmc.bfmtv.com, octobre 2026 |
| Juliette Briens : passée par BFMTV, CNews et TPMP | Libération, 29/11/2023 |
| « la nouvelle égérie d'extrême droite de BFM » | Libération (newsletter Frontal), 29/11/2023 |
| L'Arcom saisit la justice pour des propos racistes de Zemmour sur LCI, BFM et CNews | Libération, 03/11/2026 |

**Identification des personnes dans les archives :** elle vient de la compilation source. Le même dossier d'archives circule aussi ailleurs, par exemple chez Kevin Razy. Je n'ai pas trouvé de grand média ayant daté ces archives précisément. Le commentaire dit donc : « ces archives circulent sur les réseaux », et ne prête à aucune des deux une phrase précise : on entend les extraits avec leur son d'origine.
