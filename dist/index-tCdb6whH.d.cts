/**
 * Jetons de mise en page du ticket thermique.
 *
 * Tout est en millimètres, unité native du PDF produit. L'ancien générateur
 * semait des `y += 0.5`, `y += 1`, `y += 1.5` sans échelle : le rythme vertical
 * était illisible et impossible à corriger sans tout remesurer. Ici, une seule
 * échelle d'espacement et trois épaisseurs de filet porteuses de sens.
 */
type PaperWidth = 58 | 80;
/**
 * Rôles typographiques. Le ticket précédent écrivait presque tout en 9 pt, d'où
 * l'absence de hiérarchie : le client ne savait pas où poser l'œil.
 */
type FontRole = "orgName" | "band" | "total" | "chip" | "body" | "label" | "legal";
interface FontSpec {
    size: number;
    bold: boolean;
}
declare const FONTS: Record<FontRole, FontSpec>;
type SpaceSize = "xs" | "sm" | "md" | "lg";
type RuleWeight = "heavy" | "light" | "hair";
interface Tokens {
    paperWidth: number;
    margin: number;
    /** Largeur réellement écrivable, filets compris. */
    contentWidth: number;
    /** Blanc de tête : confort de découpe sur imprimante thermique. */
    topPadding: number;
    /** Blanc de pied : l'avance papier ne doit pas rogner la dernière ligne. */
    bottomPadding: number;
    space: Record<SpaceSize, number>;
    rule: Record<RuleWeight, number>;
    /** Blanc minimal entre un libellé et son montant sur une ligne justifiée. */
    minGap: number;
    /** Retrait des lignes secondaires (conditionnement, remise de ligne). */
    indent: number;
    /** Hauteur maximale du logo. */
    logoMaxHeight: number;
}
declare function tokensFor(paperWidth: PaperWidth): Tokens;
/**
 * Interligne d'un corps donné.
 *
 * Le facteur 0,385 reproduit l'ancien couple (11 pt → 4,2 mm ; 9 pt → 3,5 mm)
 * pour que la densité du ticket reste celle que les marchands connaissent.
 */
declare function leading(size: number): number;
declare function leadingOf(role: FontRole): number;

/**
 * Modèle déclaratif du ticket.
 *
 * Un document ne se dessine plus : il se décrit. C'est ce qui met fin à la
 * duplication structurelle de l'ancien générateur, où chaque document existait
 * en double (une fonction qui traçait, une fonction miroir qui rejouait les
 * mêmes conditions pour estimer la hauteur en millimètres). Il fallait corriger
 * deux fois, sinon le PDF finissait par une bande blanche ou tronquait sa
 * dernière ligne.
 *
 * Ici, `render-pdf.ts` parcourt cette liste UNE fois : il en tire à la fois la
 * hauteur et les primitives de tracé. Mesure et rendu ne peuvent plus diverger.
 */

