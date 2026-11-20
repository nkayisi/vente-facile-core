/**
 * Ce que le sélecteur de quantité propose à son ouverture, sur les deux
 * surfaces. Une proposition de 1 qui fermerait l'encaissement n'est pas faite.
 */
import { describe, it, expect } from "vitest";
import {
  basculerCanal,
  quantiteInitiale,
  saisieDeQuantite,
  type CanalQuantite,
} from "../src/pos/index";

const detail = null;
const gros = { packageOnly: false };
const grosSeul = { packageOnly: true };
const sansMotif = () => null;

describe("quantiteInitiale", () => {
  it("propose 1 unité pour un article vendu à l'unité", () => {
    expect(quantiteInitiale({ packaging: detail, alerteSiUn: sansMotif })).toEqual({
      canal: "retail", packages: 0, loose: 1, proposee: true, motifVide: null,
    });
  });

  it("propose 1 unité de détail pour un article vendu en gros et au détail", () => {
    const e = quantiteInitiale({ packaging: gros, alerteSiUn: sansMotif });
    expect(e).toMatchObject({ canal: "retail", packages: 0, loose: 1, proposee: true });
  });

  it("propose 1 contenant pour un article vendu en gros seul", () => {
    const e = quantiteInitiale({ packaging: grosSeul, alerteSiUn: sansMotif });
    expect(e).toMatchObject({ canal: "package", packages: 1, loose: 0, proposee: true });
  });

  it("ne propose rien quand 1 fermerait l'encaissement, et dit pourquoi", () => {
    const motif = "Il ne reste que 0,4 kg de Sucre.";
    const e = quantiteInitiale({ packaging: detail, alerteSiUn: () => motif });
    expect(e).toEqual({ canal: "retail", packages: 0, loose: 0, proposee: false, motifVide: motif });
  });

  it("interroge le contrôle dans le canal qui serait proposé", () => {
    const vus: CanalQuantite[] = [];
    quantiteInitiale({ packaging: grosSeul, alerteSiUn: (c) => { vus.push(c); return null; } });
    expect(vus).toEqual(["package"]);
  });

  it("rouvre une ligne du panier sur sa valeur et sur son canal, sans rien proposer", () => {
    expect(quantiteInitiale({ packaging: gros, initiale: { packages: 2, loose: 0 }, alerteSiUn: () => "x" }))
      .toEqual({ canal: "package", packages: 2, loose: 0, proposee: false, motifVide: null });
    expect(quantiteInitiale({ packaging: gros, initiale: { packages: 2, loose: 3 }, alerteSiUn: sansMotif }))
      .toMatchObject({ canal: "retail", packages: 2, loose: 3 });
    expect(quantiteInitiale({ packaging: detail, initiale: { packages: 0, loose: 0.5 }, alerteSiUn: sansMotif }))
      .toMatchObject({ canal: "retail", loose: 0.5, proposee: false });
  });
});

describe("basculerCanal", () => {
  it("fait suivre une proposition intacte : jamais « 2 cartons + 1 bouteille »", () => {
    const ouverte = quantiteInitiale({ packaging: gros, alerteSiUn: sansMotif });
    expect(basculerCanal(ouverte, "package", sansMotif)).toMatchObject({
      canal: "package", packages: 1, loose: 0, proposee: true,
    });
  });

  it("garde ce que le caissier a tapé dans les deux canaux", () => {
    const tapee = { canal: "retail" as const, packages: 0, loose: 3, proposee: false, motifVide: null };
    expect(basculerCanal(tapee, "package", sansMotif)).toEqual({ ...tapee, canal: "package" });
  });

  it("propose dans le nouveau canal quand l'ancien était vide faute de stock", () => {
    const vide = quantiteInitiale({ packaging: gros, alerteSiUn: (c) => (c === "retail" ? "plus de vrac" : null) });
    expect(vide.motifVide).toBe("plus de vrac");
    expect(basculerCanal(vide, "package", (c) => (c === "retail" ? "plus de vrac" : null)))
      .toMatchObject({ canal: "package", packages: 1, proposee: true, motifVide: null });
  });

  it("ne fait rien sur le canal déjà actif", () => {
    const e = quantiteInitiale({ packaging: gros, alerteSiUn: sansMotif });
    expect(basculerCanal(e, "retail", () => "x")).toBe(e);
  });
});

describe("saisieDeQuantite", () => {
  it("écrit une virgule, sans séparateur, et rien pour zéro", () => {
    expect(saisieDeQuantite(1)).toBe("1");
    expect(saisieDeQuantite(0.5)).toBe("0,5");
    expect(saisieDeQuantite(12500)).toBe("12500");
    expect(saisieDeQuantite(0.1 + 0.2)).toBe("0,3");
    expect(saisieDeQuantite(0)).toBe("");
  });
});
