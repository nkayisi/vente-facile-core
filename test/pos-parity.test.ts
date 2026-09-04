/**
 * Preuve que l'extraction de l'arithmétique du POS n'a rien changé.
 *
 * Ce fichier contient une COPIE VERBATIM des fermetures d'origine de
 * `frontend/app/dashboard/sales/pos/page.tsx`, telles qu'elles étaient avant
 * d'être déplacées dans le paquet. Elles ne sont pas là pour être maintenues :
 * elles sont le témoin. Sur des paniers tirés au hasard, l'ancien et le nouveau
 * code doivent rendre le même centième.
 *
 * Sans ce test, « extraction fidèle » ne serait qu'une intention. Avec lui,
 * toute divergence introduite plus tard échoue en nommant le panier fautif.
 */
import { describe, it, expect } from "vitest";
import {
  createCurrencyTable,
  basketTotals,
  totalInSaleCurrency,
  saleCurrencyTotals,
  tendersIn,
  lineGross,
  maxLoyaltyAmount,
  maxUsablePoints,
  loyaltyDiscount,
  evaluateCredit,
  roundPoints,
  type BasketLine,
  type OrganizationCurrencyLike,
} from "../src/pos/index";

// ---------------------------------------------------------------------------
// Le témoin : code d'origine, recopié sans retouche.
// ---------------------------------------------------------------------------
const r2 = (n: number) => Math.round(n * 100) / 100;

