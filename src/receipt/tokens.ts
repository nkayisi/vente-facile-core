/**
 * Jetons de mise en page du ticket thermique.
 *
 * Tout est en millimètres, unité native du PDF produit. L'ancien générateur
 * semait des `y += 0.5`, `y += 1`, `y += 1.5` sans échelle : le rythme vertical
 * était illisible et impossible à corriger sans tout remesurer. Ici, une seule
 * échelle d'espacement et trois épaisseurs de filet porteuses de sens.
 */

export type PaperWidth = 58 | 80;

/**
 * Rôles typographiques. Le ticket précédent écrivait presque tout en 9 pt, d'où
 * l'absence de hiérarchie : le client ne savait pas où poser l'œil.
 */
export type FontRole =
  | "orgName"
  | "band"
  | "total"
  | "chip"
  | "body"
  | "label"
  | "legal";

export interface FontSpec {
  size: number;
  bold: boolean;
}

export const FONTS: Record<FontRole, FontSpec> = {
  orgName: { size: 12, bold: true },
  band: { size: 10, bold: true },
  total: { size: 13, bold: true },
  chip: { size: 9, bold: true },
  body: { size: 9, bold: false },
  label: { size: 8, bold: false },
  legal: { size: 7, bold: false },
};

export type SpaceSize = "xs" | "sm" | "md" | "lg";
export type RuleWeight = "heavy" | "light" | "hair";

export interface Tokens {
  paperWidth: number;
  margin: number;
  /** Largeur réellement écrivable, filets compris. */
  contentWidth: number;
  /** Blanc de tête : confort de découpe sur imprimante thermique. */
  topPadding: number;
  /** Blanc de pied : l'avance papier ne doit pas rogner la dernière ligne. */
  bottomPadding: number;
  space: Record<SpaceSize, number>;
  rule: Record<RuleWeight, number>;
  /** Blanc minimal entre un libellé et son montant sur une ligne justifiée. */
  minGap: number;
  /** Retrait des lignes secondaires (conditionnement, remise de ligne). */
  indent: number;
  /** Hauteur maximale du logo. */
  logoMaxHeight: number;
}

const BASE = {
  topPadding: 5,
  bottomPadding: 6,
  space: { xs: 1, sm: 2, md: 3, lg: 5 },
  rule: { heavy: 0.4, light: 0.15, hair: 0.08 },
  minGap: 2,
  indent: 2,
} as const;

/**
 * Blanc latéral, de chaque côté du contenu.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN TICKET N'EST PAS UNE PAGE : SA MARGE EST DÉJÀ MÉCANIQUE.             │
 * │                                                                          │
 * │ Sur un rouleau de 58 mm, la tête ne chauffe que 48 mm - 384 points à     │
 * │ 203 par pouce. Cinq millimètres de chaque bord sont donc BLANCS quoi     │
 * │ qu'on fasse : aucun réglage, aucune feuille de style ne peut y imprimer. │
 * │                                                                          │
 * │ Les 2,5 mm d'origine venaient d'une marge de DOCUMENT et s'ajoutaient à  │
 * │ ces cinq-là : le contenu ne couvrait que 43,9 mm des 58, soit trois      │
 * │ quarts du papier, sur un support qui coûte cher au marchand. Un          │
 * │ millimètre suffit à ne pas coller le texte au bord de la bande d'encre.  │
 * │                                                                          │
 * │ Il ne peut RIEN faire déborder : la page est mise à l'échelle exacte de  │
 * │ la bande chauffée, donc réduire cette marge élargit le contenu et ne     │
 * │ déplace aucun bord.                                                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
function marginFor(paperWidth: PaperWidth): number {
  return paperWidth >= 80 ? 1.5 : 1;
}

export function tokensFor(paperWidth: PaperWidth): Tokens {
  const margin = marginFor(paperWidth);
  return {
    ...BASE,
    space: { ...BASE.space },
    rule: { ...BASE.rule },
    paperWidth,
    margin,
    contentWidth: paperWidth - margin * 2,
    // Un logo plafonné à 12 mm sur un rouleau de 80 paraît minuscule : la
    // hauteur suit le papier, comme la largeur utile.
    logoMaxHeight: paperWidth >= 80 ? 16 : 12,
  };
}

/**
 * Interligne d'un corps donné.
 *
 * Le facteur 0,385 reproduit l'ancien couple (11 pt → 4,2 mm ; 9 pt → 3,5 mm)
 * pour que la densité du ticket reste celle que les marchands connaissent.
 */
export function leading(size: number): number {
  return Math.round(size * 0.385 * 100) / 100;
}

export function leadingOf(role: FontRole): number {
  return leading(FONTS[role].size);
}
