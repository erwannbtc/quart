# Quart

Suivi d'horaires décalés (2x8, 3x8, intérim) et estimation de la paie.
Application web installable (PWA), sans compte, sans serveur : tout reste sur l'appareil.

## Lancer l'app

Dans un terminal ouvert dans ce dossier :

```bash
npm install
```

(une seule fois, installe les outils)

```bash
npm run dev
```

Puis ouvrez **http://localhost:5173** dans le navigateur.

**Sur le téléphone** (connecté au même Wi-Fi que l'ordinateur) : ouvrez
`http://ADRESSE-DE-L-ORDINATEUR:5173`. L'adresse s'affiche dans le terminal sur la
ligne « Network ». Si Windows demande d'autoriser Node.js sur le réseau, acceptez
pour les « réseaux privés ».

> Pour **installer** l'app sur l'écran d'accueil et l'utiliser hors ligne, le
> téléphone exige une adresse en HTTPS. Il faut donc publier le dossier `dist`
> (créé par `npm run build`) sur un hébergeur de sites statiques (Netlify,
> GitHub Pages, Cloudflare Pages…). Ensuite : Safari › Partager › « Sur l'écran
> d'accueil », ou Chrome › menu › « Installer l'application ».

Autres commandes :

- `npm test` : lance les tests du calcul de paie (`src/lib/pay.test.ts`).
- `npm run build` : fabrique la version finale dans `dist/`.

## Activer le mode démo

Réglages › Mode démo › interrupteur. L'app affiche un planning **fictif**
(Atelier Nord, 14,20 €/h, 151,67 h/mois, cotisations 22 %), avec « aujourd'hui »
simulé au 15 du mois. Vos vraies données ne sont ni affichées ni modifiées.
Désactivez l'interrupteur pour les retrouver (les changements faits pendant la
démo sont alors effacés).

## Sauvegarder et transférer ses données

- **Exporter** : Réglages › Vos données › « Exporter (fichier JSON) ». Un fichier
  `quart-sauvegarde-AAAA-MM-JJ.json` est téléchargé.
- **Importer** : Réglages › Vos données › « Importer un fichier », puis choisissez
  ce fichier. Il remplace les données actuelles (une confirmation est demandée).
  Un fichier abîmé ou étranger est refusé sans rien modifier.

Les données sont stockées dans le navigateur (localStorage). Effacer les données
du navigateur les efface : exportez régulièrement.

## Règles de calcul (`src/lib/pay.ts`)

- Durée payée = fin − début − pause (un poste de nuit qui passe minuit compte en entier).
- Un poste est rattaché au **jour où il commence** pour le dimanche et les jours fériés.
- Dimanche et férié le même jour : seule la majoration « férié » s'applique.
- Nuit : seules les heures dans la plage de nuit (21:00–06:00 par défaut) sont
  majorées ; la pause est répartie au prorata.
- Heures sup. : au-delà des heures du contrat, par mois et par employeur ;
  palier 1 pour les 34,67 premières heures (modifiable), palier 2 au-delà.
  Un employeur avec 0 h de contrat n'a pas d'heures sup.
- Les majorations s'additionnent. Net estimé = brut × (1 − cotisations).
- Congé : heures forfaitaires (7 h par défaut) au taux de base.
- Jours fériés : les 11 jours fériés nationaux (Pâques calculé chaque année).

Ce sont des **estimations** : elles ne remplacent pas la fiche de paie.
