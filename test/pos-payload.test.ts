/**
 * Ce que le POS envoie au serveur.
 *
 * Le backend prouve par test que `sale.create` (journal hors ligne) et
 * `POST /sales/` laissent le même état. Cette preuve ne vaut que si les deux
 * surfaces envoient la même chose : c'est ce que ce fichier verrouille.
 */
import { describe, it, expect } from "vitest";
import { createCurrencyTable, buildSalePayload } from "../src/pos/index";

const table = createCurrencyTable(
  [
    { currency_code: "CDF", exchange_rate: "1", currency_decimal_places: 0, is_primary: true },
    { currency_code: "USD", exchange_rate: "2800", currency_decimal_places: 2 },
  ],
  { code: "CDF", decimal_places: 2 }
);

const detail = {
  productId: "p1",
  product: { selling_mode: "retail_only" },
  quantity: 3,
  packageQuantity: 0,
  unit_price: 5000,
  discount_percentage: 0,
};

const gros = {
  productId: "p2",
  product: {
    selling_mode: "wholesale_and_retail",
    units_per_package: 12,
    wholesale_price: "50000",
  },
  quantity: 27, // 2 casiers + 3 bouteilles
  packageQuantity: 2,
  unit_price: 5000,
  discount_percentage: 0,
};

const base = {
  currencies: table,
  invoiceCurrency: "CDF",
  register: "r1",
  tenders: [{ method: "m1", currency: "CDF", amount: "15000" }],
};

describe("Corps de la vente", () => {
  it("envoie la saisie du caissier, jamais un total calculé ici", () => {
    const p = buildSalePayload({ ...base, lines: [detail] });
    expect(p.items[0]).toEqual({ product: "p1", unit_price: 5000, discount_percentage: 0, quantity: 3 });
    // Aucun total n'est transmis : le serveur totalise.
    expect(Object.keys(p)).not.toContain("total");
    expect(Object.keys(p)).not.toContain("subtotal");
  });

  it("décrit une ligne au conditionnement par ses deux compteurs, pas par leur somme", () => {
    // Le serveur doit savoir que 2 casiers sortent du scellé et 3 bouteilles du
    // vrac. Un total de 27 le laisserait redécouper au facteur du jour, ce qui
    // est précisément l'erreur que la lisibilité gros/détail a corrigée.
    const p = buildSalePayload({ ...base, lines: [gros] });
    expect(p.items[0]).toEqual({
      product: "p2",
      unit_price: 5000,
      discount_percentage: 0,
      package_quantity: 2,
      loose_quantity: 3,
      package_unit_price: 50000,
    });
    expect(p.items[0].quantity).toBeUndefined();
  });

  it("convertit chaque prix dans la devise de facture", () => {
    const p = buildSalePayload({ ...base, lines: [gros], invoiceCurrency: "USD" });
    expect(p.currency).toBe("USD");
    expect(p.exchange_rate).toBe(2800);
    expect(p.items[0].unit_price).toBe(1.79);       // 5 000 / 2 800
    expect(p.items[0].package_unit_price).toBe(17.86); // 50 000 / 2 800
  });

  it("donne au règlement le taux « devise de vente pour 1 unité remise »", () => {
    const p = buildSalePayload({
      ...base, lines: [detail], invoiceCurrency: "CDF",
      tenders: [{ method: "m1", currency: "USD", amount: "10" }],
    });
    expect(p.payments[0].exchange_rate).toBe(2800);
    // Même devise : pas de taux du tout, plutôt qu'un 1 redondant.
    const q = buildSalePayload({ ...base, lines: [detail] });
    expect(q.payments[0].exchange_rate).toBeUndefined();
  });

  it("arrondit le montant remis à la plus petite coupure de sa devise", () => {
    const p = buildSalePayload({
      ...base, lines: [detail],
      tenders: [{ method: "m1", currency: "CDF", amount: "15000.7" }],
    });
    expect(p.payments[0].tendered_amount).toBe(15001);
  });

  it("écarte les règlements vides plutôt que de les envoyer à zéro", () => {
    const p = buildSalePayload({
      ...base, lines: [detail],
      tenders: [
        { method: "m1", currency: "CDF", amount: "0" },
        { method: "", currency: "CDF", amount: "500" },
        { method: "m2", currency: "CDF", amount: "15000" },
      ],
    });
    expect(p.payments).toHaveLength(1);
    expect(p.payments[0].payment_method).toBe("m2");
  });

  it("ne réclame des points que si l'écran a annoncé une remise", () => {
    const program = { is_active: true, point_value: "10", min_points_to_redeem: 100, max_redemption_percent: "50" };
    // Saisie sous le minimum : l'écran n'annonce rien, le corps ne demande rien.
    const sous = buildSalePayload({ ...base, lines: [detail], loyaltyProgram: program, pointsToUse: 50 });
    expect(sous.points_used).toBeUndefined();
    const assez = buildSalePayload({ ...base, lines: [detail], loyaltyProgram: program, pointsToUse: 100 });
    expect(assez.points_used).toBe(100);
  });

  it("ne joint une échéance qu'à une vente à crédit", () => {
    const comptant = buildSalePayload({ ...base, lines: [detail], dueDate: "2026-09-30" });
    expect(comptant.sale_type).toBe("retail");
    expect(comptant.due_date).toBeUndefined();

    const credit = buildSalePayload({ ...base, lines: [detail], isCredit: true, dueDate: "2026-09-30" });
    expect(credit.sale_type).toBe("credit");
    expect(credit.due_date).toBe("2026-09-30");
  });

  it("omet les champs absents au lieu d'envoyer des nulls", () => {
    // DRF distingue « absent » de « null » : un `customer: null` explicite est
    // refusé là où l'omission passe.
    const p = buildSalePayload({ ...base, lines: [detail], customer: null, warehouse: null });
    expect("customer" in p).toBe(false);
    expect("warehouse" in p).toBe(false);
  });

  it("rend la monnaie dans la devise de facture quand aucune n'est choisie", () => {
    expect(buildSalePayload({ ...base, lines: [detail] }).change_currency).toBe("CDF");
    expect(
      buildSalePayload({ ...base, lines: [detail], changeCurrency: "USD" }).change_currency
    ).toBe("USD");
  });
});
