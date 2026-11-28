# TikTok : « Le programme du RN, déboisé » (satire sourcée, point de vue LFI)

Vidéo verticale 1080×1920 d'environ 1 min 25, à 30 images par seconde, générée par `montage_rn.py` (Python, Pillow, NumPy et FFmpeg).
- **Voix :** voix neuronale ElevenLabs, via vidIQ.
- **Musique :** ton ironique au début, puis de plus en plus grave.
- **Gags :** animations faites par le script (emojis, ticket, cartes de vote, rembobinage façon VHS, écran 404) et bruitages comiques générés par le script, donc libres de droits.

```bash
ffmpeg -i voix_off_source_elevenlabs.mp3 build/voix.wav
python3 montage_rn.py --voice-file build/voix.wav
```

## Sources des affirmations

| Affirmation | Source |
|---|---|
| Le RN vote contre le retour de l'ISF (amendement LFI n°1079) | Assemblée nationale, scrutin n°8870 du 16/10/2026 : 29 députés RN contre |
| Le RN vote contre la taxe Zucman (2 % sur les patrimoines de plus de 100 M€) | Assemblée nationale, scrutin n°8859 du 16/10/2026 : 37 députés RN contre (88 contre déjà le 31/10/2025) |
| +71 Md€ de déficit par an | Institut Montaigne, chiffrage du programme RN pour les législatives 2024 |
| Contre-budget irréaliste | La Grande Conversation, « RN : les mauvais comptes d'un budget dopé à l'IA » ; Revue Politique et Parlementaire, « RN : la règle d'or est en toc » |
| Retraites : abrogation reportée « dans un second temps » | J. Bardella, juin 2024 (L'Express, Le Parisien) |

**À savoir pour ne pas te faire contredire :** le même jour, le RN a présenté son propre « impôt sur la fortune financière », qui remplacerait l'IFI. Cet amendement a été rejeté, avec le vote pour de 31 députés RN (scrutin n°8864). Si quelqu'un te le ressort en commentaire, voici la réponse : le RN refuse l'ISF et la taxe Zucman, et il exclut l'immobilier de son impôt maison.