/** Ligne clé / valeur. */
interface KvRow {
    label: string;
    value: string;
    /** Met la valeur en gras : réservé à la ligne qui porte le sens du bloc. */
    strong?: boolean;
}
/** Ligne de montant : la valeur est un montant déjà formaté. */
interface AmountRow {
    label: string;
    value: string;
    strong?: boolean;
}
interface ItemRow {
    name: string;
    /** Quantité brute, telle qu'elle tient dans la colonne. */
    quantity: string;
    unitPrice: string;
    total: string;
    /**
     * Conditionnement lisible par le client : « 2 cartons + 3 bouteilles ».
     * La colonne quantité est trop étroite pour le porter, il passe en dessous.
     */
    quantityLabel?: string;
    /** Remise de ligne, en pourcentage. */
    discountPercentage?: number;
}
type Block = 
/**
 * Logo déjà chargé en dataURL, avec son rapport largeur / hauteur : la mise en
 * page se calcule avant tout tracé et ne peut donc pas interroger l'image.
 * Bloc simplement absent si le chargement a échoué.
 */
{
    kind: "logo";
    dataUrl: string;
    format: "PNG" | "JPEG";
    aspectRatio: number;
}
/** Texte, replié sur la largeur utile. */
 | {
    kind: "text";
    text: string;
    role: FontRole;
    align?: "left" | "center";
    italic?: boolean;
    muted?: boolean;
    indent?: boolean;
}
/**
 * Bandeau d'identification du document, en vidéo inversée.
 * Sur du papier thermique monochrome, c'est le seul dispositif qui se repère
 * dans une liasse sans avoir à lire.
 */
 | {
    kind: "band";
    text: string;
    sub?: string;
}
/** Pastille inversée, plus courte que le bandeau : DUPLICATA, DETTE SOLDÉE. */
 | {
    kind: "chip";
    text: string;
}
/**
 * Bloc clé / valeur.
 * `inline` colle la valeur au libellé et replie en retrait : c'est le mode des
 * champs d'identité, où justifier à droite laissait 28 mm de vide entre
 * « Client: » et le nom sur un ticket de 53 mm.
 * `justified` pousse la valeur à droite : réservé aux colonnes de chiffres,
 * là où l'œil balaie verticalement.
 */
 | {
    kind: "kv";
    rows: KvRow[];
    mode: "inline" | "justified";
    role?: FontRole;
}
/** Tableau des articles, en-tête compris. */
 | {
    kind: "items";
    rows: ItemRow[];
}
/** Colonne de montants justifiés, mesurés avant tracé. */
 | {
    kind: "amounts";
    rows: AmountRow[];
    role?: FontRole;
}
/** Le chiffre du document : libellé discret, montant en grand dessous. */
 | {
    kind: "total";
    label: string;
    value: string;
} | {
    kind: "rule";
    weight: RuleWeight;
} | {
    kind: "space";
    size: SpaceSize;
};
/**
 * Retire les entrées absentes pour que les documents s'écrivent en une seule
 * expression, conditions comprises. Générique : sert autant aux blocs qu'aux
 * lignes clé / valeur.
 */
declare function compact<T>(items: (T | null | false | undefined | "")[]): T[];

/**
 * Formatage monétaire du ticket.
 *
 * Deux contraintes que le générateur précédent ignorait :
 *
 * 1. **Décimales par devise.** `formatAmount(x, 2)` était codé en dur, alors que
 *    le CDF, devise par défaut de la plateforme, n'a pas de décimales. Un ticket
 *    imprimait « 1 250 036.40 CDF » au lieu de « 1 250 036 FC » : trois
 *    caractères de bruit et cinq millimètres perdus sur un papier de 53 mm
 *    utiles, là où la place manque déjà.
 *
 * 2. **Séparateur de milliers ASCII.** `Intl.NumberFormat("fr-*")` groupe avec
 *    une espace fine insécable (U+202F) que la police helvetica intégrée à jsPDF
 *    rend en « / ». On groupe donc à la main avec une espace ordinaire. Ne pas
 *    remplacer par `Intl` sans embarquer une police qui couvre U+202F.
 */
/** Décimales et symbole propres à l'organisation, quand elle les redéfinit. */
interface CurrencyOverride {
    decimals?: number;
    symbol?: string;
}
type CurrencyOverrides = Record<string, CurrencyOverride>;
declare function decimalsOf(code: string, overrides?: CurrencyOverrides): number;
declare function symbolOf(code: string, overrides?: CurrencyOverrides): string;
/** « 1250036.4 » → « 1 250 036 » (0 décimale) ou « 1 250 036.40 » (2). */
declare function formatAmount(amount: number | string, decimals: number): string;
/** Montant dans sa devise : « 1 250 036 FC », « 2 500.00 $ ». */
declare function formatMoney(amount: number | string, code: string, overrides?: CurrencyOverrides): string;
/** Montant sans devise, pour les colonnes où l'unité est déjà annoncée. */
declare function formatBare(amount: number | string, code: string, overrides?: CurrencyOverrides): string;
/**
 * Quantité : 3 décimales possibles, mais on ne les imprime pas pour rien.
 *
 * L'arrondi au millième n'est pas décoratif : il absorbe le résidu binaire
 * d'une part vrac dérivée (`0.3000000000000007`), que le papier rendrait en
 * entier. Les milliers ne sont PAS groupés, contrairement aux montants : une
 * quantité de comptoir dépasse rarement le millier, et grouper demanderait de
 * distinguer le séparateur de milliers du séparateur décimal sur un rendu qui
 * emploie le point pour le second.
 */
