#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Montage TikTok automatisé — « Acte III contre la vie chère » (31 octobre 2026)
==========================================================================

Langage : Python 3 (Pillow + NumPy) + FFmpeg (encodage) + espeak-ng/MBROLA (voix off hors ligne)

Pipeline :
  1. SCRIPT      -> liste de segments (phrase lue + texte à l'écran + palette)
  2. VOIX OFF    -> chaque phrase est synthétisée séparément (durées exactes = synchro parfaite),
                    puis concaténée, normalisée et exportée en `voix_off_trappes.mp3`
  3. MUSIQUE     -> nappe + pulsation synthétisées (NumPy), mixées très bas sous la voix
  4. IMAGES      -> chaque frame 1080x1920 est dessinée avec Pillow (fond animé, chiffres clés
                    animés, sous-titres karaoké, barre de progression) et envoyée à FFmpeg via un pipe
  5. RENDU       -> `tiktok_trappes_racisme.mp4` (H.264 + AAC, 30 fps, 9:16)

Moteur TTS :
  - Par défaut : espeak-ng + voix MBROLA « mb-fr1 » (100 % hors ligne).
  - Si edge-tts est installé ET que le réseau le permet, on peut passer --tts edge
    (voix neuronale fr-FR-HenriNeural, beaucoup plus naturelle).

Usage :
  python3 montage_trappes.py               # rendu complet
  python3 montage_trappes.py --tts edge    # voix neuronale (nécessite internet)
  python3 montage_trappes.py --preview 12  # rend uniquement une image PNG à t=12 s (debug)
"""

import argparse
import math
import os
import shutil
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------------------
# 0. CONFIGURATION
# ---------------------------------------------------------------------------
W, H = 1080, 1920
FPS = 30
SR = 44100                      # fréquence d'échantillonnage audio
GAP = 0.28                      # silence entre deux phrases (s)
INTRO_PAD = 0.15                # silence au tout début (s)
OUTRO_PAD = 0.9                 # temps de lecture après la dernière phrase (s)

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
OUT_AUDIO = os.path.join(HERE, "voix_off_trappes.mp3")
OUT_VIDEO = os.path.join(HERE, "tiktok_trappes_racisme.mp4")

FONT_BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
FONT_BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FONT_XBOLD = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"

# Palettes (fond haut, fond bas, couleur d'accent)
PAL = {
    "deuil":  ((10, 10, 12), (0, 0, 0),   (225, 20, 30)),
    "rouge":  ((40, 0, 4),   (6, 0, 0),   (235, 25, 35)),
    "blanc":  ((18, 18, 20), (0, 0, 0),   (245, 245, 245)),
}
ACCENT_SUB = (235, 30, 40)        # mot prononcé dans les sous-titres
HEADER_RIGHT = "TRAPPES · 23/10"
SOURCES_LINE = "Sources : PNAT · Le Monde · AFP · Wikipédia"
FLASH_RGB = (200, 0, 0)            # flash rouge aux changements de plan
DESATURATE = 0.85                  # photos quasi noir et blanc (gravité)
SHADOW_RGB = (200, 15, 25)         # ombre portée rouge sous les gros titres

# ---------------------------------------------------------------------------
# 1. SCRIPT (voix = texte lu, écrit en toutes lettres pour la synthèse ;
#            sub = sous-titre affiché ; big/small = chiffres et mots-clés)
# ---------------------------------------------------------------------------
SEGMENTS = [
    # --- ACCROCHE ------------------------------------------------------------
    dict(voice="Vingt-trois octobre. Trappes. Un homme tire sur des passants. Parce qu'ils sont noirs. Parce qu'ils sont arabes.",
         sub="23 octobre. Trappes. Un homme tire sur des passants. Parce qu'ils sont noirs. Parce qu'ils sont arabes.",
         big="23.10.2026", small="TRAPPES · LA VERRIÈRE", pal="rouge", tag="ATTENTAT"),
    dict(voice="Pengo Bossio Wangi, vingt-six ans, est tué.",
         sub="Pengo Bossio Wangi, 26 ans, est tué.",
         big="PENGO\n26 ANS", small="TUÉ PAR BALLES", pal="deuil", tag="ATTENTAT"),
    dict(voice="Une fillette de douze ans est touchée huit fois.",
         sub="Une fillette de 12 ans est touchée huit fois.",
         big="12 ANS", small="TOUCHÉE 8 FOIS", pal="rouge", tag="ATTENTAT"),
    dict(voice="Cent vingt-huit balles. Huit lieux. Un mort, sept blessés.",
         sub="128 balles. 8 lieux. Un mort, sept blessés.",
         big="128 BALLES", small="1 MORT · 7 BLESSÉS", pal="deuil", tag="ATTENTAT"),
    dict(voice="Le parquet antiterroriste est saisi : assassinat terroriste à caractère raciste.",
         sub="Le parquet antiterroriste est saisi : assassinat terroriste à caractère raciste.",
         big="TERRORISME", small="CARACTÈRE RACISTE · PNAT", pal="rouge", tag="ATTENTAT"),
    dict(voice="Le tireur l'avoue : il visait des personnes de type musulman, africain, nord-africain.",
         sub="Le tireur l'avoue : il visait des personnes « de type musulman, africain, nord-africain ».",
         big="CIBLÉS", small="POUR LEUR COULEUR · LEUR RELIGION", pal="deuil", tag="LES FAITS"),
    # --- LE CLIMAT -----------------------------------------------------------
    dict(voice="Trappes ? Depuis des années, on la traite sur les plateaux de république islamique.",
         sub="Trappes ? Depuis des années, on la traite sur les plateaux de « république islamique ».",
         big="DÉSIGNÉE", small="SUR LES PLATEAUX TÉLÉ", pal="blanc", tag="LE CLIMAT"),
    dict(voice="En quatre ans, l'extrême droite a tué au moins huit personnes en France.",
         sub="En 4 ans, l'extrême droite a tué au moins 8 personnes en France.",
         big="8 MORTS", small="EN 4 ANS · ULTRADROITE", pal="rouge", tag="LE CLIMAT"),
    dict(voice="Les mots désignent. Les armes tuent.",
         sub="Les mots désignent. Les armes tuent.",
         big="LES MOTS\nTUENT", small="", pal="deuil", tag="LE CLIMAT"),
    # --- LE RÉQUISITOIRE -----------------------------------------------------
    dict(voice="Trois jours avant, il avait agressé un homme noir. Arrêté. Puis relâché.",
         sub="Trois jours avant, il avait agressé un homme noir. Arrêté. Puis relâché.",
         big="RELÂCHÉ", small="3 JOURS AVANT L'ATTENTAT", pal="rouge", tag="L'ÉTAT"),
    dict(voice="Puis, tout de suite, la question : est-il fou ? Celle qu'on ne pose presque jamais quand le terroriste est islamiste.",
         sub="Puis, tout de suite, la question : « est-il fou ? » Celle qu'on ne pose presque jamais quand le terroriste est islamiste.",
         big="DEUX POIDS,\nDEUX MESURES", small="DÉNONCE L'AVOCAT DE LA FAMILLE", pal="blanc", tag="L'ÉTAT"),
    dict(voice="Un hommage national ? Annoncé. Toujours sans date.",
         sub="Un hommage national ? Annoncé. Toujours sans date.",
         big="HOMMAGE ?", small="ANNONCÉ · SANS DATE", pal="deuil", tag="L'ÉTAT"),
    # --- CONCLUSION ----------------------------------------------------------
    dict(voice="Le trente octobre, à Trappes, des milliers ont refusé l'oubli.",
         sub="Le 30 octobre, à Trappes, des milliers ont refusé l'oubli.",
         big="DES MILLIERS", small="TRAPPES · 30 OCTOBRE", pal="blanc", tag="NE PAS OUBLIER"),
    dict(voice="Justice pour Pengo. Ne détournez pas le regard.",
         sub="Justice pour Pengo. Ne détournez pas le regard.",
         big="JUSTICE\nPOUR PENGO", small="NE DÉTOURNEZ PAS LE REGARD", pal="rouge", tag="NE PAS OUBLIER"),
]


# ---------------------------------------------------------------------------
# 1 bis. PHOTOS (Wikimedia Commons, licences libres — crédit affiché à l'écran)
#         clé -> (fichier, légende lieu/date, auteur, licence)
#         Aucune image de victime ni de la scène de crime : uniquement hommages et rassemblements.
# ---------------------------------------------------------------------------
PHOTO_DIR = os.path.join(HERE, "photos")
PHOTOS = {
    "tr13":        ("Trappes · 30/10", "Jules*", "CC BY-SA 4.0"),
    "paris24_01":  ("Paris · 24/10", "Jules*", "CC BY-SA 4.0"),
    "tr12":        ("Trappes · 30/10", "Jules*", "CC BY-SA 4.0"),
    "tr01":        ("Trappes · 30/10", "Jules*", "CC BY-SA 4.0"),
    "tr02":        ("Trappes · 30/10", "Jules*", "CC BY-SA 4.0"),
    "tr11":        ("Trappes · 30/10", "Jules*", "CC BY-SA 4.0"),
    "tr18":        ("Trappes · 30/10", "Jules*", "CC BY-SA 4.0"),
    "tr14":        ("Trappes · 30/10", "Jules*", "CC BY-SA 4.0"),
    "tr10":        ("Trappes · 30/10", "Jules*", "CC BY-SA 4.0"),
    "tr09":        ("Trappes · 30/10", "Jules*", "CC BY-SA 4.0"),
    "paris24_07":  ("Paris · 24/10", "Jules*", "CC BY-SA 4.0"),
    "aix26":       ("Aix-en-Provence · 31/10", "Gabriel from92", "CC0"),
    "paris24_100": ("Paris · 24/10", "Jules*", "CC BY-SA 4.0"),
}
# Une photo par segment, dans l'ordre de SEGMENTS
PHOTO_ORDER = ["tr09", "paris24_01", "tr12", "aix26", "tr02", "tr11", "tr18", "tr14", "tr10",
               "tr09", "paris24_07", "tr13", "tr01", "paris24_100"]
for _seg, _key in zip(SEGMENTS, PHOTO_ORDER):
    _seg["photo"] = _key


def run(cmd, **kw):
    """Exécute une commande système et lève une erreur claire si elle échoue."""
    res = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if res.returncode != 0:
        sys.exit(f"[ERREUR] {' '.join(cmd[:3])}...\n{res.stderr[-1500:]}")
    return res


def ensure_tools(tts):
    """Vérifie / installe les dépendances manquantes sans bloquer."""
    if not shutil.which("ffmpeg"):
        subprocess.run(["apt-get", "install", "-y", "-q", "ffmpeg"])
    if tts == "espeak" and not shutil.which("espeak-ng"):
        subprocess.run(["apt-get", "update", "-q"])
        subprocess.run(["apt-get", "install", "-y", "-q", "espeak-ng", "mbrola-fr1"])
    if tts == "edge":
        try:
            import edge_tts  # noqa: F401
        except ImportError:
            subprocess.run([sys.executable, "-m", "pip", "install", "-q", "edge-tts"])


# ---------------------------------------------------------------------------
# 2. VOIX OFF
# ---------------------------------------------------------------------------
def read_wav_mono(path):
    """Lit un WAV (re-échantillonné en 44.1 kHz mono float32 via ffmpeg)."""
    tmp = path + ".44k.wav"
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR),
         "-sample_fmt", "s16", tmp])
    with wave.open(tmp) as w:
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)
    return data / 32768.0


def trim_silence(x, thr=0.01):
    """Coupe les silences de début/fin produits par le moteur TTS."""
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(0.02 * SR))
    b = min(len(x), idx[-1] + int(0.06 * SR))
    return x[a:b]


def synth_sentence(text, path, tts):
    if tts == "edge":
        mp3 = path.replace(".wav", ".mp3")
        run(["edge-tts", "--voice", "fr-FR-HenriNeural", "--rate", "+12%",
             "--text", text, "--write-media", mp3])
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, path])
    else:
        # mb-fr1 = voix masculine MBROLA ; -s vitesse (mots/min), -p hauteur
        run(["espeak-ng", "-v", "mb-fr1", "-s", "155", "-p", "40", "-w", path, text])


def reference_durations():
    """Durée de chaque segment lu par espeak-ng (référence d'alignement) ; repli : nb de caractères."""
    if not shutil.which("espeak-ng"):
        return [len(s["voice"]) for s in SEGMENTS]
    out = []
    for i, seg in enumerate(SEGMENTS):
        p = os.path.join(BUILD, f"ref_{i:02d}.wav")
        run(["espeak-ng", "-v", "mb-fr1", "-s", "150", "-w", p, seg["voice"]])
        out.append(len(trim_silence(read_wav_mono(p))) / SR)
    return out


def split_external(path):
    """Découpe une voix off externe (script complet lu d'une traite) en une pièce par segment.

    On repère les silences entre phrases (RMS par tranches de 20 ms) et on garde les
    N-1 silences les plus longs comme points de coupe -> une pièce audio par SEGMENT.
    """
    x = read_wav_mono(path)
    hop = int(0.02 * SR)
    rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    silent = rms < max(rms) * 0.03            # ≈ -30 dB sous le pic
    runs, start = [], None
    for i, s in enumerate(silent):
        if s and start is None:
            start = i
        elif not s and start is not None:
            runs.append((i - start, start, i))
            start = None
    speech = np.where(~silent)[0]
    runs = [r for r in runs if r[1] > speech[0] and r[2] < speech[-1] and r[0] * 0.02 >= 0.2]
    n = len(SEGMENTS)
    if len(runs) < n - 1:
        sys.exit(f"[ERREUR] {len(runs)} pauses trouvées, {n - 1} nécessaires")

    # Position attendue de chaque coupure : proportionnelle à la durée de chaque phrase lue par
    # espeak-ng (modélise syllabes ET ponctuation, bien plus fiable que le nombre de caractères)
    lens = np.array(reference_durations(), float)
    s0, s1 = speech[0], speech[-1]
    expected = s0 + (s1 - s0) * np.cumsum(lens)[:-1] / lens.sum()

    # Programmation dynamique : choisir n-1 pauses ordonnées qui collent aux positions
    # attendues tout en privilégiant les pauses longues (fin de phrase / paragraphe).
    mids = np.array([r[1] + r[0] / 2 for r in runs])
    durs = np.array([r[0] * 0.02 for r in runs])
    scale = (s1 - s0) / n * 0.35
    cost = lambda k, j: ((mids[j] - expected[k]) / scale) ** 2 - 2.0 * durs[j]
    INF = 1e18
    m = len(runs)
    dp = np.full((n - 1, m), INF)
    back = np.zeros((n - 1, m), int)
    for j in range(m):
        dp[0, j] = cost(0, j)
    for k in range(1, n - 1):
        best, arg = INF, -1
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
    cuts = sorted(int(mids[j]) for j in chosen)
    bounds = [0] + [c * hop for c in cuts] + [len(x)]
    return [shrink_pauses(trim_silence(x[a:b])) for a, b in zip(bounds[:-1], bounds[1:])]


def shrink_pauses(x, max_pause=0.22, thr_ratio=0.03):
    """Raccourcit les pauses internes trop longues (rythme TikTok plus serré)."""
    hop = int(0.01 * SR)
    peak = np.max(np.abs(x)) + 1e-9
    frames = [x[i:i + hop] for i in range(0, len(x), hop)]
    out, quiet = [], 0
    for f in frames:
        if np.sqrt(np.mean(f ** 2)) < peak * thr_ratio:
            quiet += 1
            if quiet * 0.01 > max_pause:
                continue
        else:
            quiet = 0
        out.append(f)
    return np.concatenate(out)


def build_voiceover(tts, voice_file=None):
    """Synthétise chaque phrase (ou découpe la voix externe), mesure sa durée, assemble la piste."""
    os.makedirs(BUILD, exist_ok=True)
    pieces, t = [], INTRO_PAD
    pieces.append(np.zeros(int(INTRO_PAD * SR), np.float32))
    ext = split_external(voice_file) if voice_file else None
    for i, seg in enumerate(SEGMENTS):
        if ext:
            x = ext[i]
        else:
            p = os.path.join(BUILD, f"seg_{i:02d}.wav")
            synth_sentence(seg["voice"], p, tts)
            x = trim_silence(read_wav_mono(p))
        seg["t0"], seg["t1"] = t, t + len(x) / SR
        pieces += [x, np.zeros(int(GAP * SR), np.float32)]
        t = seg["t1"] + GAP
    pieces.append(np.zeros(int(OUTRO_PAD * SR), np.float32))
    voice = np.concatenate(pieces)
    total = len(voice) / SR

    raw = os.path.join(BUILD, "voice_raw.wav")
    write_wav(raw, voice)
    # Traitement « radio » : passe-haut, compression, EQ de présence, normalisation loudness
    afilter = ("highpass=f=80,lowpass=f=9000,"
               "acompressor=threshold=-20dB:ratio=3:attack=5:release=80,"
               "equalizer=f=3000:t=q:w=1.2:g=3,"
               "loudnorm=I=-15:TP=-1.5:LRA=7")
    voice_wav = os.path.join(BUILD, "voice.wav")
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", afilter, "-ar", str(SR), voice_wav])
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", voice_wav, "-codec:a", "libmp3lame",
         "-b:a", "192k", OUT_AUDIO])
    return voice_wav, total


