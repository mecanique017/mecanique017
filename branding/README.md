# branding — logo Canal Rouge

Ce dossier ajoute le logo **Canal Rouge** en filigrane sur toutes les vidéos TikTok, pour que personne ne puisse les reprendre sans la signature.

| Fichier | Rôle |
|---|---|
| `logo_canal_rouge_original.jpg` | Le logo d'origine (fond noir) |
| `logo_canal_rouge.png` | Le rond seul, sur fond transparent (généré) |
| `badge_canal_rouge.png` | Le badge incrusté : le rond, un liseré blanc et « CANAL ROUGE » dessous (généré) |
| `canal_rouge.py` | Le générateur du badge, la fonction de montage et l'outil en ligne de commande |

## Emplacement

Le badge se place **en haut à droite**, sous l'en-tête :

- à 288 px du haut et 42 px du bord droit ;
- le rond fait 124 px ;
- l'opacité est de 88 %.

À cet endroit, rien de l'interface TikTok ne le recouvre (ni les onglets en haut, ni les boutons à droite, ni la légende en bas). En plus, il **mord sur les extraits vidéo** : on ne peut pas l'enlever en recadrant sans couper le contenu.

Pour le déplacer ou le changer de taille, modifie `DIAMETRE`, `MARGE_DROITE`, `HAUT` et `OPACITE` en haut de `canal_rouge.py`, puis lance `python3 branding/canal_rouge.py` pour régénérer le badge.

## Utilisation

**Dans les nouveaux montages**, rien à faire : `tiktok_colonisation/montage_colonisation.py`, le modèle des prochaines vidéos, appelle déjà `appliquer_logo()` sur chaque image.

**Sur une vidéo déjà terminée**, n'importe laquelle :

```bash
python3 branding/canal_rouge.py tiktok_knafo/tiktok_knafo.mp4             # -> tiktok_knafo_logo.mp4
python3 branding/canal_rouge.py ma_video.mp4 ma_video_signee.mp4
```

Le son est recopié tel quel. Le badge s'adapte à la largeur de la vidéo, quelle qu'elle soit.
