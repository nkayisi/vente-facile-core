/**
 * Le pays qu'une devise suggère à l'inscription.
 *
 * Une devise qu'aucun pays n'emploie ne LÈVE rien : elle retombe sur la RDC.
 * Un marchand de Douala qui choisirait un jour une devise oubliée ici serait donc
 * domicilié en RDC sans un mot - le défaut exact que ce module existe pour
 * fermer. D'où le croisement avec `SUPPORTED_CURRENCIES` dans les deux sens.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_COUNTRY,
  SUPPORTED_COUNTRIES,
  defaultCountryForCurrency,
  getCountryByValue,
} from "../src/countries";
import { SUPPORTED_CURRENCIES } from "../src/currencies";

describe("pays d'un établissement", () => {
  it("chaque devise de la plateforme suggère un pays qui l'emploie", () => {
    const orphelines = SUPPORTED_CURRENCIES.map((c) => c.code).filter(
      (code) => !SUPPORTED_COUNTRIES.some((p) => p.currencies.includes(code))
    );
    expect(orphelines).toEqual([]);
  });

  it("aucun pays ne cite une devise que la plateforme ignore", () => {
    const connues = new Set(SUPPORTED_CURRENCIES.map((c) => c.code));
    const inconnues = SUPPORTED_COUNTRIES.flatMap((p) =>
      p.currencies.filter((c) => !connues.has(c)).map((c) => `${p.value}:${c}`)
    );
    expect(inconnues).toEqual([]);
  });

  it("une valeur enregistrée ne désigne qu'un seul pays", () => {
    const valeurs = SUPPORTED_COUNTRIES.map((p) => p.value);
    expect(new Set(valeurs).size).toBe(valeurs.length);
  });

  // L'ordre de la liste est une décision : ces cas la tiennent.
  it.each([
    ["CDF", "RDC"],
    ["USD", "RDC"],
    ["XAF", "Cameroun"],
    ["XOF", "Sénégal"],
    ["EUR", "France"],
    ["RWF", "Rwanda"],
  ])("%s suggère %s", (devise, pays) => {
    expect(defaultCountryForCurrency(devise)).toBe(pays);
  });

  it("lit le code sans égard à la casse ni aux blancs", () => {
    expect(defaultCountryForCurrency(" xaf ")).toBe("Cameroun");
  });

  it("une devise inconnue retombe sur le pays par défaut, jamais sur rien", () => {
    expect(defaultCountryForCurrency("ZZZ")).toBe(DEFAULT_COUNTRY);
    expect(getCountryByValue(DEFAULT_COUNTRY)).toBeDefined();
  });

  it("le pays des établissements existants est dans la liste", () => {
    // Tous portent « RDC » : le sélecteur doit le présélectionner tel quel.
    expect(getCountryByValue("RDC")?.currencies).toContain("CDF");
  });
});
