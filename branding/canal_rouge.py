"""Logo « Canal Rouge » en filigrane sur les vidéos TikTok (protection anti-vol).

Langage : Python 3 (Pillow + NumPy, FFmpeg pour la version ligne de commande).

Deux usages :
  1. Dans un script de montage (rendu image par image) :
         from canal_rouge import appliquer_logo
         arr = appliquer_logo(arr)          # arr = image numpy RVB 1080x1920 (uint8)
  2. Sur une vidéo déjà terminée (n'importe laquelle, même ancienne) :
         python3 branding/canal_rouge.py ma_video.mp4             -> ma_video_logo.mp4
         python3 branding/canal_rouge.py ma_video.mp4 sortie.mp4

Le badge (rond rouge + « CANAL ROUGE ») est placé en haut à droite, sous l'en-tête,
à un endroit que l'interface TikTok ne recouvre pas, et il mord sur les extraits vidéo :
impossible de le retirer en recadrant sans couper le contenu.
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "logo_canal_rouge_original.jpg")   # logo fourni (fond noir)
LOGO_PNG = os.path.join(HERE, "logo_canal_rouge.png")          # rond seul, fond transparent
BADGE_PNG = os.path.join(HERE, "badge_canal_rouge.png")        # rond + nom, prêt à incruster (fonds sombres)
BADGE_CLAIR_PNG = os.path.join(HERE, "badge_canal_rouge_clair.png")  # variante pour fonds clairs (texte bleu nuit)
FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"

# --- réglages (modifiables) -------------------------------------------------
W, H = 1080, 1920
DIAMETRE = 124          # taille du rond en pixels sur une vidéo 1080x1920
MARGE_DROITE = 42
HAUT = 288              # sous l'en-tête (étiquette + ligne « Sources »)
OPACITE = 0.88


def creer_logo():
    """Découpe le rond du logo d'origine et le rend transparent autour (bord lissé)."""
    src = Image.open(SOURCE).convert("RGB")
    a = np.asarray(src).astype(int)
    rouge = (a[..., 0] > 150) & (a[..., 1] < 80) & (a[..., 2] < 80)
    # le rond = le premier bloc continu de lignes rouges (on ignore le slogan et le trait dessous)
    lignes = np.nonzero(rouge.sum(1) > 40)[0]
    fin = lignes[np.nonzero(np.diff(lignes) > 1)[0][0]] if np.any(np.diff(lignes) > 1) else lignes[-1]
    y0, y1 = lignes[0], fin
    xs = np.nonzero(rouge[y0:y1 + 1].any(0))[0]
    cx, cy = (xs.min() + xs.max()) / 2, (y0 + y1) / 2
    r = max(xs.max() - xs.min(), y1 - y0) / 2 + 1
    box = (int(cx - r), int(cy - r), int(cx + r), int(cy + r))
    rond = src.crop(box).resize((512, 512), Image.LANCZOS).convert("RGBA")
    # masque circulaire anticrénelé (suréchantillonné x4)
    m = Image.new("L", (2048, 2048), 0)
    ImageDraw.Draw(m).ellipse([6, 6, 2041, 2041], fill=255)
    rond.putalpha(m.resize((512, 512), Image.LANCZOS))
    rond.save(LOGO_PNG)
    return rond


