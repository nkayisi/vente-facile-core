/**
 * Types de domaine partagés.
 *
 * Repris tels quels des serializers backend, pour que les deux surfaces
 * décrivent la même chose. Ils sont structurellement identiques aux types
 * déclarés dans `frontend/actions/*.ts`, si bien que le web peut passer ses
 * propres objets à ces fonctions sans conversion.
 */

/** Devise activée par une organisation, avec son taux. */
export interface OrganizationCurrency {
  id: string;
  currency: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  currency_decimal_places: number;
  is_primary: boolean;
  /**
   * Nombre d'unités de la devise PRINCIPALE pour 1 unité de celle-ci.
   * 1 USD = 2800 CDF ⇒ « 2800.000000 ». La principale vaut toujours 1.
   */
  exchange_rate: string;
  is_active: boolean;
  last_rate_update: string;
}

/** Devise par défaut d'une organisation, forme allégée. */
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
}
