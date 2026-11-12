#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Montage TikTok — Trappes, VERSION 2 : plus d'animation + effets sonores
======================================================================

Langage : Python 3 (Pillow + NumPy) + FFmpeg.
Réutilise le moteur de `montage_trappes.py` (script, photos, voix, alignement, sous-titres)
et remplace uniquement le RENDU des images et le MIXAGE audio.

Nouveautés visuelles (par séquence) :
  - transition « glitch » (décalage RVB + tranches horizontales) + balayage rouge
  - « zoom punch » sur la photo à chaque coupe
  - gros titres en « slam » (arrivée en grand, écrasement, secousse caméra)
    ou mot par mot ; compteurs animés pour les chiffres (0 → 128, 0 → 12…)
  - bandeau secondaire tapé à la machine (curseur clignotant)
  - vignette rouge qui pulse sur le battement de cœur, lignes de balayage, grain

Nouveautés sonores (synthétisées, libres de droits) :
  - « whoosh » avant chaque coupe, impact grave sur chaque titre
  - grésillement « glitch », cliquetis de machine à écrire, tic de compteur
  - montée (« riser ») avant la conclusion, coup sourd sur « LES MOTS TUENT »

Usage :
  python3 montage_trappes_v2.py --voice-file build/voix_fast.wav
  python3 montage_trappes_v2.py --voice-file build/voix_fast.wav --preview 3 12 30
"""

import argparse
import math
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

import montage_trappes as m   # moteur commun (même dossier)

W, H, FPS, SR = m.W, m.H, m.FPS, m.SR
OUT_VIDEO = os.path.join(m.HERE, "tiktok_trappes_racisme_v2.mp4")

RED = (225, 20, 30)
WHITE = (255, 255, 255)

# Animation du gros titre par séquence : "slam" | "words" | "count"
ANIM = {0: "slam", 1: "words", 2: "count", 3: "count", 4: "slam", 5: "slam", 6: "slam",
        7: "count", 8: "words", 9: "slam", 10: "words", 11: "slam", 12: "slam", 13: "words"}

GLITCH_T = 0.16      # durée de la transition glitch (s)
SLAM_T = 0.18        # durée de l'arrivée du titre (s)
TYPE_DELAY = 0.30    # début de la frappe du bandeau (s)
TYPE_CPS = 38        # caractères par seconde du bandeau

# Lignes de balayage (précalculées)
SCAN = np.ones((H, 1, 1), np.float32)
SCAN[::4] = 0.90
# Vignette (précalculée) pour la pulsation rouge
_yy, _xx = np.mgrid[0:H, 0:W]
VIGN = (((_xx - W / 2) / (W / 2)) ** 2 + ((_yy - H / 2) / (H / 2)) ** 2).astype(np.float32)
VIGN = np.clip(VIGN - 0.35, 0, 1)[..., None]
del _yy, _xx


# ---------------------------------------------------------------------------
# OUTILS D'ANIMATION
# ---------------------------------------------------------------------------
def clamp01(x):
    return min(max(x, 0.0), 1.0)


def heartbeat(t):
    """Intensité 0..1 calée sur le « boum-boum » de la musique (temps entiers et +0,22 s)."""
    ph = t % 1.0
    return max(math.exp(-ph * 9), 0.6 * math.exp(-max(ph - 0.22, 0) * 9) if ph >= 0.22 else 0)


def count_text(big, p):
    """Remplace le premier nombre du titre par sa valeur animée (0 → N)."""
    mt = re.search(r"\d+", big)
    if not mt:
        return big
    n = int(mt.group())
    v = int(round(n * (1 - (1 - p) ** 3)))
    return big[:mt.start()] + str(v) + big[mt.end():]


def render_big_layer(text, fnt):
    """Calque RGBA du gros titre (ombre rouge + contour noir), recadré au plus juste."""
    tmp = Image.new("RGBA", (W, 900), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    m.draw_text_center(d, W / 2 + 10, 450 + 12, text, fnt, m.SHADOW_RGB + (255,), spacing=-10)
    m.draw_text_center(d, W / 2, 450, text, fnt, WHITE + (255,), stroke=4, stroke_fill=(0, 0, 0), spacing=-10)
    bb = tmp.getbbox() or (0, 0, 1, 1)
    return tmp.crop(bb)


_BIG_CACHE = {}


def big_layer_for(i, text, fnt):
    key = (i, text)
    if key not in _BIG_CACHE:
        _BIG_CACHE[key] = render_big_layer(text, fnt)
    return _BIG_CACHE[key]


def paste_scaled(img, layer, cx, cy, scale, alpha=1.0):
    """Colle `layer` centré en (cx, cy), mis à l'échelle et avec opacité."""
    if scale <= 0.01 or alpha <= 0.01:
        return
    lw, lh = max(1, int(layer.width * scale)), max(1, int(layer.height * scale))
    lay = layer.resize((lw, lh), Image.BILINEAR) if abs(scale - 1) > 0.01 else layer
    if alpha < 0.99:
        a = lay.getchannel("A").point(lambda v: int(v * alpha))
        lay = lay.copy()
        lay.putalpha(a)
    img.alpha_composite(lay, (int(cx - lw / 2), int(cy - lh / 2))) if (
        cx - lw / 2 >= 0 and cy - lh / 2 >= 0 and cx + lw / 2 <= W and cy + lh / 2 <= H) else \
        img.paste(lay, (int(cx - lw / 2), int(cy - lh / 2)), lay)


