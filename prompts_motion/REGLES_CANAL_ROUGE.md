# Règles Canal Rouge — à appliquer à CHAQUE nouvelle vidéo TikTok

Ces règles viennent de l'audit du compte @kopp3051 du 10/11/2026 (30 vidéos analysées) et des consignes de l'utilisateur. Elles priment sur les anciennes habitudes de montage.

## 1. Constat de départ

- La médiane est de 358 vues : la plupart des vidéos ne dépassent pas le premier groupe test de TikTok (environ 300 personnes). Le problème vient des 3 premières secondes, pas du fond.
- Les succès du compte :
  - Mélenchon recadre Larcher, extrait brut : 19 805 vues ;
  - Riner « à qui profite sa candidature » : 13 534 vues ;
  - « Encore une autre victime » : 4 399 vues, 16 % de likes.
- Ce qui marche :
  - l'actu chaude traitée le jour même ;
  - une personnalité très recherchée avec un angle tranché, formulé en question ;
  - les extraits bruts et courts de clash ;
  - l'émotion forte.

## 2. Montage

1. **Accroche à la première seconde** : la phrase la plus choquante de l'extrait, ou le chiffre choc, apparaît tout de suite, avec un gros texte à l'écran. Jamais de phrase de présentation en ouverture (« Dans ce podcast… », « Regardez… »).
2. **Durée par défaut : 60 à 90 secondes.** Les exceptions :
   - si l'utilisateur demande une durée précise, on la respecte ;
   - pour un gros sujet, proposer une série (partie 1/2/3) plutôt qu'une vidéo de 2 min 30.
3. **Style visuel par défaut : fond blanc, couleurs bleu-blanc-rouge**, avec le logo Canal Rouge en version claire :
   - bleu `#0055A4`, rouge `#EF4135`, texte bleu nuit ;
   - appel du logo : `appliquer_logo(arr, clair=True)` ;
   - moteur de référence : `tiktok_reaction/montage_reaction.py`.
4. **Logo Canal Rouge sur toutes les images**, extraits compris. Ne pas l'ajouter après coup sur d'anciennes vidéos, sauf demande.
5. **Voix** : edge-tts `fr-FR-HenriNeural`, débit +8 %. La voix Kokoro est jugée trop robotique.
6. **Sources** : chaque chiffre ou citation a sa source à l'écran.
7. **Extraits** : toujours crédités (droit de citation).
8. **Appel à s'abonner et à partager AU MILIEU de la vidéo** (demande de l'utilisateur, 10/11/2026), en plus de l'appel final :
   - le placer vers 40 à 55 % de la durée, juste après un fait fort, pas dans les 10 premières secondes ;
   - une phrase courte en voix off, par exemple : « Si tu apprends quelque chose, abonne-toi et partage. La suite va te surprendre. » ;
   - un bandeau « ABONNE-TOI · PARTAGE » à l'écran pendant 2 à 3 secondes ;
   - il ne doit pas casser le rythme : l'enchaîner avec une promesse sur la suite.
9. **Formats à alterner** : les vidéos sourcées, et des extraits bruts de clash de 20 à 40 secondes avec un simple titre.

## 3. Fond et ton

1. **Vérifier chaque fait avant de l'utiliser** : recherche web, sources primaires.
   - Ne jamais inventer un propos.
   - Ne jamais affirmer une intention cachée qu'on ne peut pas prouver ; formuler en question : « À qui ça profite ? ».
2. **Attaquer les propos et les actes, pas les personnes** :
   - pas d'insultes, pas de mots comme « collaborateur » ;
   - pas de vidéo à charge contre une personne privée ou dont on n'a pas les propos.
3. **Pour une affaire judiciaire** : formulation exacte de la presse, présomption d'innocence, mention des recours en cours.
4. **Réactivité** : pour une actu du jour, livrer vite compte plus qu'un montage parfait.

## 4. Livraison : légende et publication

À fournir avec chaque vidéo.

1. **Une légende prête à copier** :
   - une phrase d'accroche complète, guillemets ouvrants compris, relue pour les fautes et les noms propres ;
   - une question pour faire commenter ;
   - jamais de légende vide.
