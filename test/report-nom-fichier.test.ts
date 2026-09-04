/**
 * Le nom d'un document exporté.
 *
 * Ce fichier est ce qui reste de `report.test.ts`, qui défendait « deux
 * documents pour un seul rapport » à l'époque où la mise en page vivait dans ce
 * paquet. Les rapports sont maintenant rendus par le serveur, qui tient cette
 * garantie par construction : les deux surfaces téléchargent le même fichier,
 * et `apps/core/tests/test_exports.py::TroisMoteursUnSeulDocumentTests` compare
 * ses trois moteurs. Ne subsiste ici que le nommage, qui se décide sur
 * l'appareil.
 */
import { describe, expect, it } from "vitest";

import { nomDeFichier } from "../src/report";

describe("nomDeFichier", () => {
  it("retire ce qu'un système de fichiers refuse", () => {
    expect(nomDeFichier("Ventes 01/09 : détail")).toBe("Ventes 01 09 détail");
  });

  it("borne la longueur sans rendre une chaîne vide", () => {
    expect(nomDeFichier("x".repeat(200))).toHaveLength(80);
    expect(nomDeFichier("   ")).toBe("");
  });
});
