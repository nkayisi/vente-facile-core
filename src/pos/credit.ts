/**
 * Contrôle de crédit d'un client au moment d'encaisser.
 *
 * La règle était réécrite à trois endroits du POS web (validation à la
 * soumission, pré-avertissement dans la modale, `disabled` du bouton) avec des
 * variables différentes. Une seule fonction, que les trois appellent.
 *
 * La comparaison se fait en devise PRINCIPALE : c'est dans cette devise que le
 * serveur tient `current_balance` et `credit_limit`, la facture pouvant être
 * libellée dans une autre.
 */
import { formatPrice } from "../format";

export interface CreditCustomerLike {
  name?: string | null;
  /** `false` interdit le crédit. Distinct du plafond, voir plus bas. */
  allow_credit?: boolean | null;
  credit_limit?: string | number | null;
  current_balance?: string | number | null;
}

export interface CreditVerdict {
  creditLimit: number;
  currentBalance: number;
  /** Part de la vente qui partira à crédit, en devise principale. */
  creditInPrimary: number;
  projectedBalance: number;
  notAllowed: boolean;
  overLimit: boolean;
  blocked: boolean;
  reason: string | null;
}

const num = (v: string | number | null | undefined): number => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function evaluateCredit(
  customer: CreditCustomerLike | null | undefined,
  /** Total net de la vente, en devise principale. */
  netTotal: number,
  /** Somme déjà réglée, convertie en devise principale. */
  paidInPrimary: number,
  formatMoney: (amount: number) => string = (a) => formatPrice(a)
): CreditVerdict | null {
  if (!customer) return null;

  const creditLimit = num(customer.credit_limit);
  const currentBalance = num(customer.current_balance);
  const creditInPrimary = Math.max(0, netTotal - paidInPrimary);
  const projectedBalance = currentBalance + creditInPrimary;

  // `allow_credit` et `credit_limit` sont deux règles DISTINCTES : une limite à
  // 0 signifie « sans plafond », jamais « crédit refusé ».
  const notAllowed = customer.allow_credit === false;
  const overLimit = creditLimit > 0 && projectedBalance > creditLimit;

  return {
    creditLimit,
    currentBalance,
    creditInPrimary,
    projectedBalance,
    notAllowed,
    overLimit,
    blocked: notAllowed || overLimit,
    reason: notAllowed
      ? `${customer.name || "Ce client"} n'est pas autorisé à acheter à crédit.`
      : overLimit
        ? `Limite de crédit dépassée. Limite : ${formatMoney(creditLimit)}, ` +
          `dette actuelle : ${formatMoney(currentBalance)}, ` +
          `total projeté : ${formatMoney(projectedBalance)}.`
        : null,
  };
}
