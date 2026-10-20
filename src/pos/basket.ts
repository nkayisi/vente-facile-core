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
  /**
   * Identifiant du produit. Facultatif pour totaliser, indispensable dès qu'il
   * faut retrouver la ligne d'un produit dans le panier (contrôle de stock) ou
   * la nommer au serveur (corps de la vente).
   */
  id?: string;
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
  /**
   * Devise dans laquelle le prix de CETTE ligne est annoncé au client.
   *
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │ `unit_price` RESTE EN DEVISE PRINCIPALE, et c'est délibéré.            │
   * │                                                                        │
   * │ Changer sa devise aurait fait porter la conversion à toute             │
   * │ l'arithmétique du panier - donc aux CONTRÔLES, qui sont en principale  │
   * │ par construction : solde du client, plafond de crédit, valeur des      │
   * │ points. Ce champ ne dit QUE dans quelle monnaie la ligne est           │
   * │ ANNONCÉE ; la conversion a lieu au moment d'afficher et d'envoyer.     │
   * │                                                                        │
   * │ Absente : la ligne suit la devise de la facture, ce qu'elle a toujours │
   * │ fait. Aucune vente existante ne change de comportement.                │
   * └────────────────────────────────────────────────────────────────────────┘
   */
  priceCurrency?: string;
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

/** Ce qu'une ligne pèse dans la devise de FACTURE. */
export interface SaleCurrencyLine {
  /** Brut de la ligne, conditionnements et détail réunis. */
  gross: number;
  /** Remise de ligne, déjà arrondie dans la devise de facture. */
  discount: number;
  /** Prix d'une unité de détail. */
  unitPrice: number;
  /** Prix d'un conditionnement ; sans objet pour un produit vendu à l'unité. */
  packageUnitPrice: number;
}

/** Ventilation d'une facture, dans sa propre devise. Miroir de `BasketTotals`. */
export interface SaleCurrencyTotals {
  /** La devise dans laquelle TOUS les champs qui suivent sont exprimés. */
  currency: string;
  subtotal: number;
  itemDiscount: number;
  globalDiscount: number;
  loyaltyDiscount: number;
  tax: number;
  /** Total net, remise fidélité comprise. */
  total: number;
  /** Une entrée par ligne du panier, DANS L'ORDRE. */
  lines: SaleCurrencyLine[];
}

/**
 * Ventilation complète de la facture, exprimée dans SA PROPRE devise.
 *
 * L'ordre des opérations n'est pas négociable : convertir puis arrondir CHAQUE
 * prix unitaire, puis sommer. C'est ce que le serveur fera de ce qu'on lui
 * envoie. Sommer d'abord et convertir ensuite donne un montant qui diverge de
 * la facture émise, donc un `amount_due` et une monnaie rendue faux.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CETTE VENTILATION EST CELLE QUE LE CLIENT LIT.                          │
 * │                                                                          │
 * │ `basketTotals()` rend la même chose en devise PRINCIPALE, et les deux ne │
 * │ sont pas interchangeables : la principale sert aux CONTRÔLES (solde du   │
 * │ client, plafond de crédit, valeur des points), celle-ci sert à tout ce   │
 * │ qui s'affiche et s'imprime - le total annoncé, la monnaie rendue, le     │
 * │ ticket. Prendre l'une pour l'autre écrit un montant juste sous une       │
 * │ étiquette fausse, ce qui ne se voit pas tant que l'établissement facture │
 * │ dans sa devise principale, et se voit sur le papier du client dès qu'il  │
 * │ facture ailleurs.                                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export function saleCurrencyTotals({
  lines,
  currencies,
  invoiceCurrency,
  globalDiscountAmount = 0,
  loyaltyDiscount = 0,
}: SaleCurrencyInput): SaleCurrencyTotals {
  const cur = invoiceCurrency || currencies.primary;
  const primary = currencies.primary;
  let subtotal = 0;
  let itemDiscount = 0;
  let tax = 0;
  const perLine: SaleCurrencyLine[] = [];

  for (const line of lines) {
    const unit = currencies.convertMoney(line.unit_price, primary, cur);
    const packageUnitPrice = currencies.convertMoney(
      num(line.product.wholesale_price),
      primary,
      cur
    );
    const factor = packagingFactorOf(line.product);
    const gross =
      factor && line.packageQuantity > 0
        ? currencies.round(
            line.packageQuantity * packageUnitPrice + looseQuantityOf(line) * unit,
            cur
          )
        : currencies.round(line.quantity * unit, cur);
    const discount = currencies.round((gross * line.discount_percentage) / 100, cur);
    subtotal += gross;
    itemDiscount += discount;
    if (line.product.is_taxable) {
      tax += currencies.round(((gross - discount) * num(line.product.tax_rate)) / 100, cur);
    }
    perLine.push({ gross, discount, unitPrice: unit, packageUnitPrice });
  }

  const { globalDiscount } = basketTotals({ lines, globalDiscountAmount });
  const globalDisc = currencies.convertMoney(globalDiscount, primary, cur);
  // La remise fidélité s'applique après coup, comme côté serveur : elle s'ajoute
  // à `discount_amount` sur la vente déjà totalisée.
  const loyaltyDisc = currencies.convertMoney(loyaltyDiscount, primary, cur);

  return {
    currency: cur,
    subtotal,
    itemDiscount,
    globalDiscount: globalDisc,
    loyaltyDiscount: loyaltyDisc,
    tax,
    total: currencies.round(subtotal - itemDiscount - globalDisc - loyaltyDisc + tax, cur),
    lines: perLine,
  };
}

/** Un sous-total de panier, pour une devise d'annonce. */
export interface TotalParDevise {
  currency: string;
  subtotal: number;
  itemDiscount: number;
  tax: number;
  total: number;
}

