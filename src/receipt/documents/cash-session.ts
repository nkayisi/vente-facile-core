/**
 * Ticket de clôture de caisse (Z) et reçu de dépense.
 *
 * Ni l'un ni l'autre n'existaient : fermer une caisse ne laissait aucune trace
 * papier, alors que c'est précisément le moment où le caissier remet le fond et
 * où un écart doit être constaté et signé.
 */

import { compact, type Block, type KvRow } from "../blocks";
import { footerBlocks, orgHeaderBlocks, type ReceiptChrome } from "../identity";
import { formatMoney } from "../money";
import { identityBlocks, infoBlocks, type BaseDocumentData } from "./common";

/**
 * Une ligne par devise. Jamais de total inter-devises : additionner des francs
 * et des dollars dans un scalaire est la faute que le projet a déjà corrigée
 * partout ailleurs, et un ticket de caisse est le pire endroit pour la refaire.
 */
export interface CashSessionCurrencyLine {
  currency: string;
  opening: number;
  expected: number;
  counted: number | null;
  difference: number | null;
}

export interface CashSessionReceiptData extends BaseDocumentData {
  kind: "cash_session";
  chrome: ReceiptChrome;
  openedAt: string;
  closedAt: string;
  openedByName?: string;
  closedByName?: string;
  warehouseName?: string;
  salesCount: number;
  /** Encaissements par moyen de paiement, déjà libellés avec leur devise. */
  paymentsSummary: { method: string; total: string }[];
  balances: CashSessionCurrencyLine[];
}

