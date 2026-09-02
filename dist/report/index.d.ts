import { R as ReceiptChrome } from '../identity-ijBP1mCv.js';

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

interface ColonneRapport {
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
type CelluleRapport = string | {
    texte: string;
    sous?: string | null;
};
interface RapportSpec {
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
declare function texteCellule(c: CelluleRapport): string;
/** La sous-ligne d'une cellule, ou `null`. */
declare function sousCellule(c: CelluleRapport): string | null;

/**
 * Le document complet.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN SEUL BORD GAUCHE.                                                     │
 * │                                                                          │
 * │ Le bandeau d'identité, le titre, le cartouche de synthèse et le tableau   │
 * │ démarrent à la MÊME abscisse. C'est le défaut que les exports du serveur │
 * │ ont dû corriger en mesurant leur propre flux PDF : trois origines à un   │
 * │ ou deux millimètres près, assez peu pour passer deux relectures, assez   │
 * │ pour que l'œil lise un bord en escalier. Ici c'est le `padding` du       │
 * │ `body` qui le tient, et rien d'autre n'a de marge horizontale.           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `thead` est déclaré `table-header-group` : sur un rapport de trois cents
 * lignes, l'en-tête se répète en tête de chaque page. Sans lui, la deuxième
 * page est un tableau de nombres sans colonnes.
 */
declare function rendreRapportHtml(spec: RapportSpec): string;

/**
 * Un rapport en CSV, pour l'« Export Excel » des deux surfaces.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ POINT-VIRGULE ET BOM, ET LES DEUX SONT NÉCESSAIRES.                     │
 * │                                                                          │
 * │ Excel choisit son séparateur d'après la locale du système : en français  │
 * │ c'est le POINT-VIRGULE, et un fichier à virgules s'y ouvre en une seule  │
 * │ colonne. Le BOM UTF-8, lui, est ce qui fait afficher « Créances » au     │
 * │ lieu de « CrÃ©ances » - sans lui, Excel lit le fichier en ANSI.          │
 * │                                                                          │
 * │ Les deux ensemble : le marchand ouvre le fichier et il est droit.        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Vit dans le paquet partagé pour que le fichier produit par le back-office et
 * celui produit par le terminal soient le MÊME fichier. Le back-office en avait
 * une version maison (`exportToCSV`) qui n'échappait rien.
 */

/**
 * Échappe une cellule.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ PRESQUE TOUT MONTANT EST CONCERNÉ, ET C'EST LA DÉCIMALE FRANÇAISE.      │
 * │                                                                          │
 * │ « 560 287,70 $ » porte une virgule. Sans guillemets, un tableur réglé    │
 * │ sur la virgule y voit deux colonnes et décale toute la ligne. Ce n'est   │
 * │ donc pas un cas rare mais le cas GÉNÉRAL de ce produit, où chaque        │
 * │ cellule d'argent porte une décimale française. Un point-virgule dans une │
 * │ description de mouvement, une virgule dans un nom d'établissement, un    │
 * │ guillemet dans une note : mêmes dégâts, aucune erreur nulle part.        │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
declare function cellule(valeur: string): string;
/** Le contenu du fichier, à partir de la même description que le PDF. */
declare function contenuCsv(spec: RapportSpec): string;
/**
 * Le nom du fichier, sans extension.
 *
 * `expo-print` nomme le sien en UUID, et un `<a download>` sans nom hérite de
 * l'URL du blob : des deux côtés, trois exports arrivent indiscernables dans le
 * dossier de téléchargements. Un document qu'on ne sait pas retrouver n'a pas
 * été exporté, il a été perdu.
 */
declare function nomDeFichier(nom: string): string;
/** « 2026-09-02 05h27 » : lisible, triable, sans `Intl` (proscrit ici). */
declare function horodatage(d?: Date): string;

type PeriodeRapport = "last_7_days" | "last_30_days" | "last_12_months" | "today" | "week" | "month" | "quarter" | "year" | "custom";
/** Les libellés du back-office, au caractère près (`PERIOD_OPTIONS`). */
declare const PERIODES_RAPPORT: {
    valeur: PeriodeRapport;
    label: string;
}[];
type GroupBy = "day" | "week" | "month";
/** « Grouper par » du back-office. */
declare const GROUPEMENTS: {
    valeur: GroupBy;
    label: string;
}[];
declare function libellePeriode(p: PeriodeRapport): string;
/**
 * Bornes INCLUSIVES au format `AAAA-MM-JJ`, comme l'API les attend
 * (`sale_date__date__gte` / `__lte`).
 *
 * Les composantes sont LOCALES, comme `day_bounds()` du serveur : une vente
 * saisie à 23h30 est déjà le lendemain en UTC et disparaîtrait du rapport du
 * jour.
 *
 * `custom` rend les bornes fournies telles quelles ; à l'appelant de ne pas
 * l'employer sans elles.
 */
declare function bornesRapport(periode: PeriodeRapport, personnalisee?: {
    debut: string;
    fin: string;
}, aujourdhui?: Date): {
    debut: string;
    fin: string;
};

export { type CelluleRapport, type ColonneRapport, GROUPEMENTS, type GroupBy, PERIODES_RAPPORT, type PeriodeRapport, type RapportSpec, bornesRapport, cellule, contenuCsv, horodatage, libellePeriode, nomDeFichier, rendreRapportHtml, sousCellule, texteCellule };
