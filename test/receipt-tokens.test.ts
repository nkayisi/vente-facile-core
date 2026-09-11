/**
 * Les jetons de mise en page du ticket.
 *
 * Ce que ce fichier protège n'est pas une esthétique, c'est de la LARGEUR DE
 * PAPIER. Une marge latérale se retranche DEUX FOIS d'une bande d'encre qui
 * fait déjà 10 mm de moins que le rouleau : un demi-millimètre de trop et le
 * ticket perd une colonne, sur un support que le marchand paie.
 */
import { describe, expect, it } from "vitest";

import { tokensFor, type PaperWidth } from "../src/receipt/tokens";

/**
 * Ce que la tête chauffe réellement, en millimètres.
 *
 * 384 points sur 58 mm et 576 sur 80, à 203 points par pouce. Mesure
 * indépendante des jetons : c'est contre le MATÉRIEL qu'on les juge.
 */
const BANDE_CHAUFFEE: Record<PaperWidth, number> = {
  58: (384 / 203) * 25.4,
  80: (576 / 203) * 25.4,
};

describe("Marge latérale du ticket", () => {
  for (const papier of [58, 80] as const) {
    it(`laisse au contenu l'essentiel de la bande chauffée sur ${papier} mm`, () => {
      const t = tokensFor(papier);
      // La page est mise à l'échelle exacte de la bande : la part du contenu
      // dans la page EST sa part dans l'encre.
      const partImprimee = (t.contentWidth / t.paperWidth) * BANDE_CHAUFFEE[papier];
      expect(partImprimee / BANDE_CHAUFFEE[papier]).toBeGreaterThan(0.93);
    });

    it(`garde un blanc de sécurité non nul sur ${papier} mm`, () => {
      // Zéro collerait le texte au bord de l'encre : lisible, mais sale, et une
      // dérive d'un demi-point suffirait à mordre le premier caractère.
      expect(tokensFor(papier).margin).toBeGreaterThan(0);
    });

    it(`dérive la largeur utile de la marge, sur ${papier} mm`, () => {
      const t = tokensFor(papier);
      expect(t.contentWidth).toBe(t.paperWidth - t.margin * 2);
    });
  }

  it("ne rétrécit pas le contenu quand le rouleau s'élargit", () => {
    expect(tokensFor(80).contentWidth).toBeGreaterThan(tokensFor(58).contentWidth);
  });

  it("laisse au logo une hauteur proportionnée au rouleau", () => {
    // Un logo plafonné à la hauteur du 58 mm paraît minuscule sur 75 mm de
    // largeur utile.
    expect(tokensFor(80).logoMaxHeight).toBeGreaterThan(tokensFor(58).logoMaxHeight);
  });
});
