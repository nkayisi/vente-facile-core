/**
 * Test différentiel : `intl-fr` doit rendre EXACTEMENT ce que rend `Intl` en
 * `fr-CD` sur un moteur à ICU complète.
 *
 * C'est ce test qui autorise le web à basculer sur ce module sans changer un
 * seul pixel. Node embarque l'ICU complète, il sert donc de référence ; c'est
 * Hermes, côté mobile, qui ne l'a pas et qui motive l'existence du module.
 */
import { describe, expect, it } from "vitest";
import {
  formatDateFr,
  formatDateTimeFr,
  formatNumberFr,
  monthShort,
} from "../src/intl-fr";

const reference = (value: number, maximumFractionDigits: number) =>
  new Intl.NumberFormat("fr-CD", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);

/** Valeurs choisies : bornes de groupement, signes, zéros de queue, CDF réels. */
const VALUES = [
  0, 1, -1, 9, 10, 99, 100, 999, 1000, 1001, 9999, 10_000, 100_000,
  999_999, 1_000_000, 12_345_678, 1_234_567_890,
  0.5, 0.05, 2.3, 10.5, 10.05, 1234.5, 1234.56, 99_999.999,
  -0.5, -1234.56, -1_000_000,
  // Montants CDF réellement rencontrés dans le dépôt.
  20_000, 92_000, 1_250_036, 2_330_813, 12_500_000,
];

describe("formatNumberFr contre Intl fr-CD", () => {
  for (const decimals of [0, 2, 3, 6]) {
    it(`rend comme Intl avec ${decimals} décimales au plus`, () => {
      for (const value of VALUES) {
        expect(formatNumberFr(value, decimals), `valeur ${value}`).toBe(
          reference(value, decimals)
        );
      }
    });
  }

  it("groupe avec l'espace fine insécable U+202F, comme Intl", () => {
    const rendu = formatNumberFr(1_234_567, 0);
    expect(rendu).toContain(" ");
    expect(rendu).toBe(reference(1_234_567, 0));
  });

  it("sépare les décimales par une virgule", () => {
    expect(formatNumberFr(2.3, 6)).toBe("2,3");
  });

  it("supprime les zéros décimaux de queue", () => {
    expect(formatNumberFr(10.5, 2)).toBe("10,5");
    expect(formatNumberFr(10, 2)).toBe("10");
  });

  it("ne rend jamais NaN", () => {
    expect(formatNumberFr(Number.NaN, 2)).toBe("0");
    expect(formatNumberFr(Number.POSITIVE_INFINITY, 2)).toBe("0");
  });
});

describe("dates", () => {
  const refDate = (d: Date) =>
    d.toLocaleDateString("fr-CD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  it("rend les mois courts comme Intl", () => {
    for (let m = 0; m < 12; m++) {
      const d = new Date(2026, m, 15);
      expect(monthShort(m), `mois ${m}`).toBe(
        d.toLocaleDateString("fr-CD", { month: "short" })
      );
    }
  });

  it("rend une date courte comme Intl", () => {
    for (const day of [1, 9, 15, 28, 31]) {
      const d = new Date(2026, 7, day);
      expect(formatDateFr(d)).toBe(refDate(d));
    }
  });

  it("rend date et heure comme Intl", () => {
    const d = new Date(2026, 7, 28, 9, 5);
    expect(formatDateTimeFr(d)).toBe(
      d.toLocaleDateString("fr-CD", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  });
});
