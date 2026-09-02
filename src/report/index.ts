/**
 * Le document de RAPPORT, partagé par le back-office et le terminal.
 *
 * Un rapport se DÉCRIT (`RapportSpec`) et se REND (`rendreRapportHtml`,
 * `contenuCsv`). Les deux surfaces impriment la MÊME chaîne : le back-office
 * par le navigateur, le terminal par `expo-print`. Il n'y a donc plus de mise
 * en page à tenir en phase.
 *
 * À ne pas confondre avec `@vente-facile/core/receipt`, qui décrit les
 * documents de COMPTOIR - tickets, reçus, Z - sur un rouleau de cinquante-huit
 * millimètres. Un rapport de sept colonnes n'y entre pas.
 */
export type {
  ColonneRapport,
  CelluleRapport,
  RapportSpec,
} from "./spec";
export { texteCellule, sousCellule } from "./spec";
export { rendreRapportHtml } from "./render-html";
export { cellule, contenuCsv, nomDeFichier, horodatage } from "./csv";