def write_wav(path, x, channels=1):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


# ---------------------------------------------------------------------------
# 3. MUSIQUE DE FOND (synthèse procédurale, libre de droits)
# ---------------------------------------------------------------------------
def build_music(total, path):
    """Nappe grave en ré mineur + battement de cœur lent (60 BPM) : ambiance solennelle."""
    n = int(total * SR)
    t = np.arange(n) / SR
    pad = sum(np.sin(2 * np.pi * f * t) * a for f, a in [(36.7, .5), (73.4, .3), (87.3, .15), (110, .1), (146.8, .05)])
    pad *= 0.65 + 0.35 * np.sin(2 * np.pi * 0.1 * t)
    beat = np.zeros(n, np.float32)
    kl = int(0.30 * SR)
    kt = np.arange(kl) / SR
    k = np.sin(2 * np.pi * (40 + 60 * np.exp(-kt * 25)) * kt) * np.exp(-kt * 10)
    for b in np.arange(0, total, 1.0):            # « boum-boum » toutes les secondes
        for off, g in ((0.0, 1.0), (0.22, 0.6)):
            s = int((b + off) * SR)
            e = min(n, s + kl)
            if s < n:
                beat[s:e] += g * k[:e - s]
    mix = 0.45 * pad + 0.7 * beat
    fade = np.minimum(1, np.minimum(t / 1.5, (total - t) / 2.0))
    mix = mix / np.max(np.abs(mix)) * fade
    write_wav(path, mix.astype(np.float32))