def glitch(arr, k, seed):
    """Décalage RVB + tranches horizontales déplacées ; k = intensité 0..1."""
    if k <= 0:
        return arr
    rng = np.random.default_rng(seed)
    dx = int(28 * k)
    out = arr.copy()
    out[..., 0] = np.roll(arr[..., 0], dx, axis=1)
    out[..., 2] = np.roll(arr[..., 2], -dx, axis=1)
    for _ in range(int(10 * k) + 2):
        y = int(rng.integers(0, H - 80))
        h = int(rng.integers(12, 90))
        out[y:y + h] = np.roll(out[y:y + h], int(rng.integers(-120, 120) * k), axis=1)
    return out


# ---------------------------------------------------------------------------
# RENDU D'UNE IMAGE
# ---------------------------------------------------------------------------
def render_frame(t, total):
    i, seg = m.seg_at(t)
    local = t - seg["t0"]
    nxt = m.SEGMENTS[i + 1]["t0"] if i + 1 < len(m.SEGMENTS) else total
    dur = nxt - seg["t0"]
    acc = m.PAL[seg["pal"]][2]

    # --- 1. Photo de fond + zoom punch
    arr = m.photo_background(seg, i, local, dur)            # float32 (H, W, 3)
    punch = 1 + 0.14 * (1 - m.ease_out(local / 0.45))
    if punch > 1.002:
        im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        cw, ch = int(W / punch), int(H / punch)
        x0, y0 = (W - cw) // 2, (H - ch) // 2
        arr = np.asarray(im.crop((x0, y0, x0 + cw, y0 + ch)).resize((W, H), Image.BILINEAR)).astype(np.float32)

    # --- 2. Vignette rouge qui pulse sur le cœur + lignes de balayage + grain
    hb = heartbeat(t)
    arr = arr * (1 - VIGN * (0.55 + 0.25 * hb)) + VIGN * np.array(RED, np.float32) * (0.10 + 0.35 * hb)
    arr = arr * SCAN
    g = m.GRAIN[int(t * FPS) % len(m.GRAIN)].repeat(4, 0).repeat(4, 1) * 0.8
    arr = np.clip(arr + g, 0, 255).astype(np.uint8)

    # --- 3. Transition glitch + flash rouge en début de séquence
    if local < GLITCH_T and i > 0:
        k = 1 - local / GLITCH_T
        arr = glitch(arr, k, seed=int(t * FPS))
        arr = np.clip(arr * (1 - 0.45 * k) + np.array(m.FLASH_RGB) * 0.45 * k, 0, 255).astype(np.uint8)

    img = Image.fromarray(arr).convert("RGBA")
    d = ImageDraw.Draw(img)

    # --- 4. Balayage rouge diagonal (wipe) pendant la transition
    if i > 0 and local < 0.22:
        p = m.ease_out(local / 0.22)
        x = -W * 0.6 + p * W * 2.2
        d.polygon([(x, 0), (x + 160, 0), (x + 160 - 700, H), (x - 700, H)], fill=RED + (200,))

    # --- 5. Gros titre animé
    cy = H * 0.40
    anim = ANIM.get(i, "slam")
    big = seg["big"]
    big_f = m.fit_font(d, big, m.FONT_BLACK, 210, W - 120)
    shake = (0.0, 0.0)
    if anim == "count":
        p = clamp01(local / 0.9)
        txt = count_text(big, p)
        lay = big_layer_for(i, txt, big_f) if p >= 1 else render_big_layer(txt, big_f)
        s = 1 + 0.08 * math.sin(min(local, 0.9) / 0.9 * math.pi * 6) * (1 - p)
        paste_scaled(img, lay, W / 2, cy, s * m.ease_out_back(local / 0.25))
        if 0.9 <= local < 1.2:                                # mini-secousse à la fin du compteur
            a = 10 * (1 - (local - 0.9) / 0.3)
            shake = (a * math.sin(t * 95), a * math.cos(t * 80))
    elif anim == "words":
        lines = big.split("\n")
        lh = big_f.size * 0.95
        y_start = cy - (len(lines) - 1) * lh / 2
        k = 0
        for li, line in enumerate(lines):
            lay = big_layer_for(i * 100 + li, line, big_f)
            tt = local - 0.05 - li * 0.28
            k += 1
            if tt <= 0:
                continue
            sc = 1 + 1.3 * (1 - m.ease_out(tt / SLAM_T))
            paste_scaled(img, lay, W / 2, y_start + li * lh, sc, clamp01(tt / (SLAM_T * 0.6)))
            if tt < 0.3:
                a = 16 * (1 - tt / 0.3)
                shake = (a * math.sin(t * 90), a * math.cos(t * 75))
    else:  # slam
        lay = big_layer_for(i, big, big_f)
        tt = local - 0.04
        if tt > 0:
            sc = 1 + 1.6 * (1 - m.ease_out(tt / SLAM_T))
            if tt > SLAM_T:                                   # léger rebond après l'impact
                sc = 1 - 0.04 * math.exp(-(tt - SLAM_T) * 12) * math.cos((tt - SLAM_T) * 40)
            paste_scaled(img, lay, W / 2, cy, sc, clamp01(tt / (SLAM_T * 0.5)))
            if SLAM_T * 0.8 < tt < SLAM_T + 0.35:
                a = 22 * (1 - (tt - SLAM_T * 0.8) / 0.42)
                shake = (a * math.sin(t * 90), a * math.cos(t * 70))
    # « respiration » lente du titre sur le battement de cœur (déjà affiché)

    # --- 6. Bandeau secondaire tapé à la machine
    d = ImageDraw.Draw(img)
    big_box = d.multiline_textbbox((0, 0), big, font=big_f, spacing=-10)
    big_h = big_box[3] - big_box[1]
    if seg["small"]:
        s_f = m.fit_font(d, seg["small"], m.FONT_XBOLD, 60, W - 200)
        n = int(max(0.0, local - TYPE_DELAY) * TYPE_CPS)
        shown = seg["small"][:n]
        full_w = d.textlength(seg["small"], font=s_f)
        if n > 0:
            by = cy + big_h / 2 + 70
            bx = W / 2 - full_w / 2 - 30
            cur_w = d.textlength(shown, font=s_f)
            bg = acc if seg["pal"] != "blanc" else (245, 245, 245)
            fg = (255, 255, 255) if seg["pal"] != "blanc" else (0, 0, 0)
            d.rectangle([bx, by, bx + cur_w + 60, by + 96], fill=bg + (255,))
            d.text((bx + 30, by + 48), shown, font=s_f, fill=fg, anchor="lm")
            if n < len(seg["small"]) or int(t * 3) % 2 == 0:  # curseur clignotant
                d.rectangle([bx + 34 + cur_w, by + 18, bx + 42 + cur_w, by + 78], fill=fg)

    # --- 7. En-tête, sources, crédit photo, barre de progression
    head_f = m.font(m.FONT_XBOLD, 40)
    label = f"● {seg['tag']}"
    lw = d.textlength(label, font=head_f)
    blink = 255 if int(t * 2) % 2 == 0 else 120              # point « REC » qui clignote
    d.rounded_rectangle([60, 150, 60 + lw + 50, 220], radius=35, fill=(0, 0, 0, 180), outline=RED, width=3)
    d.text((85, 185), "●", font=head_f, fill=RED + (blink,), anchor="lm")
    d.text((85 + d.textlength("● ", font=head_f), 185), seg["tag"], font=head_f, fill=WHITE, anchor="lm")
    d.text((W - 60, 185), m.HEADER_RIGHT, font=m.font(m.FONT_BOLD, 38), fill=(255, 255, 255, 210), anchor="rm")
    d.text((60, 262), m.SOURCES_LINE, font=m.font(m.FONT_BOLD, 30), fill=(255, 255, 255, 150), anchor="lm")
    lieu, auteur, lic = m.PHOTOS[seg["photo"]]
    credit = f"Photo : {lieu} — {auteur} · {lic} · Wikimedia Commons"
    cf = m.font(m.FONT_BOLD, 24)
    d.rounded_rectangle([50, 296, 50 + d.textlength(credit, font=cf) + 30, 336], radius=12, fill=(0, 0, 0, 150))
    d.text((65, 316), credit, font=cf, fill=(255, 255, 255, 210), anchor="lm")
    d.rectangle([0, 0, W, 14], fill=(255, 255, 255, 40))
    d.rectangle([0, 0, W * min(t / total, 1), 14], fill=RED)

    # --- 8. Sous-titres karaoké (mot actif rouge + grossi)
    chunk = None
    for c in seg["chunks"]:
        if c["t0"] <= t < c["t1"] + m.GAP:
            chunk = c
    chunk = chunk or (seg["chunks"][0] if t < seg["t0"] + 0.01 else seg["chunks"][-1])
    sub_f = m.font(m.FONT_BLACK, 76)
    sub_big = sub_f   # même taille : le mot actif ressort par la couleur et un léger saut (pas de chevauchement)
    lines = m.wrap_words(d, chunk["words"], sub_f, W - 140)
    y = H * 0.74
    k = 0
    pop = m.ease_out_back((t - chunk["t0"]) / 0.18)
    for line in lines:
        x = W / 2 - d.textlength(" ".join(line), font=sub_f) / 2
        for w in line:
            active = chunk["wt"][k] <= t
            current = active and (k + 1 >= len(chunk["wt"]) or t < chunk["wt"][k + 1])
            f = sub_big if current else sub_f
            col = m.ACCENT_SUB if current else ((255, 255, 255) if active else (255, 255, 255, 140))
            dx = (d.textlength(w, font=sub_f) - d.textlength(w, font=f)) / 2   # grossi sur place, centré
            d.text((x + dx, y + (1 - pop) * 30 - (8 if current else 0)), w, font=f,
                   fill=col, stroke_width=7, stroke_fill=(0, 0, 0))
            x += d.textlength(w + " ", font=sub_f)
            k += 1
        y += 96

    out = img.convert("RGB")
    # --- 9. Secousse caméra globale
    if shake != (0.0, 0.0):
        a = np.asarray(out)
        a = np.roll(np.roll(a, int(shake[0]), axis=1), int(shake[1]), axis=0)
        out = Image.fromarray(a)
    return out