2. **4 à 6 hashtags au maximum**, séparés par des espaces et vérifiés un par un. Le format cassé à éviter : `#t#teddyrinerm#macron`. Les donner sur une ligne simple, à copier telle quelle.
3. **Les sources dans un commentaire épinglé** : fournir le texte du commentaire. Ne pas les entasser dans la légende.
4. **Les conseils de publication à rappeler** :
   - 1 à 2 vidéos par jour au maximum ;
   - au moins 3 heures d'écart entre deux vidéos ;
   - une seule vidéo par sujet ;
   - créneaux : 12 h – 13 h 30 ou 18 h – 21 h 30, jamais entre 5 h et 8 h.
5. **Identifications** : ne pas identifier (@) une personne critiquée, sauf choix assumé de l'utilisateur, à cause du risque de signalements en masse.

## 5. Marque (rappels à l'utilisateur tant que ce n'est pas fait)

- Renommer le compte **@canalrouge** ou une variante libre.
- Mettre le logo en photo de profil.
- Bio proposée : « 🔴 L'actu politique vérifiée. Sources à l'écran. 1 vidéo par jour. »

## 6. Technique (rappels pour l'assistant)

- **Transcription** : sherpa-onnx et whisper-small, téléchargés depuis les releases GitHub de k2-fsa. HuggingFace est bloqué.
- **Recherche** : Firecrawl.
- **Découpage des extraits** : points calmes (RMS), puis vérification par retranscription.
- **Rendu** : contrôler une planche d'aperçus avant le rendu complet.
- **Version légère** : `-crf 26 -maxrate 1800k`.
- **Dépôt** : les MP4 et les dossiers `build/` restent hors dépôt (`.gitignore` par dossier). Commit et push à chaque livraison.

## 7. Modèle d'écriture : @enmarge.media (demande de l'utilisateur, 11/11/2026)

Analyse de leurs 30 dernières vidéos (27/10 au 10/11/2026), à partir des légendes et des statistiques. Les images et le son n'ont pas pu être consultés depuis cet environnement : le style visuel reste à copier d'après une capture fournie par l'utilisateur.

**Leurs résultats** : médiane de 10 000 vues (contre 358 pour @kopp3051), et cinq vidéos entre 168 000 et 384 000 vues :

- Bardella et la TVA sur le plein : 384 000 ;
- la taxe sur les données numériques : 336 000 ;
- Retailleau et le Smic : 313 000 ;
- « ton patron peut-il t'empêcher de faire grève ? » : 218 000 ;
- la pétition CNews : 168 000.

**La recette à reprendre dans chaque script :**

1. **Ouvrir sur une citation exacte**, avec qui, quand et où (« Jordan Bardella, mardi 3 novembre au 20h de TF1 »). Jamais de phrase d'introduction.
2. **« On a fait le calcul »** : refaire le calcul devant le spectateur, avec des chiffres de la vie courante (un plein de 40 litres, une fiche de paie au Smic, un abonnement à 14,99 €). C'est le cœur de leurs plus gros succès.
3. **Tutoyer et ramener au quotidien** : « ta fiche de paie », « ton patron », « toi qui fais 40 litres par semaine pour aller bosser ».
4. **La question « Qui paie ? »** : chiffrer le coût de la mesure et dire qui le supporte.
5. **Donner la limite ou le point faible**, même quand ça dessert la thèse (« ce n'est pas encore une loi », « le point faible : aucun seuil »). C'est ce qui rend la vidéo crédible et partageable au-delà des convaincus.
6. **Le détail que les autres n'ont pas** : numéro du scrutin, votes groupe par groupe, article de loi, calcul maison (« sans les voix du RN, le vote donnait 25 contre 17 »).
7. **Finir par une question ou une consigne de partage ciblée** : « Envoie-la au collègue qui croit qu'il n'a pas le droit », « Tu croyais gagner combien ? ».
8. **Viser tous les camps avec la même méthode** (RN, LR, macronistes, mais aussi LFI) : la vérification paraît neutre, donc elle touche plus large.

**Les sujets qui marchent chez eux** : l'argent dans la poche des gens (carburant, Smic, retraite, impôts, grève, livret A). Les citations abstraites ou les sujets de personnes plafonnent à 2 000 – 5 000 vues.

**Les légendes** : longues et complètes (la légende raconte toute la vidéo), sources primaires listées à la fin, **aucun hashtag**. À tester sur Canal Rouge : légende longue avec sources, et 0 à 3 hashtags.

**Le rythme** : 1 à 3 vidéos par jour, publiées le jour même ou le lendemain matin de la déclaration.