function legacy(
  cart: BasketLine[],
  orgCurrencies: OrganizationCurrencyLike[],
  invoiceCurrency: string,
  globalDiscountAmount: number,
  program: any,
  pointsToUse: number,
  usePoints: boolean,
  minPts: number,
  tenders: { currency: string; amount: string }[]
) {
  const defaultCurrency = { code: "CDF", decimal_places: 2 };
  const packagingFactorOf = (p: any): number | null => {
    if (!p.selling_mode || p.selling_mode === "retail_only") return null;
    return p.units_per_package || null;
  };
  const looseQuantityOf = (item: any): number => {
    const factor = packagingFactorOf(item.product);
    if (!factor || !item.packageQuantity) return item.quantity;
    return item.quantity - item.packageQuantity * factor;
  };
  const lineGrossL = (item: any) => {
    const factor = packagingFactorOf(item.product);
    if (!factor || item.packageQuantity <= 0) return r2(item.quantity * item.unit_price);
    const packagePrice = parseFloat(item.product.wholesale_price || "0");
    return r2(item.packageQuantity * packagePrice + looseQuantityOf(item) * item.unit_price);
  };
  const calculateSubtotal = () => cart.reduce((s, i) => s + lineGrossL(i), 0);
  const calculateItemDiscount = () =>
    cart.reduce((s, i) => s + r2((lineGrossL(i) * i.discount_percentage) / 100), 0);
  const getMaxGlobalDiscountAmount = () => r2(calculateSubtotal() - calculateItemDiscount());
  const calculateGlobalDiscountAmount = () =>
    r2(Math.min(globalDiscountAmount, getMaxGlobalDiscountAmount()));
  const calculateTax = () =>
    cart.reduce((s, i) => {
      if (!i.product.is_taxable) return s;
      const t = lineGrossL(i);
      const d = r2((t * i.discount_percentage) / 100);
      const after = r2(t - d);
      const rate = parseFloat(i.product.tax_rate?.toString() || "0");
      return s + r2((after * rate) / 100);
    }, 0);
  const calculateTotal = () =>
    r2(calculateSubtotal() - calculateItemDiscount() - calculateGlobalDiscountAmount() + calculateTax());

  const pointValue = () => {
    const v = program?.point_value ? parseFloat(program.point_value) : 1;
    return v > 0 ? v : 1;
  };
  const maxLoyaltyAmountL = () => {
    const ceiling = Number(program?.max_redemption_percent_ceiling);
    const safeCeiling = Number.isFinite(ceiling) && ceiling > 0 ? ceiling : 70;
    const pct = parseFloat(program?.max_redemption_percent ?? "");
    const safePct = Number.isFinite(pct) && pct > 0 ? Math.min(pct, safeCeiling) : safeCeiling;
    return r2((calculateTotal() * safePct) / 100);
  };
  const calculateLoyaltyDiscount = () => {
    if (!usePoints || pointsToUse <= 0 || !program?.is_active) return 0;
    if (pointsToUse < minPts) return 0;
    return r2(Math.min(pointsToUse * pointValue(), maxLoyaltyAmountL()));
  };

  const getPrimaryCurrency = () => orgCurrencies.find((c) => c.is_primary);
  const primaryCode = () => getPrimaryCurrency()?.currency_code || defaultCurrency.code;
  const rateOf = (code: string) => {
    const c = orgCurrencies.find((x) => x.currency_code === code);
    const r = c ? parseFloat(String(c.exchange_rate)) : 1;
    return r > 0 ? r : 1;
  };
  const convertAmount = (amount: number, from: string, to: string) => {
    if (!amount || from === to) return amount;
    return (amount * rateOf(from)) / rateOf(to);
  };
  const decimalsOf = (code: string) => {
    const c = orgCurrencies.find((x) => x.currency_code === code);
    return c ? (c.currency_decimal_places as number) : defaultCurrency.decimal_places ?? 2;
  };
  const roundMoney = (amount: number, code: string) => {
    const f = Math.pow(10, decimalsOf(code));
    return Math.round((amount + Number.EPSILON) * f) / f;
  };
  const convMoney = (amount: number, from: string, to: string) =>
    roundMoney(convertAmount(amount, from, to), to);
  const saleCurrency = () => invoiceCurrency || primaryCode();

  const totalInSale = () => {
    const cur = saleCurrency();
    let subtotal = 0,
      itemDiscount = 0,
      tax = 0;
    for (const item of cart as any[]) {
      const unit = convMoney(item.unit_price, primaryCode(), cur);
      const factor = packagingFactorOf(item.product);
      const line =
        factor && item.packageQuantity > 0
          ? roundMoney(
              item.packageQuantity *
                convMoney(parseFloat(item.product.wholesale_price || "0"), primaryCode(), cur) +
                looseQuantityOf(item) * unit,
              cur
            )
          : roundMoney(item.quantity * unit, cur);
      const disc = roundMoney((line * item.discount_percentage) / 100, cur);
      subtotal += line;
      itemDiscount += disc;
      if (item.product.is_taxable) {
        const rate = parseFloat(item.product.tax_rate?.toString() || "0");
        tax += roundMoney(((line - disc) * rate) / 100, cur);
      }
    }
    const globalDisc = convMoney(calculateGlobalDiscountAmount(), primaryCode(), cur);
    const loyaltyDisc = convMoney(calculateLoyaltyDiscount(), primaryCode(), cur);
    return roundMoney(subtotal - itemDiscount - globalDisc - loyaltyDisc + tax, cur);
  };

  const paidInSale = () =>
    roundMoney(
      tenders.reduce(
        (s, t) => s + convertAmount(parseFloat(t.amount) || 0, t.currency, saleCurrency()),
        0
      ),
      saleCurrency()
    );

  return {
    subtotal: calculateSubtotal(),
    itemDiscount: calculateItemDiscount(),
    globalDiscount: calculateGlobalDiscountAmount(),
    tax: calculateTax(),
    total: calculateTotal(),
    loyalty: calculateLoyaltyDiscount(),
    maxLoyalty: maxLoyaltyAmountL(),
    totalInSale: totalInSale(),
    paidInSale: paidInSale(),
  };
}

// ---------------------------------------------------------------------------
// Générateur déterministe : un échec doit être rejouable à l'identique.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CURRENCIES: OrganizationCurrencyLike[] = [
  { currency_code: "CDF", exchange_rate: "1", currency_symbol: "FC", currency_decimal_places: 0, is_primary: true },
  { currency_code: "USD", exchange_rate: "2800", currency_symbol: "$", currency_decimal_places: 2 },
  { currency_code: "EUR", exchange_rate: "3050.5", currency_symbol: "€", currency_decimal_places: 2 },
];

function makeBasket(rnd: () => number): BasketLine[] {
  const n = 1 + Math.floor(rnd() * 6);
  const lines: BasketLine[] = [];
  for (let i = 0; i < n; i++) {
    // Le facteur reste >= 2 : la contrainte `product_units_per_package_gte_2`
    // le garantit en base, un facteur de 1 ne peut pas exister.
    const packaged = rnd() < 0.5;
    const factor = packaged ? 2 + Math.floor(rnd() * 22) : 0;
    const packageQuantity = packaged && rnd() < 0.8 ? Math.floor(rnd() * 5) : 0;
    const loose = Math.floor(rnd() * 40);
    const quantity = packaged ? packageQuantity * factor + loose : loose + 1;
    lines.push({
      product: {
        selling_mode: packaged ? "wholesale_and_retail" : "retail_only",
        units_per_package: packaged ? factor : null,
        wholesale_price: (rnd() * 90000).toFixed(2),
        is_taxable: rnd() < 0.5,
        tax_rate: [0, 8, 16, 18.5][Math.floor(rnd() * 4)],
      },
      quantity,
      packageQuantity,
      unit_price: Math.round(rnd() * 800000) / 100,
      discount_percentage: rnd() < 0.6 ? 0 : Math.round(rnd() * 5000) / 100,
    });
  }
  return lines;
}

