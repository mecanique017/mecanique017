#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Montage TikTok automatisé — « Le programme du RN, déboisé » (1 min 30, satire sourcée)
=====================================================================================

Langage : Python 3 (Pillow + NumPy) + FFmpeg (mixage + encodage).
Format  : 1080x1920 (9:16), 30 fps, H.264 + AAC stéréo -> `tiktok_programme_rn_deboise.mp4`

Pipeline :
  1. VOIX OFF   : voix neuronale (ElevenLabs via vidIQ) lue d'une traite, accélérée de 8 %,
                  puis découpée automatiquement en séquences (alignement sur des durées de
                  référence espeak-ng) -> `voix_off_rn_aberrations.mp3`
  2. MUSIQUE    : piste tendue et progressive générée en NumPy (basse pulsée 110 BPM, kick et
                  charleston qui entrent au fil de la vidéo, montée avant « 2027 »)
  3. SFX        : whoosh à chaque séquence, swish à chaque groupe de mots, impacts graves
                  (« boom ») synchronisés sur les mots-clés (interdire, dissoudre, peur, 2027, voter…)
  4. IMAGES     : texte cinétique mot par mot (pop), mots-clés surlignés jaune / encadrés rouge,
                  fonds animés (dégradé, faisceau lumineux, braises, mot géant en filigrane),
                  zoom lent alterné, transitions glitch + flash, secousses d'écran
  5. MIXAGE     : voix devant, musique + SFX en ducking (sidechain), limiteur, stéréo

Usage :
  python3 montage_rn.py --voice-file build/voix_fast.wav             # rendu complet
  python3 montage_rn.py --voice-file build/voix_fast.wav --preview 2 10 30
