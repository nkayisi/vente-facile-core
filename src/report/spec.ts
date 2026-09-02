/**
 * La description d'un RAPPORT, partagée par le back-office et le terminal.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN RAPPORT N'EST PAS UN TICKET, ET LE MODÈLE DES TICKETS NE SAIT PAS LE │
 * │ RENDRE.                                                                  │
 * │                                                                          │
 * │ `receipt/blocks.ts` décrit une colonne étroite en chasse fixe, pensée    │
 * │ pour cinquante-huit millimètres de papier thermique. Le terminal y       │
 * │ faisait passer ses rapports faute de mieux : « Détails des produits      │
 * │ vendus » et ses SEPT colonnes sortaient sur un rouleau, chaque ligne     │
 * │ éclatée en un paragraphe. Le back-office, lui, les traçait en jsPDF sur  │
 * │ A4. Le même rapport donnait donc deux documents qui ne se ressemblaient  │
 * │ pas, et aucun des deux n'était comparable à l'autre.                     │
 * │                                                                          │
 * │ D'où un SECOND modèle, à côté du premier et non à sa place : les         │
 * │ documents de comptoir restent des rouleaux, les rapports sont des pages. │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Le vocabulaire réunit trois descriptions déjà écrites : `DescriptionExport`
 * du terminal, les appels `addTable` du back-office, et `ReportSpec` du serveur
 * (`apps/core/exports.py`), dont on reprend les noms - `colonnes`, `lignes`,
 * `mesure` - pour qu'un développeur qui passe de l'un à l'autre s'y retrouve.
 *
 * **Tout est DÉJÀ FORMATÉ.** Aucun nombre brut ne traverse ce modèle : c'est
 * l'appelant qui connaît la devise, ses décimales et sa convention. Un montant
 * formaté ici serait un quatrième endroit où la mise en forme peut diverger.
 */
import type { ReceiptChrome } from "../receipt/identity";

export interface ColonneRapport {
  entete: string;
  /**
   * Une MESURE se range à droite, en chasse fixe.
   *
   * Une quantité écrite en mots (« 13 BOITES + 14 AMPOULES ») en est une : le
   * lecteur y compare des grandeurs. C'est `KIND_MEASURE` du serveur, et la
   * même raison - le bloc chiffré du tableau n'a alors qu'un seul bord.
   */
  mesure?: boolean;
  /** Part de la largeur du tableau, en pourcentage. Réparti si absent. */
  largeur?: number;
}

/**
 * Une cellule. La forme courte suffit presque toujours ; la forme longue porte
 * la sous-ligne (« 658 au total ») que les deux surfaces affichent déjà.
 */
export type CelluleRapport = string | { texte: string; sous?: string | null };

export interface RapportSpec {
  /** L'identité de l'établissement, la MÊME que celle des tickets. */
  identite: ReceiptChrome;
  titre: string;
  sousTitre?: string;
  /**
   * Le PÉRIMÈTRE, et il n'est jamais tu.
   *
   * Un rapport qui tait ses filtres laisse le lecteur croire qu'il a tout sous
   * les yeux. C'est vrai sur un écran, où l'on peut lever les yeux vers la
   * barre de filtres ; c'est bien pire sur un papier, qui voyage seul.
   */
  filtres?: [string, string][];
  /** La synthèse, en tête. Ventilée par devise quand il le faut. */
  synthese?: [string, string][];
  colonnes: ColonneRapport[];
  lignes: CelluleRapport[][];
  /** Ce qui s'écrit quand il n'y a rien. Jamais une page blanche. */
  vide?: string;
}

/** Le texte d'une cellule, quelle que soit sa forme. */
export function texteCellule(c: CelluleRapport): string {
  return typeof c === "string" ? c : c.texte;
}

/** La sous-ligne d'une cellule, ou `null`. */
export function sousCellule(c: CelluleRapport): string | null {
  return typeof c === "string" ? null : (c.sous ?? null);
}
