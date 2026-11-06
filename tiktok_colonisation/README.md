# tiktok_colonisation — « La colonisation, un bilan positif ? »

Il s'agit d'une vidéo-réponse TikTok verticale (1080x1920, 30 fps, environ 2 min) à une vidéo des éditions du Verbe Haut, dans laquelle Alain Pascal affirme :
- que la colonisation était « républicaine », « au nom des droits de l'Homme » ;
- que « le bilan est extrêmement positif » ;
- que « ce sont ces pays qui ont une dette à notre égard ».

## Extraits (son d'origine)

- 0 – 8,0 s : « La colonisation n'est pas chrétienne, elle est républicaine. C'est au nom des droits de l'Homme… »
- 14,2 – 18,8 s : « Mais nous, on a aussi la colonisation… le bilan est extrêmement positif. »
- 47,2 – 53,8 s : « Pour moi, la colonisation a été positive… ce sont ces pays qui ont une dette à notre égard. »

## Faits et sources

| Affirmation | Source |
|---|---|
| « Les races supérieures ont un droit vis-à-vis des races inférieures » | Jules Ferry, 28/07/1885 — Assemblée nationale, grands discours parlementaires |
| Code de l'indigénat (1887-1946) ; travail forcé aboli le 11/04/1946 | Wikipédia ; RFI (loi Houphouët-Boigny) |
| 1899 : massacre de Birni-N'Konni par la mission Voulet-Chanoine | Wikipédia ; HCDH (ONU), déclaration de Birni-N'Konni |
| Congo-Océan : 127 000 recrutés de force, 17 000 à 20 000 morts | Le Monde, 20/07/2021 ; Wikipédia ; A. Londres, « Terre d'ébène » (1929) |
| « Moins le Blanc est intelligent, plus le Noir lui paraît bête » | A. Gide, « Voyage au Congo » (1927) |
| Thiaroye, 01/12/1944 : massacre reconnu par E. Macron (lettre du 28/11/2024) | TV5Monde ; The Conversation |
| Madagascar 1947 : jusqu'à 89 000 morts (1er bilan, 1948) ; commission d'historiens en 2025 | Wikipédia ; Le Monde, 25/04/2025 |
| Cameroun 1955-1971 : une guerre, des dizaines de milliers de morts | Le Monde, 07/02/2025 ; rapport K. Ramondy (L'Histoire) |
| Franc CFA : 50 % des réserves au Trésor français jusqu'à la réforme de 2019-2020 | Le Monde, 21/12/2019 |
| Citation « Entre colonisateur et colonisé… » | A. Césaire, « Discours sur le colonialisme » (1950) — courte citation |
| Loi de 2005 « rôle positif », article abrogé en 2006 | Légifrance, loi n° 2005-158 ; histoirecoloniale.net |

## Rendu

```bash
python3 generer_voix_edge.py
python3 montage_colonisation.py --voice-file build/voix_edge.wav
```