# ---------------------------------------------------------------------------
# EFFETS SONORES (synthèse NumPy)
# ---------------------------------------------------------------------------
RNG = np.random.default_rng(7)


def sfx_impact(gain=1.0):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (30 + 70 * np.exp(-t * 18)) * t) * np.exp(-t * 4.5)
    noise = RNG.standard_normal(n) * np.exp(-t * 35)
    noise = np.convolve(noise, np.ones(12) / 12, mode="same")    # passe-bas grossier
    return gain * (0.9 * sub + 0.5 * noise)


def sfx_whoosh(dur=0.38, gain=1.0):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * t) ** 2 * t ** 0.5
    noise = RNG.standard_normal(n)
    out = np.empty(n)
    y = 0.0
    for k in range(n):                       # passe-bas dont la coupure monte (effet de souffle)
        a = 0.02 + 0.35 * t[k]
        y += a * (noise[k] - y)
        out[k] = y
    return gain * out * env * 2.5


def sfx_glitch(dur=0.16, gain=1.0):
    n = int(dur * SR)
    out = np.zeros(n)
    pos = 0
    while pos < n:
        L = int(RNG.integers(int(0.008 * SR), int(0.025 * SR)))
        f = RNG.uniform(180, 2400)
        tt = np.arange(min(L, n - pos)) / SR
        out[pos:pos + len(tt)] = np.sign(np.sin(2 * np.pi * f * tt)) * RNG.uniform(0.2, 0.7)
        pos += L
    out = np.round(out * 6) / 6                       # « bitcrush »
    return gain * out * np.linspace(1, 0.3, n)


