import { describe, expect, it } from "vitest";
import {
  candidatsDuScan,
  DOUCHETTE_AU_REPOS,
  frapper,
  quantiteApresRescan,
  estLeMemeArticle,
  frapperDansLaSaisie,
  rescanAuRepos,
  type EtatDouchette,
  type EtatRescan,
} from "../src/pos/douchette";

/** Tape une suite de touches, aux instants donnés, et rend les codes lus. */
function taper(touches: [string, number][]): { codes: string[]; etat: EtatDouchette } {
  let etat = DOUCHETTE_AU_REPOS;
  const codes: string[] = [];
  for (const [touche, instant] of touches) {
    const r = frapper(etat, touche, instant);
    etat = r.etat;
    if (r.code) codes.push(r.code);
  }
  return { codes, etat };
}

/** Une rafale de douchette : un caractère toutes les `pas` millisecondes, puis Entrée. */
function rafale(code: string, depart = 1000, pas = 8): [string, number][] {
  const touches: [string, number][] = [...code].map((c, i) => [c, depart + i * pas]);
  touches.push(["Enter", depart + code.length * pas]);
  return touches;
}

describe("la douchette", () => {
  it("une rafale rapide terminée par Entrée est un scan", () => {
    expect(taper(rafale("6001087011234")).codes).toEqual(["6001087011234"]);
  });

  it("une frappe humaine n'est PAS un scan", () => {
    const humain: [string, number][] = [
      ["5", 0], ["0", 180], ["0", 350], ["0", 520], ["Enter", 700],
    ];
    expect(taper(humain).codes).toEqual([]);
  });

  it("un code trop court n'est pas un code-barres", () => {
    expect(taper(rafale("123")).codes).toEqual([]);
  });

  it("la rafale repart quand la frappe ralentit : le début humain est oublié", () => {
    const touches: [string, number][] = [["s", 0], ["a", 200], ...rafale("96385074", 500)];
    expect(taper(touches).codes).toEqual(["96385074"]);
  });

  it("Maj n'interrompt pas la rafale (douchette en AZERTY)", () => {
    const touches: [string, number][] = [
      ["Shift", 1000], ["6", 1004], ["Shift", 1008], ["0", 1012], ["0", 1020], ["1", 1028], ["Enter", 1036],
    ];
    expect(taper(touches).codes).toEqual(["6001"]);
  });

  it("une Entrée trop tardive après la rafale n'est pas un scan", () => {
    const touches: [string, number][] = [...rafale("96385074").slice(0, -1), ["Enter", 5000]];
    expect(taper(touches).codes).toEqual([]);
  });

  it("deux scans de suite donnent deux codes", () => {
    const touches = [...rafale("11112222", 0), ...rafale("33334444", 2000)];
    expect(taper(touches).codes).toEqual(["11112222", "33334444"]);
  });
});

describe("les codes à essayer après un scan", () => {
  it("un scan tronqué en tête retrouve le code entier dans le champ", () => {
    expect(candidatsDuScan("7687GJHGD", "87687GJHGD")).toEqual(["7687GJHGD", "87687GJHGD"]);
  });

  it("le code lu seul quand le champ ne le prolonge pas", () => {
    expect(candidatsDuScan("87687GJHGD", "87687GJHGD")).toEqual(["87687GJHGD"]);
    expect(candidatsDuScan("ABCD", "XYZ")).toEqual(["ABCD"]);
    expect(candidatsDuScan("ABCD", null)).toEqual(["ABCD"]);
  });
});

/** Tape `texte` à partir de `debut`, `pas` millisecondes entre deux touches. */
function taperDansLaSaisie(
  etat: EtatRescan<string>,
  texte: string,
  debut: number,
  pas: number,
  champ: { valeur: string }
) {
  let e = etat;
  let t = debut;
  for (const touche of texte) {
    const r = frapperDansLaSaisie(e, touche, t, champ.valeur);
    e = r.etat;
    champ.valeur += touche;
    t += pas;
  }
  return { etat: e, fin: t };
}

describe("frapperDansLaSaisie", () => {
  it("reconnaît un scan et rend la saisie d'avant la rafale", () => {
    const champ = { valeur: "1" };
    const { etat, fin } = taperDansLaSaisie(rescanAuRepos(), "600123456789", 1000, 8, champ);
    const r = frapperDansLaSaisie(etat, "Enter", fin, champ.valeur);
    expect(r.scan).toEqual({ candidats: ["600123456789"], avant: "1" });
  });

  it("ne prend jamais une frappe humaine pour un scan", () => {
    const champ = { valeur: "" };
    const { etat, fin } = taperDansLaSaisie(rescanAuRepos(), "12", 1000, 250, champ);
    expect(frapperDansLaSaisie(etat, "Enter", fin + 200, champ.valeur).scan).toBeNull();
  });

  it("garde son point de reprise quand le premier caractère arrive en retard", () => {
    const champ = { valeur: "1" };
    let e = frapperDansLaSaisie(rescanAuRepos<string>(), "8", 1000, champ.valeur).etat;
    champ.valeur += "8";
    // Le deuxième caractère arrive 60 ms plus tard : la rafale repart de lui.
    const suite = taperDansLaSaisie(e, "7687GJHGD", 1060, 8, champ);
    e = suite.etat;
    const r = frapperDansLaSaisie(e, "Enter", suite.fin, champ.valeur);
    expect(r.scan?.avant).toBe("1");
    expect(r.scan?.candidats).toEqual(["7687GJHGD", "87687GJHGD"]);
  });
});

describe("estLeMemeArticle", () => {
  it("compare au code-barres et au SKU, sans la casse", () => {
    expect(estLeMemeArticle(["600123456789"], { barcode: "600123456789", sku: "X" })).toBe(true);
    expect(estLeMemeArticle(["art-1"], { barcode: "", sku: "ART-1" })).toBe(true);
    expect(estLeMemeArticle(["7687GJHGD", "87687GJHGD"], { barcode: "87687GJHGD" })).toBe(true);
    expect(estLeMemeArticle(["999"], { barcode: "600", sku: "ART" })).toBe(false);
  });
});

describe("le re-scan du même article", () => {
  it("ajoute un, en quantité de trois décimales", () => {
    expect(quantiteApresRescan(1)).toBe(2);
    expect(quantiteApresRescan(0.5)).toBe(1.5);
    expect(quantiteApresRescan(0.1 + 0.2)).toBe(1.3);
  });

  it("repart de zéro sur une saisie vide ou illisible, jamais d'un nombre inventé", () => {
    expect(quantiteApresRescan(0)).toBe(1);
    expect(quantiteApresRescan(Number.NaN)).toBe(1);
    expect(quantiteApresRescan(-2)).toBe(1);
  });
});
