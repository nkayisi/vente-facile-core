# @vente-facile/core

Les règles métier que le back-office web et l'application mobile doivent appliquer
à l'identique.

Ce paquet ne connaît **ni le DOM, ni React, ni le réseau**, et n'a **aucune
dépendance d'exécution**. Tout ce qui touche à une plateforme (chargement
d'image, rendu PDF, appels HTTP, stockage) vit dans la surface appelante.

## Pourquoi

Ces règles vivaient dans `frontend/lib/`, et le mobile en tenait une seconde
copie, écrite à la main. Les deux ont dérivé : le ticket mobile ignorait le
conditionnement, imprimait des décimales que le franc congolais n'a pas, et
recalculait un partage scellé/vrac que le serveur avait déjà décidé. Une règle
corrigée d'un côté ne l'était pas de l'autre.

## Contenu

| Module | Rôle |
| --- | --- |
| `intl-fr` | Formatage français sans `Intl` (voir plus bas) |
| `format` | Montants, nombres, pourcentages, dates, points |
| `currencies` | Catalogue des devises supportées |
| `currency` | Conversion multi-devise, arrondi par devise, parités |
| `units` | Accord en nombre des libellés d'unités saisis par le marchand |
| `packaging` | Partage gros/détail, miroir de `apps/inventory/packaging.py` |
| `pricing` | Marge sur prix de vente, conversions entre canaux, coût pondéré |
| `permissions` | Rôles et contrôle par codes plats |
| `due-date` | Échéances de crédit et retard |
| `receipt/` | Description des documents imprimés, en blocs typés |

## Le modèle de blocs

Un document se **décrit** ici, il se **rend** ailleurs. Trois moteurs consomment
les mêmes `Block[]` :

    receipt/documents/sale.ts  ->  Block[]
                                     |
              +----------------------+----------------------+
              v                      v                      v
     frontend render-pdf      mobile render-text      mobile render-html
        (jsPDF, web)          (42 colonnes, NYX)       (PDF, repli iOS)

C'est ce qui garantit que le ticket web et le ticket mobile décrivent
littéralement le même document.

## Pourquoi pas `Intl`

Hermes, le moteur JavaScript de React Native, n'embarque pas l'ICU complète.
`Intl.NumberFormat("fr-CD")` et `toLocaleDateString("fr-CD")` y rendent selon la
plateforme et la version d'OS : le même montant peut sortir « 1 234,5 » sur un
appareil et « 1,234.5 » sur un autre, et un mois court revenir en anglais. Sur
une application qui imprime des reçus, c'est inacceptable.

`intl-fr.ts` reproduit exactement ce que rend `Intl` en `fr-CD` sur un moteur à
ICU complète, et `test/intl-fr.test.ts` le **prouve** par comparaison directe
avec `Intl` sous Node. La bascule du web sur ce paquet est donc à rendu constant.

## Deux conventions de formatage, volontairement distinctes

| Surface | Milliers | Décimales | Motif |
| --- | --- | --- | --- |
| Écran (`format`, `currency`) | U+202F | virgule | Convention française, ce que rendait `Intl` |
| Papier (`receipt/money`) | espace ordinaire | point | Helvetica intégrée à jsPDF rend U+202F en « / » |

Les unifier est un changement de rendu, pas un nettoyage. Ne pas le faire par
inadvertance.

## Développement

    pnpm install
    pnpm build        # tsup, sorties ESM + CJS + types
    pnpm type-check
    pnpm test

## Publication et consommation

Le paquet est consommé comme dépendance git versionnée, par le web comme par le
mobile :

    "@vente-facile/core": "github:nkayisi/vente-facile-core#v0.1.0"

Une dépendance git s'installe dans `node_modules` comme n'importe quel paquet :
pas de lien symbolique, donc rien ne casse dans le conteneur de développement,
qui ne monte que `./frontend`.

Pendant un développement croisé, une surcharge locale évite l'aller-retour par
un tag :

    pnpm add "file:../core/vente-facile-core-0.1.0.tgz"   # apres `pnpm pack`
