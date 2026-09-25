import { describe, expect, it } from "vitest";

import {
  choixEntrepotRecevable,
  LIBELLES_VERROU_PERIMETRE,
  verrouEntrepot,
} from "../src/perimetre";

describe("verrouEntrepot", () => {
  it("un caissier est fermé quel que soit son nombre de dépôts", () => {
    expect(verrouEntrepot("cashier", 0)).toBe("cashier");
    expect(verrouEntrepot("cashier", 3)).toBe("cashier");
  });

  it("un propriétaire n'est JAMAIS fermé", () => {
    // Il n'a aucune affectation, et c'est ce qui le rend « partout » : le
    // compter comme un membre sans entrepôt le priverait de tout.
    expect(verrouEntrepot("owner", 0)).toBeNull();
  });

  it("un rôle borné sans affectation le DIT", () => {
    expect(verrouEntrepot("manager", 0)).toBe("aucun-entrepot");
    expect(verrouEntrepot("stock_keeper", 0)).toBe("aucun-entrepot");
  });

  it("choisir entre une seule chose n'est pas un choix", () => {
    expect(verrouEntrepot("manager", 1)).toBe("un-seul-entrepot");
  });

  it("au-delà de deux dépôts, le filtre est ouvert", () => {
    expect(verrouEntrepot("manager", 2)).toBeNull();
  });

  it("un rôle inconnu n'invente pas de verrou", () => {
    expect(verrouEntrepot(null, 0)).toBeNull();
  });

  it("chaque motif a un libellé, et aucun n'est muet", () => {
    for (const motif of ["cashier", "un-seul-entrepot", "aucun-entrepot"] as const) {
      expect(LIBELLES_VERROU_PERIMETRE[motif].length).toBeGreaterThan(10);
    }
  });
});

describe("choixEntrepotRecevable", () => {
  const permis = new Set(["a"]);

  it("un choix dans le périmètre passe", () => {
    expect(choixEntrepotRecevable("a", permis, false)).toBe("a");
  });

  it("un choix HORS périmètre est écarté, jamais envoyé", () => {
    // Le serveur le refuse par un 400 : l'envoyer ferait crier l'écran pour
    // une règle qu'on connaissait déjà.
    expect(choixEntrepotRecevable("b", permis, false)).toBeNull();
  });

  it("un propriétaire choisit n'importe lequel", () => {
    expect(choixEntrepotRecevable("b", permis, true)).toBe("b");
  });

  it("l'absence de choix n'est pas un choix", () => {
    expect(choixEntrepotRecevable(null, permis, true)).toBeNull();
    expect(choixEntrepotRecevable("", permis, true)).toBeNull();
  });
});
