/**
 * Convention de taux, à respecter partout : `exchange_rate` = nombre d'unités
 * de la devise PRINCIPALE pour 1 unité de cette devise. La principale vaut 1.
 * Vers la principale on multiplie, depuis la principale on divise.
 */
import { describe, expect, it } from "vitest";
import { createMoneyHelpers, MONEY_EPS, type OrganizationCurrency } from "../src/currency";

const devise = (
  code: string,
  symbol: string,
  decimals: number,
  rate: string,
  primary = false
): OrganizationCurrency => ({
  id: code,
  currency: code,
  currency_code: code,
  currency_name: code,
  currency_symbol: symbol,
  currency_decimal_places: decimals,
  is_primary: primary,
  exchange_rate: rate,
  is_active: true,
  last_rate_update: "2026-08-28",
});

// Contexte RDC : CDF principale, USD secondaire à 2800.
const CURRENCIES = [
  devise("CDF", "FC", 0, "1", true),
  devise("USD", "$", 2, "2800"),
];
const FALLBACK = { code: "CDF", name: "Franc Congolais", symbol: "FC", decimal_places: 0 };

const m = createMoneyHelpers(CURRENCIES, FALLBACK);

describe("createMoneyHelpers", () => {
  it("identifie la devise principale", () => {
    expect(m.primaryCode).toBe("CDF");
    expect(m.rateOf("CDF")).toBe(1);
    expect(m.rateOf("USD")).toBe(2800);
  });

  it("convertit vers la principale en multipliant", () => {
    expect(m.convertAmount(10, "USD", "CDF")).toBe(28_000);
  });

  it("convertit depuis la principale en divisant", () => {
    expect(m.convertAmount(28_000, "CDF", "USD")).toBe(10);
  });

  it("arrondit au plus petit signe physique de la devise cible", () => {
    // Le CDF n'a pas de centime : 0,4 FC n'existe pas.
    expect(m.roundMoney(1250.4, "CDF")).toBe(1250);
    expect(m.roundMoney(10.456, "USD")).toBe(10.46);
    expect(m.convMoney(1, "USD", "CDF")).toBe(2800);
  });

  it("formate chaque montant avec les décimales de SA devise", () => {
    // Le groupement est l'espace fine insécable U+202F, comme le rendait
    // `Intl` : on l'écrit en échappement pour que le test reste lisible et
    // qu'une espace ordinaire tapée par mégarde échoue au lieu de passer.
    const NN = "\u202f";
    // Le CDF n'a pas de centime : la fraction ne s'imprime pas, elle disparaît.
    expect(m.money(1_250_036.4, "CDF")).toBe(`1${NN}250${NN}036 FC`);
    // Le dollar en a deux, et les zéros de queue restent supprimés.
    expect(m.money(2500, "USD")).toBe(`2${NN}500 $`);
    expect(m.money(2500.5, "USD")).toBe(`2${NN}500,5 $`);
    expect(m.amountOnly(2500, "USD")).toBe(`2${NN}500`);
  });

  it("énonce toujours la parité dans le sens lisible", () => {
    // « 1 CDF = 0,000357 $ » s'affiche « 1 CDF = 0 $ » une fois arrondi aux
    // deux décimales du dollar : on inverse.
    expect(m.rateLabel("USD", "CDF")).toBe("1 USD = 2\u202f800 FC");
    expect(m.rateLabel("CDF", "USD")).toBe("1 USD = 2\u202f800 FC");
  });

  it("retombe sur la devise par défaut pour un code inconnu", () => {
    expect(m.symbolOf("CDF")).toBe("FC");
    expect(m.symbolOf("EUR")).toBe("EUR");
    expect(m.rateOf("EUR")).toBe(1);
  });

  it("refuse un taux nul ou négatif, qui ferait diverger toute conversion", () => {
    const casse = createMoneyHelpers([devise("XXX", "X", 2, "0")], FALLBACK);
    expect(casse.rateOf("XXX")).toBe(1);
  });

  it("expose une tolérance de comparaison partagée", () => {
    expect(MONEY_EPS).toBe(1e-6);
  });
});
