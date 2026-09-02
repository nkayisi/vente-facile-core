import { R as ReceiptChrome, B as Block, A as AmountRow, F as FONTS, a as FontRole, b as FontSpec, I as ItemRow, K as KvRow, L as LoadedLogo, O as OrgIdentity, P as PaperWidth, c as RuleWeight, S as SpaceSize, T as Tokens, d as compact, f as footerBlocks, l as leading, e as leadingOf, o as orgHeaderBlocks, t as tokensFor } from './identity-ijBP1mCv.js';

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
 * Points de fidélité.
 *
 * Fractionnaires par nature : 1 % d'un panier de 58 $ vaut 0,58 point, et
 * arrondir à l'entier revenait à ne rien créditer. On garde la fraction, mais
 * seulement quand elle existe : « 3 pts », pas « 3.00 pts ».
 */
declare function formatPoints(points: number | undefined | null): string;
/** Quantité : 3 décimales possibles, mais on ne les imprime pas pour rien. */
declare function formatQuantity(quantity: number | string): string;
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
type DocumentKind = "sale" | "credit_sale" | "proforma" | "debt_payment" | "advance" | "adjustment" | "sale_return" | "cash_session" | "expense";
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
    changeAmount?: number;
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
interface ExpenseReceiptData extends BaseDocumentData {
    kind: "expense";
    chrome: ReceiptChrome;
    category?: string;
    payee?: string;
    paymentMethod?: string;
    amount: number;
    currency: string;
    description?: string;
}
declare function buildExpenseReceipt(data: ExpenseReceiptData): Block[];

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

declare const index_AmountRow: typeof AmountRow;
type index_BaseDocumentData = BaseDocumentData;
declare const index_Block: typeof Block;
type index_CashSessionCurrencyLine = CashSessionCurrencyLine;
type index_CashSessionReceiptData = CashSessionReceiptData;
type index_CurrencyOverride = CurrencyOverride;
type index_CurrencyOverrides = CurrencyOverrides;
declare const index_DOCUMENT_IDENTITIES: typeof DOCUMENT_IDENTITIES;
declare const index_DUPLICATE_CHIP: typeof DUPLICATE_CHIP;
type index_DebtData = DebtData;
type index_DocumentIdentity = DocumentIdentity;
type index_DocumentKind = DocumentKind;
type index_ExpenseReceiptData = ExpenseReceiptData;
declare const index_FONTS: typeof FONTS;
declare const index_FontRole: typeof FontRole;
declare const index_FontSpec: typeof FontSpec;
declare const index_ItemRow: typeof ItemRow;
declare const index_KvRow: typeof KvRow;
declare const index_LoadedLogo: typeof LoadedLogo;
type index_LoyaltyData = LoyaltyData;
declare const index_OrgIdentity: typeof OrgIdentity;
declare const index_PaperWidth: typeof PaperWidth;
type index_PaymentReceiptData = PaymentReceiptData;
declare const index_ReceiptChrome: typeof ReceiptChrome;
declare const index_RuleWeight: typeof RuleWeight;
type index_SaleReceiptData = SaleReceiptData;
type index_SaleReceiptItem = SaleReceiptItem;
type index_SaleReceiptPayment = SaleReceiptPayment;
declare const index_SpaceSize: typeof SpaceSize;
declare const index_Tokens: typeof Tokens;
declare const index_buildCashSessionReceipt: typeof buildCashSessionReceipt;
declare const index_buildExpenseReceipt: typeof buildExpenseReceipt;
declare const index_buildPaymentReceipt: typeof buildPaymentReceipt;
declare const index_buildSaleReceipt: typeof buildSaleReceipt;
declare const index_compact: typeof compact;
declare const index_deaccent: typeof deaccent;
declare const index_decimalsOf: typeof decimalsOf;
declare const index_footerBlocks: typeof footerBlocks;
declare const index_formatAmount: typeof formatAmount;
declare const index_formatBare: typeof formatBare;
declare const index_formatMoney: typeof formatMoney;
declare const index_formatPoints: typeof formatPoints;
declare const index_formatQuantity: typeof formatQuantity;
declare const index_leading: typeof leading;
declare const index_leadingOf: typeof leadingOf;
declare const index_orgHeaderBlocks: typeof orgHeaderBlocks;
declare const index_symbolOf: typeof symbolOf;
declare const index_tokensFor: typeof tokensFor;
declare namespace index {
  export { index_AmountRow as AmountRow, type index_BaseDocumentData as BaseDocumentData, index_Block as Block, type index_CashSessionCurrencyLine as CashSessionCurrencyLine, type index_CashSessionReceiptData as CashSessionReceiptData, type index_CurrencyOverride as CurrencyOverride, type index_CurrencyOverrides as CurrencyOverrides, index_DOCUMENT_IDENTITIES as DOCUMENT_IDENTITIES, index_DUPLICATE_CHIP as DUPLICATE_CHIP, type index_DebtData as DebtData, type index_DocumentIdentity as DocumentIdentity, type index_DocumentKind as DocumentKind, type index_ExpenseReceiptData as ExpenseReceiptData, index_FONTS as FONTS, index_FontRole as FontRole, index_FontSpec as FontSpec, index_ItemRow as ItemRow, index_KvRow as KvRow, index_LoadedLogo as LoadedLogo, type index_LoyaltyData as LoyaltyData, index_OrgIdentity as OrgIdentity, index_PaperWidth as PaperWidth, type index_PaymentReceiptData as PaymentReceiptData, index_ReceiptChrome as ReceiptChrome, index_RuleWeight as RuleWeight, type index_SaleReceiptData as SaleReceiptData, type index_SaleReceiptItem as SaleReceiptItem, type index_SaleReceiptPayment as SaleReceiptPayment, index_SpaceSize as SpaceSize, index_Tokens as Tokens, index_buildCashSessionReceipt as buildCashSessionReceipt, index_buildExpenseReceipt as buildExpenseReceipt, index_buildPaymentReceipt as buildPaymentReceipt, index_buildSaleReceipt as buildSaleReceipt, index_compact as compact, index_deaccent as deaccent, index_decimalsOf as decimalsOf, index_footerBlocks as footerBlocks, index_formatAmount as formatAmount, index_formatBare as formatBare, index_formatMoney as formatMoney, index_formatPoints as formatPoints, index_formatQuantity as formatQuantity, index_leading as leading, index_leadingOf as leadingOf, index_orgHeaderBlocks as orgHeaderBlocks, index_symbolOf as symbolOf, index_tokensFor as tokensFor };
}

export { type BaseDocumentData as B, type CashSessionCurrencyLine as C, DOCUMENT_IDENTITIES as D, type ExpenseReceiptData as E, type LoyaltyData as L, type PaymentReceiptData as P, type SaleReceiptData as S, type CashSessionReceiptData as a, type CurrencyOverride as b, type CurrencyOverrides as c, DUPLICATE_CHIP as d, type DebtData as e, type DocumentIdentity as f, type DocumentKind as g, type SaleReceiptItem as h, index as i, type SaleReceiptPayment as j, buildCashSessionReceipt as k, buildExpenseReceipt as l, buildPaymentReceipt as m, buildSaleReceipt as n, deaccent as o, decimalsOf as p, formatAmount as q, formatBare as r, formatMoney as s, formatPoints as t, formatQuantity as u, symbolOf as v };