declare function formatQuantity(quantity: number | string): string;
/**
 * Une quantité avec son unité accordée, POUR LE PAPIER : « 0.5 kg ».
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN FORMATEUR D'ÉCRAN N'ATTEINT JAMAIS UN DOCUMENT.                       │
 * │                                                                          │
 * │ `formatUnitQuantity` du noyau groupe les milliers avec une espace fine   │
 * │ insécable (U+202F), que la police helvetica intégrée à jsPDF rend en     │
 * │ « / ». Le ticket a donc son propre couple nombre + unité, et c'est la    │
 * │ même raison qui fait coexister deux `formatQuantity` dans ce paquet.     │
 * │                                                                          │
 * │ Le point décimal est VOLONTAIRE ici, et seulement ici.                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
declare function formatQuantityWithUnit(quantity: number | string, word: string): string;
/**
 * Retire les diacritiques.
 *
 * Le chemin PDF (web, relayé par Thermer qui rend une image) restitue les
 * accents correctement : on écrit donc les libellés en français correct, une
 * seule fois. Le chemin natif NYX envoie du texte brut à l'imprimante, dont la
 * page de code les casse : c'est le rendu texte qui appelle cette fonction, pas
 * les documents. C'est ce qui met fin aux deux conventions qui coexistaient
 * dans l'ancien fichier (« Recu » d'un côté, « Reçu par: » de l'autre).
 */
declare function deaccent(text: string): string;

/**
 * En-tête et pied communs à tous les documents imprimés.
 *
 * La base porte depuis toujours `logo`, `address`, `city`, `phone`, `rccm`,
 * `id_nat` et `tax_id` sur l'organisation : rien ne les imprimait. Les tickets
 * sortaient avec le seul nom de la boutique, sans même l'adresse, ce qui est un
 * problème d'identification autant que de conformité pour un commerçant en RDC.
 */

interface OrgIdentity {
    name: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    /** Registre du commerce. */
    rccm?: string;
    /** Identification nationale. */
    idNat?: string;
    /** Numéro impôt. */
    taxId?: string;
    logo?: LoadedLogo;
}
interface LoadedLogo {
    dataUrl: string;
    format: "PNG" | "JPEG";
    aspectRatio: number;
}
interface ReceiptChrome {
    org: OrgIdentity;
    /**
     * En-tête libre saisi par le marchand. Il COMPLÈTE désormais le bloc
     * d'identité au lieu de le remplacer : l'ancien générateur écrasait nom,
     * adresse et téléphone dès qu'un en-tête personnalisé existait, si bien qu'un
     * marchand qui voulait ajouter un slogan perdait ses coordonnées.
     */
    header?: string;
    footer?: string;
}
/** Blocs d'en-tête : logo, identité, coordonnées, mentions légales. */
declare function orgHeaderBlocks(chrome: ReceiptChrome): Block[];
/**
 * Blocs de pied. `defaultLines` sert quand le marchand n'a rien personnalisé :
 * chaque document propose sa propre formule de politesse.
 */
declare function footerBlocks(chrome: ReceiptChrome, defaultLines: string[]): Block[];

/**
 * Identification des documents.
 *
 * Le défaut central du ticket précédent : le reçu de vente n'avait AUCUN titre
 * (après l'en-tête, il attaquait directement « Recu: <ref> »), tandis que le
 * reçu de règlement affichait « REÇU DE PAIEMENT » en 11 pt. Deux documents,
 * deux structures d'identification différentes, impossibles à distinguer d'un
 * coup d'œil dans une liasse.
 *
 * Chaque document porte désormais le même dispositif : un bandeau en vidéo
 * inversée sous l'en-tête, et un numéro préfixé par type.
 */
type DocumentKind = "sale" | "credit_sale" | "proforma" | "debt_payment" | "advance" | "adjustment" | "sale_return" | "cash_session" | "expense" | "expense_request" | "day_report";
interface DocumentIdentity {
    /** Texte du bandeau inversé. */
    band: string;
    /** Sous-titre sous le bandeau, en petit. */
    sub?: string;
    /** Préfixe attendu du numéro de document. */
    prefix: string;
    /** Libellé de la ligne qui porte le numéro. */
    numberLabel: string;
}
declare const DOCUMENT_IDENTITIES: Record<DocumentKind, DocumentIdentity>;
/** Mention portée par toute réimpression, pour la distinguer de l'original. */
declare const DUPLICATE_CHIP = "DUPLICATA";