# ---------------------------------------------------------------------------
# 4. RENDU DES IMAGES
# ---------------------------------------------------------------------------
_font_cache = {}


def font(path, size):
    key = (path, size)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(path, size)
    return _font_cache[key]


def ease_out_back(x):
    """Courbe d'animation « pop » (dépasse légèrement puis revient)."""
    x = min(max(x, 0), 1)
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def ease_out(x):
    x = min(max(x, 0), 1)
    return 1 - (1 - x) ** 3


def make_background(pal_key):
    """Fond dégradé + grain + vignette (pré-calculé une fois par palette)."""
    top, bot, acc = PAL[pal_key]
    g = np.linspace(0, 1, H)[:, None, None]
    img = (np.array(top) * (1 - g) + np.array(bot) * g) * np.ones((1, W, 1))
    # Halo de couleur d'accent derrière le chiffre clé
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt((xx - W / 2) ** 2 + ((yy - H * 0.42) * 0.8) ** 2)
    halo = np.exp(-(d / 520) ** 2)[..., None] * np.array(acc) * 0.35
    img = img + halo
    # Vignette
    v = 1 - 0.55 * ((xx - W / 2) ** 2 / (W / 2) ** 2 + (yy - H / 2) ** 2 / (H / 2) ** 2)[..., None] * 0.6
    img = img * np.clip(v, 0.3, 1)
    return np.clip(img, 0, 255).astype(np.uint8)


