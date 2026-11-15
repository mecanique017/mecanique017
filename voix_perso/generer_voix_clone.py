"""Voix off avec TA voix clonée (accord donné par l'utilisateur, enregistrement du 15/11/2026).
Modèle : Chatterbox multilingue (Resemble AI, licence MIT), sur CPU, avec tatouage audio Perth conservé.
Même sortie que generer_voix_edge.py : <projet>/build/voix_edge.wav (une phrase par séquence, 1 s de silence entre).

Usage :  <python du venv> voix_perso/generer_voix_clone.py tiktok_xxx/montage_xxx.py [référence.wav]
Référence par défaut : voix_perso/ref/ref_ma_voix.wav (NON versionnée : le dépôt est public).
Installation (une fois par session) : voir voix_perso/README.md.
Compter environ 5 à 6 s de calcul par seconde de voix générée."""
import importlib.util, os, sys, time
import numpy as np, torch, torchaudio as ta, wave
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

HERE = os.path.dirname(os.path.abspath(__file__))
montage = os.path.abspath(sys.argv[1])
ref = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "ref", "ref_ma_voix.wav")
if not os.path.exists(ref):
    sys.exit(f"Référence introuvable : {ref}. Renvoie ton enregistrement (voir voix_perso/README.md).")

spec = importlib.util.spec_from_file_location("m", montage)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
projet = os.path.dirname(montage)
os.makedirs(os.path.join(projet, "build", "clone"), exist_ok=True)

torch.manual_seed(17)                                    # rendu reproductible d'une génération à l'autre
tts = ChatterboxMultilingualTTS.from_pretrained(device="cpu")

parts, t0 = [], time.time()
for i, seg in enumerate(m.SEGMENTS):
    out = os.path.join(projet, "build", "clone", f"s{i:02d}.wav")
    if not os.path.exists(out):                          # reprise possible si le calcul est interrompu
        wav = tts.generate(seg["voice"], language_id="fr", audio_prompt_path=ref,
                           exaggeration=0.55, cfg_weight=0.45)    # un peu plus expressif, débit un peu plus vif
        ta.save(out, wav, tts.sr)
    w, sr = ta.load(out)
    if sr != 24000:
        w = ta.functional.resample(w, sr, 24000)
    parts += [(w[0].numpy() * 32767).clip(-32768, 32767).astype(np.int16), np.zeros(24000, np.int16)]
    print(f"  {i + 1}/{len(m.SEGMENTS)}  ({time.time() - t0:.0f} s)", flush=True)

with wave.open(os.path.join(projet, "build", "voix_edge.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(24000)
    f.writeframes(np.concatenate(parts).tobytes())
print("ok", len(m.SEGMENTS), "séquences ->", os.path.join(projet, "build", "voix_edge.wav"))