/**
 * Briques partagées par tous les documents : bandeau d'identification, bloc
 * d'infos, bloc fidélité, bloc de dette. Écrites une fois, elles garantissent
 * qu'un reçu de vente et un reçu de règlement se ressemblent là où ils parlent
 * de la même chose.
 */

interface BaseDocumentData {
    kind: DocumentKind;
    /** Numéro du document, préfixé par type. */
    number: string;
    date: string;
    cashierName?: string;
    registerName?: string;
    customerName?: string;
    customerPhone?: string;
    /** Réimpression : le ticket sort marqué DUPLICATA. */
    isDuplicate?: boolean;
    currencyOverrides?: CurrencyOverrides;
}
interface LoyaltyData {
    show?: boolean;
    earned?: number;
    used?: number;
    balance?: number;
    /**
     * Devise de la cagnotte : la PRINCIPALE de l'établissement.
     *
     * ⚠ ELLE N'EST PAS CELLE DE LA FACTURE, et la confondre imprimerait un
     * montant faux sur le papier du client : une cagnotte de 12 500 FC rendue
     * sous le symbole d'une facture en dollars se lirait « 12 500 $ ». Absente,
     * le montant sort nu - c'est le moindre mal, mais l'appelant doit la passer.
     */
    currency?: string;
}
interface DebtData {
    /** Solde du client avant l'opération, dans la devise de l'opération. */
    before?: number;
    /** Solde après. Zéro ou négatif signifie que la dette est éteinte. */
    after?: number;
    currency: string;
}

/**
 * Reçu de vente, vente à crédit et facture proforma.
 *
 * Les trois partagent le même corps et ne diffèrent que par leur bandeau, leur
 * pied et la présence du bloc de règlement : c'est bien un seul document à trois
 * états, pas trois documents.
 */

interface SaleReceiptItem {
    name: string;
    quantity: number;
    /** « 2 cartons + 3 bouteilles » : ce que le client emporte réellement. */
    quantityLabel?: string;
    unitPrice: number;
    discountPercentage?: number;
    total: number;
    /**
     * Devise dans laquelle CE prix a été annoncé au client.
     *
     * Absente : celle de la facture, ce que tout ticket a porté jusqu'ici.
     * `SaleReceiptPayment` portait déjà la sienne ; la ligne d'article, non -
     * et c'est ce qui empêchait d'imprimer une vente annoncée en deux monnaies.
     */
    currency?: string;
}
/** Un sous-total du ticket, pour une devise d'annonce. */
interface SaleReceiptCurrencyTotal {
    currency: string;
    total: number;
}
interface SaleReceiptPayment {
    method: string;
    amount: number;
    currency: string;
}
interface SaleReceiptData extends BaseDocumentData {
    kind: "sale" | "credit_sale" | "proforma";
    chrome: ReceiptChrome;
    warehouseName?: string;
    items: SaleReceiptItem[];
    /**
     * Les sous-totaux ANNONCÉS, par devise.
     *
     * ⚠ ILS NE S'ADDITIONNENT PAS, et c'est tout leur objet : leur somme
     * n'existe dans aucune monnaie. C'est « Total à payer » qui donne la
     * facture, en convertissant chaque ligne au taux de sa devise. Absent ou à
     * une seule entrée : rien ne s'imprime, le ticket est mono-devise.
     */
    currencyTotals?: SaleReceiptCurrencyTotal[];
    subtotal: number;
    taxAmount: number;
    /** Remise totale, part payée en points comprise. */
    discountAmount: number;
    /** Remise globale en montant fixe, telle que saisie au POS. */
    globalDiscountAmount?: number;
    /** Remise globale en pourcentage, chemin historique. */
    globalDiscountPercent?: number;
    /**
     * Part du total réglée par les points, déjà comprise dans `discountAmount`.
     * On l'isole pour que le client voie que ses points ont payé, au lieu de lire
     * une remise anonyme.
     */
    loyaltyRedemptionAmount?: number;
    total: number;
    currency: string;
    payments: SaleReceiptPayment[];
    /** La monnaie rendue, exprimée dans `changeCurrency`. */
    changeAmount?: number;
    /**
     * La devise des billets RENDUS, quand elle n'est pas celle de la facture.
     *
     * ⚠ Sans elle, une monnaie rendue en francs sur une facture en dollars
     * sortait « Monnaie rendue 89 240.00 $ » : le bon nombre, sous le mauvais
     * symbole, sur le papier que le client emporte. Le serveur la porte depuis
     * toujours (`Sale.change_currency`) ; le document n'avait aucun champ pour
     * la recevoir. Relevé sur l'émulateur le 2026-11-14. Absente : la devise de
     * la facture.
     */
    changeCurrency?: string;
    amountDue?: number;
    dueDate?: string;
    loyalty?: LoyaltyData;
    debt?: DebtData;
}
declare function buildSaleReceipt(data: SaleReceiptData): Block[];

