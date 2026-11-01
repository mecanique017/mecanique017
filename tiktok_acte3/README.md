# TikTok : Acte III contre la vie chère (31/10/2026)

Vidéo verticale 1080×1920, 30 fps, d'environ 50 s, générée entièrement par script.

| Fichier | Rôle |
|---|---|
| `montage_tiktok.py` | Script complet : rédaction, voix off, musique, rendu des images, mixage, encodage |
| `voix_off.mp3` | Voix off seule (normalisée à -15 LUFS) |
| `tiktok_acte3.mp4` | Vidéo finale (H.264 + AAC) |
| `script_voix_off.txt` | Texte exact lu par la voix |
| `timings.txt` | Minutage de chaque phrase (pour vérifier la synchronisation) |

## Relancer

```bash
sudo apt-get install -y ffmpeg espeak-ng mbrola-fr1   # installés automatiquement si absents
pip install numpy pillow
python3 montage_tiktok.py                # voix hors ligne (espeak-ng + MBROLA)
python3 montage_tiktok.py --tts edge     # voix neuronale Microsoft (internet requis), bien plus naturelle
python3 montage_tiktok.py --preview 5 20 # aperçus PNG uniquement (débogage rapide)
```

Pour modifier le texte, éditez la liste `SEGMENTS` :
- `voice` : ce qui est lu, avec les nombres en toutes lettres ;
- `sub` : le sous-titre ;
- `big` et `small` : le chiffre clé et le bandeau ;
- `pal` : la couleur de la séquence.

## Choix techniques

- **Pillow + pipe FFmpeg** plutôt que MoviePy : plus rapide et sans dépendance fragile. Chaque image est dessinée puis envoyée directement à l'encodeur.
- **Une phrase = un fichier TTS** : on connaît la durée exacte de chaque phrase, ce qui donne une synchronisation parfaite des cartes. Dans une phrase, les mots du karaoké sont répartis selon le nombre de lettres.
- **Musique synthétisée** (NumPy) : une nappe et une pulsation à 100 BPM, donc libres de droits. Elle passe en *ducking* (sidechain) sous la voix.
- **Zone utile TikTok** : les sources sont affichées en haut, et les sous-titres à 74 % de la hauteur pour éviter l'interface de l'appli.
