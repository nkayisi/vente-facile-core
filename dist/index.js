import {
  MAX_QUANTITY,
  MIN_QUANTITY,
  MONEY_EPS,
  NNBSP,
  QUANTITY_DECIMALS,
  QUANTITY_INTEGER_DIGITS,
  availableBase,
  availableSplit,
  createCurrencyTable,
  createMoneyHelpers,
  formatDate,
  formatDateFr,
  formatDateTime,
  formatDateTimeFr,
  formatDecimal,
  formatFixedFr,
  formatNumber,
  formatNumberFr,
  formatPackaged,
  formatPackagedDifference,
  formatPackagedSplit,
  formatPercent,
  formatPrice,
  formatPriceValue,
  formatQuantity,
  formatTimeFr,
  formatUnitQuantity,
  getDefaultCurrency,
  getPackaging,
  monthLong,
  monthShort,
  pos_exports,
  r2,
  remainingChannels,
  roundQuantity,
  setDefaultCurrency,
  splitPackaged,
  toBaseQuantity,
  weekdayLong
} from "./chunk-MR5DB5MD.js";
import {
  SUPPORTED_CURRENCIES,
  getCurrencyByCode,
  getCurrencyName,
  getCurrencySymbol,
  receipt_exports
} from "./chunk-6JKWBBNX.js";
import {
  pluralizeUnit
} from "./chunk-B5W4KJNN.js";
import "./chunk-PZ5AY32C.js";

// src/countries.ts
var SUPPORTED_COUNTRIES = [
  // Afrique centrale
  { value: "RDC", label: "R\xE9publique d\xE9mocratique du Congo", currencies: ["CDF", "USD"] },
  { value: "Cameroun", label: "Cameroun", currencies: ["XAF"] },
  { value: "Congo", label: "R\xE9publique du Congo", currencies: ["XAF"] },
  { value: "Gabon", label: "Gabon", currencies: ["XAF"] },
  { value: "Tchad", label: "Tchad", currencies: ["XAF"] },
  { value: "Centrafrique", label: "R\xE9publique centrafricaine", currencies: ["XAF"] },
  { value: "Guin\xE9e \xE9quatoriale", label: "Guin\xE9e \xE9quatoriale", currencies: ["XAF"] },
  // Afrique de l'Ouest (UEMOA)
  { value: "S\xE9n\xE9gal", label: "S\xE9n\xE9gal", currencies: ["XOF"] },
  { value: "C\xF4te d'Ivoire", label: "C\xF4te d'Ivoire", currencies: ["XOF"] },
  { value: "Mali", label: "Mali", currencies: ["XOF"] },
  { value: "Burkina Faso", label: "Burkina Faso", currencies: ["XOF"] },
  { value: "Niger", label: "Niger", currencies: ["XOF"] },
  { value: "B\xE9nin", label: "B\xE9nin", currencies: ["XOF"] },
  { value: "Togo", label: "Togo", currencies: ["XOF"] },
  { value: "Guin\xE9e-Bissau", label: "Guin\xE9e-Bissau", currencies: ["XOF"] },
  // Reste de l'Afrique
  { value: "Rwanda", label: "Rwanda", currencies: ["RWF"] },
  { value: "Ouganda", label: "Ouganda", currencies: ["UGX"] },
  { value: "Tanzanie", label: "Tanzanie", currencies: ["TZS"] },
  { value: "Kenya", label: "Kenya", currencies: ["KES"] },
  { value: "Nigeria", label: "Nigeria", currencies: ["NGN"] },
  { value: "Ghana", label: "Ghana", currencies: ["GHS"] },
  { value: "Afrique du Sud", label: "Afrique du Sud", currencies: ["ZAR"] },
  { value: "Maroc", label: "Maroc", currencies: ["MAD"] },
  { value: "\xC9gypte", label: "\xC9gypte", currencies: ["EGP"] },
  // Hors d'Afrique
  { value: "France", label: "France", currencies: ["EUR"] },
  { value: "Belgique", label: "Belgique", currencies: ["EUR"] },
  { value: "Luxembourg", label: "Luxembourg", currencies: ["EUR"] },
  { value: "Suisse", label: "Suisse", currencies: ["CHF"] },
  { value: "Royaume-Uni", label: "Royaume-Uni", currencies: ["GBP"] },
  { value: "\xC9tats-Unis", label: "\xC9tats-Unis", currencies: ["USD"] },
  { value: "Canada", label: "Canada", currencies: ["CAD"] },
  { value: "Australie", label: "Australie", currencies: ["AUD"] },
  { value: "Chine", label: "Chine", currencies: ["CNY"] },
  { value: "Japon", label: "Japon", currencies: ["JPY"] },
  { value: "Inde", label: "Inde", currencies: ["INR"] }
];
var DEFAULT_COUNTRY = "RDC";
function defaultCountryForCurrency(code) {
  const upper = code.trim().toUpperCase();
  return SUPPORTED_COUNTRIES.find((c) => c.currencies.includes(upper))?.value ?? DEFAULT_COUNTRY;
}
function getCountryByValue(value) {
  return SUPPORTED_COUNTRIES.find((c) => c.value === value);
}