export function buildCashSessionReceipt(data: CashSessionReceiptData): Block[] {
  const money = (amount: number, currency: string) =>
    formatMoney(amount, currency, data.currencyOverrides);

  const info = compact<KvRow>([
    data.warehouseName && { label: "Dépôt", value: data.warehouseName },
    { label: "Ouverte le", value: data.openedAt },
    data.openedByName && { label: "Ouverte par", value: data.openedByName },
    { label: "Fermée le", value: data.closedAt },
    data.closedByName && { label: "Fermée par", value: data.closedByName },
  ]);

  const currencyBlocks = data.balances.flatMap((line): Block[] => {
    const rows = compact<KvRow>([
      { label: "Fond d'ouverture", value: money(line.opening, line.currency) },
      { label: "Attendu en caisse", value: money(line.expected, line.currency) },
      line.counted !== null && {
        label: "Compté",
        value: money(line.counted, line.currency),
      },
      // Un écart nul ne mérite pas une ligne « Excédent 0,00 » : on le dit en
      // clair, c'est justement la bonne nouvelle que le responsable cherche.
      line.difference !== null &&
        Math.abs(line.difference) > 0.005 && {
          label: line.difference < 0 ? "Manquant" : "Excédent",
          value: money(Math.abs(line.difference), line.currency),
          strong: true,
        },
      line.difference !== null &&
        Math.abs(line.difference) <= 0.005 && {
          label: "Écart",
          value: "aucun",
        },
    ]);

    return [
      { kind: "space", size: "sm" },
      { kind: "text", text: line.currency, role: "chip", align: "left" },
      { kind: "amounts", rows, role: "body" },
    ];
  });

  return compact<Block>([
    ...orgHeaderBlocks(data.chrome),
    ...identityBlocks(data),
    ...infoBlocks(data, info),

    { kind: "space", size: "sm" },
    {
      kind: "amounts",
      rows: [{ label: "Ventes de la session", value: String(data.salesCount) }],
      role: "body",
    },

    data.paymentsSummary.length > 0 && { kind: "space", size: "sm" },
    data.paymentsSummary.length > 0 && {
      kind: "text",
      text: "Encaissements par moyen",
      role: "label",
      align: "left",
    },
    data.paymentsSummary.length > 0 && {
      kind: "amounts",
      rows: data.paymentsSummary.map((p) => ({
        label: p.method,
        value: p.total,
      })),
      role: "body",
    },

    { kind: "space", size: "sm" },
    { kind: "rule", weight: "light" },
    { kind: "text", text: "Soldes par devise", role: "label", align: "left" },
    ...currencyBlocks,

    { kind: "space", size: "lg" },
    { kind: "rule", weight: "hair" },
    { kind: "text", text: "Caissier", role: "legal", align: "left" },
    { kind: "space", size: "lg" },
    { kind: "rule", weight: "hair" },
    { kind: "text", text: "Responsable", role: "legal", align: "left" },

    ...footerBlocks({ org: data.chrome.org }, [
      "Ticket de contrôle de caisse.",
      "À conserver avec le fond remis.",
    ]),
  ]);
}

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
export interface ExpenseReceiptData extends BaseDocumentData {
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

export function buildExpenseReceipt(data: ExpenseReceiptData): Block[] {
  const info = compact<KvRow>([
    data.category && { label: "Catégorie", value: data.category },
    data.payee && { label: "Bénéficiaire", value: data.payee },
    data.paymentMethod && { label: "Mode", value: data.paymentMethod },
    data.paymentReference && { label: "Réf. paiement", value: data.paymentReference },
    data.approvedBy && { label: "Approuvée par", value: data.approvedBy },
  ]);

  return compact<Block>([
    ...orgHeaderBlocks(data.chrome),
    ...identityBlocks(data),
    ...infoBlocks(data, info, "Payé par"),

    data.description && { kind: "space", size: "sm" },
    data.description && {
      kind: "text",
      text: data.description,
      role: "body",
      align: "left",
    },

    { kind: "space", size: "sm" },
    {
      kind: "total",
      label: "Montant décaissé",
      value: formatMoney(data.amount, data.currency, data.currencyOverrides),
    },

    { kind: "space", size: "lg" },
    { kind: "rule", weight: "hair" },
    { kind: "text", text: "Bénéficiaire", role: "legal", align: "left" },

    ...footerBlocks({ org: data.chrome.org }, [
      "Pièce justificative de sortie de caisse.",
    ]),
  ]);
}

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
export interface ExpenseRequestData extends BaseDocumentData {
  kind: "expense_request";
  chrome: ReceiptChrome;
  category?: string;
  payee?: string;
  amount: number;
  currency: string;
  description?: string;
}

export function buildExpenseRequest(data: ExpenseRequestData): Block[] {
  const info = compact<KvRow>([
    data.category && { label: "Catégorie", value: data.category },
    data.payee && { label: "Bénéficiaire", value: data.payee },
  ]);

  return compact<Block>([
    ...orgHeaderBlocks(data.chrome),
    ...identityBlocks(data),
    ...infoBlocks(data, info, "Demandée par"),

    data.description && { kind: "space", size: "sm" },
    data.description && {
      kind: "text",
      text: data.description,
      role: "body",
      align: "left",
    },

    { kind: "space", size: "sm" },
    {
      kind: "total",
      label: "Montant demandé",
      value: formatMoney(data.amount, data.currency, data.currencyOverrides),
    },

    // Dans le CORPS et non dans les lignes de pied : celles-ci sont des
    // lignes « par défaut », que `footerBlocks` remplace dès qu'on lui passe
    // le pied du marchand. La mention ne doit dépendre d'aucun réglage.
    { kind: "space", size: "sm" },
    {
      kind: "text",
      text: "Aucun argent n'est encore sorti : il sortira au paiement, contre le reçu de dépense.",
      role: "label",
      align: "left",
    },

    { kind: "space", size: "lg" },
    { kind: "rule", weight: "hair" },
    { kind: "text", text: "Demandeur", role: "legal", align: "left" },
    { kind: "space", size: "lg" },
    { kind: "rule", weight: "hair" },
    { kind: "text", text: "Approbation", role: "legal", align: "left" },

    ...footerBlocks({ org: data.chrome.org }, ["Pièce à présenter au paiement."]),
  ]);
}