describe("POS : l'extraction n'a rien changé", () => {
  it("rend le même chiffre que le code d'origine sur 2 000 paniers tirés au hasard", () => {
    const table = createCurrencyTable(CURRENCIES, { code: "CDF", decimal_places: 2 });
    const divergences: string[] = [];

    for (let seed = 1; seed <= 2000; seed++) {
      const rnd = mulberry32(seed);
      const lines = makeBasket(rnd);
      const invoiceCurrency = ["CDF", "USD", "EUR"][Math.floor(rnd() * 3)];
      const globalDiscountAmount = rnd() < 0.7 ? 0 : Math.round(rnd() * 500000) / 100;
      const program = {
        is_active: rnd() < 0.8,
        point_value: (Math.round(rnd() * 500) / 100 || 1).toFixed(2),
        min_points_to_redeem: 100,
        max_redemption_percent: rnd() < 0.2 ? null : String(Math.floor(rnd() * 100)),
        max_redemption_percent_ceiling: rnd() < 0.2 ? null : 70,
      };
      const usePoints = rnd() < 0.5;
      const pointsToUse = Math.floor(rnd() * 5000);
      const tenders = [
        { currency: ["CDF", "USD", "EUR"][Math.floor(rnd() * 3)], amount: (rnd() * 1_000_000).toFixed(2) },
      ];

      const before = legacy(
        lines, CURRENCIES, invoiceCurrency, globalDiscountAmount,
        program, pointsToUse, usePoints, 100, tenders
      );

      const totals = basketTotals({ lines, globalDiscountAmount });
      // `usePoints` est un état d'interface, pas une règle : côté paquet, ne pas
      // vouloir de points se dit en n'en passant aucun.
      const points = usePoints ? pointsToUse : 0;
      const discount = loyaltyDiscount(totals.total, points, program);
      const after = {
        subtotal: totals.subtotal,
        itemDiscount: totals.itemDiscount,
        globalDiscount: totals.globalDiscount,
        tax: totals.tax,
        total: totals.total,
        loyalty: discount,
        maxLoyalty: maxLoyaltyAmount(totals.total, program),
        totalInSale: totalInSaleCurrency({
          lines, currencies: table, invoiceCurrency,
          globalDiscountAmount, loyaltyDiscount: discount,
        }),
        paidInSale: tendersIn(tenders, table, invoiceCurrency),
      };

      // ┌────────────────────────────────────────────────────────────────────┐
      // │ LA VENTILATION DOIT REDONNER SON PROPRE TOTAL.                    │
      // │                                                                    │
      // │ `saleCurrencyTotals` a été extraite de `totalInSaleCurrency` pour  │
      // │ que le ticket puisse lire le détail de ce qu'il imprime. Les deux  │
      // │ doivent rester la MÊME arithmétique : si elles divergent, l'écran  │
      // │ annonce un total et le papier en additionne un autre.             │
      // └────────────────────────────────────────────────────────────────────┘
      const ventilation = saleCurrencyTotals({
        lines, currencies: table, invoiceCurrency,
        globalDiscountAmount, loyaltyDiscount: discount,
      });
      if (ventilation.total !== after.totalInSale) {
        divergences.push(
          `graine ${seed}, ventilation.total : ${ventilation.total} !== ${after.totalInSale}`
        );
      }
      if (ventilation.lines.length !== lines.length) {
        divergences.push(`graine ${seed}, ventilation : ${ventilation.lines.length} lignes pour ${lines.length}`);
      }
      const sommeBrute = ventilation.lines.reduce((s, l) => s + l.gross, 0);
      if (sommeBrute !== ventilation.subtotal) {
        divergences.push(
          `graine ${seed}, somme des lignes : ${sommeBrute} !== ${ventilation.subtotal}`
        );
      }
      const sommeRemises = ventilation.lines.reduce((s, l) => s + l.discount, 0);
      if (sommeRemises !== ventilation.itemDiscount) {
        divergences.push(
          `graine ${seed}, remises de ligne : ${sommeRemises} !== ${ventilation.itemDiscount}`
        );
      }
      const recompose = table.round(
        ventilation.subtotal - ventilation.itemDiscount - ventilation.globalDiscount
          - ventilation.loyaltyDiscount + ventilation.tax,
        invoiceCurrency
      );
      if (recompose !== ventilation.total) {
        divergences.push(
          `graine ${seed}, recomposition : ${recompose} !== ${ventilation.total}`
        );
      }

      for (const key of Object.keys(before) as (keyof typeof before)[]) {
        if (before[key] !== after[key]) {
          divergences.push(`graine ${seed}, ${key} : ${before[key]} !== ${after[key]}`);
        }
      }
    }

    expect(divergences).toEqual([]);
  });
});

