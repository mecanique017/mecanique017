#!/usr/bin/env python3
"""Regenere sitemap.xml a partir des pages HTML du site.

- Ignore les pages marquees <meta name="robots" content="noindex">
  (admin, 404, outils internes...).
- Ajoute automatiquement chaque article du dossier blog/.
- <lastmod> = date du dernier commit git de la page (ou date du jour).

Usage : python3 .github/scripts/generate_sitemap.py   (depuis la racine du depot)
"""
import re
import subprocess
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

BASE_URL = "https://garage-mecanique17.fr/"
ROOT = Path(__file__).resolve().parents[2]

# Priorite / frequence par page ; les autres pages prennent DEFAULT.
RULES = {
    "index.html": ("weekly", "1.0"),
    "tarifs.html": ("monthly", "0.9"),
    "en.html": ("monthly", "0.8"),
    "depannage.html": ("monthly", "0.8"),
    "vehicules-occasion.html": ("weekly", "0.8"),
    "voyants.html": ("monthly", "0.7"),
    "blog.html": ("weekly", "0.7"),
    "suivi.html": ("monthly", "0.6"),
    "bon-cadeau.html": ("monthly", "0.5"),
}
DEFAULT = ("monthly", "0.5")
BLOG = ("yearly", "0.6")

NOINDEX = re.compile(r'<meta[^>]+name=["\']robots["\'][^>]+noindex', re.I)


def last_modified(path: Path) -> str:
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", str(path.relative_to(ROOT))],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
        if out:
            return out
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    return date.today().isoformat()


def indexable(path: Path) -> bool:
    return not NOINDEX.search(path.read_text(encoding="utf-8", errors="ignore"))


def main() -> None:
    entries = []
    pages = sorted(ROOT.glob("*.html"), key=lambda p: (p.name != "index.html", p.name))
    for page in pages:
        if not indexable(page):
            continue
        loc = BASE_URL if page.name == "index.html" else BASE_URL + page.name
        entries.append((loc, page, *RULES.get(page.name, DEFAULT)))

    for article in sorted((ROOT / "blog").glob("*.html")):
        if indexable(article):
            entries.append((BASE_URL + "blog/" + article.name, article, *BLOG))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, path, freq, prio in entries:
        lines.append(
            f"  <url><loc>{escape(loc)}</loc><lastmod>{last_modified(path)}</lastmod>"
            f"<changefreq>{freq}</changefreq><priority>{prio}</priority></url>"
        )
    lines.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"sitemap.xml : {len(entries)} URL")


if __name__ == "__main__":
    main()