def creer_badge(clair=False):
    """Rond + « CANAL ROUGE » dessous, avec une ombre pour rester lisible sur tous les fonds.
    clair=True : variante pour fond blanc (nom en bleu nuit, ombre légère)."""
    rond = Image.open(LOGO_PNG) if os.path.exists(LOGO_PNG) else creer_logo()
    f = ImageFont.truetype(FONT, 25)
    nom = "CANAL ROUGE"
    tw = int(ImageDraw.Draw(Image.new("L", (1, 1))).textlength(nom, font=f))
    bw, bh = max(DIAMETRE, tw) + 24, DIAMETRE + 48
    badge = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    # ombre portée
    ombre = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    od = ImageDraw.Draw(ombre)
    x0 = (bw - DIAMETRE) // 2
    od.ellipse([x0 + 2, 6, x0 + DIAMETRE + 2, DIAMETRE + 6], fill=(0, 0, 0, 90 if clair else 170))
    if not clair:
        od.text((bw / 2 + 2, DIAMETRE + 28), nom, font=f, fill=(0, 0, 0, 220), anchor="mm")
    badge.alpha_composite(ombre.filter(ImageFilter.GaussianBlur(4)))
    # liseré blanc + rond
    d = ImageDraw.Draw(badge)
    d.ellipse([x0 - 3, 1, x0 + DIAMETRE + 3, DIAMETRE + 7], fill=(255, 255, 255, 235))
    badge.alpha_composite(rond.resize((DIAMETRE, DIAMETRE), Image.LANCZOS), (x0, 4))
    d.text((bw / 2, DIAMETRE + 26), nom, font=f, fill=(0, 35, 95, 255) if clair else (255, 255, 255, 255), anchor="mm")
    if OPACITE < 1:
        badge.putalpha(badge.getchannel("A").point(lambda v: int(v * OPACITE)))
    badge.save(BADGE_CLAIR_PNG if clair else BADGE_PNG)
    return badge


def position(badge, w=W):
    return w - MARGE_DROITE - badge.width, HAUT


_cache = {}


def appliquer_logo(arr, clair=False):
    """Incruste le badge sur une image numpy RVB (H, W, 3) uint8 et la renvoie.
    clair=True pour les vidéos sur fond blanc."""
    cle = "clair" if clair else "b"
    if cle not in _cache:
        png = BADGE_CLAIR_PNG if clair else BADGE_PNG
        b = Image.open(png) if os.path.exists(png) else creer_badge(clair)
        rgba = np.asarray(b).astype(np.float32)
        _cache[cle] = (rgba[..., :3], rgba[..., 3:] / 255.0, position(b, arr.shape[1]))
    rgb, al, (x, y) = _cache[cle]
    h, w = al.shape[:2]
    zone = arr[y:y + h, x:x + w].astype(np.float32)
    arr = arr.copy() if not arr.flags.writeable else arr
    arr[y:y + h, x:x + w] = (zone * (1 - al) + rgb * al).astype(np.uint8)
    return arr


def filigraner_video(entree, sortie=None):
    """Ajoute le badge sur une vidéo existante (le son est recopié tel quel)."""
    if sortie is None:
        base, ext = os.path.splitext(entree)
        sortie = f"{base}_logo{ext or '.mp4'}"
    if not os.path.exists(BADGE_PNG):
        creer_badge()
    b = Image.open(BADGE_PNG)
    # largeur réelle de la vidéo -> mise à l'échelle du badge (la taille est pensée pour 1080 px)
    vw = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                             "stream=width", "-of", "csv=p=0", entree], capture_output=True, text=True).stdout.strip())
    k = vw / W
    x, y = position(b)
    filtre = (f"[1:v]scale={int(b.width * k)}:-1[l];"
              f"[0:v][l]overlay={int(x * k)}:{int(y * k)}:format=auto,format=yuv420p[v]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", entree, "-i", BADGE_PNG,
                    "-filter_complex", filtre, "-map", "[v]", "-map", "0:a?",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "4500k", "-bufsize", "9M",
                    "-c:a", "copy", "-movflags", "+faststart", sortie], check=True)
    print(f"[OK] {sortie}")
    return sortie


if __name__ == "__main__":
    if len(sys.argv) < 2:
        creer_logo()
        creer_badge()
        creer_badge(clair=True)
        print(f"[OK] {LOGO_PNG}\n[OK] {BADGE_PNG}\n[OK] {BADGE_CLAIR_PNG}")
        print("Usage : python3 branding/canal_rouge.py video.mp4 [sortie.mp4]")
    else:
        filigraner_video(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