/**
 * Reçu de règlement de dette.
 *
 * C'est le document qui a motivé la refonte : il sortait sans adresse ni
 * téléphone, avec un numéro fabriqué dans le navigateur, des libellés collés à
 * leur montant, et rien pour le distinguer d'un ticket de vente.
 */

interface PaymentReceiptData extends BaseDocumentData {
    kind: "debt_payment" | "advance" | "adjustment";
    chrome: ReceiptChrome;
    /** Moyen de paiement, tel que nommé par l'organisation. */
    paymentMethod?: string;
    /** Référence externe : numéro de transaction mobile money, de chèque… */
    paymentReference?: string;
    amountPaid: number;
    currency: string;
    /**
     * Montant réellement remis, quand il est dans une autre devise que celle de
     * l'imputation. Sans lui, un client qui paie en francs une facture en dollars
     * ne lit sur son reçu aucun des billets qu'il a sortis.
     */
    tenderedAmount?: number;
    tenderedCurrency?: string;
    /** Facture réglée, s'il s'agit d'un règlement imputé à une facture précise. */
    invoice?: {
        reference: string;
        total: number;
        previouslyPaid: number;
        remaining: number;
        /** Devise de la facture, qui fait foi pour les trois montants ci-dessus. */
        currency: string;
    };
    /** Factures soldées d'un coup par un règlement global. */
    settledInvoices?: string[];
    debt?: DebtData;
    loyalty?: LoyaltyData;
    notes?: string;
}
declare function buildPaymentReceipt(data: PaymentReceiptData): Block[];

/**
 * Ticket de clôture de caisse (Z) et reçu de dépense.
 *
 * Ni l'un ni l'autre n'existaient : fermer une caisse ne laissait aucune trace
 * papier, alors que c'est précisément le moment où le caissier remet le fond et
 * où un écart doit être constaté et signé.
 */

/**
 * Une ligne par devise. Jamais de total inter-devises : additionner des francs
 * et des dollars dans un scalaire est la faute que le projet a déjà corrigée
 * partout ailleurs, et un ticket de caisse est le pire endroit pour la refaire.
 */
interface CashSessionCurrencyLine {
    currency: string;
    opening: number;
    expected: number;
    counted: number | null;
    difference: number | null;
}
interface CashSessionReceiptData extends BaseDocumentData {
    kind: "cash_session";
    chrome: ReceiptChrome;
    openedAt: string;
    closedAt: string;
    openedByName?: string;
    closedByName?: string;
    warehouseName?: string;
    salesCount: number;
    /** Encaissements par moyen de paiement, déjà libellés avec leur devise. */
    paymentsSummary: {
        method: string;
        total: string;
    }[];
    balances: CashSessionCurrencyLine[];
}
declare function buildCashSessionReceipt(data: CashSessionReceiptData): Block[];
/**
 * Reçu de dépense : la pièce justificative de l'argent SORTI.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ IL S'IMPRIME AU PAIEMENT, PLUS À LA CRÉATION.                           │
 * │                                                                          │
 * │ Une dépense naît en brouillon et ne sort de la caisse qu'au paiement.    │
 * │ Le reçu imprimé à la création justifiait donc une sortie qui n'avait pas │
 * │ eu lieu, et pouvait même ne jamais avoir lieu (dépense rejetée). Ce qui  │
 * │ se remet à la création est la DEMANDE (`buildExpenseRequest`).           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `cashierName` est le PAYEUR, celui qui a fait sortir l'argent ; `date` est
 * l'instant du paiement. `paidAt` doublonnerait `date` : il n'existe pas.
 */