describe("POS : les règles qui décident de l'argent", () => {
  const table = createCurrencyTable(CURRENCIES, { code: "CDF", decimal_places: 2 });

  it("facture le tarif de gros aux contenants entiers, pas le détail multiplié", () => {
    // Un casier à 50 000 quand la bouteille est à 5 000 : douze bouteilles
    // achetées au casier coûtent 50 000, pas 60 000. C'est tout l'intérêt du gros.
    const line: BasketLine = {
      product: {
        selling_mode: "wholesale_and_retail",
        units_per_package: 12,
        wholesale_price: "50000",
      },
      quantity: 12,
      packageQuantity: 1,
      unit_price: 5000,
      discount_percentage: 0,
    };
    expect(lineGross(line)).toBe(50000);
    // Ligne mixte : un casier plus trois bouteilles isolées.
    expect(lineGross({ ...line, quantity: 15 })).toBe(65000);
  });

  it("n'invente pas de centime au CDF, qui n'a pas de décimale", () => {
    const lines: BasketLine[] = [
      { product: { selling_mode: "retail_only" }, quantity: 3, packageQuantity: 0, unit_price: 1666.67, discount_percentage: 0 },
    ];
    const total = totalInSaleCurrency({ lines, currencies: table, invoiceCurrency: "CDF" });
    expect(Number.isInteger(total)).toBe(true);
  });

  it("convertit et arrondit CHAQUE prix avant de sommer, comme le serveur", () => {
    // Trois lignes à 1 000 CDF en facture USD (taux 2 800) : chaque ligne tombe
    // à 0,36 après arrondi, donc 1,08. Convertir le total agrégé donnerait 1,07.
    const lines: BasketLine[] = Array.from({ length: 3 }, () => ({
      product: { selling_mode: "retail_only" },
      quantity: 1,
      packageQuantity: 0,
      unit_price: 1000,
      discount_percentage: 0,
    }));
    expect(totalInSaleCurrency({ lines, currencies: table, invoiceCurrency: "USD" })).toBe(1.08);
    expect(table.round(3000 / 2800, "USD")).toBe(1.07);
  });

  it("ne rend PAS le meme total en principale et en facture, et c'est le piege", () => {
    // ┌──────────────────────────────────────────────────────────────────────┐
    // │ CE TEST EXISTE PARCE QUE LE TICKET DU TERMINAL S'Y EST TROMPE.      │
    // │                                                                      │
    // │ `basketTotals` somme les `unit_price` SANS conversion : ils sont     │
    // │ tenus en devise principale, donc son total l'est aussi. Une facture  │
    // │ en USD sur un etablissement tenu en CDF vaut 2 800 fois moins. Ranger │
    // │ l'un sous l'etiquette de l'autre imprime un montant juste sous une    │
    // │ devise fausse - invisible tant que les deux coincident, et c'est le   │
    // │ cas de toutes les donnees de developpement.                          │
    // └──────────────────────────────────────────────────────────────────────┘
    const lines: BasketLine[] = [
      { product: { selling_mode: "retail_only" }, quantity: 2, packageQuantity: 0, unit_price: 140000, discount_percentage: 0 },
    ];
    const principale = basketTotals({ lines });
    const facture = saleCurrencyTotals({ lines, currencies: table, invoiceCurrency: "USD" });

    expect(principale.total).toBe(280000);   // CDF
    expect(facture.total).toBe(100);         // USD
    expect(facture.currency).toBe("USD");
    // La ventilation NOMME sa devise : c'est ce qui permet a un appelant de
    // verifier qu'il etiquette bien ce qu'il affiche.
    expect(saleCurrencyTotals({ lines, currencies: table }).currency).toBe("CDF");
  });

  it("rend le prix unitaire ET le prix du contenant dans la devise de facture", () => {
    // Le ticket imprime « 2 x 92 000 » sous le nom de l'article : ce prix
    // unitaire doit etre celui de la FACTURE, sinon la ligne ne se recompose
    // pas a partir de ce que le client lit.
    const line: BasketLine = {
      product: { selling_mode: "wholesale_and_retail", units_per_package: 12, wholesale_price: "50400" },
      quantity: 14,
      packageQuantity: 1,
      unit_price: 5600,
      discount_percentage: 0,
    };
    const v = saleCurrencyTotals({ lines: [line], currencies: table, invoiceCurrency: "USD" });
    expect(v.lines[0].unitPrice).toBe(2);          // 5 600 CDF / 2 800
    expect(v.lines[0].packageUnitPrice).toBe(18);  // 50 400 CDF / 2 800
    // Un contenant plus deux unites isolees : 18 + 2 x 2.
    expect(v.lines[0].gross).toBe(22);
  });

  it("ne donne aucune remise sous le minimum du programme, au lieu de l'ignorer", () => {
    const program = { is_active: true, point_value: "10", min_points_to_redeem: 100, max_redemption_percent: "50" };
    expect(loyaltyDiscount(100000, 99, program)).toBe(0);
    expect(loyaltyDiscount(100000, 100, program)).toBe(1000);
  });

  it("plafonne les points à la part réglable, jamais à la facture entière", () => {
    const program = { is_active: true, point_value: "10", min_points_to_redeem: 1, max_redemption_percent: "50" };
    // 10 000 points valent 100 000, mais la moitié de la facture seulement est réglable.
    expect(loyaltyDiscount(100000, 10000, program)).toBe(50000);
    expect(maxUsablePoints(100000, 10000, program)).toBe(5000);
  });

  it("retombe sur la borne dure, jamais sur zéro, quand le réglage est illisible", () => {
    // Une lecture ratée ne doit pas interdire au caissier d'utiliser les points :
    // le serveur reste l'autorité et tranchera.
    expect(maxLoyaltyAmount(100000, { max_redemption_percent: null })).toBe(70000);
    expect(maxLoyaltyAmount(100000, { max_redemption_percent: "abc" })).toBe(70000);
    // Le réglage de l'organisation ne peut que DURCIR la borne.
    expect(maxLoyaltyAmount(100000, { max_redemption_percent: "90", max_redemption_percent_ceiling: 70 })).toBe(70000);
  });

  it("lit une limite de crédit à 0 comme « sans plafond », jamais comme un refus", () => {
    const sans = evaluateCredit({ name: "Kalume", credit_limit: "0", current_balance: "900000" }, 500000, 0);
    expect(sans!.blocked).toBe(false);

    const avec = evaluateCredit({ name: "Kalume", credit_limit: "1000000", current_balance: "900000" }, 500000, 0);
    expect(avec!.overLimit).toBe(true);
    expect(avec!.projectedBalance).toBe(1400000);
  });

  it("refuse le crédit interdit même quand le plafond le permettrait", () => {
    const v = evaluateCredit(
      { name: "Kalume", allow_credit: false, credit_limit: "0", current_balance: "0" }, 500000, 0
    );
    expect(v!.blocked).toBe(true);
    expect(v!.reason).toContain("n'est pas autorisé");
  });

  it("ne compte à crédit que ce qui reste après les règlements", () => {
    const v = evaluateCredit({ name: "K", credit_limit: "0", current_balance: "0" }, 500000, 500000);
    expect(v!.creditInPrimary).toBe(0);
    // Un client qui rend trop ne devient pas créditeur par ce chemin.
    expect(evaluateCredit({ name: "K" }, 500000, 700000)!.creditInPrimary).toBe(0);
  });

  it("compte les points par défaut, jamais au-dessus du solde réel", () => {
    expect(roundPoints(4.999)).toBe(4.99);
    expect(maxUsablePoints(1e9, 250, { is_active: true, point_value: "1" })).toBe(250);
  });

  it("survit à un taux de change nul plutôt que de diviser par zéro", () => {
    const cassee = createCurrencyTable(
      [
        { currency_code: "CDF", exchange_rate: "1", currency_decimal_places: 0, is_primary: true },
        { currency_code: "USD", exchange_rate: "0", currency_decimal_places: 2 },
      ],
      { code: "CDF", decimal_places: 2 }
    );
    expect(Number.isFinite(cassee.convert(100, "USD", "CDF"))).toBe(true);
  });
});
