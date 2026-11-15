"""Voix off avec TA voix clonée (accord donné par l'utilisateur, enregistrement du 15/11/2026).
Modèle : Chatterbox multilingue (Resemble AI, licence MIT), sur CPU, avec tatouage audio Perth conservé.
Même sortie que generer_voix_edge.py : <projet>/build/voix_edge.wav (une séquence par entrée de SEGMENTS, 1 s de silence entre).

Fiabilisation (15/11/2026, après un marmonnement et une phrase coupée) :
  - le texte de chaque séquence est découpé en phrases, générées une par une (le modèle déraille sur les longs textes) ;
  - chaque phrase est contrôlée : trop courte (coupée) ou trop longue (marmonnement) => nouvel essai, 3 au maximum ;
  - le son faible qui traîne après la dernière syllabe est coupé.

Usage :  <python du venv> voix_perso/generer_voix_clone.py tiktok_xxx/montage_xxx.py [référence.wav]
Référence par défaut : voix_perso/ref/ref_ma_voix.wav (NON versionnée : le dépôt est public).
Installation (une fois par session) : voir voix_perso/README.md.
Compter environ 5 à 6 s de calcul par seconde de voix générée."""
import importlib.util, os, re, sys, time
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

SR = 24000
CHARS_PAR_S = 14.0            # débit moyen mesuré sur ta voix clonée
PAUSE_PHRASE = 0.22           # respiration entre deux phrases d'une même séquence (s)
tts = ChatterboxMultilingualTTS.from_pretrained(device="cpu")


def phrases(texte):
    """Découpe en phrases (. ? ! : ;), en regroupant les très courtes avec la suivante."""
    bouts = [b.strip() for b in re.split(r"(?<=[.?!:;])\s+", texte) if b.strip()]
    out = []
    for b in bouts:
        if out and len(out[-1]) < 25:
            out[-1] += " " + b
        else:
            out.append(b)
    return out


def couper_traine(x):
    """Coupe le silence / marmonnement après la dernière syllabe nette (fenêtres de 50 ms)."""
    win = SR // 20
    n = len(x) // win
    if n < 3:
        return x
    rms = np.array([np.sqrt((x[k * win:(k + 1) * win] ** 2).mean()) for k in range(n)])
    seuil = 0.18 * np.percentile(rms, 95)
    fort = np.where(rms > seuil)[0]
    if len(fort) == 0:
        return x
    fin = min(len(x), (fort[-1] + 1) * win + int(0.12 * SR))
    debut = max(0, fort[0] * win - int(0.05 * SR))
    y = x[debut:fin].copy()
    fade = int(0.04 * SR)
    y[-fade:] *= np.linspace(1, 0, fade)
    return y


def generer_phrase(txt, graine):
    """Génère une phrase avec contrôle de durée ; garde le meilleur des essais."""
    attendu = max(1.2, len(txt) / CHARS_PAR_S)
    meilleur, ecart_min = None, 1e9
    for essai in range(3):
        torch.manual_seed(graine + 101 * essai)
        wav = tts.generate(txt, language_id="fr", audio_prompt_path=ref, exaggeration=0.55, cfg_weight=0.45)
        x = couper_traine(wav[0].numpy().astype(np.float32))
        ratio = (len(x) / SR) / attendu
        ecart = abs(np.log(ratio))
        if ecart < ecart_min:
            meilleur, ecart_min = x, ecart
        if 0.65 <= ratio <= 1.45:                # durée plausible : ni coupée, ni marmonnement
            break
        print(f"     essai {essai + 1} rejeté (durée x{ratio:.2f}) : « {txt[:40]}… »", flush=True)
    return meilleur


parts, t0 = [], time.time()
for i, seg in enumerate(m.SEGMENTS):
    out = os.path.join(projet, "build", "clone", f"s{i:02d}.wav")
    if not os.path.exists(out):                          # reprise possible si le calcul est interrompu
        morceaux = []
        for j, ph in enumerate(phrases(seg["voice"])):
            morceaux += [generer_phrase(ph, 17 + 31 * i + j), np.zeros(int(PAUSE_PHRASE * SR), np.float32)]
        ta.save(out, torch.from_numpy(np.concatenate(morceaux[:-1]))[None], SR)
    w, sr = ta.load(out)
    if sr != SR:
        w = ta.functional.resample(w, sr, SR)
    parts += [(w[0].numpy() * 32767).clip(-32768, 32767).astype(np.int16), np.zeros(SR, np.int16)]
    print(f"  {i + 1}/{len(m.SEGMENTS)}  ({time.time() - t0:.0f} s)", flush=True)

with wave.open(os.path.join(projet, "build", "voix_edge.wav"), "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes(np.concatenate(parts).tobytes())
print("ok", len(m.SEGMENTS), "séquences ->", os.path.join(projet, "build", "voix_edge.wav"))