interface ExpenseReceiptData extends BaseDocumentData {
    kind: "expense";
    chrome: ReceiptChrome;
    category?: string;
    payee?: string;
    paymentMethod?: string;
    /** Référence du paiement (numéro de transaction, de chèque…). */
    paymentReference?: string;
    /** Qui a approuvé la dépense, s'il est connu. */
    approvedBy?: string;
    amount: number;
    currency: string;
    description?: string;
}
declare function buildExpenseReceipt(data: ExpenseReceiptData): Block[];
/**
 * Demande de dépense : ce qui se remet à la CRÉATION.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CE N'EST PAS UN JUSTIFICATIF, ET LE PAPIER LE DIT DEUX FOIS.            │
 * │                                                                          │
 * │ Sous le bandeau, et dans le corps. Aucun argent n'est sorti : la demande │
 * │ attend une approbation, puis un paiement, qui seul imprime le reçu.      │
 * │ Elle porte le MÊME numéro que ce reçu : c'est la même dépense, avant et  │
 * │ après la sortie d'argent, et c'est ce numéro qu'on rapproche.           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `cashierName` est le DEMANDEUR ; `date` est l'instant de la demande.
 */
interface ExpenseRequestData extends BaseDocumentData {
    kind: "expense_request";
    chrome: ReceiptChrome;
    category?: string;
    payee?: string;
    amount: number;
    currency: string;
    description?: string;
}
declare function buildExpenseRequest(data: ExpenseRequestData): Block[];

/**
 * Ticket « rapport de la journée » : la lecture de contrôle d'une journée.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CE N'EST PAS UN Z, ET LE PAPIER LE DIT.                                 │
 * │                                                                          │
 * │ Il ne clôture aucune caisse, ne fige aucun solde et ne porte aucun      │
 * │ numéro : il se régénère depuis l'écran, comme la proforma, et le        │
 * │ terminal ne le range pas parmi les documents à valeur probante. Il dit  │
 * │ ce que la journée a produit, à l'instant où on l'imprime.               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ LES RELEVÉS SONT EN DEVISE PRINCIPALE, CHAQUE VENTE DANS SA DEVISE. Les
 * relevés sont des sommes converties au taux figé de chaque vente (la même
 * lecture que l'écran) ; une ligne de vente garde la monnaie de sa facture, et
 * aucun total n'additionne deux monnaies.
 *
 * ⚠ LA LISTE EST BORNÉE. Au-delà de `LIGNES_MAX_RAPPORT` ventes, on imprime les
 * plus récentes et on renvoie au document A4 : un rouleau de trois cents lignes
 * n'est pas un rapport.
 */

/** Au-delà, le ticket renvoie au document A4 pour la liste complète. */
declare const LIGNES_MAX_RAPPORT = 60;
interface DayReportSale {
    /** Heure locale, « 14:07 ». */
    time: string;
    reference: string;
    amount: number;
    /** La devise de SA facture. */
    currency: string;
    /** Mention courte accolée à la référence : « crédit », « annulée ». */
    note?: string;
}
interface DayReportData {
    kind: "day_report";
    chrome: ReceiptChrome;
    /** « Lundi 23 novembre 2026 ». */
    day: string;
    /** Heure de l'arrêté, « 14:07 ». */
    closedAt: string;
    /** Ce que la journée couvre : « Mes opérations », « Boutique Nord · toute l'équipe ». */
    scope: string;
    /** Qui imprime. */
    printedBy?: string;
    /** Devise des relevés : la PRINCIPALE. */
    currency: string;
    sales: {
        count: number;
        total: number;
        onCredit: number;
    };
    /** Encaissé par moyen, en devise principale. */
    payments: {
        method: string;
        total: number;
    }[];
    expenses: {
        count: number;
        total: number;
    };
    cash: {
        cashIn: number;
        cashOut: number;
        net: number;
    };
    /** Mouvements de stock du jour par type ; absent sans droit de les lire. */
    stock?: {
        label: string;
        count: number;
    }[] | null;
    /**
     * Les ventes, de la plus ancienne à la plus récente. `null` : le lecteur n'a
     * pas le droit de lire les ventes, la section n'existe pas.
     */
    lines?: DayReportSale[] | null;
    currencyOverrides?: CurrencyOverrides;
}
declare function buildDayReport(data: DayReportData): Block[];