/**
 * Ventile le panier par devise d'ANNONCE : ce que le client lit sur son ticket.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CES SOUS-TOTAUX NE S'ADDITIONNENT PAS, ET C'EST TOUT LEUR OBJET.         │
 * │                                                                          │
 * │ Un marchand annonce la farine en francs et le savon importé en dollars.  │
 * │ Les deux chiffres sont vrais, et leur somme n'existe dans aucune         │
 * │ monnaie : c'est `saleCurrencyTotals` qui donne le total de la FACTURE,   │
 * │ en convertissant chaque ligne au taux de sa devise.                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Miroir de `apps/sales/currency_totals.py::ventiler`. L'ordre d'opérations y
 * est le même : convertir puis arrondir CHAQUE prix unitaire, puis sommer.
 */
export function totauxParDevise({
  lines,
  currencies,
  invoiceCurrency,
}: SaleCurrencyInput): TotalParDevise[] {
  const facture = invoiceCurrency || currencies.primary;
  const primary = currencies.primary;
  const par = new Map<string, TotalParDevise>();

  for (const line of lines) {
    const cur = line.priceCurrency?.trim() || facture;
    const unit = currencies.convertMoney(line.unit_price, primary, cur);
    const packageUnitPrice = currencies.convertMoney(
      num(line.product.wholesale_price),
      primary,
      cur
    );
    const factor = packagingFactorOf(line.product);
    const gross =
      factor && line.packageQuantity > 0
        ? currencies.round(
            line.packageQuantity * packageUnitPrice + looseQuantityOf(line) * unit,
            cur
          )
        : currencies.round(line.quantity * unit, cur);
    const discount = currencies.round((gross * line.discount_percentage) / 100, cur);
    const taxe = line.product.is_taxable
      ? currencies.round(((gross - discount) * num(line.product.tax_rate)) / 100, cur)
      : 0;

    const acc = par.get(cur) ?? {
      currency: cur, subtotal: 0, itemDiscount: 0, tax: 0, total: 0,
    };
    acc.subtotal += gross;
    acc.itemDiscount += discount;
    acc.tax += taxe;
    acc.total = currencies.round(acc.subtotal - acc.itemDiscount + acc.tax, cur);
    par.set(cur, acc);
  }

  // Tri par code : un ordre stable, pour que deux rendus successifs ne
  // présentent pas les mêmes devises dans un ordre différent.
  return [...par.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * Total de la facture, exprimé dans sa propre devise.
 *
 * Accesseur de `saleCurrencyTotals` : c'est la lecture la plus fréquente, et
 * elle a des appelants dans les deux surfaces.
 */
export function totalInSaleCurrency(input: SaleCurrencyInput): number {
  return saleCurrencyTotals(input).total;
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