"""

import argparse
import math
import os
import re
import shutil
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# 0. CONFIGURATION
# ---------------------------------------------------------------------------
W, H, FPS, SR = 1080, 1920, 30, 44100
GAP, INTRO_PAD, OUTRO_PAD = 0.50, 0.15, 1.8

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
OUT_AUDIO = os.path.join(HERE, "voix_off_rn_aberrations.mp3")
OUT_VIDEO = os.path.join(HERE, "tiktok_programme_rn_deboise.mp4")

FONT_BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
FONT_BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FONT_XBOLD = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FONT_EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
FONT_MONO = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-ExtraBold.ttf"

YELLOW = (255, 214, 0)
RED = (228, 20, 40)
WHITE = (255, 255, 255)
BG = {  # (centre, bord) des fonds dégradés
    "noir":  ((40, 8, 12), (0, 0, 0)),
    "rouge": ((95, 6, 16), (12, 0, 2)),
}

# ---------------------------------------------------------------------------
# 1. SCRIPT DÉCOUPÉ EN SÉQUENCES
#    voice : texte lu (nombres en toutes lettres)      sub : texte affiché
#    tag   : étiquette en haut de l'écran               bg  : fond     mark : filigrane géant
#    shake : secousse légère pendant toute la séquence
#    Mots-clés : *mot* = surligné jaune ; **mot** = encadré rouge + impact sonore
# ---------------------------------------------------------------------------
SEGMENTS = [
    # ===== LE MYTHE =====
    dict(voice="Le Rassemblement national se peint en champion des pauvres.",
         sub="Le Rassemblement national se peint en *champion* *des* *pauvres*.",
         tag="LE MYTHE", bg="noir", mark="RN", gag=dict(kind="emoji", e="🎭", anim="bounce", sfx="chuckle")),
    dict(voice="Mais dès qu'on gratte un peu… c'est le grand vide. Et le service après-vente du MEDEF !",
         sub="Mais dès qu'on gratte un peu… c'est le grand *VIDE*. Et le service après-vente du *MEDEF* !",
         tag="LE MYTHE", bg="rouge", mark="SAV", gag=dict(kind="receipt", sfx="kaching")),
    dict(voice="Parlons de leur programme, et de leurs contradictions lunaires.",
         sub="Parlons de leur programme, et de leurs contradictions *lunaires*.",
         tag="LE MYTHE", bg="noir", mark="?!", gag=dict(kind="emoji", e="🌙🚀", anim="float", sfx="chuckle")),
    # ===== GAG N°1 : LE FISCAL =====
    dict(voice="Premier gag : la crédibilité économique.",
         sub="Premier gag : la crédibilité **ÉCONOMIQUE**.",
         tag="GAG N°1", bg="rouge", mark="N°1", gag=dict(kind="title", text="GAG N°1", sfx="rimshot")),
    dict(voice="Leur programme ? Soixante et onze milliards d'euros de déficit en plus chaque année, selon l'Institut Montaigne.",
         sub="Leur programme ? *+71* *milliards* d'euros de déficit en plus chaque année, selon l'Institut Montaigne.",
         tag="GAG N°1", bg="noir", mark="€", gag=dict(kind="counter", n=71, fmt="+{} Md€ / an", e="📉", sfx="tick"),
         source="Institut Montaigne — chiffrage du programme RN (législatives 2024)"),
    dict(voice="Des économies fantômes, des affichages magiques… même les économistes n'y croient pas.",
         sub="Des économies *fantômes*, des affichages *magiques*… même les *économistes* n'y croient pas.",
         tag="GAG N°1", bg="rouge", mark="???", gag=dict(kind="emoji", e="👻🪄", anim="float", sfx="ghost"),
         source="La Grande Conversation · Revue Politique et Parlementaire (contre-budget RN)"),
    dict(voice="Et quand il faut passer aux actes, à l'Assemblée ? Ne cherchez plus personne.",
         sub="Et quand il faut passer aux actes, à l'Assemblée ? Ne cherchez plus *personne*.",
         tag="GAG N°1", bg="noir", mark="…", beat=1.0, gag=dict(kind="emoji", e="🦗", anim="hop", sfx="crickets")),
    dict(voice="Seize octobre. Retour de l'ISF ? Le RN vote contre.",
         sub="16 octobre. Retour de l'**ISF** ? Le RN vote *contre*.",
         tag="À L'ASSEMBLÉE", bg="rouge", mark="ISF",
         gag=dict(kind="vote", title="Rétablir l'ISF", scrutin="Scrutin n°8870 · 16/10/2026", rn="RN : 29 CONTRE", sfx="buzzer"),
         source="Assemblée nationale — scrutin public n°8870 (PLF 2027)"),
    dict(voice="La taxe Zucman sur les ultra-riches ? Le RN vote encore contre.",
         sub="La taxe **ZUCMAN** sur les ultra-riches ? Le RN vote *encore* *contre*.",
         tag="À L'ASSEMBLÉE", bg="noir", mark="2%",
         gag=dict(kind="vote", title="Taxe Zucman (2 % > 100 M€)", scrutin="Scrutin n°8859 · 16/10/2026", rn="RN : 37 CONTRE", sfx="buzzer"),
         source="Assemblée nationale — scrutin public n°8859 (PLF 2027)"),
    dict(voice="Quand il s'agit de protéger les milliardaires, y a plus de patriotes !",
         sub="Quand il s'agit de protéger les *milliardaires*, y a plus de **PATRIOTES** !",
         tag="À L'ASSEMBLÉE", bg="rouge", mark="€€€", beat=0.7, gag=dict(kind="rain", e="💸", sfx="scratch")),
    # ===== GAG N°2 : LES RÉTROPÉDALAGES =====
    dict(voice="Deuxième aberration : les rétropédalages en série.",
         sub="Deuxième aberration : les *rétropédalages* en série.",
         tag="GAG N°2", bg="noir", mark="N°2", gag=dict(kind="rewind", sfx="rewind")),
    dict(voice="Abroger la réforme des retraites ? Promis… puis, « dans un second temps ».",
         sub="Abroger la réforme des *retraites* ? Promis… puis, « dans *un* *second* *temps* ».",
         tag="GAG N°2", bg="rouge", mark="64", beat=0.9,
         gag=dict(kind="quote", text="« dans un second temps »", who="J. Bardella, juin 2024", sfx="trombone"),
         source="L'Express · Le Parisien (juin 2024)"),
    dict(voice="Le pouvoir d'achat ? Ça change d'avis selon la météo médiatique.",
         sub="Le pouvoir d'achat ? Ça change d'avis selon la *météo* *médiatique*.",
         tag="GAG N°2", bg="noir", mark="MÉTÉO", gag=dict(kind="carousel", e="☀️🌧️🌪️🌈", sfx="chuckle")),
    dict(voice="Ils surfent sur la colère de la vie chère, pour un projet qui ne touche pas un cheveu du CAC quarante.",
         sub="Ils surfent sur la colère de la *vie* *chère*, pour un projet qui ne touche pas un cheveu du **CAC** **40**.",
         tag="GAG N°2", bg="rouge", mark="CAC", gag=dict(kind="emoji", e="🏄📈", anim="surf", sfx="whoosh")),
    # ===== LA VÉRITÉ (sérieux) =====
    dict(voice="Leur seule vraie mesure, c'est la division. La haine de l'autre, pour masquer le vide de leur projet social.",
         sub="Leur seule vraie mesure, c'est la **DIVISION**. La *haine* *de* *l'autre*, pour masquer le vide de leur projet social.",
         tag="LA VÉRITÉ", bg="noir", mark="404", serious=True, gag=dict(kind="error404", sfx="glitch")),
    dict(voice="Ne vous faites pas avoir.",
         sub="Ne vous faites pas **AVOIR**.",
         tag="LA VÉRITÉ", bg="rouge", mark="!", serious=True, shake=True, gag=None),
    dict(voice="La vraie rupture face à l'austérité, elle est à gauche. Pas dans l'imposture brune.",
         sub="La vraie rupture face à l'austérité, elle est à *gauche*. Pas dans l'**IMPOSTURE** brune.",
         tag="LA VÉRITÉ", bg="noir", mark="2027", serious=True, gag=dict(kind="cta")),
]

# Longueur « parlée » des mots affichés différemment de leur lecture (pour le minutage)
SPOKEN = {"*+71*": "soixante et onze", "+71": "soixante et onze", "16": "seize", "40.": "quarante.", "40.**": "quarante."}


# ---------------------------------------------------------------------------
# 2. OUTILS AUDIO
# ---------------------------------------------------------------------------
def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"[ERREUR] {' '.join(cmd[:3])}…\n{r.stderr[-1500:]}")
    return r


def ensure_tools():
    """Installe ffmpeg / espeak-ng si absents (apt), sans bloquer le reste."""
    missing = [p for p in ("ffmpeg", "espeak-ng") if not shutil.which(p)]
    if missing:
        subprocess.run(["apt-get", "update", "-q"])
        subprocess.run(["apt-get", "install", "-y", "-q", "ffmpeg", "espeak-ng", "mbrola-fr1"])
    if not shutil.which("ffmpeg"):
        sys.exit("[ERREUR] FFmpeg introuvable : installez-le (apt install ffmpeg / brew install ffmpeg).")


def read_wav_mono(path):
    tmp = os.path.join(BUILD, "_tmp44k.wav")
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-sample_fmt", "s16", tmp])
    with wave.open(tmp) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768


def write_wav(path, x):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def trim_silence(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    return x[max(0, idx[0] - int(0.02 * SR)): idx[-1] + int(0.06 * SR)]


def shrink_pauses(x, max_pause=0.34, ratio=0.03):
    hop = int(0.01 * SR)
    peak = np.max(np.abs(x)) + 1e-9
    out, quiet = [], 0
    for i in range(0, len(x), hop):
        f = x[i:i + hop]
        if np.sqrt(np.mean(f ** 2)) < peak * ratio:
            quiet += 1
            if quiet * 0.01 > max_pause:
                continue
        else:
            quiet = 0
        out.append(f)
    return np.concatenate(out)


def reference_durations():
    """Durée de chaque séquence lue par espeak-ng : sert de référence pour l'alignement."""
    if not shutil.which("espeak-ng"):
        return [len(s["voice"]) for s in SEGMENTS]
    out = []
    for i, s in enumerate(SEGMENTS):
        p = os.path.join(BUILD, f"ref_{i:02d}.wav")
        run(["espeak-ng", "-v", "fr", "-s", "150", "-w", p, s["voice"]])
        out.append(len(trim_silence(read_wav_mono(p))) / SR)
    return out


