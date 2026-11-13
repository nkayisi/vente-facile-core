/**
 * Les pays proposés à la création d'un établissement, et le pays qu'une devise
 * suggère.
 *
 * Les deux surfaces écrivaient `country: "RDC"` en dur : un marchand de Douala
 * qui choisissait le franc CFA restait domicilié en RDC, sur ses tickets comme
 * dans l'administration, et aucun écran ne lui permettait de le corriger avant
 * d'être entré dans l'application.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ LA DEVISE SUGGÈRE UN PAYS, ELLE NE L'IMPOSE PAS.                         │
 * │                                                                          │
 * │ Le franc CFA de la CEMAC est la monnaie de six pays, l'euro de vingt, et │
 * │ le dollar circule en RDC à côté du franc congolais. Le pays se préremplit│
 * │ depuis la devise tant que le marchand n'en a pas choisi un, puis il est  │
 * │ à lui : changer de devise après coup ne doit pas défaire son choix.      │
 * │ Cette règle-là vit dans l'écran, qui seul sait si le champ a été touché. │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ `value` EST CE QUI S'ENREGISTRE, et c'est un NOM, pas un code ISO.
 *   `Organization.country` est un texte libre depuis l'origine, imprimé tel
 *   quel en tête des tickets, et tous les établissements existants portent
 *   « RDC ». Passer à des codes réécrirait le papier de chacun d'eux ; d'où
 *   « RDC » pour la RDC, et le nom français partout ailleurs.
 *
 * ⚠ L'ORDRE DE LA LISTE EST UNE DÉCISION : le pays suggéré par une devise est
 *   le PREMIER qui l'emploie. C'est ce qui fait suggérer la RDC pour le dollar -
 *   les marchands en dollars de ce produit sont congolais - et le Cameroun pour
 *   le franc CFA de la CEMAC. Un test épingle chaque devise.
 */

export interface CountryOption {
  /** Ce qui s'enregistre dans `Organization.country`, et s'imprime. */
  value: string;
  /** Ce que le sélecteur affiche. */
  label: string;
  /** Les devises qu'on y emploie couramment, par ordre d'usage. */
  currencies: string[];
}

export const SUPPORTED_COUNTRIES: CountryOption[] = [
  // Afrique centrale
  { value: "RDC", label: "République démocratique du Congo", currencies: ["CDF", "USD"] },
  { value: "Cameroun", label: "Cameroun", currencies: ["XAF"] },
  { value: "Congo", label: "République du Congo", currencies: ["XAF"] },
  { value: "Gabon", label: "Gabon", currencies: ["XAF"] },
  { value: "Tchad", label: "Tchad", currencies: ["XAF"] },
  { value: "Centrafrique", label: "République centrafricaine", currencies: ["XAF"] },
  { value: "Guinée équatoriale", label: "Guinée équatoriale", currencies: ["XAF"] },

  // Afrique de l'Ouest (UEMOA)
  { value: "Sénégal", label: "Sénégal", currencies: ["XOF"] },
  { value: "Côte d'Ivoire", label: "Côte d'Ivoire", currencies: ["XOF"] },
  { value: "Mali", label: "Mali", currencies: ["XOF"] },
  { value: "Burkina Faso", label: "Burkina Faso", currencies: ["XOF"] },
  { value: "Niger", label: "Niger", currencies: ["XOF"] },
  { value: "Bénin", label: "Bénin", currencies: ["XOF"] },
  { value: "Togo", label: "Togo", currencies: ["XOF"] },
  { value: "Guinée-Bissau", label: "Guinée-Bissau", currencies: ["XOF"] },

  // Reste de l'Afrique
  { value: "Rwanda", label: "Rwanda", currencies: ["RWF"] },
  { value: "Ouganda", label: "Ouganda", currencies: ["UGX"] },
  { value: "Tanzanie", label: "Tanzanie", currencies: ["TZS"] },
  { value: "Kenya", label: "Kenya", currencies: ["KES"] },
  { value: "Nigeria", label: "Nigeria", currencies: ["NGN"] },
  { value: "Ghana", label: "Ghana", currencies: ["GHS"] },
  { value: "Afrique du Sud", label: "Afrique du Sud", currencies: ["ZAR"] },
  { value: "Maroc", label: "Maroc", currencies: ["MAD"] },
  { value: "Égypte", label: "Égypte", currencies: ["EGP"] },

  // Hors d'Afrique
  { value: "France", label: "France", currencies: ["EUR"] },
  { value: "Belgique", label: "Belgique", currencies: ["EUR"] },
  { value: "Luxembourg", label: "Luxembourg", currencies: ["EUR"] },
  { value: "Suisse", label: "Suisse", currencies: ["CHF"] },
  { value: "Royaume-Uni", label: "Royaume-Uni", currencies: ["GBP"] },
  { value: "États-Unis", label: "États-Unis", currencies: ["USD"] },
  { value: "Canada", label: "Canada", currencies: ["CAD"] },
  { value: "Australie", label: "Australie", currencies: ["AUD"] },
  { value: "Chine", label: "Chine", currencies: ["CNY"] },
  { value: "Japon", label: "Japon", currencies: ["JPY"] },
  { value: "Inde", label: "Inde", currencies: ["INR"] },
];

/** Le pays par défaut d'un établissement, quand rien d'autre ne le dit. */
export const DEFAULT_COUNTRY = "RDC";

/**
 * Le pays qu'une devise suggère : le premier de la liste qui l'emploie.
 *
 * Une devise inconnue rend `DEFAULT_COUNTRY` plutôt que rien : le champ est
 * obligatoire côté serveur, et un sélecteur vide se lirait comme un oubli.
 */
export function defaultCountryForCurrency(code: string): string {
  const upper = code.trim().toUpperCase();
  return SUPPORTED_COUNTRIES.find((c) => c.currencies.includes(upper))?.value ?? DEFAULT_COUNTRY;
}

/** Un pays de la liste, par la valeur enregistrée. */
export function getCountryByValue(value: string): CountryOption | undefined {
  return SUPPORTED_COUNTRIES.find((c) => c.value === value);
}
