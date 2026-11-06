"""Voix off gratuite et hors ligne : Piper (voix « Gilles », fr). Une phrase par séquence, séparées par 1 s de silence."""
import importlib.util, subprocess, wave, numpy as np, sys
spec = importlib.util.spec_from_file_location('m', '/home/user/mecanique017/tiktok_sondage/montage_sondage.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
model = 'voix/fr-gilles-low.onnx'
parts = []
for i, seg in enumerate(m.SEGMENTS):
    out = f'/home/user/mecanique017/tiktok_sondage/build/piper_{i:02d}.wav'
    subprocess.run([sys.executable, '-m', 'piper', '-m', model, '--length-scale', '0.95', '-f', out], input=seg['voice'].encode(), capture_output=True, check=True)
    with wave.open(out) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16)
    parts += [x, np.zeros(int(1.0 * sr), np.int16)]
y = np.concatenate(parts)
with wave.open('/home/user/mecanique017/tiktok_sondage/build/voix_piper.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.tobytes())
print('ok', len(y) / sr, sr)
