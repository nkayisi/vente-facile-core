/**
 * Table de devises d'une organisation, et les quatre opérations qui en découlent.
 *
 * `OrganizationCurrency.exchange_rate` se lit « unités de devise PRINCIPALE
 * pour 1 unité de cette devise » ; la principale vaut donc 1. Toute conversion
 * passe par la principale, jamais directement de l'une à l'autre : c'est ce que
 * fait le serveur, et un taux croisé calculé autrement dériverait.
 *
 * Ces fonctions vivaient dans la page POS du back-office, en fermetures sur son
 * state. Elles décident de l'argent : les dupliquer sur mobile aurait été la
 * faute la plus coûteuse du projet, puisqu'une divergence d'un centième ne se
 * voit qu'au moment où un client conteste sa monnaie.
 */

export interface OrganizationCurrencyLike {
  currency_code: string;
  exchange_rate: string | number;
  currency_symbol?: string | null;
  currency_decimal_places?: number | null;
  is_primary?: boolean;
}

export interface CurrencyFallback {
  code: string;
  symbol?: string;
  decimal_places?: number;
}

/**
 * Tolérance de comparaison monétaire : absorbe l'erreur flottante résiduelle
 * après arrondi par devise. Une seule constante pour l'affichage ET pour le
 * bouton « Encaisser », afin qu'ils ne puissent jamais se contredire.
 */
export const MONEY_EPS = 1e-6;

/** Arrondi à deux décimales, en devise principale. */
export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface CurrencyTable {
  /** Code de la devise principale de l'organisation. */
  primary: string;
  /** Taux vers la principale ; 1 si la devise est inconnue ou mal réglée. */
  rateOf(code: string): number;
  /** Symbole d'affichage ; le code lui-même à défaut. */
  symbolOf(code: string): string;
  /** Décimales PHYSIQUES de la devise : le CDF en a zéro, l'USD deux. */
  decimalsOf(code: string): number;
  /** Arrondi d'un montant à la plus petite unité physique de sa devise. */
  round(amount: number, code: string): number;
  /** Conversion pure, sans arrondi : à réserver aux sommes intermédiaires. */
  convert(amount: number, from: string, to: string): number;
  /** Conversion PUIS arrondi : la forme à utiliser pour tout prix affiché ou envoyé. */
  convertMoney(amount: number, from: string, to: string): number;
}

export function createCurrencyTable(
  currencies: OrganizationCurrencyLike[],
  fallback: CurrencyFallback
): CurrencyTable {
  const find = (code: string) => currencies.find((c) => c.currency_code === code);
  const primary = currencies.find((c) => c.is_primary)?.currency_code || fallback.code;

  const rateOf = (code: string): number => {
    const c = find(code);
    const r = c ? Number(c.exchange_rate) : 1;
    // Un taux nul ou négatif n'est pas une donnée, c'est un réglage manqué :
    // s'en servir diviserait par zéro. On retombe sur la parité, et le serveur
    // tranchera. Refuser la vente ici punirait le caissier d'une faute d'admin.
    return Number.isFinite(r) && r > 0 ? r : 1;
  };

  const decimalsOf = (code: string): number => {
    const c = find(code);
    if (c && c.currency_decimal_places != null) return c.currency_decimal_places;
    return fallback.decimal_places ?? 2;
  };

  const round = (amount: number, code: string): number => {
    const f = Math.pow(10, decimalsOf(code));
    return Math.round((amount + Number.EPSILON) * f) / f;
  };

  const convert = (amount: number, from: string, to: string): number => {
    if (!amount || from === to) return amount;
    return (amount * rateOf(from)) / rateOf(to);
  };

  return {
    primary,
    rateOf,
    decimalsOf,
    round,
    convert,
    symbolOf: (code) => find(code)?.currency_symbol || code,
    convertMoney: (amount, from, to) => round(convert(amount, from, to), to),
  };
}
