/**
 * Formatage monétaire du ticket.
 *
 * Convention distincte de celle de l'écran, et c'est volontaire : ici l'espace
 * de groupement est ORDINAIRE et la décimale est un POINT, parce que la police
 * Helvetica intégrée à jsPDF rend U+202F en « / ». Voir l'en-tête de
 * `receipt/money.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  deaccent,
  decimalsOf,
  formatAmount,
  formatBare,
  formatMoney,
  formatPoints,
  formatQuantity,
  symbolOf,
} from "../src/receipt/money";

describe("décimales par devise", () => {
  it("le CDF n'a pas de décimales", () => {
    expect(decimalsOf("CDF")).toBe(0);
    expect(formatMoney(1_250_036.4, "CDF")).toBe("1 250 036 FC");
  });

  it("le dollar en a deux", () => {
    expect(decimalsOf("USD")).toBe(2);
    expect(formatMoney(2500, "USD")).toBe("2 500.00 $");
  });

  it("les autres devises à zéro décimale du contexte africain", () => {
    for (const code of ["XAF", "XOF", "RWF", "UGX", "JPY"]) {
      expect(decimalsOf(code), code).toBe(0);
    }
  });

  it("une organisation peut redéfinir décimales et symbole", () => {
    const overrides = { CDF: { decimals: 2, symbol: "CDF" } };
    expect(formatMoney(1000, "CDF", overrides)).toBe("1 000.00 CDF");
  });

  it("une devise inconnue garde son code comme symbole", () => {
    expect(symbolOf("ZZZ")).toBe("ZZZ");
    expect(decimalsOf("ZZZ")).toBe(2);
  });
});

describe("formatAmount", () => {
  it("groupe avec une espace ORDINAIRE, pas U+202F", () => {
    const rendu = formatAmount(1_234_567, 0);
    expect(rendu).toBe("1 234 567");
    expect(rendu).not.toContain(" ");
  });

  it("tient le nombre de décimales demandé, zéros compris", () => {
    expect(formatAmount(10.5, 2)).toBe("10.50");
    expect(formatAmount(10, 2)).toBe("10.00");
  });

  it("ne rend jamais NaN", () => {
    expect(formatAmount("pas un nombre", 2)).toBe("0.00");
  });

  it("formatBare omet le symbole", () => {
    expect(formatBare(1_250_036.4, "CDF")).toBe("1 250 036");
  });
});

describe("points de fidélité", () => {
  it("garde la fraction quand elle existe, et rien du tout sinon", () => {
    expect(formatPoints(3)).toBe("3");
    expect(formatPoints(0.58)).toBe("0.58");
    expect(formatPoints(null)).toBe("0");
  });

  it("complète à deux décimales dès que la fraction existe", () => {
    // DIVERGENCE ASSUMÉE avec `format.ts`, qui rend « 4,5 » à l'écran là où le
    // ticket imprime « 4.50 ». Les deux fonctions portent le même nom et ne
    // rendent pas la même chose. Comportement actuel du web, figé ici tel quel :
    // l'aligner change ce qui sort du papier, ce n'est pas une extraction.
    expect(formatPoints(4.5)).toBe("4.50");
  });
});

describe("formatQuantity", () => {
  it("n'imprime pas de décimales pour rien", () => {
    expect(formatQuantity(3)).toBe("3");
    expect(formatQuantity("3.000")).toBe("3");
    expect(formatQuantity(2.5)).toBe("2.5");
  });
});

describe("deaccent", () => {
  it("retire les diacritiques que la page de code NYX casse", () => {
    expect(deaccent("REÇU DE VENTE")).toBe("RECU DE VENTE");
    expect(deaccent("Établissement Kalume & Fils")).toBe("Etablissement Kalume & Fils");
    expect(deaccent("CLÔTURE DE CAISSE (Z)")).toBe("CLOTURE DE CAISSE (Z)");
  });
});
