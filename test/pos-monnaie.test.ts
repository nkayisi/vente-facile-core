/**
 * La monnaie se calcule depuis les billets remis, avec un seul arrondi.
 *
 * Le serveur rejoue la même règle (`resolve_change`) : son test
 * `apps/sales/tests/test_monnaie_exacte.py` porte LES MÊMES CAS. Changer un
 * attendu ici sans le changer là-bas, c'est laisser l'écran et le ticket
 * annoncer une monnaie que le serveur écrira autrement.
 */
import { describe, it, expect } from "vitest";
import { createCurrencyTable, monnaieARendre, tendersIn } from "../src/pos/index";

// Devise principale USD, le franc congolais à 2 300 et sans décimale.
const devises = createCurrencyTable(
  [
    { currency_code: "USD", exchange_rate: "1", currency_decimal_places: 2, is_primary: true },
    { currency_code: "CDF", exchange_rate: String(1 / 2300), currency_decimal_places: 0 },
  ],
  { code: "USD", decimal_places: 2 }
);

const monnaie = (
  tenders: { amount: number; currency: string }[],
  total: number,
  changeCurrency: string,
  invoiceCurrency = "USD"
) => monnaieARendre({ tenders, total, invoiceCurrency, changeCurrency, currencies: devises });

describe("monnaieARendre", () => {
  it("rend 377 500 FC sur 575 $ réglés 1 700 000 FC (le franc perdu)", () => {
    // Le passage par le dollar arrondi donnait 739,13 $ remis, 377 499 FC rendus.
    expect(tendersIn([{ amount: 1_700_000, currency: "CDF" }], devises, "USD")).toBe(739.13);
    expect(monnaie([{ amount: 1_700_000, currency: "CDF" }], 575, "CDF")).toBe(377_500);
  });

  it("rend les dix francs d'un règlement presque exact", () => {
    expect(monnaie([{ amount: 1_322_510, currency: "CDF" }], 575, "CDF")).toBe(10);
  });

  it("ne rend rien sur un règlement exact", () => {
    expect(monnaie([{ amount: 1_322_500, currency: "CDF" }], 575, "CDF")).toBe(0);
  });

  it("rend dans la devise de la facture", () => {
    expect(monnaie([{ amount: 600, currency: "USD" }], 575, "USD")).toBe(25);
  });

  it("rend en francs un règlement en dollars", () => {
    expect(monnaie([{ amount: 600, currency: "USD" }], 575, "CDF")).toBe(57_500);
  });

  it("additionne deux règlements dans deux devises avant l'unique arrondi", () => {
    // 500 $ + 200 000 FC pour 575 $ : 1 150 000 + 200 000 - 1 322 500 = 27 500 FC.
    expect(
      monnaie(
        [
          { amount: 500, currency: "USD" },
          { amount: 200_000, currency: "CDF" },
        ],
        575,
        "CDF"
      )
    ).toBe(27_500);
  });

  it("ne rend rien tant que la facture n'est pas couverte", () => {
    expect(monnaie([{ amount: 1_300_000, currency: "CDF" }], 575, "CDF")).toBe(0);
    expect(monnaie([{ amount: 500, currency: "USD" }], 575, "USD")).toBe(0);
  });

  it("garde la devise de la monnaie quand la facture est en francs", () => {
    // Facture 46 000 FC, règlement 20 $ : 46 000 FC dus, 46 000 remis.
    expect(monnaie([{ amount: 20, currency: "USD" }], 46_000, "CDF", "CDF")).toBe(0);
    expect(monnaie([{ amount: 25, currency: "USD" }], 46_000, "CDF", "CDF")).toBe(11_500);
  });
});
