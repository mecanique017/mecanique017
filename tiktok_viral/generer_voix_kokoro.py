"""Voix off gratuite et hors ligne : Kokoro (voix française « ff_siwis »).
Une phrase par séquence, séparées par 1 s de silence -> build/voix_kokoro.wav.
Modèles : github.com/thewh1teagle/kokoro-onnx/releases (kokoro-v1.0.onnx + voices-v1.0.bin) dans ./voix/"""
import importlib.util, os, sys, wave
import numpy as np
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
VOIX = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "voix")
spec = importlib.util.spec_from_file_location("m", os.path.join(HERE, "montage_viral.py"))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
k = Kokoro(os.path.join(VOIX, "kokoro-v1.0.onnx"), os.path.join(VOIX, "voices-v1.0.bin"))
parts, sr = [], 24000
for seg in m.SEGMENTS:
    audio, sr = k.create(seg["voice"], voice="ff_siwis", speed=1.08, lang="fr-fr")
    parts += [audio.astype(np.float32), np.zeros(int(1.0 * sr), np.float32)]
y = np.concatenate(parts)
y = y / (np.max(np.abs(y)) + 1e-9) * 0.9
with wave.open(os.path.join(HERE, "build", "voix_kokoro.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((y * 32767).astype(np.int16).tobytes())
print("ok", round(len(y) / sr, 1), "s")
