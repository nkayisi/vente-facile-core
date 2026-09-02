/**
 * Le document de rapport partagé.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CE QUE CES TESTS DÉFENDENT : DEUX DOCUMENTS POUR UN SEUL RAPPORT.       │
 * │                                                                          │
 * │ Le back-office traçait ses rapports en jsPDF sur A4 ; le terminal les    │
 * │ faisait passer par le tuyau des TICKETS, donc sur un rouleau de          │
 * │ cinquante-huit millimètres, chaque ligne de sept colonnes éclatée en un  │
 * │ paragraphe. Le même rapport donnait deux documents qu'on ne pouvait pas  │
 * │ comparer, et rien ne le signalait : chacun était correct chez lui.       │
 * │                                                                          │
 * │ Cette fonction est désormais la SEULE mise en page. Les deux surfaces    │
 * │ impriment la chaîne qu'elle rend.                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
import { describe, expect, it } from "vitest";

import {
  cellule,
  contenuCsv,
  nomDeFichier,
  rendreRapportHtml,
  sousCellule,
  texteCellule,
  type RapportSpec,
} from "../src/report";

const SPEC: RapportSpec = {
  identite: {
    org: {
      name: "NekaShop Inc",
      address: "12 av. Kasavubu",
      city: "Goma",
      phone: "0997057917",
      email: "contact@yopmail.com",
      rccm: "CD/GOM/RCCM/22-B-00123",
      idNat: "01-H5300-N12345",
      taxId: "A2345678X",
    },
    footer: "Merci de votre confiance",
  },
  titre: "BÉNÉFICES PAR PRODUIT",
  sousTitre: "30 derniers jours (2026-08-04 au 2026-09-02)",
  filtres: [
    ["Période", "30 derniers jours"],
    ["Du", "2026-08-04"],
  ],
  synthese: [
    ["Chiffre d'affaires", "560 740,7 $"],
    ["  1 à 30 j", "9 923,43 $"],
  ],
  colonnes: [
    { entete: "Produit" },
    { entete: "Qté vendue", mesure: true },
    { entete: "Bénéfice", mesure: true },
  ],
  lignes: [
    ["ALDOMET 500MG CES", "49 PLAQUETTES", "157 948,22 $"],
    [
      { texte: "Autre test gros", sous: "AUTRET-0639" },
      { texte: "23 BOITES + 14 AMPOULES", sous: "658 au total" },
      "118,4 $",
    ],
  ],
  vide: "Aucune ligne sur ce périmètre.",
};

describe("rendreRapportHtml", () => {
  it("sort en A4, et non sur un rouleau", () => {
    // C'est tout l'objet du second modèle : sept colonnes n'entrent pas dans
    // cinquante-huit millimètres.
    expect(rendreRapportHtml(SPEC)).toContain("@page { size: A4;");
  });

  it("porte l'identité de l'établissement, champ pour champ", () => {
    const html = rendreRapportHtml(SPEC);
    expect(html).toContain("NEKASHOP INC");
    expect(html).toContain("12 av. Kasavubu, Goma");
    expect(html).toContain("Tél. 0997057917");
    // Les mentions légales, dans l'ordre des tickets.
    expect(html).toContain("RCCM CD/GOM/RCCM/22-B-00123 · ID Nat 01-H5300-N12345 · NIF A2345678X");
  });

  it("porte le PÉRIMÈTRE : un papier voyage seul", () => {
    // Un rapport qui tait ses filtres laisse croire au lecteur qu'il a tout
    // sous les yeux. Sur un écran on lève les yeux vers la barre de filtres ;
    // sur un papier, il n'y a rien à lever.
    const html = rendreRapportHtml(SPEC);
    expect(html).toContain("Période");
    expect(html).toContain("30 derniers jours");
  });

  it("l'EN-TÊTE SUIT SA COLONNE : une mesure et son libellé à droite", () => {
    // Un libellé collé à gauche au-dessus de montants collés à droite oblige à
    // relire l'en-tête pour savoir lequel coiffe quoi. Défaut déjà corrigé sur
    // les exports du serveur.
    const html = rendreRapportHtml(SPEC);
    expect(html).toContain('<th class="m"');
    expect(html).toContain('<td class="m">157 948,22 $</td>');
    // Une colonne d'identité ne porte pas la classe.
    expect(html).toContain('<th class="">Produit</th>');
  });

  it("rend la SOUS-LIGNE d'une cellule", () => {
    // « 658 au total » sous « 23 BOITES + 14 AMPOULES » : les deux surfaces
    // l'affichent déjà, le document doit la porter aussi.
    expect(rendreRapportHtml(SPEC)).toContain('<span class="sous">658 au total</span>');
  });

  it("répète l'en-tête du tableau à chaque page", () => {
    // Sans lui, la deuxième page d'un rapport de trois cents lignes est un
    // tableau de nombres sans colonnes.
    expect(rendreRapportHtml(SPEC)).toContain("thead { display: table-header-group; }");
  });

  it("ÉCHAPPE ce qui viendrait d'un marchand", () => {
    // Un nom d'établissement est saisi librement : sans échappement, un
    // chevron casse le document, et le marchand n'a rien fait de mal.
    const html = rendreRapportHtml({
      ...SPEC,
      identite: { org: { name: 'Chez <b>"Papa"</b> & Fils' } },
    });
    expect(html).toContain("&lt;B&gt;&quot;PAPA&quot;&lt;/B&gt; &amp; FILS");
    expect(html).not.toContain("<b>");
  });

  it("ne rend JAMAIS une page blanche", () => {
    const html = rendreRapportHtml({ ...SPEC, lignes: [] });
    expect(html).toContain("Aucune ligne sur ce périmètre.");
    expect(html).not.toContain("<tbody></tbody>");
  });

  it("indente une ligne de synthèse enfant plutôt que d'aplatir ses espaces", () => {
    // Le HTML réduit deux espaces de tête à un seul : la hiérarchie d'une
    // balance âgée disparaîtrait, et « 1 à 30 j » se lirait comme un total.
    const html = rendreRapportHtml(SPEC);
    expect(html).toContain('<div class="s sc">');
    expect(html).toContain('<div class="sk">1 à 30 j</div>');
  });

  it("tout le style est EN LIGNE : aucune feuille externe ne le suivra", () => {
    // `expo-print` reçoit une chaîne isolée, et l'onglet ouvert par le
    // navigateur n'hérite de rien.
    const html = rendreRapportHtml(SPEC);
    expect(html).not.toContain("<link");
    expect(html).toContain("<style>");
  });
});

describe("contenuCsv", () => {
  it("commence par un BOM : sans lui Excel lit « CrÃ©ances »", () => {
    expect(contenuCsv(SPEC).charCodeAt(0)).toBe(0xfeff);
  });

  it("sépare par des POINTS-VIRGULES", () => {
    // Excel choisit son séparateur d'après la locale : en français c'est le
    // point-virgule, et un fichier à virgules s'ouvre en UNE colonne.
    expect(contenuCsv(SPEC)).toContain("Produit;Qté vendue;Bénéfice");
  });

  it("PROTÈGE les montants, et c'est le cas GÉNÉRAL", () => {
    // « 157 948,22 $ » porte une virgule. Chaque cellule d'argent de ce
    // produit en porte une.
    expect(contenuCsv(SPEC)).toContain('"157 948,22 $"');
  });

  it("range la sous-ligne DANS sa cellule, jamais dans une colonne de plus", () => {
    // Une colonne supplémentaire décalerait toutes les suivantes, et le
    // tableur d'en face n'a pas la notion de seconde ligne dans une cellule.
    // Sans virgule ni point-virgule, la cellule n'a pas besoin de guillemets :
    // les poser partout gonflerait le fichier sans rien protéger.
    expect(contenuCsv(SPEC)).toContain("23 BOITES + 14 AMPOULES (658 au total)");
    expect(contenuCsv(SPEC)).toContain("Autre test gros (AUTRET-0639)");
  });

  it("porte le même PÉRIMÈTRE et la même synthèse que le PDF", () => {
    const csv = contenuCsv(SPEC);
    expect(csv).toContain("Période;30 derniers jours");
    expect(csv).toContain('Chiffre d\'affaires;"560 740,7 $"');
    // Le libellé enfant perd son indentation : un tableur n'en fait rien.
    expect(csv).toContain('1 à 30 j;"9 923,43 $"');
  });

  it("finit par un saut de ligne, que certains tableurs exigent", () => {
    expect(contenuCsv(SPEC).endsWith("\r\n")).toBe(true);
  });

  it("ne rend jamais un fichier muet", () => {
    expect(contenuCsv({ ...SPEC, lignes: [] })).toContain("Aucune ligne sur ce périmètre.");
  });
});

describe("cellule", () => {
  it("laisse passer ce qui ne casse rien", () => {
    expect(cellule("SPECIALITE")).toBe("SPECIALITE");
  });

  it("protège séparateur, virgule, guillemet et saut de ligne", () => {
    expect(cellule("Remboursement ; retour")).toBe('"Remboursement ; retour"');
    expect(cellule("Kalume, Fils")).toBe('"Kalume, Fils"');
    // Le guillemet se DOUBLE, il ne se retire pas : le retirer changerait la
    // donnée.
    expect(cellule('Note "urgente"')).toBe('"Note ""urgente"""');
    expect(cellule("a\nb")).toBe('"a\nb"');
  });
});

describe("nomDeFichier", () => {
  it("retire ce qu'un système de fichiers refuse", () => {
    expect(nomDeFichier("Ventes 01/09 : détail")).toBe("Ventes 01 09 détail");
  });

  it("borne la longueur sans rendre une chaîne vide", () => {
    expect(nomDeFichier("x".repeat(200))).toHaveLength(80);
    expect(nomDeFichier("   ")).toBe("");
  });
});

describe("les deux formes de cellule", () => {
  it("la forme courte et la forme longue se lisent pareil", () => {
    expect(texteCellule("49 PLAQUETTES")).toBe("49 PLAQUETTES");
    expect(texteCellule({ texte: "49 PLAQUETTES" })).toBe("49 PLAQUETTES");
    expect(sousCellule("49 PLAQUETTES")).toBeNull();
    expect(sousCellule({ texte: "x", sous: "658 au total" })).toBe("658 au total");
  });
});
