/**
 * Helpers monétaires multi-devise.
 *
 * Convention du projet (identique côté backend) :
 * `OrganizationCurrency.exchange_rate` = nombre d'unités de la devise
 * PRINCIPALE pour 1 unité de cette devise (1 USD = 2800 CDF ⇒ taux 2800).
 * La devise principale a toujours un taux de 1.
 *   - vers la principale : montant × taux
 *   - depuis la principale : montant ÷ taux
 *   - entre deux devises : on passe par la principale.
 *
 * Chaque montant est formaté avec le symbole ET le nombre de décimales de SA
 * devise (CDF = 0, USD/EUR = 2). On n'additionne jamais deux devises.
 */
import { formatNumberFr } from "./intl-fr";
import type { CurrencyInfo, OrganizationCurrency } from "./types";

export type { CurrencyInfo, OrganizationCurrency };

/** Tolérance de comparaison partagée entre affichage et validation. */
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

export interface OrganizationCurrencyLike {
  currency_code: string;
  exchange_rate: string | number;
  currency_symbol?: string | null;
  currency_decimal_places?: number | null;
  is_primary?: boolean;
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
  /** Montant formaté avec son symbole : « 46 000 FC ». */
  money(amount: string | number, code: string): string;
  /** Montant formaté SANS symbole (quand le code est déjà affiché à côté). */
  amountOnly(amount: string | number, code: string): string;
}

/**
 * Table de devises d'une organisation, et les opérations qui en découlent.
 *
 * `exchange_rate` se lit « unités de devise PRINCIPALE pour 1 unité de
 * celle-ci » ; la principale vaut donc 1. Toute conversion passe par la
 * principale, jamais directement de l'une à l'autre : c'est ce que fait le
 * serveur, et un taux croisé calculé autrement dériverait.
 *
 * Domicile UNIQUE de cette arithmétique. Elle vivait aussi en fermetures dans
 * la page POS du back-office, ce qui faisait deux implémentations d'un calcul
 * de monnaie : elles ne restent pas d'accord, et leur désaccord ne se découvre
 * qu'au comptoir, face à un client qui compte ce qu'on lui rend.
 */
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

  const symbolOf = (code: string): string =>
    find(code)?.currency_symbol ||
    (code === fallback.code ? fallback.symbol || code : code);

  const round = (amount: number, code: string): number => {
    const f = Math.pow(10, decimalsOf(code));
    return Math.round((amount + Number.EPSILON) * f) / f;
  };

  const convert = (amount: number, from: string, to: string): number => {
    if (!amount || from === to) return amount;
    return (amount * rateOf(from)) / rateOf(to);
  };

  // `Intl` est proscrit ici : voir l'en-tête de `intl-fr.ts`. Le rendu est
  // identique, décimales de queue comprises.
  const amountOnly = (amount: string | number, code: string): string => {
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    return formatNumberFr(isNaN(n) ? 0 : n, decimalsOf(code));
  };

  return {
    primary,
    rateOf,
    decimalsOf,
    symbolOf,
    round,
    convert,
    convertMoney: (amount, from, to) => round(convert(amount, from, to), to),
    amountOnly,
    money: (amount, code) => `${amountOnly(amount, code)} ${symbolOf(code)}`,
  };
}

export interface CurrencyFallback {
  code: string;
  symbol?: string;
  decimal_places?: number;
}

export interface MoneyHelpers {
  /** Devises actives de l'organisation, telles que renvoyées par l'API. */
  currencies: OrganizationCurrency[];
  /** Code de la devise principale. */
  primaryCode: string;
  /** Décimales d'affichage d'une devise (CDF = 0, USD = 2). */
  decimalsOf: (code: string) => number;
  /** Symbole d'une devise (repli : le code lui-même). */
  symbolOf: (code: string) => string;
  /** Taux vers la devise principale (toujours > 0). */
  rateOf: (code: string) => number;
  /** Convertit un montant d'une devise à une autre, via la principale. */
  convertAmount: (amount: number, from: string, to: string) => number;
  /** Arrondit au nombre de décimales de la devise. */
  roundMoney: (amount: number, code: string) => number;
  /** Convertit puis arrondit dans la devise cible. */
  convMoney: (amount: number, from: string, to: string) => number;
  /** Montant formaté avec son symbole : « 46 000 FC ». */
  money: (amount: string | number, code: string) => string;
  /** Montant formaté SANS symbole (quand le code est déjà affiché à côté). */
  amountOnly: (amount: string | number, code: string) => string;
  /** Parité lisible entre deux devises : « 1 USD = 2 300 FC ». */
  rateLabel: (from: string, to: string) => string;
}

/**
 * Construit les helpers à partir des devises de l'organisation.
 *
 * `fallback` sert tant que la liste n'est pas chargée, ou pour une devise
 * inconnue (données historiques) : c'est la devise par défaut de l'org exposée
 * par `useCurrency()`.
 */
export function createMoneyHelpers(
  currencies: OrganizationCurrency[],
  fallback: CurrencyInfo
): MoneyHelpers {
  // Délègue à `createCurrencyTable` : ces helpers portaient leur propre copie
  // de l'arithmétique, identique à une virgule près. Deux copies d'un calcul de
  // monnaie ne restent pas d'accord.
  const t = createCurrencyTable(currencies, fallback);

  return {
    currencies,
    primaryCode: t.primary,
    decimalsOf: t.decimalsOf,
    symbolOf: t.symbolOf,
    rateOf: t.rateOf,
    convertAmount: t.convert,
    roundMoney: t.round,
    convMoney: t.convertMoney,
    money: t.money,
    amountOnly: t.amountOnly,
    // Toujours énoncer la parité dans le sens qui donne un nombre lisible.
    // « 1 CDF = 0,000434 $ » s'affichait « 1 CDF = 0 $ » une fois arrondi aux
    // 2 décimales de l'USD : on inverse pour dire « 1 USD = 2 300 FC ».
    rateLabel: (from, to) => {
      const direct = t.rateOf(from) / t.rateOf(to);
      if (direct >= 1) {
        return `1 ${from} = ${t.amountOnly(direct, to)} ${t.symbolOf(to)}`;
      }
      return `1 ${to} = ${t.amountOnly(1 / direct, from)} ${t.symbolOf(from)}`;
    },
  };
}
