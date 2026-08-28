/** Marge, conversions de prix par canal, coût moyen pondéré. */
import { describe, expect, it } from "vitest";
import {
  blendedUnitCost,
  computeMargin,
  packageEquivalent,
  retailEquivalent,
} from "../src/pricing";

describe("computeMargin", () => {
  it("calcule la marge SUR LE PRIX DE VENTE, jamais sur le prix d'achat", () => {
    // Acheté 100, revendu 1000 : 90 % de marge, pas 900 % de taux de marque.
    const marge = computeMargin(100, 1000);
    expect(marge?.rate).toBeCloseTo(90, 6);
    expect(marge?.profit).toBe(900);
    expect(marge?.isNonPositive).toBe(false);
  });

  it("reste bornée à 100 %", () => {
    expect(computeMargin(1, 1_000_000)?.rate).toBeLessThan(100);
  });

  it("signale une vente à perte", () => {
    expect(computeMargin(1000, 800)?.isNonPositive).toBe(true);
  });

  it("rend null tant que les deux prix ne sont pas renseignés", () => {
    expect(computeMargin(null, 1000)).toBeNull();
    expect(computeMargin(100, 0)).toBeNull();
    expect(computeMargin(undefined, undefined)).toBeNull();
  });
});

describe("conversions entre canaux", () => {
  it("déduit le prix de détail du prix du conditionnement", () => {
    expect(retailEquivalent(4900, 10)).toBe(490);
  });

  it("déduit le prix du conditionnement du prix de détail", () => {
    expect(packageEquivalent(490, 10)).toBe(4900);
  });

  it("refuse de convertir sans conditionnement réel", () => {
    expect(retailEquivalent(4900, 1)).toBeNull();
    expect(packageEquivalent(490, null)).toBeNull();
  });
});

describe("blendedUnitCost", () => {
  it("pondère par ce qui a été reçu quand les deux canaux sont servis", () => {
    // 2 casiers de 12 à 1200 et 6 bouteilles à 110 : (2400 + 660) / 30 = 102.
    expect(
      blendedUnitCost({
        packageQuantity: 2,
        packageCost: 1200,
        looseQuantity: 6,
        looseCost: 110,
        factor: 12,
      })
    ).toBe(102);
  });

  it("complète le prix manquant par conversion, comme le serveur", () => {
    expect(
      blendedUnitCost({ packageQuantity: 1, packageCost: 1200, looseQuantity: 0, factor: 12 })
    ).toBe(100);
  });

  it("rend null quand aucun prix n'est saisi", () => {
    expect(blendedUnitCost({ packageQuantity: 1, looseQuantity: 1, factor: 12 })).toBeNull();
  });
});
