import {
  MONEY_EPS,
  NNBSP,
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
  formatPoints,
  formatPrice,
  formatPriceValue,
  formatTimeFr,
  formatUnitQuantity,
  getDefaultCurrency,
  getPackaging,
  monthLong,
  monthShort,
  pluralizeUnit,
  pos_exports,
  r2,
  remainingChannels,
  setDefaultCurrency,
  splitPackaged,
  toBaseQuantity,
  weekdayLong
} from "./chunk-VFDBNXRO.js";
import {
  SUPPORTED_CURRENCIES,
  getCurrencyByCode,
  getCurrencyName,
  getCurrencySymbol,
  receipt_exports
} from "./chunk-3QGXYJKJ.js";
import "./chunk-PZ5AY32C.js";

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
  MONEY_EPS,
  NNBSP,
  ROLE_HIERARCHY,
  ROLE_LABELS,
  SUPPORTED_CURRENCIES,
  availableBase,
  availableSplit,
  blendedUnitCost,
  canManageRole,
  computeMargin,
  createCurrencyTable,
  createMoneyHelpers,
  daysLate,
  dueDateLabel,
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
  formatPoints,
  formatPrice,
  formatPriceValue,
  formatTimeFr,
  formatUnitQuantity,
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
  monthLong,
  monthShort,
  packageEquivalent,
  pluralizeUnit,
  pos_exports as pos,
  r2,
  receipt_exports as receipt,
  remainingChannels,
  retailEquivalent,
  setDefaultCurrency,
  splitPackaged,
  toBaseQuantity,
  weekdayLong
};
//# sourceMappingURL=index.js.map