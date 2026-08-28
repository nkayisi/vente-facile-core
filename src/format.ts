/**
 * Utilitaires de formatage pour l'affichage des nombres et prix.
 *
 * **Les montants s'écrivent TOUJOURS en entier.** Pas de « 2,33 M », pas de
 * « 1,2 Md », pas de `notation: "compact"`. La plateforme s'adresse à des
 * commerçants qui ne pratiquent pas forcément cette écriture : un montant
 * abrégé est pour eux un montant qu'ils ne savent pas lire, et un chiffre
 * qu'on ne sait pas lire ne renseigne pas, il inquiète.
 *
 * Quand un montant ne tient pas dans sa carte, c'est la TAILLE DU TEXTE qui
 * cède, jamais le nombre de chiffres (voir `StatValue`).
 *
 * Le rendu passe par `intl-fr.ts` et non par `Intl` : voir l'en-tête de ce
 * module pour le motif (Hermes n'embarque pas l'ICU complète). Le résultat est
 * identique à ce que rendait `Intl.NumberFormat("fr-CD")`.
 */

import {
  formatDateFr,
  formatDateTimeFr,
  formatNumberFr,
} from "./intl-fr";

// Devise par défaut de l'organisation, posée au montage par la surface hôte.
let _defaultSymbol = "FC";
let _defaultDecimals = 0;
let _defaultCode = "CDF";

export function setDefaultCurrency(symbol: string, decimalPlaces: number, code?: string) {
  _defaultSymbol = symbol;
  _defaultDecimals = decimalPlaces;
  if (code) _defaultCode = code;
}

export function getDefaultCurrency() {
  return { symbol: _defaultSymbol, decimal_places: _defaultDecimals, code: _defaultCode };
}

/**
 * Formate un prix avec séparateur de milliers et symbole de devise.
 * Utilise la devise par défaut de l'organisation si aucun paramètre n'est fourni.
 * Affiche les décimales exactes de la valeur stockée (ex: 2.3 → "2,3").
 * Ex: formatPrice(20000) → "20 000 FC"
 * Ex: formatPrice(2.3) → "2,3 FC"
 * Ex: formatPrice(10.50) → "10,5 FC"
 */
export function formatPrice(price: string | number, symbol?: string): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  const sym = symbol || _defaultSymbol;
  if (isNaN(num)) return `0 ${sym}`;
  return `${formatNumberFr(num, 6)} ${sym}`;
}

/**
 * Formate un nombre entier avec séparateur de milliers.
 * Ex: 20000 → "20 000", 1500 → "1 500"
 */
export function formatNumber(num: number | string): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0";
  return formatNumberFr(n, 0);
}

/**
 * Formate un nombre décimal (ex: quantités) avec séparateur de milliers.
 * Ex: 20000.500 → "20 000,5"
 */
export function formatDecimal(num: number | string, decimals: number = 3): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0";
  return formatNumberFr(n, decimals);
}

/**
 * Formate un prix sans le symbole de devise (pour les exports CSV).
 * Affiche les décimales telles quelles sans forcer un nombre fixe.
 * Ex: formatPriceValue(20000.50) → "20000.5"
 */
export function formatPriceValue(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "0";
  return num.toString();
}

/**
 * Formate un pourcentage.
 * Ex: 15.5 → "15,5%"
 */
export function formatPercent(num: number | string): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0%";
  return `${formatNumberFr(n, 2)}%`;
}

/** Formate une date en format court français : « 28 août 2026 ». */
export function formatDate(dateStr: string): string {
  return formatDateFr(new Date(dateStr));
}

/** Formate une date avec heure : « 28 août, 11:30 ». */
export function formatDateTime(dateStr: string): string {
  return formatDateTimeFr(new Date(dateStr));
}

/**
 * Formate un nombre de points de fidélité.
 *
 * Les points sont fractionnaires depuis qu'un barème en pourcentage sur une
 * devise forte peut produire 0,58 point : les tronquer les faisait disparaître.
 * On affiche donc la fraction quand elle existe, et rien de plus quand le
 * compte tombe juste : « 3 pts », jamais « 3,00 pts ».
 *
 * Ex : 3 → "3" ; 0.58 → "0,58" ; 4.5 → "4,5" ; 1234.25 → "1 234,25"
 */
export function formatPoints(points: number | string | null | undefined): string {
  const n = typeof points === "string" ? parseFloat(points) : points ?? 0;
  if (!Number.isFinite(n)) return "0";
  return formatNumberFr(n, 2);
}
