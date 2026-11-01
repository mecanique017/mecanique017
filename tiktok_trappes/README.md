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

## Version 2 : plus d'animation et des effets sonores

Le fichier `tiktok_trappes_racisme_v2.mp4` est produit par `montage_trappes_v2.py`. Ce script réutilise `montage_trappes.py` (même texte, même voix, mêmes photos) et ne remplace que le rendu des images et le mixage du son.

```bash
python3 montage_trappes_v2.py --voice-file build/voix_fast.wav
```

**Ce qui bouge à l'image :**
- **Entre deux plans :** un effet de bug numérique (couleurs décalées, image découpée en bandes), un balayage rouge et un zoom brusque sur la photo.
- **Gros titres :** ils arrivent en grand et s'écrasent à l'écran avec une secousse, ou apparaissent ligne par ligne.
- **Chiffres :** ils défilent comme un compteur (0 → 128, 0 → 12, 0 → 8).
- **Bandeau sous le titre :** il s'écrit lettre par lettre, comme à la machine à écrire, avec un curseur.
- **Ambiance :** un cadre rouge qui pulse au rythme du battement de cœur, des lignes de balayage façon vieil écran, du grain et un point « REC » qui clignote.

**Effets sonores**, tous générés par le script et donc libres de droits :
- un souffle (« whoosh ») avant chaque coupe et un grésillement au moment de la coupe ;
- un impact grave à chaque titre, un tic à chaque chiffre du compteur et un cliquetis de machine à écrire ;
- un son qui monte avant la conclusion et un coup sourd sur « LES MOTS TUENT ».

La musique et les effets baissent automatiquement quand la voix parle.