/**
 * Fabrique de tickets, partie portable.
 *
 * Un document se DÉCRIT ici, sous forme de blocs typés ; il se REND ailleurs.
 * Trois moteurs consomment ces mêmes blocs :
 *   - `frontend/lib/receipt/render-pdf.ts`  : PDF jsPDF, pour le navigateur ;
 *   - mobile `src/printing/render-text.ts`  : texte 42 colonnes, imprimante NYX ;
 *   - mobile `src/printing/render-html.ts`  : HTML puis PDF, repli iOS.
 *
 * C'est ce qui met fin à la double implémentation : web et mobile décrivent
 * littéralement le même document, ils n'en diffèrent que par le rendu.
 */

type index_AmountRow = AmountRow;
type index_BaseDocumentData = BaseDocumentData;
type index_Block = Block;
type index_CashSessionCurrencyLine = CashSessionCurrencyLine;
type index_CashSessionReceiptData = CashSessionReceiptData;
type index_CurrencyOverride = CurrencyOverride;
type index_CurrencyOverrides = CurrencyOverrides;
declare const index_DOCUMENT_IDENTITIES: typeof DOCUMENT_IDENTITIES;
declare const index_DUPLICATE_CHIP: typeof DUPLICATE_CHIP;
type index_DayReportData = DayReportData;
type index_DayReportSale = DayReportSale;
type index_DebtData = DebtData;
type index_DocumentIdentity = DocumentIdentity;
type index_DocumentKind = DocumentKind;
type index_ExpenseReceiptData = ExpenseReceiptData;
type index_ExpenseRequestData = ExpenseRequestData;
declare const index_FONTS: typeof FONTS;
type index_FontRole = FontRole;
type index_FontSpec = FontSpec;
type index_ItemRow = ItemRow;
type index_KvRow = KvRow;
declare const index_LIGNES_MAX_RAPPORT: typeof LIGNES_MAX_RAPPORT;
type index_LoadedLogo = LoadedLogo;
type index_LoyaltyData = LoyaltyData;
type index_OrgIdentity = OrgIdentity;
type index_PaperWidth = PaperWidth;
type index_PaymentReceiptData = PaymentReceiptData;
type index_ReceiptChrome = ReceiptChrome;
type index_RuleWeight = RuleWeight;
type index_SaleReceiptData = SaleReceiptData;
type index_SaleReceiptItem = SaleReceiptItem;
type index_SaleReceiptPayment = SaleReceiptPayment;
type index_SpaceSize = SpaceSize;
type index_Tokens = Tokens;
declare const index_buildCashSessionReceipt: typeof buildCashSessionReceipt;
declare const index_buildDayReport: typeof buildDayReport;
declare const index_buildExpenseReceipt: typeof buildExpenseReceipt;
declare const index_buildExpenseRequest: typeof buildExpenseRequest;
declare const index_buildPaymentReceipt: typeof buildPaymentReceipt;
declare const index_buildSaleReceipt: typeof buildSaleReceipt;
declare const index_compact: typeof compact;
declare const index_deaccent: typeof deaccent;
declare const index_decimalsOf: typeof decimalsOf;
declare const index_footerBlocks: typeof footerBlocks;
declare const index_formatAmount: typeof formatAmount;
declare const index_formatBare: typeof formatBare;
declare const index_formatMoney: typeof formatMoney;
declare const index_formatQuantity: typeof formatQuantity;
declare const index_formatQuantityWithUnit: typeof formatQuantityWithUnit;
declare const index_leading: typeof leading;
declare const index_leadingOf: typeof leadingOf;
declare const index_orgHeaderBlocks: typeof orgHeaderBlocks;
declare const index_symbolOf: typeof symbolOf;
declare const index_tokensFor: typeof tokensFor;
declare namespace index {
  export { type index_AmountRow as AmountRow, type index_BaseDocumentData as BaseDocumentData, type index_Block as Block, type index_CashSessionCurrencyLine as CashSessionCurrencyLine, type index_CashSessionReceiptData as CashSessionReceiptData, type index_CurrencyOverride as CurrencyOverride, type index_CurrencyOverrides as CurrencyOverrides, index_DOCUMENT_IDENTITIES as DOCUMENT_IDENTITIES, index_DUPLICATE_CHIP as DUPLICATE_CHIP, type index_DayReportData as DayReportData, type index_DayReportSale as DayReportSale, type index_DebtData as DebtData, type index_DocumentIdentity as DocumentIdentity, type index_DocumentKind as DocumentKind, type index_ExpenseReceiptData as ExpenseReceiptData, type index_ExpenseRequestData as ExpenseRequestData, index_FONTS as FONTS, type index_FontRole as FontRole, type index_FontSpec as FontSpec, type index_ItemRow as ItemRow, type index_KvRow as KvRow, index_LIGNES_MAX_RAPPORT as LIGNES_MAX_RAPPORT, type index_LoadedLogo as LoadedLogo, type index_LoyaltyData as LoyaltyData, type index_OrgIdentity as OrgIdentity, type index_PaperWidth as PaperWidth, type index_PaymentReceiptData as PaymentReceiptData, type index_ReceiptChrome as ReceiptChrome, type index_RuleWeight as RuleWeight, type index_SaleReceiptData as SaleReceiptData, type index_SaleReceiptItem as SaleReceiptItem, type index_SaleReceiptPayment as SaleReceiptPayment, type index_SpaceSize as SpaceSize, type index_Tokens as Tokens, index_buildCashSessionReceipt as buildCashSessionReceipt, index_buildDayReport as buildDayReport, index_buildExpenseReceipt as buildExpenseReceipt, index_buildExpenseRequest as buildExpenseRequest, index_buildPaymentReceipt as buildPaymentReceipt, index_buildSaleReceipt as buildSaleReceipt, index_compact as compact, index_deaccent as deaccent, index_decimalsOf as decimalsOf, index_footerBlocks as footerBlocks, index_formatAmount as formatAmount, index_formatBare as formatBare, index_formatMoney as formatMoney, index_formatQuantity as formatQuantity, index_formatQuantityWithUnit as formatQuantityWithUnit, index_leading as leading, index_leadingOf as leadingOf, index_orgHeaderBlocks as orgHeaderBlocks, index_symbolOf as symbolOf, index_tokensFor as tokensFor };
}

