# Prompt type pour mes vidéos TikTok

Ce prompt reprend les techniques qui reviennent dans les meilleurs prompts de prompt-motion.com (@twoclipping, @notdwd, @rossaxbt, @techhalla, @demonugc et le template « showreel »), adaptées à mes vidéos : format vertical, voix off, sources à l'écran.

Il suffit de remplacer ce qui est entre `[crochets]`.

```text
<inputs>
Sujet : [SUJET]. Angle : [ANGLE / CAMP]. Durée : [60-90] s.
Script voix off : [COLLER LE SCRIPT, une phrase par ligne] (ou : écris-le toi-même, sourcé).
Sources à afficher : [LIENS].
Médias fournis : [photos / extraits vidéo, ou « aucun »].
Musique : génère-la en code, ou utilise [piste libre de droits ~120 BPM avec un drop].
Si un élément manque, prends une valeur par défaut raisonnable et dis-le moi.
</inputs>

<direction>
Vidéo TikTok verticale 1080x1920, 30 ou 60 fps, plan-séquence continu : chaque scène naît de la précédente
(un mot devient une forme, une carte s'ouvre sur la scène suivante, une couleur envahit l'écran puis se contracte).
Une seule police d'affichage grasse (Anton ou Archivo Black) et une police texte (Inter ou Geist).
Palette : 2 couleurs maximum, plus le noir et le blanc.
Sous-titres cinétiques mot par mot, calés sur la voix, avec les mots-clés surlignés.
Accroche dans la première seconde. Une idée par plan. Rien ne reste immobile plus de 0,8 s.
Chaque chiffre ou citation affiche une carte « Source : … » lisible au moins 1,5 s.
Interdit : fondus enchaînés partout, particules gratuites, glow, tremblements permanents,
easing rebondissant, texte collé dans les coins, chiffres inventés.
</direction>

<structure>
Grille à 120 BPM : il se passe quelque chose sur chaque temps.
0-2 s : accroche (question ou chiffre choc).
Puis une séquence par idée du script, chacune avec son geste visuel (compteur, carte de vote, frise, balance…).
Drop musical sur la révélation principale.
Fin : appel à l'action et logo.
Logo Canal Rouge (branding/badge_canal_rouge.png) en haut à droite sous l'en-tête, sur TOUTES les images, extraits compris (anti-vol). La dernière image rejoint la première pour boucler.
</structure>

<build>
1. Une seule page HTML (ou un script Python Pillow + NumPy) : chaque image est une fonction pure du temps, seek(t).
   Pas de transitions CSS, pas de timers, aucun état gardé d'une image à l'autre.
2. Springs en forme fermée : chaque changement de cible ajoute son propre ressort.
3. Voix off : découpe-la phrase par phrase et aligne les sous-titres sur les attaques mesurées.
   Raccourcis les pauses de plus de 0,3 s.
4. Son : musique sous la voix en sidechain (la voix 9 dB au-dessus) et un effet par événement, placé sur son pic mesuré.
   Normalisation à -14 LUFS.
5. Rendu avec Playwright (ou par pipe vers FFmpeg) avec 4 sous-images par image fusionnées par tmix pour le flou de mouvement,
   encodage H.264 yuv420p et piste AAC.
6. Avant le rendu complet, sors une image par temps fort et corrige ce qui déborde, se chevauche ou est illisible.
   Après le rendu, cherche les sauts d'une seule image.
</build>

<gotchas>
Texte trop long → réduire la taille de la police, ne jamais le laisser sortir du cadre. Emoji → police NotoColorEmoji.
Une couleur qui envahit l'écran doit dépasser les quatre coins et durer environ 0,3 s, sinon elle fait un flash.
Les apostrophes et le formatage autour des mots-clés ne doivent jamais apparaître à l'écran.
</gotchas>

<start>
Montre-moi d'abord le découpage temps par temps et 4 images clés, puis fabrique la vidéo sans autre question.
Livre le MP4, une version légère (< 20 Mo), le code et le script découpé.
</start>
```

## Les prompts dont il s'inspire (voir `PROMPTS.md`)

| Technique | Prompt d'origine |
|---|---|
| Plan-séquence, débordement de couleur, morphing | @twoclipping, « Photo print app launch film » |
| Une forme qui traverse toutes les scènes | @demonugc / @twoclipping, « Morphing UI states » |
| Voix off alignée mot par mot, sidechain | @rossaxbt, « Ora 2 launch film » |
| Typo cinétique, palette stricte, misregistration | @techhalla, « Kinetic type bumper » |
| Discours construit en typographie | @Gdgtify, « Speech built as architecture » |
| Rendu frame par frame et contrôle par temps | template « The showreel prompt » |