def split_voice(path):
    """Découpe la voix (lue d'une traite) en une pièce par séquence.

    1) détection des pauses (RMS / 20 ms) ; 2) position attendue de chaque coupure d'après les
    durées de référence ; 3) programmation dynamique : on choisit N-1 pauses ordonnées qui
    collent au mieux aux positions attendues, en favorisant légèrement les pauses longues.
    """
    x = read_wav_mono(path)
    hop = int(0.02 * SR)
    rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    silent = rms < rms.max() * 0.03
    runs, st = [], None
    for i, s in enumerate(silent):
        if s and st is None:
            st = i
        elif not s and st is not None:
            runs.append((i - st, st, i))
            st = None
    speech = np.where(~silent)[0]
    runs = [r for r in runs if speech[0] < r[1] and r[2] < speech[-1] and r[0] * 0.02 >= 0.18]
    n = len(SEGMENTS)
    if len(runs) < n - 1:
        sys.exit(f"[ERREUR] {len(runs)} pauses trouvées, {n - 1} nécessaires")
    ref = np.array(reference_durations())
    s0, s1 = speech[0], speech[-1]
    expected = s0 + (s1 - s0) * np.cumsum(ref)[:-1] / ref.sum()
    mids = np.array([r[1] + r[0] / 2 for r in runs])
    durs = np.array([r[0] * 0.02 for r in runs])
    scale = (s1 - s0) / n * 0.35

    def cost(k, j):
        return ((mids[j] - expected[k]) / scale) ** 2 - 2.0 * durs[j]

    m = len(runs)
    dp = np.full((n - 1, m), 1e18)
    back = np.zeros((n - 1, m), int)
    dp[0] = [cost(0, j) for j in range(m)]
    for k in range(1, n - 1):
        best, arg = 1e18, -1
        for j in range(m):
            if j > 0 and dp[k - 1, j - 1] < best:
                best, arg = dp[k - 1, j - 1], j - 1
            if arg >= 0:
                dp[k, j] = best + cost(k, j)
                back[k, j] = arg
    j = int(np.argmin(dp[n - 2]))
    chosen = [j]
    for k in range(n - 2, 0, -1):
        j = back[k, j]
        chosen.append(j)
    cuts = sorted(int(mids[c]) * hop for c in chosen)
    bounds = [0] + cuts + [len(x)]
    return [shrink_pauses(trim_silence(x[a:b])) for a, b in zip(bounds[:-1], bounds[1:])]


def build_voiceover(voice_file):
    pieces = [np.zeros(int(INTRO_PAD * SR), np.float32)]
    t = INTRO_PAD
    for seg, x in zip(SEGMENTS, split_voice(voice_file)):
        seg["t0"], seg["t1"] = t, t + len(x) / SR
        gap = GAP + seg.get("beat", 0.0)          # « temps comique » après certaines phrases
        pieces += [x, np.zeros(int(gap * SR), np.float32)]
        t = seg["t1"] + gap
    pieces.append(np.zeros(int(OUTRO_PAD * SR), np.float32))
    voice = np.concatenate(pieces)
    raw, out = os.path.join(BUILD, "voice_raw.wav"), os.path.join(BUILD, "voice.wav")
    write_wav(raw, voice)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
         "highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,"
         "equalizer=f=3000:t=q:w=1.2:g=2,loudnorm=I=-15:TP=-1.5:LRA=7", "-ar", str(SR), out])
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", out, "-codec:a", "libmp3lame", "-b:a", "192k", OUT_AUDIO])
    return out, len(voice) / SR


# ---------------------------------------------------------------------------
# 3. MINUTAGE MOT PAR MOT
# ---------------------------------------------------------------------------
def parse_words(sub):
    """'*mot*' -> style 'hl' (jaune) ; '**MOT**' -> 'key' (encadré rouge + boom)."""
    out = []
    for tok in sub.split():
        style = "n"
        if "**" in tok:                       # marqueur n'importe où (ex. « l'**ISF** »)
            style, tok = "key", tok.replace("**", "")
        elif "*" in tok:
            style, tok = "hl", tok.replace("*", "")
        out.append((tok, style))
    return out


def prepare_timing():
    for seg in SEGMENTS:
        words = parse_words(seg["sub"])
        weights = [len(SPOKEN.get(w, w)) + 1 for w, _ in words]
        dur, tot = seg["t1"] - seg["t0"], sum(weights)
        t, wl = seg["t0"], []
        for (w, st), wt in zip(words, weights):
            wl.append(dict(word=w, style=st, t=t))
            t += dur * wt / tot
        # groupes d'écran : 6 mots max, coupure après ponctuation forte
        chunks, cur = [], []
        for w in wl:
            cur.append(w)
            if len(cur) >= 6 or w["word"][-1] in ".?!:" or (w["word"][-1] == "," and len(cur) >= 3):
                chunks.append(cur)
                cur = []
        if cur:
            chunks.append(cur)
        seg["words"], seg["chunks"] = wl, chunks


# ---------------------------------------------------------------------------
# 4. MUSIQUE (tendue, progressive) + EFFETS SONORES
# ---------------------------------------------------------------------------
RNG = np.random.default_rng(11)


def lowpass(x, a):
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def build_music(total, path):
    """Partie 1 (ironique) : basse « pizzicato » sautillante + claquements, 104 BPM.
    Partie 2 (« LA VÉRITÉ ») : bascule grave — nappe sombre, kick lent, plus de sautillement."""
    n = int(total * SR)
    t = np.arange(n) / SR
    bpm = 104
    beat = 60 / bpm
    t_ser = next(s["t0"] for s in SEGMENTS if s.get("serious")) - 0.3
    ser = np.clip((t - t_ser) / 1.2, 0, 1)                         # fondu vers le sérieux
    # basse sautillante : notes courtes (ré, fa, la, sol) en croches
    notes = [73.4, 87.3, 110.0, 98.0, 73.4, 110.0, 87.3, 65.4]
    step = beat / 2
    idx = (t // step).astype(int)
    f = np.array(notes)[idx % len(notes)]
    ph = (t % step)
    pizz = np.sin(2 * np.pi * f * t) * np.exp(-ph * 14) + 0.3 * np.sin(4 * np.pi * f * t) * np.exp(-ph * 22)
    # claquement sur les temps 2 et 4
    clap = np.zeros(n)
    cl = int(0.06 * SR)
    cn = np.diff(np.concatenate([[0], RNG.standard_normal(cl)])) * np.exp(-np.arange(cl) / SR * 70)
    for b_ in np.arange(beat, t_ser, 2 * beat):
        s_ = int(b_ * SR)
        clap[s_:s_ + cl] += cn[:max(0, min(cl, n - s_))]
    kick = np.zeros(n)
    kl = int(0.3 * SR)
    kt = np.arange(kl) / SR
    k = np.sin(2 * np.pi * (45 + 100 * np.exp(-kt * 30)) * kt) * np.exp(-kt * 10)
    for b_ in np.arange(0, total, beat):
        s_ = int(b_ * SR)
        g = 0.6 if b_ < t_ser else (1.0 if int(round(b_ / beat)) % 2 == 0 else 0.0)   # kick lent ensuite
        kick[s_:s_ + kl] += g * k[:max(0, min(kl, n - s_))]
    pad = sum(np.sin(2 * np.pi * fr * t) * a_ for fr, a_ in [(36.7, .5), (73.4, .3), (87.3, .2), (110, .1)])
    pad *= 0.7 + 0.3 * np.sin(2 * np.pi * 0.15 * t)
    mix = (1 - ser) * (0.55 * pizz + 0.25 * clap) + ser * 0.6 * pad + 0.55 * kick
    mix *= np.minimum(1, np.minimum(t / 0.8, (total - t) / 2.0))
    write_wav(path, mix / (np.max(np.abs(mix)) + 1e-9) * 0.9)


def sfx_boom(gain=1.0):
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (28 + 85 * np.exp(-t * 14)) * t) * np.exp(-t * 3.2)
    crack = np.convolve(RNG.standard_normal(n) * np.exp(-t * 40), np.ones(8) / 8, "same")
    return gain * np.tanh(1.6 * (sub + 0.6 * crack))


