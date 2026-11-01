# TikTok : attentat raciste de Trappes et La Verrière (23/10/2026)

Vidéo verticale 1080×1920, 30 fps, 57,6 s, générée entièrement par script.
- **Voix :** voix neuronale ElevenLabs (« Daniel », via vidIQ).
- **Style :** noir, blanc et rouge, avec des photos de rassemblements passées en noir et blanc.
- **Musique :** une nappe grave et un battement de cœur lent.

| Fichier | Rôle |
|---|---|
| `montage_trappes.py` | Script complet (même moteur que `tiktok_acte3/`) |
| `voix_off_trappes.mp3` | Voix off finale, normalisée |
| `voix_off_source_elevenlabs.mp3` | Voix brute, lue d'une traite |
| `tiktok_trappes_racisme.mp4` | Vidéo finale |
| `script_voix_off_trappes.txt` | Texte exact lu par la voix |
| `SOURCES.md` | Source de chaque affirmation du script |
| `photos/CREDITS.md` | Crédits et licences des photos |

## Relancer

```bash
ffmpeg -i voix_off_source_elevenlabs.mp3 -af atempo=1.08 build/voix_fast.wav
python3 montage_trappes.py --voice-file build/voix_fast.wav
```

## Nouveauté technique : un meilleur alignement voix / texte

La voix externe est découpée en phrases. Pour savoir où couper, le script lit d'abord chaque phrase avec espeak-ng et en mesure la durée. Il cherche ensuite, dans l'enregistrement, les pauses qui tombent au plus près de ces durées attendues. Le résultat est bien plus fiable qu'avec le simple nombre de caractères, surtout quand le texte est fait de phrases très courtes (« Arrêté. Puis relâché. »).
