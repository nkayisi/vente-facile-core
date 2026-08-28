/**
 * Corps de requête d'une vente, tel que `SaleCreateSerializer` l'attend.
 *
 * Partagé pour une raison précise : le backend prouve déjà, par test, que
 * l'opération `sale.create` du journal hors ligne et l'appel direct
 * `POST /sales/` laissent le même état. Cette preuve ne vaut que si les deux
 * surfaces envoient la même chose. En construisant le corps ici, la parité
 * cesse de reposer sur la vigilance de qui touchera l'un des deux écrans.
 *
 * On n'envoie que la SAISIE du caissier : quantités, prix unitaires, remises,
 * points. Aucun total n'est transmis. Le serveur totalise, plafonne les points,
 * contrôle le crédit et décrémente le stock ; c'est lui l'autorité, et les
 * calculs de `basket.ts` ne servent qu'à annoncer d'avance ce qu'il fera.
 */
import { packagingFactorOf, looseQuantityOf, type BasketLine } from "./basket";
import { loyaltyDiscount, type LoyaltyProgramLike } from "./loyalty";
import { basketTotals } from "./basket";
import { r2, type CurrencyTable } from "./money";

export interface SaleTender {
  /** Identifiant du `PaymentMethod`, jamais un libellé. */
  method: string;
  currency: string;
  amount: string | number;
  reference?: string;
}

export interface SalePayloadInput {
  lines: (BasketLine & { productId: string })[];
  currencies: CurrencyTable;
  invoiceCurrency: string;
  changeCurrency?: string | null;
  globalDiscountAmount?: number;
  tenders: SaleTender[];
  register: string;
  warehouse?: string | null;
  customer?: string | null;
  /** Vente portée au compte du client : le reliquat devient une dette. */
  isCredit?: boolean;
  /** Échéance, seulement si le caissier en a fixé une sur une vente à crédit. */
  dueDate?: string | null;
  loyaltyProgram?: LoyaltyProgramLike | null;
  pointsToUse?: number;
  isPos?: boolean;
}

export interface SaleItemPayload {
  product: string;
  unit_price: number;
  discount_percentage: number;
  quantity?: number;
  package_quantity?: number;
  loose_quantity?: number;
  package_unit_price?: number;
}

export interface SalePaymentPayload {
  payment_method: string;
  tendered_amount: number;
  currency: string;
  exchange_rate?: number;
  reference?: string;
}

export interface SalePayload {
  register: string;
  warehouse?: string;
  customer?: string;
  sale_type: "retail" | "credit";
  due_date?: string;
  global_discount_amount: number;
  discount_percentage: number;
  currency: string;
  exchange_rate: number;
  change_currency: string;
  is_pos: boolean;
  items: SaleItemPayload[];
  payments: SalePaymentPayload[];
  points_used?: number;
}

const num = (v: string | number | null | undefined): number => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function buildSalePayload(input: SalePayloadInput): SalePayload {
  const {
    lines, currencies, invoiceCurrency, changeCurrency,
    globalDiscountAmount = 0, tenders, register, warehouse, customer,
    isCredit = false, dueDate, loyaltyProgram, pointsToUse = 0, isPos = true,
  } = input;
  const primary = currencies.primary;
  const cur = invoiceCurrency;

  const items: SaleItemPayload[] = lines.map((line) => {
    const base: SaleItemPayload = {
      product: line.productId,
      unit_price: currencies.convertMoney(line.unit_price, primary, cur),
      discount_percentage: r2(line.discount_percentage),
    };
    // Produit vendu en gros : on envoie la saisie du caissier (contenants et
    // unités) plutôt qu'un total calculé ici. Le serveur fait la conversion et
    // reste seul juge de la quantité enregistrée, donc du partage scellé/vrac
    // qui sortira du stock.
    if (packagingFactorOf(line.product)) {
      return {
        ...base,
        package_quantity: line.packageQuantity,
        loose_quantity: looseQuantityOf(line),
        package_unit_price: currencies.convertMoney(
          num(line.product.wholesale_price), primary, cur
        ),
      };
    }
    return { ...base, quantity: line.quantity };
  });

  const payments: SalePaymentPayload[] = tenders
    .filter((t) => num(t.amount) > 0 && t.method)
    .map((t) => ({
      payment_method: t.method,
      tendered_amount: currencies.round(num(t.amount), t.currency),
      currency: t.currency,
      // Taux : devise de la vente pour 1 unité de la devise du règlement.
      ...(t.currency === cur
        ? {}
        : { exchange_rate: currencies.rateOf(t.currency) / currencies.rateOf(cur) }),
      ...(t.reference ? { reference: t.reference } : {}),
    }));

  const { total, globalDiscount } = basketTotals({ lines, globalDiscountAmount });
  const discount = loyaltyDiscount(total, pointsToUse, loyaltyProgram);

  return {
    register,
    ...(warehouse ? { warehouse } : {}),
    ...(customer ? { customer } : {}),
    sale_type: isCredit ? "credit" : "retail",
    ...(isCredit && dueDate ? { due_date: dueDate } : {}),
    global_discount_amount: currencies.convertMoney(globalDiscount, primary, cur),
    discount_percentage: 0,
    currency: cur,
    exchange_rate: currencies.rateOf(cur),
    change_currency: changeCurrency || cur,
    is_pos: isPos,
    items,
    payments,
    // Points utilisés. Le serveur plafonne et convertit lui-même. On n'envoie
    // rien quand l'écran n'annonce aucune remise (saisie sous le minimum du
    // programme) : le corps doit dire exactement ce que le caissier a vu.
    ...(discount > 0 ? { points_used: pointsToUse } : {}),
  };
}
