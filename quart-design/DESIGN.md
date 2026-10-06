# Quart — spécification de design

App mobile de suivi des horaires et de la paie estimée (2x8, 3x8, intérim).
Cible : iPhone 390 × 844. Ce dossier sert de référence pour coder l'app.

## Contenu du dossier

- `DESIGN.md` : ce document.
- `tokens.json` : couleurs, typographie, rayons, espacements.
- `ecrans/Main.dc.html` : écran Accueil.
- `ecrans/Postes.dc.html` : écran Postes et taux.
- `ecrans/Ajouter.dc.html` : feuille « Ajouter un poste ».

Les fichiers `.dc.html` sont les sources du canevas de design. Ils ne
s'ouvrent pas seuls dans un navigateur (ils dépendent de l'éditeur) : ils
servent de référence exacte pour le balisage, les styles et les calculs.

## Style : liquid glass sur fond noir

- Fond : noir pur `#000000`.
- Trois halos très flous derrière le contenu (flou 70 px) : vert accent en haut
  à gauche (opacité 0,28), bleu `#4C8DFF` à droite au milieu (0,30), violet
  `#9B6DFF` en bas à gauche (0,26). Ils donnent au verre quelque chose à flouter.
- Carte en verre :
  - fond `rgba(255,255,255,0.07)`
  - flou d'arrière-plan 26 px, saturation 170 %
  - bordure 1 px `rgba(255,255,255,0.12)`
  - reflet haut : ombre interne `0 1px 0 rgba(255,255,255,0.22)`
  - ombre portée `0 10px 30px rgba(0,0,0,0.45)`
  - rayon 18 px (petites cartes) ou 22 px (grandes cartes)
- Champ / stepper : fond `rgba(255,255,255,0.06)`, bordure
  `rgba(255,255,255,0.18)`, rayon 12 px, hauteur 44 à 48 px.
- En React Native : utiliser `expo-blur` (`BlurView`, `tint="dark"`,
  intensité ~40) sous un calque `rgba(255,255,255,0.07)`.

## Typographie

- Texte : Outfit (400, 500, 600).
- Chiffres : JetBrains Mono (500, 600), chiffres tabulaires.
- Tailles : titre d'écran 22, titre de feuille 20, montant principal 17,
  texte 15, secondaire 12–13, libellé de carte 11, mention 9–10.
- Texte principal `#E8EAED`, secondaire `#8A93A6`, intermédiaire `#A9B2C3`.

## Couleurs des postes

| Poste | Code | Couleur | Texte sur teinte |
|---|---|---|---|
| Matin | M | `#F5A623` | `#F7BC5C` |
| Après-midi | A | `#4C8DFF` | `#8DB6FF` |
| Nuit | N | `#9B6DFF` | `#BDA0FF` |
| Repos | · | `#6E788A` | `#9AA3B4` |
| Congé | C | `#7FCFA5` | `#9BDCB9` |

Accent unique : vert `#2BD67B` (texte sur accent : `#06140C`).

Case du calendrier : fond = couleur du poste à 30 % (jours passés et jour
actuel) ou 14 % (jours à venir), bordure 1 px à 40 %, rayon 10 px, hauteur
50 px. Numéro en mono 14, lettre du poste dessous en 9.
Jour actuel : bordure 2 px accent + halo `0 0 0 3px` accent à 25 % et
`0 0 18px` accent à 50 %.

## Écran 1 : Accueil

De haut en bas, marges latérales 16 px :