def make_stripes(acc):
    """Bandes diagonales semi-transparentes (style ruban de signalisation), 2x hauteur pour défilement."""
    s = Image.new("RGBA", (W + 400, H + 400), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    for x in range(-H, W + 800, 140):
        d.polygon([(x, 0), (x + 50, 0), (x + 50 + H + 400, H + 400), (x + H + 400, H + 400)],
                  fill=acc + (14,))
    return s


GRAIN = [np.random.default_rng(i).integers(-14, 14, (H // 4, W // 4, 1), dtype=np.int16) for i in range(6)]


def draw_text_center(draw, cx, cy, text, fnt, fill, stroke=0, stroke_fill=(0, 0, 0), spacing=0):
    bbox = draw.multiline_textbbox((0, 0), text, font=fnt, align="center",
                                   stroke_width=stroke, spacing=spacing)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.multiline_text((cx - w / 2 - bbox[0], cy - h / 2 - bbox[1]), text, font=fnt, fill=fill,
                        align="center", stroke_width=stroke, stroke_fill=stroke_fill, spacing=spacing)
    return w, h


def fit_font(draw, text, path, start, max_w):
    """Réduit la taille de police jusqu'à ce que le texte tienne dans max_w."""
    size = start
    while size > 40:
        f = font(path, size)
        b = draw.multiline_textbbox((0, 0), text, font=f, align="center", spacing=-10)
        if b[2] - b[0] <= max_w:
            return f
        size -= 6
    return font(path, size)


def wrap_words(draw, words, fnt, max_w):
    """Découpe une liste de mots en lignes de largeur max_w."""
    lines, cur = [], []
    for w in words:
        test = " ".join(cur + [w])
        if draw.textlength(test, font=fnt) <= max_w or not cur:
            cur.append(w)
        else:
            lines.append(cur)
            cur = [w]
    if cur:
        lines.append(cur)
    return lines


def subtitle_chunks(sub, max_words=4):
    """Découpe le sous-titre en petits blocs de 3-4 mots (rythme TikTok)."""
    words = sub.split()
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= max_words or w[-1] in ".?!:,":
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    # Fusionne les blocs d'un seul mot avec le précédent
    out = []
    for c in chunks:
        if out and len(c) == 1 and len(out[-1]) < 5:
            out[-1] += c
        else:
            out.append(c)
    return out


PHOTO_CACHE = {}


def load_photo(key):
    """Charge une photo et la redimensionne pour couvrir 1080x1920 (+ marge pour pan/zoom)."""
    im = Image.open(os.path.join(PHOTO_DIR, key + ".jpg")).convert("RGB")
    # rogne 2 % sur chaque bord (restes éventuels d'interface)
    mx, my = int(im.width * 0.02), int(im.height * 0.02)
    im = im.crop((mx, my, im.width - mx, im.height - my))
    scale = max(W * 1.12 / im.width, H * 1.10 / im.height)
    return im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)


def photo_background(seg, i, local, dur):
    """Fond photo animé : panoramique lent (sens alterné) + léger zoom + assombrissement teinté."""
    ph = PHOTO_CACHE[seg["photo"]]
    top = PAL[seg["pal"]][0]
    k = min(max(local / max(dur, 0.1), 0), 1)
    zoom = 1.0 + 0.06 * k
    cw, ch = int(W / zoom * 1.0), int(H / zoom * 1.0)
    rng_x = ph.width - cw
    rng_y = ph.height - ch
    span = min(rng_x, 520)                       # amplitude du panoramique limitée
    cx = rng_x / 2 + (k - 0.5) * span * (1 if i % 2 == 0 else -1)
    cy = rng_y / 2
    box = (int(cx), int(cy), int(cx) + cw, int(cy) + ch)
    frame = ph.crop(box).resize((W, H), Image.BILINEAR)
    arr = np.asarray(frame).astype(np.float32)
    gray = arr.mean(2, keepdims=True)
    arr = arr * (1 - DESATURATE) + gray * DESATURATE
    arr = arr * PHOTO_SHADE + np.array(top, np.float32) * (1 - PHOTO_SHADE)
    return arr


# Courbe d'assombrissement verticale : lisibilité du titre (haut), du chiffre (centre) et des sous-titres (bas)
_y = np.linspace(0, 1, H)[:, None, None]
PHOTO_SHADE = (0.62 - 0.22 * np.exp(-((_y - 0.05) / 0.12) ** 2)
               - 0.10 * np.exp(-((_y - 0.42) / 0.12) ** 2)
               - 0.25 * np.exp(-((_y - 0.80) / 0.14) ** 2)).astype(np.float32)


def prepare_segments():
    """Pré-calcule fonds, blocs de sous-titres et timings mot à mot."""
    bgs, stripes = {}, {}
    for seg in SEGMENTS:
        if seg.get("photo") and seg["photo"] not in PHOTO_CACHE:
            PHOTO_CACHE[seg["photo"]] = load_photo(seg["photo"])
        k = seg["pal"]
        if k not in bgs:
            bgs[k] = make_background(k)
            stripes[k] = make_stripes(PAL[k][2])
        chunks = subtitle_chunks(seg["sub"])
        # Timing proportionnel au nombre de caractères (approximation fiable pour une voix régulière)
        lens = [sum(len(w) + 1 for w in c) for c in chunks]
        tot = sum(lens)
        dur = seg["t1"] - seg["t0"]
        t = seg["t0"]
        seg["chunks"] = []
        for c, L in zip(chunks, lens):
            d = dur * L / tot
            wl = [len(w) + 1 for w in c]
            wt, acc = [], t
            for x in wl:
                wt.append(acc)
                acc += d * x / sum(wl)
            seg["chunks"].append(dict(words=c, t0=t, t1=t + d, wt=wt))
            t += d
    return bgs, stripes


def seg_at(t):
    for i, s in enumerate(SEGMENTS):
        nxt = SEGMENTS[i + 1]["t0"] if i + 1 < len(SEGMENTS) else 1e9
        if t < nxt:
            return i, s
    return len(SEGMENTS) - 1, SEGMENTS[-1]


def render_frame(t, total, bgs, stripes):
    i, seg = seg_at(t)
    top, bot, acc = PAL[seg["pal"]]
    local = t - seg["t0"]

    if seg.get("photo"):
        # --- Fond PHOTO : panoramique + zoom + assombrissement teinté + grain léger
        nxt = SEGMENTS[i + 1]["t0"] if i + 1 < len(SEGMENTS) else total
        arr = photo_background(seg, i, local, nxt - seg["t0"])
        g = GRAIN[int(t * FPS) % len(GRAIN)].repeat(4, 0).repeat(4, 1) * 0.5
        arr = np.clip(arr + g, 0, 255).astype(np.uint8)
    else:
        arr = None
    # --- Fond : dégradé + léger zoom « Ken Burns » + bandes qui défilent + grain
    base = Image.fromarray(bgs[seg["pal"]])
    zoom = 1 + 0.04 * min(local / 4, 1)
    if arr is None and zoom > 1.001:
        zw, zh = int(W * zoom), int(H * zoom)
        base = base.resize((zw, zh), Image.BILINEAR).crop(((zw - W) // 2, (zh - H) // 2,
                                                            (zw - W) // 2 + W, (zh - H) // 2 + H))
    if arr is None:
        off = int((t * 60) % 140)
        st = stripes[seg["pal"]].crop((off, off, off + W, off + H))
        base = base.convert("RGBA")
        base.alpha_composite(st)
        arr = np.asarray(base.convert("RGB")).astype(np.int16)
        g = GRAIN[int(t * FPS) % len(GRAIN)].repeat(4, 0).repeat(4, 1)
        arr = np.clip(arr + g, 0, 255).astype(np.uint8)

    # Flash blanc bref à chaque changement de segment (cut dynamique)
    if local < 0.08:
        k_ = 0.55 * (1 - local / 0.08)
        arr = np.clip(arr * (1 - k_) + np.array(FLASH_RGB) * k_, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr).convert("RGBA")

    # --- Calque texte principal (chiffre clé) avec animation pop + secousse sur les segments « tension »
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    p = ease_out_back(local / 0.35)
    shake = (0, 0)
    if seg["pal"] == "rouge" and local < 0.5:
        amp = 14 * (1 - local / 0.5)
        shake = (amp * math.sin(t * 90), amp * math.cos(t * 70))
    big_f = fit_font(d, seg["big"], FONT_BLACK, 210, W - 120)
    cy = H * 0.40
    # Ombre portée colorée
    draw_text_center(d, W / 2 + 10 + shake[0], cy + 12 + shake[1], seg["big"], big_f, SHADOW_RGB + (255,), spacing=-10)
    draw_text_center(d, W / 2 + shake[0], cy + shake[1], seg["big"], big_f, (255, 255, 255, 255),
                     stroke=4, stroke_fill=(0, 0, 0), spacing=-10)
    if p < 0.999 or p > 1.001:
        sc = max(p, 0.01)
        lw, lh = int(W * sc), int(H * sc)
        scaled = layer.resize((lw, lh), Image.BICUBIC)
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        # Mise à l'échelle autour du centre du texte (paste accepte les décalages négatifs)
        layer.paste(scaled, (int(W / 2 - W / 2 * sc), int(cy - cy * sc)), scaled)
    img.alpha_composite(layer)

    d = ImageDraw.Draw(img)
    big_box = d.multiline_textbbox((0, 0), seg["big"], font=big_f, spacing=-10)
    big_h = big_box[3] - big_box[1]

    # --- Flèche descendante animée (segment « en baisse »)
    if seg.get("arrow"):
        a = ease_out(local / 0.6)
        ax, ay = W / 2, cy - big_h / 2 - 170 + 60 * a
        d.polygon([(ax - 60, ay), (ax + 60, ay), (ax + 60, ay + 50), (ax + 100, ay + 50),
                   (ax, ay + 140), (ax - 100, ay + 50), (ax - 60, ay + 50)], fill=acc + (255,))

    # --- Bandeau mot-clé secondaire (glisse depuis la gauche)
    if seg["small"]:
        s_f = fit_font(d, seg["small"], FONT_XBOLD, 64, W - 200)
        a = ease_out((local - 0.15) / 0.35)
        tw = d.textlength(seg["small"], font=s_f)
        bx = W / 2 - tw / 2 - 30 - (1 - a) * W
        by = cy + big_h / 2 + 70
        d.rectangle([bx, by, bx + tw + 60, by + 100], fill=acc + (255,))
        d.text((bx + 30, by + 50), seg["small"], font=s_f, fill=(0, 0, 0), anchor="lm")

    # --- En-tête : étiquette de section + date
    head_f = font(FONT_XBOLD, 40)
    label = f"● {seg['tag']}"
    lw = d.textlength(label, font=head_f)
    d.rounded_rectangle([60, 150, 60 + lw + 50, 220], radius=35, fill=(0, 0, 0, 170), outline=acc, width=3)
    d.text((85, 185), label, font=head_f, fill=acc, anchor="lm")
    d.text((W - 60, 185), HEADER_RIGHT, font=font(FONT_BOLD, 38), fill=(255, 255, 255, 200), anchor="rm")

    # --- Crédit photo (obligatoire pour les licences CC BY-SA)
    if seg.get("photo"):
        lieu, auteur, lic = PHOTOS[seg["photo"]]
        credit = (f"Photo : {lieu} — {auteur} · {lic} · Wikimedia Commons" if lic
                  else f"Photo : {lieu}")
        size = 28
        while size > 18 and d.textlength(credit, font=font(FONT_BOLD, size)) > W - 140:
            size -= 1
        cf = font(FONT_BOLD, size)
        cw_ = d.textlength(credit, font=cf)
        d.rounded_rectangle([50, 296, 50 + cw_ + 30, 340], radius=12, fill=(0, 0, 0, 150))
        d.text((65, 318), credit, font=cf, fill=(255, 255, 255, 220), anchor="lm")

    # --- Barre de progression en haut
    d.rectangle([0, 0, W, 14], fill=(255, 255, 255, 40))
    d.rectangle([0, 0, W * min(t / total, 1), 14], fill=acc)

    # --- Sous-titres karaoké (bloc courant, mot prononcé en couleur d'accent)
    chunk = None
    for c in seg["chunks"]:
        if c["t0"] <= t < c["t1"] + GAP:
            chunk = c
    if chunk is None and t < seg["t0"] + 0.01:
        chunk = seg["chunks"][0]
    if chunk is None:
        chunk = seg["chunks"][-1]
    sub_f = font(FONT_BLACK, 76)
    lines = wrap_words(d, chunk["words"], sub_f, W - 140)
    y = H * 0.74
    k = 0
    pop = ease_out_back((t - chunk["t0"]) / 0.18)
    for line in lines:
        line_w = d.textlength(" ".join(line), font=sub_f)
        x = W / 2 - line_w / 2
        for w in line:
            active = chunk["wt"][k] <= t
            current = active and (k + 1 >= len(chunk["wt"]) or t < chunk["wt"][k + 1])
            col = ACCENT_SUB if current else ((255, 255, 255) if active else (255, 255, 255, 150))
            dy = -8 if current else 0
            d.text((x, y + dy + (1 - pop) * 30), w, font=sub_f, fill=col, stroke_width=7, stroke_fill=(0, 0, 0))
            x += d.textlength(w + " ", font=sub_f)
            k += 1
        y += 96

    # --- Signature discrète en bas
    # (placée en haut : le bas de l'écran est masqué par l'interface TikTok)
    d.text((60, 262), SOURCES_LINE,
           font=font(FONT_BOLD, 30), fill=(255, 255, 255, 150), anchor="lm")
    return img.convert("RGB")


# ---------------------------------------------------------------------------
# 5. ASSEMBLAGE FINAL
# ---------------------------------------------------------------------------
def render_video(voice_wav, total):
    bgs, stripes = prepare_segments()
    music_wav = os.path.join(BUILD, "music.wav")
    build_music(total, music_wav)
    nframes = int(math.ceil(total * FPS))
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", voice_wav, "-i", music_wav,
           # Voix au premier plan, musique à -20 dB avec « ducking » (sidechain) sous la voix
           "-filter_complex",
           "[2:a]volume=0.10[m];[m][1:a]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[md];"
           "[1:a][md]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95,pan=stereo|c0=c0|c1=c0[a]",
           "-map", "0:v", "-map", "[a]",
           "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "6M", "-bufsize", "12M", "-pix_fmt", "yuv420p",
           "-profile:v", "high", "-movflags", "+faststart",
           "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-shortest", OUT_VIDEO]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(nframes):
        t = f / FPS
        proc.stdin.write(render_frame(t, total, bgs, stripes).tobytes())
        if f % (FPS * 5) == 0:
            print(f"  rendu {t:5.1f}s / {total:.1f}s", flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("[ERREUR] encodage ffmpeg")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tts", choices=["espeak", "edge"], default="espeak")
    ap.add_argument("--voice-file", help="voix off externe (script complet lu d'une traite, ex. ElevenLabs)")
    ap.add_argument("--preview", type=float, nargs="*", help="rend seulement des PNG aux instants donnés")
    args = ap.parse_args()

    ensure_tools(args.tts)
    print("1/3 Voix off…")
    voice_wav, total = build_voiceover(args.tts, args.voice_file)
    print(f"    durée totale : {total:.1f} s  ->  {OUT_AUDIO}")
    with open(os.path.join(HERE, "timings.txt"), "w", encoding="utf-8") as fh:
        for s in SEGMENTS:
            fh.write(f"{s['t0']:6.2f}-{s['t1']:6.2f}  [{s['tag']}]  {s['sub']}\n")

    if args.preview is not None:
        bgs, stripes = prepare_segments()
        for t in args.preview:
            out = os.path.join(BUILD, f"preview_{t:05.1f}.png")
            render_frame(t, total, bgs, stripes).save(out)
            print("    aperçu :", out)
        return

    print("2/3 Rendu des images + mixage…")
    render_video(voice_wav, total)
    print(f"3/3 Terminé -> {OUT_VIDEO}")


if __name__ == "__main__":
    main()
