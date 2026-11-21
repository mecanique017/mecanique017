# tiktok_serment — « Un sénateur musulman, "pas normal" ? On vérifie »

Il s'agit d'une vidéo TikTok verticale (1080x1920, 30 fps) construite autour d'une vidéo TikTok de @streetnews_ fournie par l'utilisateur. L'influenceur y réagit à l'élection d'Abdul El-Sayed : serment « sur le Coran », « base catholique » des États-Unis, « un problème qu'un musulman soit venu à la tête d'un job de sénateur ».

## Extraits (son d'origine)

- 31,4 – 40,7 s : « Le pire, c'est que JD Vance va lui faire prêter serment sur le Coran. S'il vous plaît. »
- 45,3 – 57,9 s : « À la base, les États-Unis, c'est pas un pays islamique… on est supposé avoir une base catholique. »
- 57,9 – 68,7 s : « C'est un problème qu'un musulman soit venu à la tête… d'un job de sénateur. »

## Sources

| Affirmation | Source |
|---|---|
| Le vice-président fait prêter serment aux sénateurs ; on jure de défendre la Constitution | Constitution des États-Unis, art. VI (congress.gov) ; CBS News, discours de victoire |
| 2007 : Keith Ellison prête serment sur le Coran de Thomas Jefferson | Bibliothèque du Congrès, communiqué 07-001 |
| 19 % de catholiques, 40 % de protestants, 1,2 % de musulmans | Pew Research Center, Religious Landscape Study (02/2025) |
| « No religious Test shall ever be required… » (1787) | constitution.congress.gov, art. VI, clause 3 |

## Choix éditoriaux

- L'influenceur n'est pas nommé : seul le compte est crédité.
- La vidéo ne dit pas qu'El-Sayed jurera sur le Coran, car il ne l'a pas annoncé. Elle explique que ce serait légal et déjà arrivé.

## Rendu

```bash
python3 generer_voix_edge.py
python3 montage_serment.py --voice-file build/voix_edge.wav
```
