# Voix off avec ta voix clonée

Clone de la voix de l'utilisateur, à sa demande et avec son accord (enregistrement vidéo du 15/11/2026, accord donné à voix haute).

- Modèle : **Chatterbox multilingue** (Resemble AI, licence MIT, usage commercial autorisé). Français pris en charge.
- Tourne sur CPU : environ **5 à 6 s de calcul par seconde de voix** (une voix off de 90 s ≈ 8 à 9 min).
- Le tatouage audio invisible **Perth** reste actif : il marque l'audio comme généré par IA.
- Mesure du test : hauteur moyenne de ta voix 110 Hz, clone 105 Hz ; texte restitué mot pour mot.

## Sécurité
Le dépôt GitHub est **public** : l'enregistrement de référence (`ref/`) est exclu de git. Garde ton fichier d'origine ; il faudra le renvoyer dans une nouvelle session si la machine a été réinitialisée.

## Installation (une fois par session)
Réseau requis : `huggingface.co`, `us.aws.cdn.hf.co`, `cdn-lfs.hf.co` (déjà autorisés dans l'environnement « Par défaut »).
```
python3 -m venv /tmp/voixclone && /tmp/voixclone/bin/pip install chatterbox-tts "setuptools<81"
```
Puis préparer la référence à partir de ton enregistrement :
```
ffmpeg -i ton_enregistrement.MOV -vn -af "highpass=f=70,silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-18:TP=-2" -ar 24000 -ac 1 voix_perso/ref/ref_ma_voix.wav
```

## Utilisation
```
/tmp/voixclone/bin/python voix_perso/generer_voix_clone.py tiktok_xxx/montage_xxx.py
python3 tiktok_xxx/montage_xxx.py --voice-file tiktok_xxx/build/voix_edge.wav
```

## Sur TikTok
TikTok demande d'indiquer les contenus réalistes générés par IA : active le réglage **« Contenu généré par l'IA »** au moment de publier.