export { symbolOf as $, type AmountRow as A, type BaseDocumentData as B, type CashSessionCurrencyLine as C, DOCUMENT_IDENTITIES as D, type ExpenseReceiptData as E, FONTS as F, buildSaleReceipt as G, compact as H, type ItemRow as I, deaccent as J, type KvRow as K, LIGNES_MAX_RAPPORT as L, decimalsOf as M, footerBlocks as N, type OrgIdentity as O, type PaperWidth as P, formatAmount as Q, type ReceiptChrome as R, type SaleReceiptData as S, type Tokens as T, formatBare as U, formatMoney as V, formatQuantity as W, formatQuantityWithUnit as X, leading as Y, leadingOf as Z, orgHeaderBlocks as _, type Block as a, tokensFor as a0, type CashSessionReceiptData as b, type CurrencyOverride as c, type CurrencyOverrides as d, DUPLICATE_CHIP as e, type DayReportData as f, type DayReportSale as g, type DebtData as h, index as i, type DocumentIdentity as j, type DocumentKind as k, type ExpenseRequestData as l, type FontRole as m, type FontSpec as n, type LoadedLogo as o, type LoyaltyData as p, type PaymentReceiptData as q, type RuleWeight as r, type SaleReceiptItem as s, type SaleReceiptPayment as t, type SpaceSize as u, buildCashSessionReceipt as v, buildDayReport as w, buildExpenseReceipt as x, buildExpenseRequest as y, buildPaymentReceipt as z };