// src/pricing.ts
function computeMargin(costPrice, sellingPrice) {
  const cost = Number(costPrice ?? 0);
  const selling = Number(sellingPrice ?? 0);
  if (!(selling > 0) || !(cost > 0)) return null;
  const profit = selling - cost;
  return {
    profit,
    rate: profit / selling * 100,
    isNonPositive: profit <= 0
  };
}
function retailEquivalent(packagePrice, factor) {
  const price = Number(packagePrice ?? 0);
  const perPackage = Number(factor ?? 0);
  if (!(price > 0) || perPackage < 2) return null;
  return Math.round(price / perPackage * 100) / 100;
}
function packageEquivalent(unitPrice, factor) {
  const price = Number(unitPrice ?? 0);
  const perPackage = Number(factor ?? 0);
  if (!(price > 0) || perPackage < 2) return null;
  return Math.round(price * perPackage * 100) / 100;
}
function blendedUnitCost({
  packageQuantity,
  packageCost,
  looseQuantity,
  looseCost,
  factor
}) {
  const packages = Number(packageQuantity ?? 0);
  const loose = Number(looseQuantity ?? 0);
  const perPackage = Number(factor ?? 0);
  let packagePrice = Number(packageCost ?? 0) || null;
  let loosePrice = Number(looseCost ?? 0) || null;
  if (packagePrice === null && loosePrice === null) return null;
  if (perPackage < 2) return loosePrice;
  if (packagePrice === null) packagePrice = packageEquivalent(loosePrice, perPackage);
  if (loosePrice === null) loosePrice = retailEquivalent(packagePrice, perPackage);
  const baseQuantity = packages * perPackage + loose;
  if (!(baseQuantity > 0)) return loosePrice;
  const total = packages * (packagePrice ?? 0) + loose * (loosePrice ?? 0);
  return Math.round(total / baseQuantity * 100) / 100;
}

// src/permissions.ts
var ROLE_LABELS = {
  owner: "Administrateur",
  manager: "G\xE9rant",
  stock_keeper: "Magasinier",
  cashier: "Caissier"
};
var ROLE_HIERARCHY = {
  owner: 4,
  manager: 3,
  stock_keeper: 2,
  cashier: 1
};
function hasPermission(userPermissions, permission) {
  if (!userPermissions) return false;
  return userPermissions.permissions.includes(permission);
}
function hasAnyPermission(userPermissions, permissions) {
  if (!userPermissions) return false;
  return permissions.some((p) => userPermissions.permissions.includes(p));
}
function hasAllPermissions(userPermissions, permissions) {
  if (!userPermissions) return false;
  return permissions.every((p) => userPermissions.permissions.includes(p));
}
function isRole(userPermissions, role) {
  if (!userPermissions) return false;
  return userPermissions.role === role;
}
function isAtLeastRole(userPermissions, role) {
  if (!userPermissions) return false;
  return (ROLE_HIERARCHY[userPermissions.role] || 0) >= (ROLE_HIERARCHY[role] || 0);
}
function canManageRole(userPermissions, targetRole) {
  if (!userPermissions) return false;
  return userPermissions.manageable_roles.some((r) => r.value === targetRole);
}

