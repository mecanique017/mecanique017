# TikTok : Acte III contre la vie chère (31/10/2026)

Vidéo verticale 1080×1920, 30 fps, 58,6 s, générée entièrement par script. La voix off est une voix neuronale ElevenLabs (« Daniel », générée via vidIQ). Les fonds sont 14 photos réelles sous licence libre (Wikimedia Commons), avec un panoramique animé ; les crédits sont dans `photos/CREDITS.md` et s'affichent à l'écran.

| Fichier | Rôle |
|---|---|
| `montage_tiktok.py` | Script complet : rédaction, voix off, musique, rendu des images, mixage, encodage |
| `voix_off.mp3` | Voix off seule (normalisée à -15 LUFS) |
| `tiktok_acte3.mp4` | Vidéo finale (H.264 + AAC) |
| `script_voix_off.txt` | Texte exact lu par la voix |
| `timings.txt` | Minutage de chaque phrase (pour vérifier la synchronisation) |
| `photos/` | Photos de fond et `CREDITS.md` (auteur, licence, lien) |

## Relancer

```bash
sudo apt-get install -y ffmpeg espeak-ng mbrola-fr1   # installés automatiquement si absents
pip install numpy pillow
python3 montage_tiktok.py                # voix hors ligne (espeak-ng + MBROLA)
python3 montage_tiktok.py --tts edge     # voix neuronale Microsoft (internet requis), bien plus naturelle
python3 montage_tiktok.py --preview 5 20 # aperçus PNG uniquement (débogage rapide)

# Voix externe (version publiée) : script complet lu d'une traite (ElevenLabs/vidIQ),
# accéléré de 8 %, puis découpé automatiquement en phrases
ffmpeg -i voix_off_source_elevenlabs.mp3 -af atempo=1.08 voix_fast.wav
python3 montage_tiktok.py --voice-file voix_fast.wav
```

Pour modifier le texte, éditez la liste `SEGMENTS` :
- `voice` : ce qui est lu, avec les nombres en toutes lettres ;
- `sub` : le sous-titre ;
- `big` et `small` : le chiffre clé et le bandeau ;
- `pal` : la couleur de la séquence ;
- `PHOTO_ORDER` / `PHOTOS` : la photo de fond de chaque séquence et son crédit. Pour ajouter tes propres photos, dépose un `.jpg` dans `photos/` et ajoute une entrée.

## Choix techniques

- **Pillow + pipe FFmpeg** plutôt que MoviePy : plus rapide et sans dépendance fragile. Chaque image est dessinée puis envoyée directement à l'encodeur.
- **Découpage d'une voix externe** : les pauses sont détectées, puis on choisit par programmation dynamique celles qui tombent le plus près de la position attendue de chaque fin de phrase (calculée d'après le nombre de caractères). Les pauses internes sont raccourcies à 0,22 s.
- **Une phrase = un fichier TTS** : on connaît la durée exacte de chaque phrase, ce qui donne une synchronisation parfaite des cartes. Dans une phrase, les mots du karaoké sont répartis selon le nombre de lettres.
- **Musique synthétisée** (NumPy) : une nappe et une pulsation à 100 BPM, donc libres de droits. Elle est mixée très bas (-20 dB) et passe en *ducking* (sidechain) sous la voix. La sortie audio est en stéréo, pour une compatibilité maximale avec les lecteurs mobiles.
- **Zone utile TikTok** : les sources sont affichées en haut, et les sous-titres à 74 % de la hauteur pour éviter l'interface de l'appli.