def sfx_whoosh(dur=0.36, gain=1.0):
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    noise = RNG.standard_normal(n)
    out = np.empty(n)
    y = 0.0
    for i in range(n):
        y += (0.02 + 0.4 * u[i]) * (noise[i] - y)
        out[i] = y
    return gain * 2.5 * out * np.sin(np.pi * u) ** 2


def sfx_swish(gain=1.0):
    n = int(0.12 * SR)
    u = np.linspace(0, 1, n)
    x = np.diff(np.concatenate([[0], RNG.standard_normal(n)]))
    return gain * x * np.sin(np.pi * u) ** 3 * 0.5


def sfx_riser(dur, gain=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 110 * 2 ** (3 * t / dur)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    noise = np.convolve(RNG.standard_normal(n), np.ones(5) / 5, "same")
    return gain * (t / dur) ** 2 * (0.6 * tone + 0.5 * noise)


def place(track, clip, t):
    s = int(t * SR)
    if s < 0:
        clip, s = clip[-s:], 0
    e = min(len(track), s + len(clip))
    if e > s:
        track[s:e] += clip[:e - s]


def tone(f, dur, shape="sin", vib=0.0):
    t = np.arange(int(dur * SR)) / SR
    ff = f * (1 + vib * np.sin(2 * np.pi * 5.5 * t)) if np.isscalar(f) else f
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(ff, t.shape)) / SR
    return np.sin(ph) if shape == "sin" else (2 * ((ph / (2 * np.pi)) % 1) - 1)


def sfx_buzzer():                       # buzzer « mauvaise réponse »
    x = tone(110, 0.55, "saw") * 0.5 + tone(116, 0.55, "saw") * 0.5
    return np.tanh(2 * x) * np.minimum(1, np.linspace(6, 0, len(x)))


def sfx_scratch():                      # disque rayé
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 300 + 900 * np.abs(np.sin(2 * np.pi * 4.5 * t))
    noise = np.convolve(RNG.standard_normal(n), np.ones(3) / 3, "same")
    return (0.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * noise) * np.exp(-t * 2)


def sfx_trombone():                     # trombone triste « wah-wah-wah-waaah »
    out = []
    for f, d in [(233, 0.32), (220, 0.32), (208, 0.32), (196, 0.9)]:
        x = tone(f, d, "saw", vib=0.02 if d > 0.5 else 0)
        env = np.minimum(1, np.linspace(0, 8, len(x))) * np.minimum(1, np.linspace(4, 0, len(x)) + 0.3)
        out.append(np.convolve(x * env, np.ones(10) / 10, "same") * 0.6)
    return np.concatenate(out)


def sfx_crickets(dur=1.6):              # criquets dans le silence
    t = np.arange(int(dur * SR)) / SR
    chirp = np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 28 * t) > 0.3)
    gate = ((t % 0.5) < 0.18)
    return 0.35 * chirp * gate


def sfx_rimshot():                      # « ba-dum-tss »
    def tom(f, d):
        t = np.arange(int(d * SR)) / SR
        return np.sin(2 * np.pi * f * t * (1 - 0.3 * t)) * np.exp(-t * 18)
    n = int(0.9 * SR)
    out = np.zeros(n)
    place(out, tom(180, 0.25), 0.0)
    place(out, tom(130, 0.25), 0.16)
    cym = np.diff(np.concatenate([[0], RNG.standard_normal(int(0.6 * SR))])) * np.exp(-np.arange(int(0.6 * SR)) / SR * 6)
    place(out, 0.35 * cym, 0.32)
    return out


def sfx_kaching():                      # caisse enregistreuse
    out = np.zeros(int(0.8 * SR))
    place(out, 0.5 * np.diff(np.concatenate([[0], RNG.standard_normal(int(0.05 * SR))])), 0.0)
    for f in (2093, 2637, 3136):
        t = np.arange(int(0.6 * SR)) / SR
        place(out, 0.25 * np.sin(2 * np.pi * f * t) * np.exp(-t * 6), 0.08)
    return out


def sfx_chuckle():                      # « rire étouffé » : 4 « hm » nasaux décroissants
    out = []
    for k in range(4):
        d = 0.11
        x = tone(150 - 8 * k, d, "saw")
        x = np.convolve(x, np.ones(25) / 25, "same") * np.sin(np.linspace(0, np.pi, len(x)))
        out += [x * (0.6 - 0.1 * k), np.zeros(int(0.06 * SR))]
    return np.concatenate(out)


def sfx_ghost():                        # « houuuu » de fantôme + paillettes magiques
    t = np.arange(int(1.2 * SR)) / SR
    f = 500 + 150 * np.sin(2 * np.pi * 1.2 * t) - 120 * t
    x = 0.35 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 1.2)
    for i in range(8):
        tt = np.arange(int(0.25 * SR)) / SR
        place(x, 0.12 * np.sin(2 * np.pi * (2500 + 300 * i) * tt) * np.exp(-tt * 15), 0.55 + i * 0.07)
    return x


def sfx_rewind():                       # cassette qui rembobine
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = 600 + 2200 * (t / t[-1]) ** 0.5
    return 0.35 * np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 30 * t)))


