#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Montage TikTok automatisé — « Ils veulent interdire La France Insoumise »
=======================================================================

Langage : Python 3 (Pillow + NumPy) + FFmpeg (mixage + encodage).
Format  : 1080x1920 (9:16), 30 fps, H.264 + AAC stéréo -> `tiktok_lfi_dissolution.mp4`

Pipeline :
  1. VOIX OFF   : voix neuronale (ElevenLabs via vidIQ) lue d'une traite, accélérée de 8 %,
                  puis découpée automatiquement en séquences (alignement sur des durées de
                  référence espeak-ng) -> `voix_off_lfi.mp3`
  2. MUSIQUE    : piste tendue et progressive générée en NumPy (basse pulsée 110 BPM, kick et
                  charleston qui entrent au fil de la vidéo, montée avant « 2027 »)
  3. SFX        : whoosh à chaque séquence, swish à chaque groupe de mots, impacts graves
                  (« boom ») synchronisés sur les mots-clés (interdire, dissoudre, peur, 2027, voter…)
  4. IMAGES     : texte cinétique mot par mot (pop), mots-clés surlignés jaune / encadrés rouge,
                  fonds animés (dégradé, faisceau lumineux, braises, mot géant en filigrane),
                  zoom lent alterné, transitions glitch + flash, secousses d'écran
  5. MIXAGE     : voix devant, musique + SFX en ducking (sidechain), limiteur, stéréo

Usage :
  python3 montage_lfi.py --voice-file build/voix_fast.wav             # rendu complet
  python3 montage_lfi.py --voice-file build/voix_fast.wav --preview 2 10 30
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
GAP, INTRO_PAD, OUTRO_PAD = 0.26, 0.15, 1.0

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
OUT_AUDIO = os.path.join(HERE, "voix_off_lfi.mp3")
OUT_VIDEO = os.path.join(HERE, "tiktok_lfi_dissolution.mp4")

FONT_BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
FONT_BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FONT_XBOLD = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"

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
    dict(voice="Ils veulent interdire La France Insoumise.",
         sub="Ils veulent **INTERDIRE** La France Insoumise.",
         tag="ALERTE", bg="rouge", mark="LFI", shake=True),
    dict(voice="Bruno Retailleau, Gérard Larcher, une partie de la droite : ils appellent à dissoudre LFI.",
         sub="Bruno Retailleau, Gérard Larcher, une partie de la droite : ils appellent à **DISSOUDRE** LFI.",
         tag="ALERTE", bg="noir", mark="LR"),
    dict(voice="Ils parlent de discours de haine. Ils l'accusent pour les mobilisations contre la vie chère.",
         sub="Ils parlent de « *discours* *de* *haine* ». Ils l'accusent pour les mobilisations contre la *vie* *chère*.",
         tag="LEURS MOTS", bg="noir", mark="« »"),
    dict(voice="Pourquoi cette offensive ?",
         sub="Pourquoi cette *offensive* ?",
         tag="POURQUOI ?", bg="rouge", mark="?"),
    dict(voice="Parce que quand les gens descendent dans la rue contre la vie chère, c'est LFI qui est là.",
         sub="Parce que quand les gens descendent dans la *rue* contre la *vie* *chère*, c'est *LFI* qui est là.",
         tag="POURQUOI ?", bg="noir", mark="RUE"),
    dict(voice="C'est LFI qui porte la colère populaire.",
         sub="C'est LFI qui porte la *colère* *populaire*.",
         tag="POURQUOI ?", bg="rouge", mark="LFI"),
    dict(voice="Ils ont peur d'un parti qui pèse dans les sondages, qui mobilise dans la rue, et qui propose une autre voie.",
         sub="Ils ont **PEUR** d'un parti qui pèse dans les *sondages*, qui *mobilise* dans la rue, et qui propose une *autre* *voie*.",
         tag="LA VÉRITÉ", bg="noir", mark="PEUR"),
    dict(voice="Interdire un parti qui représente des millions de Français, c'est avouer que la démocratie les dérange.",
         sub="Interdire un parti qui représente des *millions* *de* *Français*, c'est avouer que la *démocratie* les dérange.",
         tag="LA VÉRITÉ", bg="rouge", mark="DÉMOCRATIE", shake=True),
    dict(voice="La réponse est simple.",
         sub="La réponse est *simple*.",
         tag="LA RÉPONSE", bg="noir", mark="!"),
    dict(voice="En deux mille vingt-sept, on ne laisse pas le champ libre à ceux qui veulent nous faire taire.",
         sub="En **2027**, on ne laisse pas le champ libre à ceux qui veulent nous faire *taire*.",
         tag="LA RÉPONSE", bg="rouge", mark="2027"),
    dict(voice="On s'inscrit sur les listes électorales. On se mobilise. On va voter.",
         sub="On s'inscrit sur les *listes* *électorales*. On se *mobilise*. On va **VOTER**.",
         tag="LA RÉPONSE", bg="noir", mark="VOTE"),
    dict(voice="Pour une France qui ne se résigne plus.",
         sub="Pour une France qui ne se *résigne* *plus*.",
         tag="LA RÉPONSE", bg="rouge", mark="FRANCE"),
    dict(voice="LFI dérange ? Tant mieux. C'est pour ça qu'il faut la défendre dans les urnes.",
         sub="LFI dérange ? *Tant* *mieux*. C'est pour ça qu'il faut la défendre dans les **URNES**.",
         tag="2027", bg="noir", mark="URNES", shake=True),
]

