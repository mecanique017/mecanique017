"""Extrait les pages prompt-motion.com déjà scrapées (transcript Claude + fichiers tool-results)
et écrit prompts.json + PROMPTS.md. Usage : python3 extraire.py"""
import json, glob, os, re
BASE = "/root/.claude/projects/-home-user-mecanique017"
OUT = os.path.dirname(os.path.abspath(__file__))
pages = {}

def take(obj):
    if isinstance(obj, dict) and "markdown" in obj and isinstance(obj.get("metadata"), dict):
        url = obj["metadata"].get("sourceURL") or obj["metadata"].get("url") or ""
        if "prompt-motion.com/" in url and obj["markdown"].startswith("[All videos]"):
            pages[url.rstrip("/")] = obj

def scan_text(s):
    s = s.strip()
    if s.startswith("{") and '"markdown"' in s:
        try: take(json.loads(s))
        except Exception: pass

for f in glob.glob(BASE + "/*.jsonl"):
    for line in open(f, encoding="utf-8"):
        if "prompt-motion.com" not in line: continue
        try: ev = json.loads(line)
        except Exception: continue
        c = ev.get("message", {}).get("content")
        if not isinstance(c, list): continue
        for part in c:
            if part.get("type") != "tool_result": continue
            cc = part.get("content")
            if isinstance(cc, str): scan_text(cc)
            elif isinstance(cc, list):
                for x in cc:
                    if x.get("type") == "text": scan_text(x.get("text", ""))
for f in glob.glob(BASE + "/*/tool-results/*.txt"):
    try: scan_text(open(f, encoding="utf-8").read())
    except Exception: pass

def parse(url, o):
    md = o["markdown"]; m = o["metadata"]
    title = m.get("ogTitle") or m.get("og:title") or ""
    handle = (re.search(r"\n\n(@[^\n]+)\n\n\[View post", md) or [None, ""])[1].replace("\\_", "_")
    post = (re.search(r"\[View post[^\]]*\]\(([^)]+)\)", md) or [None, ""])[1]
    tags = re.findall(r"- \[([^\]]+)\]\(https://prompt-motion.com/tags/", md)
    template = (re.search(r"\(https://prompt-motion.com/(templates/[^)]+)\)", md) or [None, ""])[1]
    kind, body = "prompt", ""
    if "\n## Prompt\n" in md:
        body = md.split("\n## Prompt\n", 1)[1]
        body = re.sub(r"^.*?CopiedCopy\n\n", "", body, count=1, flags=re.S)
        body = re.split(r"\n\nThis prompt was taken directly|\n\nModel", body)[0]
    elif "\n## Skill\n" in md:
        kind = "skill"; body = md.split("\n## Skill\n", 1)[1]
        body = re.split(r"\n\nModel", body)[0].replace("CopiedCopy", "")
    if "/templates/" in url:
        kind = "template"
        body = md.split("## Improved prompt", 1)[1]
        body = body.split("[Customize this prompt]")[0].replace("CopiedCopy", "")
    body = body.replace("\\_", "_").replace("\\[", "[").replace("\\]", "]").replace("\\|", "|").strip()
    meta = dict(re.findall(r"\n\n(Model|Effort|Iterations|Stack|Posted)([^\n]+)", md))
    return dict(url=url, title=title, auteur=handle, post=post, type=kind, tags=tags,
                template=template, prompt=body, **{k.lower(): v for k, v in meta.items()})

items = sorted((parse(u, o) for u, o in pages.items()), key=lambda d: (d["type"] != "template", d["url"]))
json.dump(items, open(os.path.join(OUT, "prompts.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(items), "pages ;", sum(1 for i in items if i["prompt"]), "avec texte")

# ---------- PROMPTS.md ----------
from collections import Counter, defaultdict
norm = lambda t: re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()
cnt = Counter(norm(i["prompt"]) for i in items)
def bloc(i):
    meta = " · ".join(x for x in [i["auteur"], i.get("stack",""), i.get("effort","") and "effort "+i["effort"], i.get("posted","")] if x)
    tags = ", ".join(i["tags"])
    out = [f"### {i['title']}"]
    ligne = " — ".join(x for x in [meta and f"*{meta}*", tags and f"tags : {tags}"] if x)
    if ligne: out.append(ligne)
    out.append(f"Source : {i['url']}")
    if i["post"]: out.append(f"Post d'origine : {i['post']}")
    out += ["", "```text", i["prompt"], "```", ""]
    return "\n".join(out)
tpl = [i for i in items if i["type"]=="template"]
skills = [i for i in items if i["type"]=="skill"]
prompts = [i for i in items if i["type"]=="prompt"]
seen=set(); uniq=[]
for i in sorted(prompts, key=lambda d: -len(d["prompt"])):
    k=norm(i["prompt"])
    if k in seen: continue
    seen.add(k); uniq.append(i)
longs=[i for i in uniq if len(i["prompt"])>=600]
courts=[i for i in uniq if len(i["prompt"])<600]
L=["# Prompts motion design — prompt-motion.com","",
   f"Collecte du 05/11/2026 : **{len(items)} pages** ({len(prompts)} prompts, {len(skills)} skills, {len(tpl)} template). "
   f"Après suppression des doublons, il reste **{len(uniq)} prompts différents**. Les données brutes sont dans `prompts.json`.","",
   "Les textes sont recopiés tels quels (souvent en anglais) et appartiennent à leurs auteurs : le lien vers le post d'origine est donné pour chacun.","",
   "## Sommaire","- [1. Template amélioré (showreel)](#1-template-amélioré-showreel)",
   "- [2. Prompts détaillés (les plus utiles)](#2-prompts-détaillés-les-plus-utiles)",
   "- [3. Skills Claude Code](#3-skills-claude-code)","- [4. Prompts courts](#4-prompts-courts)","",
   "## 1. Template amélioré (showreel)",""]
L += [bloc(i) for i in tpl]
L += ["## 2. Prompts détaillés (les plus utiles)","","Ce sont des cahiers des charges complets : direction artistique, timeline, build, pièges. Ils sont classés du plus long au plus court.",""]
L += [bloc(i) for i in longs]
L += ["## 3. Skills Claude Code","","Il s'agit de compétences à installer, pas de prompts.",""]
L += [bloc(i) for i in skills]
L += ["## 4. Prompts courts",""]
for i in courts:
    n=cnt[norm(i["prompt"])]
    if n>1: i=dict(i, title=i["title"]+f" (utilisé {n} fois)")
    L.append(bloc(i))
open(os.path.join(OUT,"PROMPTS.md"),"w",encoding="utf-8").write("\n".join(L))
print("uniques", len(uniq), "longs", len(longs), "courts", len(courts), "skills", len(skills))
