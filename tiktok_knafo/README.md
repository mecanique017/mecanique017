# tiktok_knafo — « Knafo veut supprimer le ministère des Sports »

Il s'agit d'une vidéo TikTok verticale (1080x1920, 30 fps) construite autour de l'extrait du Signal Z du 3 novembre 2026, fourni par l'utilisateur. Dans cet extrait, Sarah Knafo propose un exécutif de 10 ministres et la suppression du ministère des Sports.

## Propos rapportés (son d'origine)

- 0 – 9,5 s : « Ce n'est pas une plaisanterie, mais je veux supprimer le ministère des Sports. »
- 39,8 – 50,8 s : « Vous avez les États-Unis qui n'ont pas de ministre des Sports et pourtant ça ne les empêche pas de gagner énormément de médailles. Ce n'est pas le ministre des Sports qui marque les buts de l'équipe de France. »

## Sources

| Affirmation | Source |
|---|---|
| Le comité olympique américain est « entièrement financé par des fonds privés » | usopc.org, page « About the USOPC » |
| Paris 2024 : 64 médailles dont 16 en or, record ; préparation par l'Agence nationale du sport | ANS ; évaluation de la stratégie « Ambition Bleue » (sports.gouv.fr) |
| 17,2 millions de licences sportives en 2024 (record) | INJEP / CNOSF |
| Programme « Sport » : 554 M€ en crédits de paiement en 2026 (-6,5 %), Pass'Sport -35,8 M€ | Sénat, avis budgétaire PLF 2026 « Sport » |
| 1 € investi dans le sport = au moins 1,73 € d'économie publique | Sénat, même rapport |
| Sarah Knafo : énarque, magistrate à la Cour des comptes, eurodéputée | Wikipédia ; CV officiel du Parlement européen |

## Rendu

```bash
python3 generer_voix_edge.py                                   # voix off (edge-tts, Henri) -> build/voix_edge.wav
python3 montage_knafo.py --voice-file build/voix_edge.wav
```

La vidéo source et les MP4 ne sont pas versionnés.
