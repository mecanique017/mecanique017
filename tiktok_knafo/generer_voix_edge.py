"""Voix off neuronale gratuite : edge-tts (voix Microsoft « fr-FR-HenriNeural »).
Une phrase par séquence, 1 s de silence entre chaque -> build/voix_edge.wav.
Nécessite l'accès réseau à speech.platform.bing.com. Usage : python3 generer_voix_edge.py [voix] [débit]"""
import asyncio, importlib.util, os, subprocess, sys
import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = sys.argv[1] if len(sys.argv) > 1 else "fr-FR-HenriNeural"
RATE = sys.argv[2] if len(sys.argv) > 2 else "+8%"
spec = importlib.util.spec_from_file_location("m", os.path.join(HERE, "montage_knafo.py"))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
tmp = os.path.join(HERE, "build", "edge"); os.makedirs(tmp, exist_ok=True)

async def main():
    files = []
    for i, seg in enumerate(m.SEGMENTS):
        mp3 = os.path.join(tmp, f"s{i:02d}.mp3")
        await edge_tts.Communicate(seg["voice"], VOICE, rate=RATE, proxy=os.environ.get("HTTPS_PROXY")).save(mp3)
        files.append(mp3)
    import numpy as np, wave
    parts = []
    for p in files:                                  # décodage puis assemblage en NumPy (1 s de silence entre phrases)
        raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", p, "-ac", "1", "-ar", "24000", "-f", "s16le", "-"],
                             capture_output=True, check=True).stdout
        parts += [np.frombuffer(raw, np.int16), np.zeros(24000, np.int16)]
    with wave.open(os.path.join(HERE, "build", "voix_edge.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000)
        w.writeframes(np.concatenate(parts).tobytes())
    print("ok", len(files), "séquences")

asyncio.run(main())
