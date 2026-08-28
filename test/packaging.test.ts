/**
 * Tables de vérité du conditionnement gros/détail.
 *
 * Miroir strict de `backend/apps/inventory/packaging.py`. Toute divergence ici
 * se traduit par un écran qui annonce autre chose que ce que le serveur
 * enregistrera : c'est la classe de défaut la plus coûteuse du produit.
 */
import { describe, expect, it } from "vitest";
import {
  formatPackaged,
  formatPackagedDifference,
  formatPackagedSplit,
  getPackaging,
  remainingChannels,
  splitPackaged,
  toBaseQuantity,
  type Packaging,
} from "../src/packaging";

const casier: Packaging = {
  factor: 12,
  retailWord: "bouteille",
  packageWord: "casier",
  packageOnly: false,
};

describe("getPackaging", () => {
  it("rend null pour un produit vendu à l'unité seule", () => {
    expect(getPackaging({ selling_mode: "retail_only", units_per_package: 12 })).toBeNull();
  });

  it("rend null plutôt que d'échouer sur un produit mal configuré", () => {
    // Mode gros sans nombre d'unités : le serveur dégrade en mono-unité, pas
    // en exception, parce que ce chemin traverse les listes de catalogue.
    expect(getPackaging({ selling_mode: "wholesale_only", units_per_package: null })).toBeNull();
    expect(getPackaging({ selling_mode: "wholesale_and_retail", units_per_package: 1 })).toBeNull();
  });

  it("retient les libellés du marchand, avec un repli", () => {
    expect(
      getPackaging({
        selling_mode: "wholesale_and_retail",
        units_per_package: 24,
        unit_name: "bouteille",
        packaging_unit_name: "casier",
      })
    ).toEqual({ factor: 24, retailWord: "bouteille", packageWord: "casier", packageOnly: false });

    expect(
      getPackaging({ selling_mode: "wholesale_only", units_per_package: 6 })
    ).toEqual({ factor: 6, retailWord: "unité", packageWord: "contenant", packageOnly: true });
  });
});

describe("splitPackaged", () => {
  it("laisse le reste au vrac : un contenant entamé ne se rescelle pas", () => {
    expect(splitPackaged(43, 7, 12)).toEqual({ packages: 3, loose: 7 });
  });

  it("absorbe un déficit sur le vrac plutôt que de compter un contenant négatif", () => {
    expect(splitPackaged(-5, 0, 12)).toEqual({ packages: 0, loose: -5 });
  });

  it("garantit sealed × facteur + vrac == total", () => {
    for (const base of [0, 1, 11, 12, 13, 143, 144, 145]) {
      for (const loose of [0, 1, 5, 11]) {
        const { packages, loose: rest } = splitPackaged(base, loose, 12);
        expect(packages * 12 + rest, `base ${base}, vrac ${loose}`).toBe(base);
      }
    }
  });

  it("ne partage pas sans conditionnement", () => {
    expect(splitPackaged(43, 0, 1)).toEqual({ packages: 0, loose: 43 });
  });
});

describe("formatPackagedSplit contre formatPackaged", () => {
  it("rend un partage DÉJÀ connu sans le recalculer", () => {
    // Le rayon porte 3 casiers scellés et 27 bouteilles isolées. Redécouper le
    // total (63) au facteur donnerait « 5 casiers + 3 bouteilles », un rayon
    // qui n'a jamais existé.
    expect(formatPackagedSplit(casier, 3, 27)).toBe("3 casiers + 27 bouteilles");
    expect(formatPackaged(casier, 63, 27)).toBe("3 casiers + 27 bouteilles");
  });

  it("accorde les libellés en suivant la casse du marchand", () => {
    const plaquette: Packaging = {
      factor: 10,
      retailWord: "AMPOULE",
      packageWord: "BOITE",
      packageOnly: false,
    };
    expect(formatPackagedSplit(plaquette, 13, 14)).toBe("13 BOITES + 14 AMPOULES");
    expect(formatPackagedSplit(plaquette, 1, 1)).toBe("1 BOITE + 1 AMPOULE");
  });

  it("affiche toujours une quantité, même nulle", () => {
    expect(formatPackagedSplit(casier, 0, 0)).toBe("0 bouteille");
    expect(formatPackagedSplit(casier, 2, 0)).toBe("2 casiers");
  });
});

describe("formatPackagedDifference", () => {
  it("ventile l'écart par canal, avec une virgule et non un plus", () => {
    // Un manquant de scellés et un surplus d'unités se compensent dans le
    // total et y disparaissent : ventilés, chacun désigne sa cause.
    expect(formatPackagedDifference(casier, -2, 5)).toBe("-2 casiers, +5 bouteilles");
  });

  it("se réduit au vrac quand il n'y a pas de conditionnement", () => {
    expect(formatPackagedDifference(null, 0, -3)).toBe("-3");
  });
});

describe("toBaseQuantity", () => {
  it("somme les deux canaux en unité de détail", () => {
    expect(toBaseQuantity(casier, 2, 3)).toBe(27);
    expect(toBaseQuantity(null, 2, 3)).toBe(3);
  });
});

describe("remainingChannels", () => {
  it("puise les contenants dans le scellé", () => {
    expect(remainingChannels({ sealed: 5, loose: 4 }, { packages: 2, loose: 0 }, 12)).toEqual({
      sealed: 3,
      loose: 4,
    });
  });

  it("ouvre un contenant quand le vrac ne suffit pas, jamais l'inverse", () => {
    // 4 en vrac, on en demande 10 : on ouvre un casier (12), il en reste 6.
    expect(remainingChannels({ sealed: 5, loose: 4 }, { packages: 0, loose: 10 }, 12)).toEqual({
      sealed: 4,
      loose: 6,
    });
  });

  it("propage l'inconnu au lieu d'inventer un zéro bloquant", () => {
    expect(remainingChannels({ sealed: null, loose: 4 }, { packages: 1, loose: 0 }, 12)).toEqual({
      sealed: null,
      loose: 4,
    });
  });

  it("laisse le stock intact sans conditionnement", () => {
    expect(remainingChannels({ sealed: 3, loose: 9 }, { packages: 1, loose: 1 }, 1)).toEqual({
      sealed: 3,
      loose: 9,
    });
  });
});