def sfx_tick(gain=1.0):
    n = int(0.012 * SR)
    x = RNG.standard_normal(n) * np.exp(-np.arange(n) / SR * 600)
    return gain * np.diff(np.concatenate([[0], x]))   # passe-haut → clic sec


def sfx_riser(dur=2.0, gain=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 80 * (2 ** (3 * t / dur))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    noise = np.convolve(RNG.standard_normal(n), np.ones(6) / 6, mode="same")
    env = (t / dur) ** 2
    return gain * env * (0.6 * tone + 0.4 * noise)


def place(track, clip, t):
    s = int(t * SR)
    if s < 0:
        clip, s = clip[-s:], 0
    e = min(len(track), s + len(clip))
    if e > s:
        track[s:e] += clip[:e - s]


def build_sfx(total, path):
    track = np.zeros(int(total * SR) + SR)
    for i, seg in enumerate(m.SEGMENTS):
        t0 = seg["t0"]
        if i > 0:
            place(track, sfx_whoosh(gain=0.55), t0 - 0.36)
            place(track, sfx_glitch(gain=0.22), t0)
        anim = ANIM.get(i, "slam")
        if anim == "slam":
            place(track, sfx_impact(gain=0.95), t0 + 0.04 + SLAM_T * 0.8)
        elif anim == "words":
            for li in range(len(seg["big"].split("\n"))):
                place(track, sfx_impact(gain=0.75), t0 + 0.05 + li * 0.28 + SLAM_T * 0.8)
        elif anim == "count":
            mt = re.search(r"\d+", seg["big"])
            nmax = int(mt.group()) if mt else 10
            last = -1
            for f in range(int(0.9 * FPS) + 1):               # un tic par valeur affichée qui change
                p = f / (0.9 * FPS)
                v = int(round(nmax * (1 - (1 - min(p, 1)) ** 3)))
                if v != last:
                    place(track, sfx_tick(gain=0.5), t0 + f / FPS)
                    last = v
            place(track, sfx_impact(gain=0.8), t0 + 0.9)
        if seg["small"]:                                       # machine à écrire
            for c in range(len(seg["small"])):
                if seg["small"][c] != " ":
                    place(track, sfx_tick(gain=0.28), t0 + TYPE_DELAY + c / TYPE_CPS)
    # Montée avant la conclusion + coup sourd sur « LES MOTS TUENT »
    place(track, sfx_riser(2.0, gain=0.35), m.SEGMENTS[-1]["t0"] - 2.0)
    i_mots = next(k for k, s in enumerate(m.SEGMENTS) if s["big"].startswith("LES MOTS"))
    place(track, sfx_impact(gain=1.0) * 1.2, m.SEGMENTS[i_mots]["t0"] + 0.33)
    track = track[: int(total * SR)]
    track = track / (np.max(np.abs(track)) + 1e-9) * 0.9
    m.write_wav(path, track.astype(np.float32))


# ---------------------------------------------------------------------------
# ASSEMBLAGE
# ---------------------------------------------------------------------------
def render_video(voice_wav, total):
    music = os.path.join(m.BUILD, "music_v2.wav")
    sfx = os.path.join(m.BUILD, "sfx_v2.wav")
    m.build_music(total, music)
    build_sfx(total, sfx)
    nframes = int(math.ceil(total * FPS))
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-i", voice_wav, "-i", music, "-i", sfx,
           "-filter_complex",
           # musique et effets passent sous la voix (ducking), effets un peu plus présents
           "[2:a]volume=0.10[m];[3:a]volume=0.32[s];[m][s]amix=inputs=2:normalize=0[bed];"
           "[bed][1:a]sidechaincompress=threshold=0.03:ratio=4:attack=15:release=250[bd];"
           "[1:a][bd]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95,"
           "pan=stereo|c0=c0|c1=c0[a]",
           "-map", "0:v", "-map", "[a]",
           "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "6M", "-bufsize", "12M",
           "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart",
           "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-shortest", OUT_VIDEO]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(nframes):
        proc.stdin.write(render_frame(f / FPS, total).tobytes())
        if f % (FPS * 5) == 0:
            print(f"  rendu {f / FPS:5.1f}s / {total:.1f}s", flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("[ERREUR] encodage ffmpeg")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice-file", required=True)
    ap.add_argument("--preview", type=float, nargs="*")
    args = ap.parse_args()
    os.makedirs(m.BUILD, exist_ok=True)
    print("1/3 Voix off…")
    voice_wav, total = m.build_voiceover("espeak", args.voice_file)
    m.prepare_segments()                    # photos + sous-titres
    if args.preview is not None:
        for t in args.preview:
            out = os.path.join(m.BUILD, f"v2_{t:05.2f}.png")
            render_frame(t, total).save(out)
            print("    aperçu :", out)
        return
    print("2/3 Rendu + effets sonores…")
    render_video(voice_wav, total)
    print(f"3/3 Terminé -> {OUT_VIDEO}")


if __name__ == "__main__":
    main()
