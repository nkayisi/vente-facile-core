/**
 * Ce que le paquet partagé garde des RAPPORTS.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ LES RAPPORTS SONT FABRIQUÉS PAR LE SERVEUR.                             │
 * │                                                                          │
 * │ Ce module a porté une description (`RapportSpec`), une mise en page HTML │
 * │ et un rendu CSV, pour que le back-office et le terminal impriment la     │
 * │ MÊME chaîne. Les trois documents viennent désormais du serveur           │
 * │ (`apps/core/exports.py`), qui sert le PDF, le classeur et le CSV : les   │
 * │ deux surfaces ne font plus que télécharger des octets. Ce qui restait    │
 * │ n'avait plus d'appelant et a été retiré.                                 │
 * │                                                                          │
 * │ Ne subsiste que ce que le serveur ne peut pas faire : nommer un fichier  │
 * │ au moment où l'appareil le range, et calculer les fenêtres de période    │
 * │ que l'écran affiche avant tout appel.                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * À ne pas confondre avec `@vente-facile/core/receipt`, qui décrit les
 * documents de COMPTOIR - tickets, reçus, Z - sur un rouleau de cinquante-huit
 * millimètres, et qui doivent sortir hors ligne.
 */
export { nomDeFichier } from "./nom-fichier";
export {
  PERIODES_RAPPORT,
  GROUPEMENTS,
  bornesRapport,
  libellePeriode,
  type PeriodeRapport,
  type GroupBy,
} from "./periodes";
