/**
 * Formatage français, sans `Intl`.
 *
 * Motif : Hermes, le moteur JavaScript de React Native, n'embarque pas l'ICU
 * complète. `Intl.NumberFormat("fr-CD")` et `toLocaleDateString("fr-CD")` y
 * rendent selon la plateforme, la version d'OS et l'option `jsEngine` : le même
 * montant peut sortir « 1 234,5 » sur un appareil et « 1,234.5 » sur un autre,
 * et un mois court peut revenir en anglais. Sur une application qui imprime des
 * reçus, c'est inacceptable.
 *
 * Ces fonctions reproduisent EXACTEMENT ce que rend `Intl` en `fr-CD` sur un
 * navigateur à ICU complète, relevé et figé ici :
 *   - séparateur de milliers : espace fine insécable U+202F ;
 *   - séparateur décimal : virgule ;
 *   - mois courts : « janv. », « févr. », « août », « déc. » ;
 *   - zéros décimaux de queue supprimés (`maximumFractionDigits` sans minimum).
 *
 * La bascule du web sur ce module est donc à rendu constant.
 *
 * À ne pas confondre avec `receipt/money.ts`, qui groupe avec une espace
 * ORDINAIRE et sépare les décimales par un POINT. Cette divergence est
 * volontaire et documentée : la police Helvetica intégrée à jsPDF rend U+202F
 * en « / ». Les deux conventions coexistent donc, l'une à l'écran, l'autre sur
 * le papier. Les unifier est un changement de rendu, pas un nettoyage.
 */

/** Espace fine insécable, séparateur de milliers du français. */
export const NNBSP = " ";

const MONTHS_SHORT = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
] as const;

const MONTHS_LONG = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
] as const;

const WEEKDAYS_LONG = [
  "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi",
] as const;

export function monthShort(monthIndex: number): string {
  return MONTHS_SHORT[monthIndex] ?? "";
}

export function monthLong(monthIndex: number): string {
  return MONTHS_LONG[monthIndex] ?? "";
}

export function weekdayLong(dayIndex: number): string {
  return WEEKDAYS_LONG[dayIndex] ?? "";
}

/** Groupe la partie entière par milliers. Le signe reste collé au premier chiffre. */
function groupInteger(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}

/**
 * Nombre à la française, décimales de queue supprimées.
 *
 * Équivalent de `Intl.NumberFormat("fr-CD", { minimumFractionDigits: 0,
 * maximumFractionDigits })`. `formatFixed` sert quand le nombre de décimales
 * doit être tenu quoi qu'il arrive (colonnes de montants alignées).
 */
export function formatNumberFr(value: number, maximumFractionDigits: number): string {
  if (!Number.isFinite(value)) return "0";

  const fixed = value.toFixed(Math.max(0, maximumFractionDigits));
  const [whole, fraction = ""] = fixed.split(".");
  const trimmed = fraction.replace(/0+$/, "");

  const head = groupInteger(whole ?? "0");
  return trimmed ? `${head},${trimmed}` : head;
}

/** Nombre à la française avec un nombre de décimales imposé. */
export function formatFixedFr(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) return formatFixedFr(0, fractionDigits);

  const fixed = value.toFixed(Math.max(0, fractionDigits));
  const [whole, fraction] = fixed.split(".");
  const head = groupInteger(whole ?? "0");
  return fraction ? `${head},${fraction}` : head;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** « 28 août 2026 », en heure locale de l'appareil. */
export function formatDateFr(date: Date): string {
  return `${pad2(date.getDate())} ${monthShort(date.getMonth())} ${date.getFullYear()}`;
}

/** « 28 août, 11:30 », en heure locale de l'appareil. */
export function formatDateTimeFr(date: Date): string {
  const day = `${pad2(date.getDate())} ${monthShort(date.getMonth())}`;
  return `${day}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** « 11:30 ». */
export function formatTimeFr(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
