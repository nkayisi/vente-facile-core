/**
 * Totalisation d'un panier de point de vente.
 *
 * MIROIR STRICT de `Sale.calculate_totals()` et `SaleItem.save()` côté serveur.
 * Le serveur reste l'autorité : rien ici n'est envoyé tel quel, on n'envoie que
 * la saisie (quantités, prix unitaires, remises). Ce calcul sert à ce que
 * l'écran annonce AVANT validation le montant que le serveur facturera. Un
 * écart, si petit soit-il, se manifeste par une monnaie rendue fausse.
 *
 * Deux totalisations coexistent, et ce n'est pas une redondance :
 *
 * - `basketTotals()` travaille en devise PRINCIPALE. C'est la devise dans
 *   laquelle sont tenus les soldes clients, les plafonds de crédit et la valeur
 *   des points ; les contrôles s'y font donc.
 * - `totalInSaleCurrency()` travaille dans la devise de FACTURE. Chaque prix
 *   unitaire y est converti PUIS arrondi ligne à ligne, exactement comme le
 *   serveur le fera à partir de ce qu'on lui envoie. Convertir le total agrégé
 *   donnerait un autre chiffre, et c'est celui-là que le client paie.
 */
import { getPackaging, type PackagedProductLike } from "../packaging";
import { r2, type CurrencyTable } from "./money";

export interface BasketProduct extends PackagedProductLike {
  wholesale_price?: string | number | null;
  is_taxable?: boolean | null;
  tax_rate?: string | number | null;
}

export interface BasketLine {
  product: BasketProduct;
  /**
   * Quantité totale en unité de détail, miroir exact du champ serveur : pour un
   * produit vendu en gros elle vaut `packageQuantity × facteur + part au détail`.
   */
  quantity: number;
  /** Conditionnements entiers sur cette ligne (0 pour une vente à l'unité). */
  packageQuantity: number;
  /** Prix d'une unité de détail, en devise principale. */
  unit_price: number;
  discount_percentage: number;
}

/** Contenu d'un conditionnement, ou `null` si le produit se vend à l'unité. */
export function packagingFactorOf(product: BasketProduct): number | null {
  return getPackaging(product)?.factor ?? null;
}

/** Part de la ligne vendue à l'unité : dérivée, jamais stockée. */
export function looseQuantityOf(line: BasketLine): number {
  const factor = packagingFactorOf(line.product);
  if (!factor || !line.packageQuantity) return line.quantity;
  return line.quantity - line.packageQuantity * factor;
}

const num = (v: string | number | null | undefined): number => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Montant brut d'une ligne, en devise principale.
 *
 * Le prix d'un conditionnement n'est PAS le prix unitaire multiplié par son
 * contenu : c'est précisément l'intérêt commercial du gros. Une ligne mixte
 * additionne donc les deux tarifs.
 */
export function lineGross(line: BasketLine): number {
  const factor = packagingFactorOf(line.product);
  if (!factor || line.packageQuantity <= 0) {
    return r2(line.quantity * line.unit_price);
  }
  return r2(
    line.packageQuantity * num(line.product.wholesale_price) +
      looseQuantityOf(line) * line.unit_price
  );
}

export interface BasketTotals {
  subtotal: number;
  itemDiscount: number;
  /** Remise globale effectivement applicable, plafonnée au net des lignes. */
  globalDiscount: number;
  tax: number;
  /** Total BRUT, avant remise fidélité. */
  total: number;
}

export interface BasketInput {
  lines: BasketLine[];
  /** Remise globale saisie par le caissier, en devise principale. */
  globalDiscountAmount?: number;
}

/** Plafond de la remise globale : on ne descend jamais sous zéro. */
export function maxGlobalDiscount(lines: BasketLine[]): number {
  let subtotal = 0;
  let itemDiscount = 0;
  for (const line of lines) {
    const gross = lineGross(line);
    subtotal += gross;
    itemDiscount += r2((gross * line.discount_percentage) / 100);
  }
  return r2(subtotal - itemDiscount);
}

export function basketTotals({ lines, globalDiscountAmount = 0 }: BasketInput): BasketTotals {
  let subtotal = 0;
  let itemDiscount = 0;
  let tax = 0;

  for (const line of lines) {
    const gross = lineGross(line);
    const discount = r2((gross * line.discount_percentage) / 100);
    subtotal += gross;
    itemDiscount += discount;
    if (line.product.is_taxable) {
      tax += r2((r2(gross - discount) * num(line.product.tax_rate)) / 100);
    }
  }

  const globalDiscount = r2(Math.min(globalDiscountAmount, r2(subtotal - itemDiscount)));
  return {
    subtotal,
    itemDiscount,
    globalDiscount,
    tax,
    total: r2(subtotal - itemDiscount - globalDiscount + tax),
  };
}

export interface SaleCurrencyInput extends BasketInput {
  currencies: CurrencyTable;
  /** Devise de facture ; la principale si absente. */
  invoiceCurrency?: string | null;
  /** Remise fidélité, en devise PRINCIPALE (c'est là que `point_value` est libellé). */
  loyaltyDiscount?: number;
}

/**
 * Total de la facture, exprimé dans sa propre devise.
 *
 * L'ordre des opérations n'est pas négociable : convertir puis arrondir CHAQUE
 * prix unitaire, puis sommer. C'est ce que le serveur fera de ce qu'on lui
 * envoie. Sommer d'abord et convertir ensuite donne un montant qui diverge de
 * la facture émise, donc un `amount_due` et une monnaie rendue faux.
 */
export function totalInSaleCurrency({
  lines,
  currencies,
  invoiceCurrency,
  globalDiscountAmount = 0,
  loyaltyDiscount = 0,
}: SaleCurrencyInput): number {
  const cur = invoiceCurrency || currencies.primary;
  const primary = currencies.primary;
  let subtotal = 0;
  let itemDiscount = 0;
  let tax = 0;

  for (const line of lines) {
    const unit = currencies.convertMoney(line.unit_price, primary, cur);
    const factor = packagingFactorOf(line.product);
    const gross =
      factor && line.packageQuantity > 0
        ? currencies.round(
            line.packageQuantity *
              currencies.convertMoney(num(line.product.wholesale_price), primary, cur) +
              looseQuantityOf(line) * unit,
            cur
          )
        : currencies.round(line.quantity * unit, cur);
    const discount = currencies.round((gross * line.discount_percentage) / 100, cur);
    subtotal += gross;
    itemDiscount += discount;
    if (line.product.is_taxable) {
      tax += currencies.round(((gross - discount) * num(line.product.tax_rate)) / 100, cur);
    }
  }

  const { globalDiscount } = basketTotals({ lines, globalDiscountAmount });
  const globalDisc = currencies.convertMoney(globalDiscount, primary, cur);
  // La remise fidélité s'applique après coup, comme côté serveur : elle s'ajoute
  // à `discount_amount` sur la vente déjà totalisée.
  const loyaltyDisc = currencies.convertMoney(loyaltyDiscount, primary, cur);

  return currencies.round(subtotal - itemDiscount - globalDisc - loyaltyDisc + tax, cur);
}

export interface TenderLike {
  currency: string;
  amount: string | number;
}

/** Somme des règlements, convertie et arrondie dans la devise demandée. */
export function tendersIn(
  tenders: TenderLike[],
  currencies: CurrencyTable,
  target: string
): number {
  return currencies.round(
    tenders.reduce((s, t) => s + currencies.convert(num(t.amount), t.currency, target), 0),
    target
  );
}