# Longueur « parlée » des mots affichés différemment de leur lecture (pour le minutage)
SPOKEN = {"2027,": "deux mille vingt-sept,"}


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


def shrink_pauses(x, max_pause=0.20, ratio=0.03):
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
        pieces += [x, np.zeros(int(GAP * SR), np.float32)]
        t = seg["t1"] + GAP
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
        if tok.startswith("**"):
            style, tok = "key", tok.replace("**", "")
        elif tok.startswith("*"):
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
    n = int(total * SR)
    t = np.arange(n) / SR
    bpm = 110
    beat = 60 / bpm
    i_rep = next(i for i, s in enumerate(SEGMENTS) if s["tag"] == "LA RÉPONSE")
    t_rep, t_2027 = SEGMENTS[i_rep]["t0"], SEGMENTS[i_rep + 1]["t0"]
    # intensité globale : monte doucement, palier à « La réponse », maximum après « 2027 »
    inten = np.clip(0.35 + 0.35 * t / t_rep, 0, 0.7)
    inten = np.where(t >= t_2027, 1.0, inten)
    # basse pulsée en doubles-croches (ré), légère distorsion
    pulse = (np.sin(2 * np.pi * (t / (beat / 4))) > 0).astype(np.float32)
    env16 = np.exp(-((t % (beat / 4)) / 0.06))
    bass = np.tanh(2.5 * (np.sin(2 * np.pi * 73.4 * t) + 0.5 * np.sin(2 * np.pi * 36.7 * t))) * env16 * (0.5 + 0.5 * pulse)
    # nappe sombre (ré mineur) avec trémolo lent
    pad = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(146.8, .3), (174.6, .2), (220, .15), (293.7, .08)])
    pad *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * t)
    # kick (entre à la 4e séquence) et charleston (entre à « La réponse »)
    kick = np.zeros(n)
    kl = int(0.3 * SR)
    kt = np.arange(kl) / SR
    k = np.sin(2 * np.pi * (45 + 100 * np.exp(-kt * 30)) * kt) * np.exp(-kt * 10)
    for b in np.arange(SEGMENTS[3]["t0"], total, beat):
        s = int(b * SR)
        kick[s:s + kl] += k[:max(0, min(kl, n - s))]
    hat = np.zeros(n)
    hl = int(0.03 * SR)
    hn = np.diff(np.concatenate([[0], RNG.standard_normal(hl)])) * np.exp(-np.arange(hl) / SR * 150)
    for b in np.arange(t_rep, total, beat / 2):
        s = int(b * SR)
        hat[s:s + hl] += hn[:max(0, min(hl, n - s))]
    mix = inten * (0.45 * bass + 0.25 * pad) + 0.7 * kick + 0.15 * hat
    mix *= np.minimum(1, np.minimum(t / 1.0, (total - t) / 1.5))
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


def build_sfx(total, path):
    tr = np.zeros(int(total * SR))
    for i, seg in enumerate(SEGMENTS):
        if i > 0:
            place(tr, sfx_whoosh(gain=0.5), seg["t0"] - 0.34)       # changement de plan
        for c in seg["chunks"][1:]:
            place(tr, sfx_swish(gain=0.6), c[0]["t"] - 0.02)          # changement de texte
        for w in seg["words"]:
            if w["style"] == "key":
                place(tr, sfx_boom(gain=1.0), w["t"] + 0.02)          # mot-clé fort
    i_2027 = next(i for i, s in enumerate(SEGMENTS) if "2027" in s["sub"])
    place(tr, sfx_riser(2.2, gain=0.45), SEGMENTS[i_2027]["t0"] - 2.2)  # montée vers « 2027 »
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
WORD_SIZE = 120


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
    y0 = H * 0.47 - (len(lines) - 1) * lh / 2
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
    d.text((W - 60, 194), "PRÉSIDENTIELLE 2027", font=font(FONT_BOLD, 34), fill=(255, 255, 255, 200), anchor="rm")
    d.text((60, 262), "Sources : TF1 Info · franceinfo · LCP · Le Point (oct. 2026)", font=font(FONT_BOLD, 28),
           fill=(255, 255, 255, 140), anchor="lm")
    # --- appel à l'action permanent en bas à partir de « La réponse »
    if seg["tag"] in ("LA RÉPONSE", "2027"):
        cta = "INSCRIS-TOI SUR LES LISTES ÉLECTORALES"
        cf = font(FONT_XBOLD, 40)
        cw = d.textlength(cta, font=cf)
        pulse = 1 + 0.03 * math.sin(t * 6)
        bw, bh = (cw + 60) * pulse, 84 * pulse
        d.rounded_rectangle([W / 2 - bw / 2, H * 0.80 - bh / 2, W / 2 + bw / 2, H * 0.80 + bh / 2], radius=20,
                            fill=YELLOW + (255,))
        d.text((W / 2, H * 0.80), cta, font=cf, fill=(0, 0, 0), anchor="mm")
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
           "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "6M", "-bufsize", "12M",
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
