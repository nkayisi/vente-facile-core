import { describe, it, expect } from "vitest";
import {
  convertirSaisie,
  lireNombre,
  montrerConversion,
  type Conversion,
} from "../src/nombres";

/**
 * La lecture d'un nombre tapé au comptoir.
 *
 * Elle décide de ce qui part au serveur : une virgule non traduite était
 * refusée par `DecimalField` et l'opération partait en quarantaine, un espace
 * de milliers donnait `NaN` puis zéro, et un bouton ne réagissait pas.
 */

const valeur = (s: string): number | null => {
  const r = lireNombre(s);
  if (!r.ok) throw new Error(`refusé : ${r.motif}`);
  return r.valeur;
};

describe("lireNombre", () => {
  it("lit la VIRGULE du pavé décimal francophone", () => {
    expect(valeur("12,5")).toBe(12.5);
    expect(valeur("12.5")).toBe(12.5);
  });

  it("lit les séparateurs de milliers, quels qu'ils soient", () => {
    expect(valeur("12 500")).toBe(12500);
    expect(valeur("12 500")).toBe(12500);
    expect(valeur("12 500,50")).toBe(12500.5);
  });

  it("rend `null` sur une saisie VIDE, jamais zéro", () => {
    // Ce que « vide » veut dire appartient à l'appelant : hériter du tiroir
    // précédent pour un fonds de caisse, ne rien ajouter pour une ligne.
    expect(valeur("")).toBeNull();
    expect(valeur("   ")).toBeNull();
  });

  it("rend zéro quand il est ÉCRIT", () => {
    expect(valeur("0")).toBe(0);
    expect(valeur("0,00")).toBe(0);
  });

  it("nomme le motif du refus, sans le formuler", () => {
    // La phrase appartient à l'écran : « un fonds négatif » et « une quantité
    // négative » ne se disent pas pareil, et c'est l'écran qui sait laquelle.
    expect(lireNombre("-500")).toEqual({ ok: false, motif: "negatif" });
    for (const saisie of ["abc", "12,5,5", "1.2.3", ",", "12$"]) {
      expect(lireNombre(saisie)).toEqual({ ok: false, motif: "illisible" });
    }
  });

  it("ne DEVINE pas une virgule de milliers", () => {
    // « 12,500 » vaut douze et demi en français. Deviner l'autre lecture
    // écrirait un montant faux qui a l'air juste.
    expect(valeur("12,500")).toBe(12.5);
  });
});

/** 1 USD = 2 800 CDF. Le CDF n'a pas de décimales, le dollar en a deux. */
const TAUX: Record<string, number> = { CDF: 1, USD: 2800 };
const DECIMALES: Record<string, number> = { CDF: 0, USD: 2 };

const conv: Conversion = {
  convertir: (m, de, vers) => {
    const brut = (m * TAUX[de]) / TAUX[vers];
    const d = DECIMALES[vers];
    return Math.round(brut * 10 ** d) / 10 ** d;
  },
  decimales: (c) => DECIMALES[c] ?? 2,
};

describe("changer de devise", () => {
  it("CONVERTIT le montant, il ne l'efface pas", () => {
    // Le défaut qu'on ferme : un champ vidé fait retaper une somme que le
    // marchand vient de dire à son client.
    expect(convertirSaisie("46000", "CDF", "USD", conv)).toBe("16.43");
    expect(convertirSaisie("10", "USD", "CDF", conv)).toBe("28000");
  });

  it("lit « 12 500 » comme douze mille cinq cents, jamais comme douze", () => {
    // `parseFloat("12 500")` rend 12. Au pouce, sur un pavé décimal, le
    // séparateur de milliers se tape tous les jours.
    expect(convertirSaisie("12 500", "CDF", "USD", conv)).toBe("4.46");
  });

  it("accepte la virgule décimale française", () => {
    expect(convertirSaisie("1,5", "USD", "CDF", conv)).toBe("4200");
  });

  it("rend la saisie VERBATIM quand elle est vide, illisible ou nulle", () => {
    // C'est ce que fait le web : basculer de devise avant d'avoir tapé quoi
    // que ce soit ne doit rien détruire, et une saisie fautive doit rester
    // sous les yeux pour être corrigée.
    expect(convertirSaisie("", "CDF", "USD", conv)).toBe("");
    expect(convertirSaisie("12,5,0", "CDF", "USD", conv)).toBe("12,5,0");
    expect(convertirSaisie("0", "CDF", "USD", conv)).toBe("0");
    expect(convertirSaisie("abc", "CDF", "USD", conv)).toBe("abc");
  });

  it("ne touche à rien quand la devise ne change pas", () => {
    expect(convertirSaisie("46 000", "CDF", "CDF", conv)).toBe("46 000");
  });

  it("arrondit aux décimales de la devise CIBLE", () => {
    // Un franc congolais n'a pas de décimales : « 16.428571 » n'existe pas.
    expect(convertirSaisie("16.43", "USD", "CDF", conv)).toBe("46004");
    expect(convertirSaisie("1", "USD", "CDF", conv)).toBe("2800");
  });

  it("ne rend jamais de zéros de queue ni de notation exponentielle", () => {
    // « 46000.00 » dans un champ se relit mal, et `String(1e21)` rendrait
    // « 1e+21 », que le serveur refuserait.
    expect(convertirSaisie("2800", "CDF", "USD", conv)).toBe("1");
    expect(convertirSaisie("1e30", "CDF", "USD", conv)).toBe("1e30");
  });
});

describe("le repère de conversion", () => {
  it("ne s'affiche que sur une devise secondaire, multi-devise, montant positif", () => {
    expect(montrerConversion("46000", "USD", "CDF", 2)).toBe(true);
    // Mono-devise : il n'y a rien à comparer.
    expect(montrerConversion("46000", "USD", "CDF", 1)).toBe(false);
    // La principale est déjà l'unité de compte.
    expect(montrerConversion("46000", "CDF", "CDF", 2)).toBe(false);
    // Un repère sur un champ vide occupe une ligne pour rien.
    expect(montrerConversion("", "USD", "CDF", 2)).toBe(false);
    expect(montrerConversion("0", "USD", "CDF", 2)).toBe(false);
  });
});