def sfx_pop():                          # « pop » des blocs de texte
    t = np.arange(int(0.07 * SR)) / SR
    return np.sin(2 * np.pi * (900 - 6000 * t) * t) * np.exp(-t * 60)


GAG_SFX = {"buzzer": sfx_buzzer, "scratch": sfx_scratch, "trombone": sfx_trombone, "crickets": sfx_crickets,
           "rimshot": sfx_rimshot, "kaching": sfx_kaching, "chuckle": sfx_chuckle, "ghost": sfx_ghost,
           "rewind": sfx_rewind, "whoosh": lambda: sfx_whoosh(0.5, 1.0), "glitch": lambda: sfx_swish(2.0),
           "tick": lambda: sfx_pop()}
GAG_DELAY = 0.55        # le gag visuel (et son bruitage) arrive 0,55 s après le début de la séquence


def build_sfx(total, path):
    tr = np.zeros(int(total * SR))
    for i, seg in enumerate(SEGMENTS):
        if i > 0:
            place(tr, sfx_whoosh(gain=0.45), seg["t0"] - 0.34)     # changement de plan
        for c in seg["chunks"][1:]:
            place(tr, sfx_pop() * 0.7, c[0]["t"] - 0.01)          # pop sur chaque bloc de texte
        for w in seg["words"]:
            if w["style"] == "key":
                place(tr, sfx_boom(gain=0.9), w["t"] + 0.02)      # impact sur les punchlines
        g = seg.get("gag")
        if g and g.get("sfx") in GAG_SFX:
            if g["sfx"] == "tick":                                  # compteur : un pop par palier
                for k in range(12):
                    place(tr, sfx_pop() * 0.5, seg["t0"] + GAG_DELAY + k * 0.07)
            else:
                gain = 0.9 if g["sfx"] in ("buzzer", "trombone", "scratch", "rimshot") else 0.7
                place(tr, GAG_SFX[g["sfx"]]() * gain, seg["t0"] + GAG_DELAY)
    write_wav(path, tr / (np.max(np.abs(tr)) + 1e-9) * 0.9)


# ---------------------------------------------------------------------------
# 5. RENDU DES IMAGES
# ---------------------------------------------------------------------------
_fonts = {}


def font(path, size):
    if (path, size) not in _fonts:
        _fonts[(path, size)] = ImageFont.truetype(path, size)
    return _fonts[(path, size)]


def ease_out(x):
    x = min(max(x, 0), 1)
    return 1 - (1 - x) ** 3


def ease_back(x):
    x = min(max(x, 0), 1)
    return 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2