1. En-tête : logo (quart de disque vert dans un carré arrondi) + « Quart »,
   mois avec flèches, bouton « + » vert 44 × 44 (ouvre la feuille d'ajout).
2. Trois cartes en grille, écart 8 px :
   - Heures : anneau 68 px (rayon 28, trait 7), pourcentage au centre,
     « 82,5 h / 151,67 », « reste 69,17 h ».
   - Brut du mois : montant à date, puis « Prévu fin de mois ».
   - Net : badge « estimation », montant à date en vert,
     « à date · cotis. ~22 % », puis « Prévu fin de mois ».
3. Calendrier : grille 7 colonnes, lundi en premier, écart 5 px.
4. Légende des 5 couleurs.
5. Carte « Aujourd'hui » : poste du jour, durée, gain brut.
6. Barre de navigation (voir plus bas).

## Écran 2 : Postes et taux

Cinq cartes empilées, écart 12 px :

1. Types de postes : pastille couleur, nom, pause, horaires, bouton crayon.
   Matin 05:00–13:00, Après-midi 13:00–21:00, Nuit 21:00–05:00, Repos.
   Pause 30 min.
2. Employeur : nom, taux horaire brut, heures contrat par mois.
3. Majorations (stepper par pas de 5) : heures sup. palier 1 +25 %,
   palier 2 +50 %, nuit +20 %, dimanche +50 %, jours fériés +100 %.
4. Cotisations sociales : stepper par pas de 1 (22 %), avec un exemple
   « 100,00 € brut → 78,00 € net estimé ».
5. Cycle de rotation : interrupteur « Planning 2x8 automatique », aperçu sur
   14 jours (5 matin, 2 repos, 5 après-midi, 2 repos).

## Écran 3 : Ajouter un poste (feuille)

Feuille en verre qui monte du bas, coins hauts 22 px, sur l'accueil assombri
(`rgba(4,6,10,0.72)`).

- Type de poste : 5 puces en grille de 3 (sélection = fond teinté 22 % +
  bordure de la couleur).
- Date.
- Horaires : Début / Fin (pas de 15 min) et Pause (pas de 5 min).
  Désactivés (opacité 0,35) pour Repos et Congé.
- Employeur.
- Résumé : durée payée et brut estimé.
- Bouton « Enregistrer » vert, hauteur 52 px, rayon 14 px.

## Barre de navigation

- Pilule flottante : marges 16 px sur les côtés, 14 px en bas, hauteur 64 px,
  rayon 32 px, padding 6 px, 3 onglets (Accueil, Postes, Réglages).
- Verre : fond `rgba(255,255,255,0.07)`, flou 30 px, saturation 180 %,
  bordure `rgba(255,255,255,0.16)`, ombre `0 14px 34px rgba(0,0,0,0.6)`.
- Onglet actif = goutte d'eau : hauteur 50 px, rayon 26 px, dégradé radial
  blanc (38 % en haut à gauche vers 3 %), reflet interne haut
  `rgba(255,255,255,0.65)`, liseré interne 1 px, ombre `0 6px 18px` noire.
  Icône et libellé en vert accent, graisse 600.
- Onglets inactifs : `#A9B2C3`.

## Calculs

Données fictives : Atelier Nord, 14,20 €/h brut, 151,67 h/mois, cotisations 22 %.

- Durée payée d'un poste = fin − début − pause (7 h 30 pour un poste standard).
  Congé = 7 h.
- Heures faites = somme des durées jusqu'au jour actuel inclus.
- Pourcentage = heures faites ÷ heures contrat (plafonné à 100 %).
- Brut à date = heures faites × taux horaire.
- Brut prévu fin de mois = heures jusqu'au contrat × taux
  + heures sup. (les 34,67 premières à +25 %, le reste à +50 %)
  + majoration de nuit (+20 % sur les heures de nuit).
- Net estimé = brut × (1 − taux de cotisations). Toujours affiché avec la
  mention « estimation ».

Avec le planning fictif d'octobre 2026 (jour actuel : jeudi 15) :
82,5 h faites, brut à date 1 171,50 €, net à date 913,77 €,
brut prévu environ 2 381 €, net prévu environ 1 858 €.

## Animations

| Élément | Animation | Durée | Courbe |
|---|---|---|---|
| Anneau des heures | se remplit de 0 au pourcentage | 1,5 s | ease-out cubique |
| Montants et heures | s'incrémentent de 0 à la valeur | 1,5 s | ease-out cubique |
| Case du calendrier modifiée | fondu de couleur + rebond (0,82 → 1,08 → 1) | 0,45 s | ease |
| Anneau après modification | glisse vers la nouvelle valeur | 0,6 s | ease |
| Goutte de la navigation | s'étire puis se stabilise | 0,7 s | cubic-bezier(.3,1.4,.5,1) |
| Feuille d'ajout | monte du bas | 0,45 s | cubic-bezier(.2,.8,.2,1) |
| Voile sombre | fondu | 0,3 s | ease |
| Interrupteur, puces | fondu de couleur | 0,25–0,3 s | ease |

## Accessibilité

- Zones tactiles d'au moins 44 px.
- Les postes se distinguent par une lettre en plus de la couleur.
- Boutons à icône seule : libellé accessible (« Mois précédent », « Fermer »…).