// src/perimetre.ts
var PERMISSION_VOIR_TOUT = "sales.view_all";
function membreDepuisPermissions(p) {
  return {
    role: p?.role ?? null,
    consulteTout: Boolean(p?.consult_all_warehouses),
    voitCollegues: Boolean(p?.permissions?.includes(PERMISSION_VOIR_TOUT)),
    affectes: p?.assigned_warehouses ?? []
  };
}
var actif = (e) => e.is_active !== false;
function litTousLesEntrepots(m) {
  return m.role === "owner" || m.consulteTout;
}
function estBorneParAuteur(m, nature) {
  if (m.role === null || m.role === "owner") return false;
  if (nature === "lecture" && m.consulteTout) return false;
  return !m.voitCollegues;
}
function entrepotsLisibles(m, tous) {
  if (litTousLesEntrepots(m)) return [...tous];
  const permis = new Set(m.affectes.map((e) => e.id));
  return tous.filter((e) => permis.has(e.id));
}
function entrepotsActionnables(m, tous) {
  if (m.role === "owner") return tous.filter(actif);
  const permis = new Set(m.affectes.filter(actif).map((e) => e.id));
  return tous.filter((e) => actif(e) && permis.has(e.id));
}
var LIBELLES_VERROU_PERIMETRE = {
  "propres-donnees": "Vous ne voyez que vos propres donn\xE9es.",
  "un-seul-entrepot": "Vous n'avez acc\xE8s qu'\xE0 un seul entrep\xF4t.",
  "aucun-entrepot": "Aucun entrep\xF4t ne vous est assign\xE9. Demandez-en un au propri\xE9taire.",
  "entrepot-inactif": "Votre entrep\xF4t est d\xE9sactiv\xE9. Demandez au propri\xE9taire de vous en affecter un autre."
};
function verrouEntrepot(m, nombre, nature = "lecture") {
  if (m.role === null || m.role === "owner") return null;
  if (nature === "lecture" && m.consulteTout) return null;
  if (nombre === 0) {
    return nature === "action" && m.affectes.length > 0 ? "entrepot-inactif" : "aucun-entrepot";
  }
  if (nombre === 1) return "un-seul-entrepot";
  return null;
}
function verrouUtilisateur(m, nature = "lecture") {
  return estBorneParAuteur(m, nature) ? "propres-donnees" : null;
}
function choixEntrepotRecevable(choix, permis, ouvertATous) {
  if (!choix) return null;
  if (ouvertATous || permis.has(choix)) return choix;
  return null;
}

// src/due-date.ts
function today() {
  const now = /* @__PURE__ */ new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}
function parseDueDate(dueDate) {
  const [year, month, day] = dueDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}
function isOverdue(dueDate) {
  if (!dueDate) return false;
  const due = parseDueDate(dueDate);
  return due !== null && due < today();
}
function daysLate(dueDate) {
  if (!dueDate) return 0;
  const due = parseDueDate(dueDate);
  if (due === null) return 0;
  return Math.round((today().getTime() - due.getTime()) / 864e5);
}
function dueDateLabel(dueDate) {
  if (!dueDate) return null;
  const late = daysLate(dueDate);
  if (late > 0) return `En retard de ${late} j`;
  if (late === 0) return "\xC9choit aujourd'hui";
  return `\xC9choit dans ${-late} j`;
}
export {
  DEFAULT_COUNTRY,
  LIBELLES_VERROU_PERIMETRE,
  MAX_QUANTITY,
  MIN_QUANTITY,
  MONEY_EPS,
  NNBSP,
  PERMISSION_VOIR_TOUT,
  QUANTITY_DECIMALS,
  QUANTITY_INTEGER_DIGITS,
  ROLE_HIERARCHY,
  ROLE_LABELS,
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
  availableBase,
  availableSplit,
  blendedUnitCost,
  canManageRole,
  choixEntrepotRecevable,
  computeMargin,
  createCurrencyTable,
  createMoneyHelpers,
  daysLate,
  defaultCountryForCurrency,
  dueDateLabel,
  entrepotsActionnables,
  entrepotsLisibles,
  estBorneParAuteur,
  formatDate,
  formatDateFr,
  formatDateTime,
  formatDateTimeFr,
  formatDecimal,
  formatFixedFr,
  formatNumber,
  formatNumberFr,
  formatPackaged,
  formatPackagedDifference,
  formatPackagedSplit,
  formatPercent,
  formatPrice,
  formatPriceValue,
  formatQuantity,
  formatTimeFr,
  formatUnitQuantity,
  getCountryByValue,
  getCurrencyByCode,
  getCurrencyName,
  getCurrencySymbol,
  getDefaultCurrency,
  getPackaging,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isAtLeastRole,
  isOverdue,
  isRole,
  litTousLesEntrepots,
  membreDepuisPermissions,
  monthLong,
  monthShort,
  packageEquivalent,
  pluralizeUnit,
  pos_exports as pos,
  r2,
  receipt_exports as receipt,
  remainingChannels,
  retailEquivalent,
  roundQuantity,
  setDefaultCurrency,
  splitPackaged,
  toBaseQuantity,
  verrouEntrepot,
  verrouUtilisateur,
  weekdayLong
};
//# sourceMappingURL=index.js.map