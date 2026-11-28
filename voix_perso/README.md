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

## Netteté de la voix (correctifs du 21/11/2026, 5 experts)
1. **Référence nettoyée** (le clone recopiait le souffle de l'enregistrement vidéo, -14,5 dB de souffle aigu) :
```
ffmpeg -i voix_perso/ref/ref_ma_voix.wav -af "highpass=f=80,afftdn=nr=20:nf=-55:tn=1,equalizer=f=6950:t=q:w=8:g=-12,lowpass=f=11000" voix_perso/ref/ref_ma_voix_clean.wav
```
   Le générateur l'utilise automatiquement si elle existe.
2. **DeepFilterNet3** (débruiteur IA, MIT/Apache) appliqué à chaque phrase, atténuation limitée à 18 dB. Facultatif, installé dans `voix_perso/df/` (hors dépôt) :
```
V=/tmp/voixclone; D=voix_perso/df; mkdir -p $D/DeepFilterNet3/checkpoints
$V/bin/pip download --no-deps -d /tmp/dl deepfilternet deepfilterlib
$V/bin/python -m pip install --no-deps --target $D/dflib /tmp/dl/DeepFilterLib-*.tar.gz /tmp/dl/deepfilternet-*.whl
$V/bin/python -m pip install --target $D/dfdeps appdirs loguru
curl -L -o $D/DeepFilterNet3/config.ini https://huggingface.co/fal/DeepFilterNet3/resolve/main/config.ini
curl -L -o $D/DeepFilterNet3/model.safetensors https://huggingface.co/fal/DeepFilterNet3/resolve/main/model.safetensors
$V/bin/python -c "from safetensors.torch import load_file;import torch;torch.save(load_file('$D/DeepFilterNet3/model.safetensors'),'$D/DeepFilterNet3/checkpoints/model_120.ckpt.best')"
```
3. **Crête à -1 dBFS** avant enregistrement de chaque séquence (plus de craquements d'écrêtage).
4. Côté moteur de montage : chaîne voix douce (débruitage léger, porte, de-esser, loudnorm en deux passes), musique et effets baissés sous la voix, plus de grésillement aux extraits, master -14 LUFS / -2 dBTP en 48 kHz, AAC 256 kb/s.
5. Le mieux reste un **nouvel enregistrement de référence** : 20 à 30 s, mémo vocal (pas une vidéo), pièce calme, téléphone à 15-20 cm.

## Utilisation
```
/tmp/voixclone/bin/python voix_perso/generer_voix_clone.py tiktok_xxx/montage_xxx.py
python3 tiktok_xxx/montage_xxx.py --voice-file tiktok_xxx/build/voix_edge.wav
```

## Sur TikTok
TikTok demande d'indiquer les contenus réalistes générés par IA : active le réglage **« Contenu généré par l'IA »** au moment de publier.