_yy, _xx = np.mgrid[0:H, 0:W].astype(np.float32)
RADIAL = np.sqrt(((_xx - W / 2) / (W * 0.75)) ** 2 + ((_yy - H * 0.45) / (H * 0.6)) ** 2)[..., None]
DIAG = ((_xx * 0.6 + _yy * 0.8) / 1.0)[..., None]       # projection pour le faisceau lumineux
VIGN = np.clip(RADIAL - 0.55, 0, 1)
GRAIN = [np.random.default_rng(i).integers(-12, 12, (H // 4, W // 4, 1)).astype(np.int16) for i in range(6)]
EMBERS = np.random.default_rng(3).random((70, 4))       # x, y, vitesse, taille


def background(seg, i, local, dur, t):
    c_in, c_out = BG[seg["bg"]]
    r = np.clip(RADIAL, 0, 1)
    arr = np.array(c_in, np.float32) * (1 - r) + np.array(c_out, np.float32) * r
    # faisceau lumineux qui balaie l'écran
    pos = ((t * 260) % 3600) - 600
    beam = np.exp(-((DIAG - pos) / 140) ** 2) * 38
    arr = arr + beam * np.array([1.0, 0.35, 0.35], np.float32)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")
    # mot géant en filigrane (contour), zoom lent
    if seg.get("mark"):
        mk = mark_layer(seg["mark"])
        sc = 0.95 + 0.12 * (local / max(dur, 0.1))
        mw, mh = int(mk.width * sc), int(mk.height * sc)
        mk2 = mk.resize((mw, mh), Image.BILINEAR)
        img.alpha_composite(mk2, (int(W / 2 - mw / 2), int(H * 0.45 - mh / 2))) if mw <= W and mh <= H else \
            img.paste(mk2, (int(W / 2 - mw / 2), int(H * 0.45 - mh / 2)), mk2)
    # braises qui montent
    d = ImageDraw.Draw(img)
    for x, y, v, s in EMBERS:
        yy = (y * H - t * (60 + 140 * v)) % H
        xx = (x * W + 30 * math.sin(t * (0.5 + v) + x * 10)) % W
        rr = 2 + 4 * s
        a = int(90 + 120 * v)
        d.ellipse([xx - rr, yy - rr, xx + rr, yy + rr], fill=(255, 120 + int(80 * s), 40, a))
    # zoom lent alterné (in sur les séquences paires, out sur les impaires)
    k = local / max(dur, 0.1)
    z = 1.0 + (0.08 * k if i % 2 == 0 else 0.08 * (1 - k))
    if z > 1.001:
        cw, ch = int(W / z), int(H / z)
        img = img.crop(((W - cw) // 2, (H - ch) // 2, (W - cw) // 2 + cw, (H - ch) // 2 + ch)).resize((W, H), Image.BILINEAR)
    return img


_marks = {}


def mark_layer(text):
    if text not in _marks:
        f = font(FONT_BLACK, 420)
        tmp = Image.new("RGBA", (W * 2, 700), (0, 0, 0, 0))
        d = ImageDraw.Draw(tmp)
        d.text((W, 350), text, font=f, anchor="mm", fill=(255, 255, 255, 0), stroke_width=5,
               stroke_fill=(255, 255, 255, 48))
        bb = tmp.getbbox() or (0, 0, 1, 1)
        lay = tmp.crop(bb)
        if lay.width > W * 1.05:                   # filigrane trop large -> réduit
            r = W * 1.05 / lay.width
            lay = lay.resize((int(lay.width * r), int(lay.height * r)), Image.BILINEAR)
        _marks[text] = lay
    return _marks[text]


_word_cache = {}
WORD_SIZE = 104


def word_img(word, style):
    """Mot pré-rendu : blanc (n), jaune (hl), ou blanc sur pavé rouge (key)."""
    key = (word, style)
    if key in _word_cache:
        return _word_cache[key]
    f = font(FONT_BLACK, WORD_SIZE)
    tmp = Image.new("RGBA", (1400, 260), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    bb = d.textbbox((0, 0), word, font=f, stroke_width=8)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    ox, oy = 40 - bb[0], 60 - bb[1]
    if style == "key":
        d.rounded_rectangle([ox + bb[0] - 22, oy + bb[1] - 14, ox + bb[2] + 22, oy + bb[3] + 14], radius=16, fill=RED + (255,))
        d.text((ox, oy), word, font=f, fill=WHITE, stroke_width=0)
    else:
        col = YELLOW if style == "hl" else WHITE
        d.text((ox + 6, oy + 8), word, font=f, fill=(0, 0, 0, 160))            # ombre
        d.text((ox, oy), word, font=f, fill=col, stroke_width=8, stroke_fill=(0, 0, 0))
    img = tmp.crop(tmp.getbbox())
    _word_cache[key] = img
    return img


def layout_chunk(chunk):
    """Place les mots du groupe en lignes centrées ; renvoie [(mot, x_centre, y_centre)]."""
    gap = 26
    imgs = [word_img(w["word"], w["style"]) for w in chunk]
    lines, cur, cw = [], [], 0
    for w, im in zip(chunk, imgs):
        if cur and cw + gap + im.width > W - 110:
            lines.append(cur)
            cur, cw = [], 0
        cur.append((w, im))
        cw += (gap if len(cur) > 1 else 0) + im.width
    if cur:
        lines.append(cur)
    lh = 150
    y0 = H * 0.36 - (len(lines) - 1) * lh / 2
    out = []
    for li, line in enumerate(lines):
        tw = sum(im.width for _, im in line) + gap * (len(line) - 1)
        x = W / 2 - tw / 2
        for w, im in line:
            out.append((w, im, x + im.width / 2, y0 + li * lh))
            x += im.width + gap
    return out


def seg_at(t):
    for i, s in enumerate(SEGMENTS):
        if i + 1 == len(SEGMENTS) or t < SEGMENTS[i + 1]["t0"]:
            return i, s



# ---------------------------------------------------------------------------
# 5 bis. GAGS VISUELS (emojis animés, cartes de vote, ticket, rembobinage, 404…)
# ---------------------------------------------------------------------------
_emo = {}


def emoji_img(e, size):
    key = (e, size)
    if key not in _emo:
        f = ImageFont.truetype(FONT_EMOJI, 109)
        tmp = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
        ImageDraw.Draw(tmp).text((80, 80), e, font=f, embedded_color=True, anchor="mm")
        im = tmp.crop(tmp.getbbox() or (0, 0, 1, 1))
        r = size / max(im.width, im.height)
        _emo[key] = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    return _emo[key]


def split_emojis(s):
    out, cur = [], ""
    for ch in s:
        if ord(ch) in (0xFE0F, 0x200D) and cur:
            cur += ch
        else:
            if cur:
                out.append(cur)
            cur = ch
    if cur:
        out.append(cur)
    return out


def paste_c(img, im, cx, cy, rot=0.0, scale=1.0):
    if scale != 1.0:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.BILINEAR)
    if rot:
        im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    img.paste(im, (int(cx - im.width / 2), int(cy - im.height / 2)), im)


def card(img, box, fill=(250, 250, 245), outline=None, radius=24):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    d.rounded_rectangle([x0 + 10, y0 + 12, x1 + 10, y1 + 12], radius=radius, fill=(0, 0, 0, 120))   # ombre
    d.rounded_rectangle(box, radius=radius, fill=fill + (255,), outline=outline, width=6 if outline else 0)
    return d


def draw_gag(img, seg, local, t):
    g = seg.get("gag")
    if not g:
        return
    lt = local - GAG_DELAY
    if lt < 0:
        return
    k = ease_back(lt / 0.35)                      # entrée « pop »
    cy = H * 0.66
    kind = g["kind"]
    if kind in ("emoji", "rain", "carousel"):
        es = split_emojis(g["e"])
        if kind == "rain":                         # pluie de billets
            for n in range(14):
                x = (n * 97 + 40) % W
                y = -150 + ((lt * (500 + 60 * (n % 4)) + n * 130) % (H + 300))
                paste_c(img, emoji_img(es[0], 120), x, y, rot=25 * math.sin(lt * 4 + n))
            return
        if kind == "carousel":                     # la « météo » qui tourne
            for n, e in enumerate(es):
                a = lt * 2.4 + n * 2 * math.pi / len(es)
                paste_c(img, emoji_img(e, 170), W / 2 + 260 * math.cos(a), cy + 110 * math.sin(a), scale=max(k, 0.05))
            return
        for n, e in enumerate(es):
            x = W / 2 + (n - (len(es) - 1) / 2) * 300
            anim = g.get("anim", "bounce")
            if anim == "bounce":
                y, rot = cy - abs(math.sin(lt * 5)) * 60, 0
            elif anim == "float":
                y, rot = cy + 30 * math.sin(lt * 2.5 + n), 12 * math.sin(lt * 2 + n)
                x += 40 * math.sin(lt * 1.7 + n)
            elif anim == "hop":
                y, rot = cy - abs(math.sin(lt * 7)) * 40, 0
                x += (lt * 120) % 400 - 200
            else:  # surf
                y, rot = cy + 40 * math.sin(lt * 4 + n * 1.5), 15 * math.sin(lt * 4 + n * 1.5)
            paste_c(img, emoji_img(e, 230), x, y, rot=rot, scale=max(k, 0.05))
    elif kind == "receipt":                        # ticket de caisse « SAV MEDEF »
        y_off = (1 - ease_out(lt / 0.5)) * 500
        d = card(img, [W / 2 - 300, cy - 210 + y_off, W / 2 + 300, cy + 230 + y_off], fill=(252, 250, 240))
        f, fb = font(FONT_MONO, 34), font(FONT_MONO, 44)
        lines = [("SERVICE APRÈS-VENTE", fb), ("— M E D E F —", f), ("------------------------", f),
                 ("Promesses sociales ...... 0 €", f), ("Cadeaux aux riches ... ∞ €", f),
                 ("------------------------", f), ("MERCI DE VOTRE VOTE", fb)]
        y = cy - 170 + y_off
        for txt, ff in lines:
            d.text((W / 2, y), txt, font=ff, fill=(30, 30, 30), anchor="mm")
            y += 58
    elif kind == "title":                          # carton de jeu télé
        d = card(img, [W / 2 - 330 * k, cy - 120 * k, W / 2 + 330 * k, cy + 120 * k], fill=YELLOW, radius=30)
        if k > 0.5:
            d.text((W / 2, cy), g["text"], font=font(FONT_BLACK, 130), fill=(0, 0, 0), anchor="mm")
        for n in range(10):                        # ampoules qui clignotent autour
            a = n / 10 * 2 * math.pi
            on = (int(t * 8) + n) % 2 == 0
            r = 18
            x, y = W / 2 + 380 * math.cos(a), cy + 170 * math.sin(a)
            d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255) if on else (120, 90, 0))
    elif kind == "counter":                        # compteur de déficit
        n = int(round(g["n"] * (1 - (1 - min(lt / 0.9, 1)) ** 3)))
        d = card(img, [W / 2 - 380, cy - 150, W / 2 + 380, cy + 150], fill=(20, 20, 24), outline=RED)
        d.text((W / 2, cy - 20), g["fmt"].format(n), font=font(FONT_BLACK, 120), fill=RED, anchor="mm")
        d.text((W / 2, cy + 95), "de déficit en plus", font=font(FONT_XBOLD, 40), fill=WHITE, anchor="mm")
        paste_c(img, emoji_img(g["e"], 150), W / 2 + 360, cy - 150, rot=10 * math.sin(t * 3))
    elif kind == "vote":                           # carte de scrutin + tampon CONTRE
        d = card(img, [W / 2 - 410, cy - 200, W / 2 + 410, cy + 200], fill=(245, 245, 250))
        d.rectangle([W / 2 - 410, cy - 200, W / 2 + 410, cy - 120], fill=(0, 35, 120))
        d.text((W / 2, cy - 160), "ASSEMBLÉE NATIONALE", font=font(FONT_XBOLD, 40), fill=WHITE, anchor="mm")
        d.text((W / 2, cy - 70), g["title"], font=font(FONT_BLACK, 50), fill=(20, 20, 20), anchor="mm")
        d.text((W / 2, cy - 10), g["scrutin"], font=font(FONT_BOLD, 34), fill=(80, 80, 90), anchor="mm")
        d.text((W / 2, cy + 70), g["rn"], font=font(FONT_BLACK, 76), fill=RED, anchor="mm")
        st = lt - 0.35
        if st > 0:                                 # tampon qui s'écrase
            sc = 1 + 1.5 * (1 - ease_out(st / 0.15))
            stamp = Image.new("RGBA", (520, 170), (0, 0, 0, 0))
            sd = ImageDraw.Draw(stamp)
            sd.rounded_rectangle([6, 6, 514, 164], radius=18, outline=RED + (230,), width=12)
            sd.text((260, 85), "CONTRE", font=font(FONT_BLACK, 110), fill=RED + (230,), anchor="mm")
            paste_c(img, stamp, W / 2 + 230, cy + 255, rot=-14, scale=sc)
    elif kind == "quote":                          # citation façon carte
        d = card(img, [W / 2 - 430, cy - 150, W / 2 + 430, cy + 150], fill=(250, 250, 245), outline=YELLOW)
        d.text((W / 2, cy - 25), g["text"], font=font(FONT_BLACK, 66), fill=(20, 20, 20), anchor="mm")
        d.text((W / 2, cy + 75), "— " + g["who"], font=font(FONT_BOLD, 36), fill=(90, 90, 90), anchor="mm")
        paste_c(img, emoji_img("🐌", 140), W / 2 + 400, cy + 150, rot=-8)
    elif kind == "rewind":                         # rembobinage VHS
        d = ImageDraw.Draw(img)
        d.text((W / 2, cy - 20), "◀◀ REWIND", font=font(FONT_MONO, 120), fill=WHITE, anchor="mm")
        d.text((W / 2, cy + 90), f"SP  0:0{int(9 - lt * 3) % 10}:{int(59 - lt * 40) % 60:02d}", font=font(FONT_MONO, 56),
               fill=(200, 255, 200), anchor="mm")
        for n in range(3):                         # bandes de « tracking » qui défilent
            y = (lt * 900 + n * 640) % H
            d.rectangle([0, y, W, y + 26], fill=(255, 255, 255, 60))
        paste_c(img, emoji_img("🚲", 170), W / 2 + 330 - (lt * 300) % 700, cy - 200, rot=0)
    elif kind == "error404":                       # écran d'erreur
        d = card(img, [W / 2 - 420, cy - 170, W / 2 + 420, cy + 170], fill=(15, 15, 18), outline=RED)
        blink = int(t * 4) % 2 == 0
        d.text((W / 2, cy - 60), "ERREUR 404", font=font(FONT_MONO, 110), fill=RED if blink else (140, 10, 20), anchor="mm")
        d.text((W / 2, cy + 60), "PROJET SOCIAL INTROUVABLE", font=font(FONT_MONO, 44), fill=WHITE, anchor="mm")
    elif kind == "cta":                            # appel final
        d = ImageDraw.Draw(img)
        pulse = 1 + 0.04 * math.sin(t * 6)
        bw, bh = 820 * pulse * k, 110 * pulse * k
        d.rounded_rectangle([W / 2 - bw / 2, cy - bh / 2, W / 2 + bw / 2, cy + bh / 2], radius=24, fill=YELLOW)
        if k > 0.6:
            d.text((W / 2, cy), "PARTAGE · ABONNE-TOI", font=font(FONT_BLACK, 62), fill=(0, 0, 0), anchor="mm")


def draw_source(img, text, local):
    """Encart « SOURCE » façon document, qui glisse depuis la droite."""
    p = ease_out((local - 0.3) / 0.35)
    if p <= 0:
        return
    f = font(FONT_BOLD, 30)
    d = ImageDraw.Draw(img)
    tw = d.textlength(text, font=f)
    while tw > W - 230 and f.size > 20:
        f = font(FONT_BOLD, f.size - 1)
        tw = d.textlength(text, font=f)
    x1 = W - 40 + (1 - p) * (tw + 300)
    x0 = x1 - tw - 190
    y0, y1 = H * 0.805, H * 0.805 + 70
    d.rounded_rectangle([x0, y0, x1, y1], radius=14, fill=(255, 255, 255, 235))
    d.rounded_rectangle([x0, y0, x0 + 150, y1], radius=14, fill=RED + (255,))
    d.text((x0 + 75, (y0 + y1) / 2), "SOURCE", font=font(FONT_BLACK, 30), fill=WHITE, anchor="mm")
    d.text((x0 + 170, (y0 + y1) / 2), text, font=f, fill=(20, 20, 20), anchor="lm")


def render_frame(t, total):
    i, seg = seg_at(t)
    nxt = SEGMENTS[i + 1]["t0"] if i + 1 < len(SEGMENTS) else total
    dur, local = nxt - seg["t0"], t - seg["t0"]
    img = background(seg, i, local, dur, t)

    # --- texte cinétique : groupe courant, mots qui apparaissent un par un (pop)
    chunk = seg["chunks"][0]
    for c in seg["chunks"]:
        if t >= c[0]["t"] - 0.02:
            chunk = c
    shake = 0.0
    for w, im, cx, cy in layout_chunk(chunk):
        dt = t - w["t"]
        if dt < 0:
            continue
        s = 1.0 + (0.55 if w["style"] == "key" else 0.35) * (1 - ease_back(dt / 0.16)) if dt < 0.16 else 1.0
        s = max(s, 0.2)
        if w["style"] == "key" and dt < 0.4:
            shake = max(shake, 20 * (1 - dt / 0.4))                 # secousse sur mot-clé fort
        a = min(1.0, dt / 0.06)
        lay = im if abs(s - 1) < 0.01 else im.resize((int(im.width * s), int(im.height * s)), Image.BILINEAR)
        if a < 1:
            lay = lay.copy()
            lay.putalpha(lay.getchannel("A").point(lambda v: int(v * a)))
        img.paste(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)), lay)
    if seg.get("shake"):
        shake = max(shake, 5.0)                                      # tension continue légère

    d = ImageDraw.Draw(img)
    # --- étiquette de séquence + bandeau sources
    tf = font(FONT_XBOLD, 42)
    tw = d.textlength(seg["tag"], font=tf)
    slide = ease_out(local / 0.25)
    x0 = 60 - (1 - slide) * 400
    d.rectangle([x0, 160, x0 + tw + 50, 228], fill=RED + (255,))
    d.text((x0 + 25, 194), seg["tag"], font=tf, fill=WHITE, anchor="lm")
    d.text((W - 60, 194), "LE PROGRAMME DU RN, DÉBOISÉ", font=font(FONT_BOLD, 30), fill=(255, 255, 255, 200), anchor="rm")
    d.text((60, 262), "Sources : Assemblée nationale · Institut Montaigne · presse", font=font(FONT_BOLD, 28),
           fill=(255, 255, 255, 140), anchor="lm")
    # --- appel à l'action permanent en bas à partir de « La réponse »
    # --- gag visuel + encart « Source »
    draw_gag(img, seg, local, t)
    if seg.get("source"):
        draw_source(img, seg["source"], local)
    # --- barre de progression
    d.rectangle([0, 0, W, 12], fill=(255, 255, 255, 40))
    d.rectangle([0, 0, W * min(t / total, 1), 12], fill=YELLOW)

    arr = np.asarray(img.convert("RGB")).astype(np.float32)
    # --- vignette, grain
    arr *= (1 - 0.7 * VIGN)
    arr += GRAIN[int(t * FPS) % len(GRAIN)].repeat(4, 0).repeat(4, 1)
    # --- transition : glitch RVB + flash blanc au début de chaque séquence
    if i > 0 and local < 0.14:
        k = 1 - local / 0.14
        dx = int(30 * k)
        arr[..., 0] = np.roll(arr[..., 0], dx, axis=1)
        arr[..., 2] = np.roll(arr[..., 2], -dx, axis=1)
        rng = np.random.default_rng(int(t * 1000))
        for _ in range(8):
            y = int(rng.integers(0, H - 100))
            hh = int(rng.integers(10, 100))
            arr[y:y + hh] = np.roll(arr[y:y + hh], int(rng.integers(-140, 140) * k), axis=1)
        if local < 0.05:
            arr = arr * 0.5 + 255 * 0.5
    # --- secousse d'écran
    if shake > 0.5:
        sx, sy = int(shake * math.sin(t * 93)), int(shake * math.cos(t * 71))
        arr = np.roll(np.roll(arr, sx, axis=1), sy, axis=0)
    return np.clip(arr, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------------------
# 6. ASSEMBLAGE FINAL
# ---------------------------------------------------------------------------
def render_video(voice_wav, total):
    music, sfx = os.path.join(BUILD, "music.wav"), os.path.join(BUILD, "sfx.wav")
    build_music(total, music)
    build_sfx(total, sfx)
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", voice_wav, "-i", music, "-i", sfx,
           "-filter_complex",
           "[2:a]volume=0.16[m];[3:a]volume=0.38[s];[m][s]amix=inputs=2:normalize=0[bed];"
           "[bed][1:a]sidechaincompress=threshold=0.03:ratio=4:attack=15:release=250[bd];"
           "[1:a][bd]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95,pan=stereo|c0=c0|c1=c0[a]",
           "-map", "0:v", "-map", "[a]",
           "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "4500k", "-bufsize", "9M",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "192k", "-ac", "2",
           "-shortest", OUT_VIDEO]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    nframes = int(math.ceil(total * FPS))
    for f in range(nframes):
        proc.stdin.write(render_frame(f / FPS, total).tobytes())
        if f % (FPS * 5) == 0:
            print(f"  rendu {f / FPS:5.1f}s / {total:.1f}s", flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("[ERREUR] encodage ffmpeg")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice-file", required=True, help="voix off lue d'une traite (wav/mp3)")
    ap.add_argument("--preview", type=float, nargs="*")
    args = ap.parse_args()
    os.makedirs(BUILD, exist_ok=True)
    ensure_tools()
    print("1/3 Voix off + découpage…")
    voice_wav, total = build_voiceover(args.voice_file)
    prepare_timing()
    print(f"    durée : {total:.1f} s -> {OUT_AUDIO}")
    with open(os.path.join(HERE, "timings.txt"), "w", encoding="utf-8") as fh:
        for s in SEGMENTS:
            fh.write(f"{s['t0']:6.2f}-{s['t1']:6.2f}  [{s['tag']}]  {s['voice']}\n")
    if args.preview is not None:
        for t in args.preview:
            p = os.path.join(BUILD, f"preview_{t:05.2f}.png")
            Image.fromarray(render_frame(t, total)).save(p)
            print("    aperçu :", p)
        return
    print("2/3 Rendu des images, musique et effets sonores…")
    render_video(voice_wav, total)
    print(f"3/3 Terminé -> {OUT_VIDEO}")


if __name__ == "__main__":
    main()
