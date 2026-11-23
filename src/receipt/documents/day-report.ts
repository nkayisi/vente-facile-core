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

import { compact, type AmountRow, type Block, type KvRow } from "../blocks";
import { footerBlocks, orgHeaderBlocks, type ReceiptChrome } from "../identity";
import { formatMoney, type CurrencyOverrides } from "../money";
import { identityBlocks } from "./common";

/** Au-delà, le ticket renvoie au document A4 pour la liste complète. */
export const LIGNES_MAX_RAPPORT = 60;

export interface DayReportSale {
  /** Heure locale, « 14:07 ». */
  time: string;
  reference: string;
  amount: number;
  /** La devise de SA facture. */
  currency: string;
  /** Mention courte accolée à la référence : « crédit », « annulée ». */
  note?: string;
}

export interface DayReportData {
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
  sales: { count: number; total: number; onCredit: number };
  /** Encaissé par moyen, en devise principale. */
  payments: { method: string; total: number }[];
  expenses: { count: number; total: number };
  cash: { cashIn: number; cashOut: number; net: number };
  /** Mouvements de stock du jour par type ; absent sans droit de les lire. */
  stock?: { label: string; count: number }[] | null;
  /**
   * Les ventes, de la plus ancienne à la plus récente. `null` : le lecteur n'a
   * pas le droit de lire les ventes, la section n'existe pas.
   */
  lines?: DayReportSale[] | null;
  currencyOverrides?: CurrencyOverrides;
}

export function buildDayReport(data: DayReportData): Block[] {
  const money = (amount: number, currency: string) =>
    formatMoney(amount, currency, data.currencyOverrides);
  const principal = (amount: number) => money(amount, data.currency);

  const info = compact<KvRow>([
    { label: "Journée", value: data.day, strong: true },
    { label: "Arrêté à", value: data.closedAt },
    { label: "Portée", value: data.scope },
    data.printedBy && { label: "Imprimé par", value: data.printedBy },
  ]);

  const ventes = compact<AmountRow>([
    { label: "Ventes", value: String(data.sales.count) },
    { label: "Facturé", value: principal(data.sales.total), strong: true },
    data.sales.onCredit > 0.005 && {
      label: "dont à crédit",
      value: principal(data.sales.onCredit),
    },
  ]);

  const caisse: AmountRow[] = [
    {
      label: `Dépenses (${data.expenses.count})`,
      value: principal(data.expenses.total),
    },
    { label: "Entrées de caisse", value: principal(data.cash.cashIn) },
    { label: "Sorties de caisse", value: principal(data.cash.cashOut) },
    { label: "Solde net de caisse", value: principal(data.cash.net), strong: true },
  ];

  const lignes = data.lines ?? null;
  const visibles = lignes ? lignes.slice(-LIGNES_MAX_RAPPORT) : [];
  const omises = lignes ? lignes.length - visibles.length : 0;

  return compact<Block>([
    ...orgHeaderBlocks(data.chrome),
    ...identityBlocks({ kind: "day_report", number: "", date: data.day }),
    { kind: "kv", rows: info, mode: "inline", role: "body" },
    { kind: "space", size: "xs" },
    { kind: "rule", weight: "light" },

    { kind: "space", size: "sm" },
    { kind: "amounts", rows: ventes, role: "body" },

    { kind: "space", size: "sm" },
    { kind: "text", text: "Encaissé par moyen", role: "label", align: "left" },
    data.payments.length > 0
      ? {
          kind: "amounts",
          rows: data.payments.map((p) => ({ label: p.method, value: principal(p.total) })),
          role: "body",
        }
      : { kind: "text", text: "Aucun encaissement", role: "body", align: "left" },

    { kind: "space", size: "sm" },
    { kind: "rule", weight: "light" },
    { kind: "amounts", rows: caisse, role: "body" },

    data.stock && { kind: "space", size: "sm" },
    data.stock && { kind: "rule", weight: "light" },
    data.stock && { kind: "text", text: "Mouvements de stock", role: "label", align: "left" },
    data.stock &&
      (data.stock.length > 0
        ? {
            kind: "amounts",
            rows: data.stock.map((s) => ({ label: s.label, value: String(s.count) })),
            role: "body",
          }
        : { kind: "text", text: "Aucun mouvement", role: "body", align: "left" }),

    lignes && { kind: "space", size: "sm" },
    lignes && { kind: "rule", weight: "light" },
    lignes && {
      kind: "text",
      text: `Ventes de la journée (${lignes.length})`,
      role: "label",
      align: "left",
    },
    lignes && omises > 0 && {
      kind: "text",
      text: `${omises} vente${omises > 1 ? "s" : ""} plus ancienne${omises > 1 ? "s" : ""} : liste complète dans le document A4.`,
      role: "legal",
      align: "left",
    },
    lignes &&
      (visibles.length > 0
        ? {
            kind: "amounts",
            rows: visibles.map((l) => ({
              label: `${l.time} ${l.reference}${l.note ? ` (${l.note})` : ""}`,
              value: money(l.amount, l.currency),
            })),
            role: "body",
          }
        : { kind: "text", text: "Aucune vente", role: "body", align: "left" }),

    ...footerBlocks({ org: data.chrome.org }, [
      "Lecture de contrôle de la journée.",
      "Ne clôture aucune caisse.",
    ]),
  ]);
}
