# TikTok : « Ils veulent interdire La France Insoumise »

Vidéo verticale 1080×1920 de 50,9 s, en 30 images par seconde, générée entièrement par `montage_lfi.py` (Python, Pillow, NumPy et FFmpeg).

**Relancer la génération :**
```bash
ffmpeg -i voix_off_source_elevenlabs.mp3 -af atempo=1.06 build/voix_fast.wav
python3 montage_lfi.py --voice-file build/voix_fast.wav
```

**Contenu du dossier :**
- `tiktok_lfi_dissolution.mp4` : la vidéo finale.
- `voix_off_lfi.mp3` : la voix off seule.
- `script_voix_off_lfi.txt` : le texte découpé par séquence.
- `timings.txt` : le minutage de chaque séquence.

**Sources des déclarations citées :**
- TF1 Info (20/10/2026) : Gérard Larcher estime que la question de l'interdiction de LFI doit être « posée » et accuse le parti d'avoir « alimenté un discours de haine ».
- BFM TV (début octobre 2026) : Bruno Retailleau dit que « la question de l'interdiction de LFI se pose ».
- franceinfo, LCP et Le Point (octobre 2026) reprennent ces propositions.
