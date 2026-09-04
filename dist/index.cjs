"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  MONEY_EPS: () => MONEY_EPS,
  NNBSP: () => NNBSP,
  ROLE_HIERARCHY: () => ROLE_HIERARCHY,
  ROLE_LABELS: () => ROLE_LABELS,
  SUPPORTED_CURRENCIES: () => SUPPORTED_CURRENCIES,
  availableBase: () => availableBase,
  availableSplit: () => availableSplit,
  blendedUnitCost: () => blendedUnitCost,
  canManageRole: () => canManageRole,
  computeMargin: () => computeMargin,
  createCurrencyTable: () => createCurrencyTable,
  createMoneyHelpers: () => createMoneyHelpers,
  daysLate: () => daysLate,
  dueDateLabel: () => dueDateLabel,
  formatDate: () => formatDate,
  formatDateFr: () => formatDateFr,
  formatDateTime: () => formatDateTime,
  formatDateTimeFr: () => formatDateTimeFr,
  formatDecimal: () => formatDecimal,
  formatFixedFr: () => formatFixedFr,
  formatNumber: () => formatNumber,
  formatNumberFr: () => formatNumberFr,
  formatPackaged: () => formatPackaged,
  formatPackagedDifference: () => formatPackagedDifference,
  formatPackagedSplit: () => formatPackagedSplit,
  formatPercent: () => formatPercent,
  formatPoints: () => formatPoints,
  formatPrice: () => formatPrice,
  formatPriceValue: () => formatPriceValue,
  formatTimeFr: () => formatTimeFr,
  formatUnitQuantity: () => formatUnitQuantity,
  getCurrencyByCode: () => getCurrencyByCode,
  getCurrencyName: () => getCurrencyName,
  getCurrencySymbol: () => getCurrencySymbol,
  getDefaultCurrency: () => getDefaultCurrency,
  getPackaging: () => getPackaging,
  hasAllPermissions: () => hasAllPermissions,
  hasAnyPermission: () => hasAnyPermission,
  hasPermission: () => hasPermission,
  isAtLeastRole: () => isAtLeastRole,
  isOverdue: () => isOverdue,
  isRole: () => isRole,
  monthLong: () => monthLong,
  monthShort: () => monthShort,
  packageEquivalent: () => packageEquivalent,
  pluralizeUnit: () => pluralizeUnit,
  pos: () => pos_exports,
  r2: () => r2,
  receipt: () => receipt_exports,
  remainingChannels: () => remainingChannels,
  retailEquivalent: () => retailEquivalent,
  setDefaultCurrency: () => setDefaultCurrency,
  splitPackaged: () => splitPackaged,
  toBaseQuantity: () => toBaseQuantity,
  weekdayLong: () => weekdayLong
});
module.exports = __toCommonJS(index_exports);

// src/intl-fr.ts
var NNBSP = "\u202F";
var MONTHS_SHORT = [
  "janv.",
  "f\xE9vr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "ao\xFBt",
  "sept.",
  "oct.",
  "nov.",
  "d\xE9c."
];
var MONTHS_LONG = [
  "janvier",
  "f\xE9vrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "ao\xFBt",
  "septembre",
  "octobre",
  "novembre",
  "d\xE9cembre"
];
var WEEKDAYS_LONG = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi"
];
function monthShort(monthIndex) {
  return MONTHS_SHORT[monthIndex] ?? "";
}
function monthLong(monthIndex) {
  return MONTHS_LONG[monthIndex] ?? "";
}
function weekdayLong(dayIndex) {
  return WEEKDAYS_LONG[dayIndex] ?? "";
}
function groupInteger(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
}
function formatNumberFr(value, maximumFractionDigits) {
  if (!Number.isFinite(value)) return "0";
  const fixed = value.toFixed(Math.max(0, maximumFractionDigits));
  const [whole, fraction = ""] = fixed.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  const head = groupInteger(whole ?? "0");
  return trimmed ? `${head},${trimmed}` : head;
}
function formatFixedFr(value, fractionDigits) {
  if (!Number.isFinite(value)) return formatFixedFr(0, fractionDigits);
  const fixed = value.toFixed(Math.max(0, fractionDigits));
  const [whole, fraction] = fixed.split(".");
  const head = groupInteger(whole ?? "0");
  return fraction ? `${head},${fraction}` : head;
}
function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}
function formatDateFr(date) {
  return `${pad2(date.getDate())} ${monthShort(date.getMonth())} ${date.getFullYear()}`;
}
function formatDateTimeFr(date) {
  const day = `${pad2(date.getDate())} ${monthShort(date.getMonth())}`;
  return `${day}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
function formatTimeFr(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

// src/format.ts
var _defaultSymbol = "FC";
var _defaultDecimals = 0;
var _defaultCode = "CDF";
function setDefaultCurrency(symbol, decimalPlaces, code) {
  _defaultSymbol = symbol;
  _defaultDecimals = decimalPlaces;
  if (code) _defaultCode = code;
}
function getDefaultCurrency() {
  return { symbol: _defaultSymbol, decimal_places: _defaultDecimals, code: _defaultCode };
}
function formatPrice(price, symbol) {
  const num5 = typeof price === "string" ? parseFloat(price) : price;
  const sym = symbol || _defaultSymbol;
  if (isNaN(num5)) return `0 ${sym}`;
  return `${formatNumberFr(num5, 6)} ${sym}`;
}
function formatNumber(num5) {
  const n = typeof num5 === "string" ? parseFloat(num5) : num5;
  if (isNaN(n)) return "0";
  return formatNumberFr(n, 0);
}
function formatDecimal(num5, decimals = 3) {
  const n = typeof num5 === "string" ? parseFloat(num5) : num5;
  if (isNaN(n)) return "0";
  return formatNumberFr(n, decimals);
}
function formatPriceValue(price) {
  const num5 = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num5)) return "0";
  return num5.toString();
}
function formatPercent(num5) {
  const n = typeof num5 === "string" ? parseFloat(num5) : num5;
  if (isNaN(n)) return "0%";
  return `${formatNumberFr(n, 2)}%`;
}
function formatDate(dateStr) {
  return formatDateFr(new Date(dateStr));
}
function formatDateTime(dateStr) {
  return formatDateTimeFr(new Date(dateStr));
}
function formatPoints(points) {
  const n = typeof points === "string" ? parseFloat(points) : points ?? 0;
  if (!Number.isFinite(n)) return "0";
  return formatNumberFr(n, 2);
}

// src/currencies.ts
var SUPPORTED_CURRENCIES = [
  // Afrique
  { code: "CDF", name: "Franc Congolais", symbol: "FC", decimal_places: 0 },
  { code: "XAF", name: "Franc CFA (CEMAC)", symbol: "FCFA", decimal_places: 0 },
  { code: "XOF", name: "Franc CFA (UEMOA)", symbol: "FCFA", decimal_places: 0 },
  { code: "ZAR", name: "Rand Sud-Africain", symbol: "R", decimal_places: 2 },
  { code: "NGN", name: "Naira Nig\xE9rian", symbol: "\u20A6", decimal_places: 2 },
  { code: "KES", name: "Shilling Kenyan", symbol: "KSh", decimal_places: 2 },
  { code: "GHS", name: "Cedi Ghan\xE9en", symbol: "GH\u20B5", decimal_places: 2 },
  { code: "TZS", name: "Shilling Tanzanien", symbol: "TSh", decimal_places: 2 },
  { code: "UGX", name: "Shilling Ougandais", symbol: "USh", decimal_places: 0 },
  { code: "RWF", name: "Franc Rwandais", symbol: "FRw", decimal_places: 0 },
  { code: "MAD", name: "Dirham Marocain", symbol: "DH", decimal_places: 2 },
  { code: "EGP", name: "Livre \xC9gyptienne", symbol: "E\xA3", decimal_places: 2 },
  // Devises internationales majeures
  { code: "USD", name: "Dollar Am\xE9ricain", symbol: "$", decimal_places: 2 },
  { code: "EUR", name: "Euro", symbol: "\u20AC", decimal_places: 2 },
  { code: "GBP", name: "Livre Sterling", symbol: "\xA3", decimal_places: 2 },
  { code: "CHF", name: "Franc Suisse", symbol: "CHF", decimal_places: 2 },
  { code: "CAD", name: "Dollar Canadien", symbol: "C$", decimal_places: 2 },
  { code: "AUD", name: "Dollar Australien", symbol: "A$", decimal_places: 2 },
  { code: "JPY", name: "Yen Japonais", symbol: "\xA5", decimal_places: 0 },
  { code: "CNY", name: "Yuan Chinois", symbol: "\xA5", decimal_places: 2 },
  { code: "INR", name: "Roupie Indienne", symbol: "\u20B9", decimal_places: 2 }
];
function getCurrencyByCode(code) {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code);
}
function getCurrencySymbol(code) {
  const currency = getCurrencyByCode(code);
  return currency?.symbol || code;
}
function getCurrencyName(code) {
  const currency = getCurrencyByCode(code);
  return currency?.name || code;
}

// src/currency.ts
var MONEY_EPS = 1e-6;
function r2(n) {
  return Math.round(n * 100) / 100;
}
function createCurrencyTable(currencies, fallback) {
  const find = (code) => currencies.find((c) => c.currency_code === code);
  const primary = currencies.find((c) => c.is_primary)?.currency_code || fallback.code;
  const rateOf = (code) => {
    const c = find(code);
    const r = c ? Number(c.exchange_rate) : 1;
    return Number.isFinite(r) && r > 0 ? r : 1;
  };
  const decimalsOf2 = (code) => {
    const c = find(code);
    if (c && c.currency_decimal_places != null) return c.currency_decimal_places;
    return fallback.decimal_places ?? 2;
  };
  const symbolOf2 = (code) => find(code)?.currency_symbol || (code === fallback.code ? fallback.symbol || code : code);
  const round = (amount, code) => {
    const f = Math.pow(10, decimalsOf2(code));
    return Math.round((amount + Number.EPSILON) * f) / f;
  };
  const convert = (amount, from, to) => {
    if (!amount || from === to) return amount;
    return amount * rateOf(from) / rateOf(to);
  };
  const amountOnly = (amount, code) => {
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    return formatNumberFr(isNaN(n) ? 0 : n, decimalsOf2(code));
  };
  return {
    primary,
    rateOf,
    decimalsOf: decimalsOf2,
    symbolOf: symbolOf2,
    round,
    convert,
    convertMoney: (amount, from, to) => round(convert(amount, from, to), to),
    amountOnly,
    money: (amount, code) => `${amountOnly(amount, code)} ${symbolOf2(code)}`
  };
}
function createMoneyHelpers(currencies, fallback) {
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
    }
  };
}

// src/units.ts
function pluralizeUnit(word, count) {
  const mot = (word || "").trim();
  if (!mot) return "";
  if (Math.abs(count) < 2) return mot;
  if (/[sxz]$/i.test(mot)) return mot;
  const enCapitales = mot === mot.toUpperCase() && /[A-ZÀ-Ÿ]/.test(mot);
  return `${mot}${enCapitales ? "S" : "s"}`;
}
function formatUnitQuantity(count, word) {
  return `${count} ${pluralizeUnit(word, count)}`.trim();
}

// src/packaging.ts
function getPackaging(product) {
  if (!product) return null;
  const mode = product.selling_mode ?? "retail_only";
  if (mode === "retail_only") return null;
  const factor = product.units_per_package ?? 0;
  if (!factor || factor < 2) return null;
  return {
    factor,
    retailWord: (product.unit_name || "").trim() || "unit\xE9",
    packageWord: (product.packaging_unit_name || "").trim() || "contenant",
    packageOnly: mode === "wholesale_only"
  };
}
function splitPackaged(baseQuantity, looseQuantity, factor) {
  if (!factor || factor < 2) return { packages: 0, loose: baseQuantity };
  const loose = Math.max(0, Math.min(looseQuantity, Math.max(baseQuantity, 0)));
  const sealedBase = baseQuantity - loose;
  if (sealedBase < 0) return { packages: 0, loose: baseQuantity };
  const packages = Math.floor(sealedBase / factor);
  return { packages, loose: loose + (sealedBase - packages * factor) };
}
function formatPackaged(packaging, baseQuantity, looseQuantity = 0) {
  if (!packaging) return String(baseQuantity);
  const { packages, loose } = splitPackaged(baseQuantity, looseQuantity, packaging.factor);
  const parts = [];
  if (packages) {
    parts.push(`${packages} ${pluralizeUnit(packaging.packageWord, packages)}`);
  }
  if (loose || parts.length === 0) {
    parts.push(`${loose} ${pluralizeUnit(packaging.retailWord, loose)}`);
  }
  return parts.join(" + ");
}
function formatPackagedSplit(packaging, packages, loose) {
  if (!packaging) return String(loose);
  const parts = [];
  if (packages) {
    parts.push(`${packages} ${pluralizeUnit(packaging.packageWord, packages)}`);
  }
  if (loose || parts.length === 0) {
    parts.push(`${loose} ${pluralizeUnit(packaging.retailWord, loose)}`);
  }
  return parts.join(" + ");
}
function formatPackagedDifference(packaging, packageDelta, looseDelta) {
  const signed = (value, word) => `${value > 0 ? "+" : ""}${value} ${pluralizeUnit(word, value)}`;
  if (!packaging) return `${looseDelta > 0 ? "+" : ""}${looseDelta}`;
  const parts = [];
  if (packageDelta) parts.push(signed(packageDelta, packaging.packageWord));
  if (looseDelta || parts.length === 0) {
    parts.push(signed(looseDelta, packaging.retailWord));
  }
  return parts.join(", ");
}
function toBaseQuantity(packaging, packages = 0, loose = 0) {
  if (!packaging) return loose;
  return packages * packaging.factor + loose;
}
function remainingChannels(stock, used, factor) {
  if (stock.sealed === null || stock.loose === null || !factor || factor < 2) {
    return { sealed: stock.sealed, loose: stock.loose };
  }
  const sealed = stock.sealed - Math.max(0, used.packages);
  let loose = stock.loose;
  let remainingSealed = sealed;
  const neededLoose = Math.max(0, used.loose);
  if (neededLoose > loose) {
    const toOpen = Math.ceil((neededLoose - loose) / factor);
    remainingSealed -= toOpen;
    loose += toOpen * factor;
  }
  loose -= neededLoose;
  return { sealed: remainingSealed, loose };
}
function availableSplit(stock, factor) {
  const reserved = Math.max(0, stock.reserved_quantity ?? 0);
  const availableBase2 = stock.quantity - reserved;
  if (!factor || factor < 2) return { packages: 0, loose: availableBase2 };
  if (reserved <= 0) {
    return { packages: stock.package_quantity ?? 0, loose: stock.loose_quantity ?? 0 };
  }
  const availableLoose = Math.min(stock.loose_quantity ?? 0, Math.max(availableBase2, 0));
  return splitPackaged(availableBase2, availableLoose, factor);
}
function availableBase(stock) {
  return stock.quantity - Math.max(0, stock.reserved_quantity ?? 0);
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

// src/receipt/index.ts
var receipt_exports = {};
__export(receipt_exports, {
  DOCUMENT_IDENTITIES: () => DOCUMENT_IDENTITIES,
  DUPLICATE_CHIP: () => DUPLICATE_CHIP,
  FONTS: () => FONTS,
  buildCashSessionReceipt: () => buildCashSessionReceipt,
  buildExpenseReceipt: () => buildExpenseReceipt,
  buildPaymentReceipt: () => buildPaymentReceipt,
  buildSaleReceipt: () => buildSaleReceipt,
  compact: () => compact,
  deaccent: () => deaccent,
  decimalsOf: () => decimalsOf,
  footerBlocks: () => footerBlocks,
  formatAmount: () => formatAmount,
  formatBare: () => formatBare,
  formatMoney: () => formatMoney,
  formatPoints: () => formatPoints2,
  formatQuantity: () => formatQuantity,
  leading: () => leading,
  leadingOf: () => leadingOf,
  orgHeaderBlocks: () => orgHeaderBlocks,
  symbolOf: () => symbolOf,
  tokensFor: () => tokensFor
});

// src/receipt/blocks.ts
function compact(items) {
  return items.filter((item) => Boolean(item));
}

// src/receipt/tokens.ts
var FONTS = {
  orgName: { size: 12, bold: true },
  band: { size: 10, bold: true },
  total: { size: 13, bold: true },
  chip: { size: 9, bold: true },
  body: { size: 9, bold: false },
  label: { size: 8, bold: false },
  legal: { size: 7, bold: false }
};
var BASE = {
  margin: 2.5,
  topPadding: 5,
  bottomPadding: 6,
  space: { xs: 1, sm: 2, md: 3, lg: 5 },
  rule: { heavy: 0.4, light: 0.15, hair: 0.08 },
  minGap: 2,
  indent: 2,
  logoMaxHeight: 12
};
function tokensFor(paperWidth) {
  return {
    ...BASE,
    space: { ...BASE.space },
    rule: { ...BASE.rule },
    paperWidth,
    contentWidth: paperWidth - BASE.margin * 2,
    itemCols: paperWidth === 80 ? { name: 0.46, qty: 0.6, unitPrice: 0.78 } : { name: 0.4, qty: 0.45, unitPrice: 0.7 }
  };
}
function leading(size) {
  return Math.round(size * 0.385 * 100) / 100;
}
function leadingOf(role) {
  return leading(FONTS[role].size);
}

// src/receipt/money.ts
function decimalsOf(code, overrides) {
  const override = overrides?.[code]?.decimals;
  if (typeof override === "number") return override;
  return getCurrencyByCode(code)?.decimal_places ?? 2;
}
function symbolOf(code, overrides) {
  return overrides?.[code]?.symbol || getCurrencyByCode(code)?.symbol || code;
}
function formatAmount(amount, decimals) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const safe = Number.isFinite(n) ? n : 0;
  const parts = safe.toFixed(Math.max(0, decimals)).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(".");
}
function formatMoney(amount, code, overrides) {
  return `${formatAmount(amount, decimalsOf(code, overrides))} ${symbolOf(code, overrides)}`;
}
function formatBare(amount, code, overrides) {
  return formatAmount(amount, decimalsOf(code, overrides));
}
function formatPoints2(points) {
  const n = points ?? 0;
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : formatAmount(rounded, 2);
}
function formatQuantity(quantity) {
  const n = typeof quantity === "string" ? parseFloat(quantity) : quantity;
  const safe = Number.isFinite(n) ? n : 0;
  const rounded = Math.round(safe * 1e3) / 1e3;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
function deaccent(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// src/receipt/identity.ts
function lines(value) {
  return (value ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
}
function locality(org) {
  const parts = [org.address, org.city].map((p) => p?.trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : void 0;
}
function legalMentions(org) {
  return [
    org.rccm?.trim() ? `RCCM ${org.rccm.trim()}` : "",
    org.idNat?.trim() ? `ID Nat ${org.idNat.trim()}` : "",
    org.taxId?.trim() ? `NIF ${org.taxId.trim()}` : ""
  ].filter(Boolean);
}
function orgHeaderBlocks(chrome) {
  const { org } = chrome;
  const place = locality(org);
  const legal = legalMentions(org);
  return compact([
    org.logo && {
      kind: "logo",
      dataUrl: org.logo.dataUrl,
      format: org.logo.format,
      aspectRatio: org.logo.aspectRatio
    },
    { kind: "text", text: org.name.toUpperCase(), role: "orgName", align: "center" },
    place && { kind: "text", text: place, role: "label", align: "center" },
    org.phone?.trim() && {
      kind: "text",
      text: `T\xE9l. ${org.phone.trim()}`,
      role: "label",
      align: "center"
    },
    org.email?.trim() && {
      kind: "text",
      text: org.email.trim(),
      role: "legal",
      align: "center"
    },
    ...legal.map(
      (line) => ({ kind: "text", text: line, role: "legal", align: "center" })
    ),
    ...lines(chrome.header).map(
      (line) => ({ kind: "text", text: line, role: "label", align: "center" })
    ),
    { kind: "space", size: "xs" },
    { kind: "rule", weight: "heavy" }
  ]);
}
function footerBlocks(chrome, defaultLines) {
  const custom = lines(chrome.footer);
  const body = custom.length ? custom : defaultLines;
  return compact([
    { kind: "space", size: "sm" },
    ...body.map(
      (line) => ({ kind: "text", text: line, role: "label", align: "center" })
    ),
    { kind: "space", size: "xs" },
    {
      kind: "text",
      text: "Powered by Vente Facile",
      role: "legal",
      align: "center",
      muted: true
    }
  ]);
}

// src/receipt/documents/types.ts
var DOCUMENT_IDENTITIES = {
  sale: { band: "RE\xC7U DE VENTE", prefix: "VT", numberLabel: "Re\xE7u n\xB0" },
  credit_sale: {
    band: "VENTE \xC0 CR\xC9DIT",
    sub: "Facture \xE0 r\xE9gler",
    prefix: "VT",
    numberLabel: "Facture n\xB0"
  },
  proforma: {
    band: "FACTURE PROFORMA",
    sub: "Sans valeur comptable, non fiscale",
    prefix: "PRO",
    numberLabel: "Proforma n\xB0"
  },
  debt_payment: {
    band: "RE\xC7U DE R\xC8GLEMENT",
    prefix: "RGL",
    numberLabel: "Re\xE7u n\xB0"
  },
  advance: { band: "RE\xC7U D'AVANCE", prefix: "AVC", numberLabel: "Re\xE7u n\xB0" },
  adjustment: {
    band: "AJUSTEMENT DE SOLDE",
    prefix: "AJU",
    numberLabel: "Pi\xE8ce n\xB0"
  },
  sale_return: { band: "BON DE RETOUR", prefix: "RET", numberLabel: "Bon n\xB0" },
  cash_session: {
    band: "CL\xD4TURE DE CAISSE (Z)",
    prefix: "CZ",
    numberLabel: "Ticket n\xB0"
  },
  expense: { band: "RE\xC7U DE D\xC9PENSE", prefix: "DEP", numberLabel: "Re\xE7u n\xB0" }
};
var DUPLICATE_CHIP = "DUPLICATA";

// src/receipt/documents/common.ts
function identityBlocks(data) {
  const identity = DOCUMENT_IDENTITIES[data.kind];
  return compact([
    { kind: "space", size: "xs" },
    { kind: "band", text: identity.band, sub: identity.sub },
    data.isDuplicate && { kind: "space", size: "xs" },
    data.isDuplicate && { kind: "chip", text: DUPLICATE_CHIP },
    { kind: "space", size: "sm" }
  ]);
}
function infoBlocks(data, extra = [], cashierLabel = "Servi par") {
  const identity = DOCUMENT_IDENTITIES[data.kind];
  const rows = compact([
    { label: identity.numberLabel, value: data.number, strong: true },
    { label: "Date", value: data.date },
    data.registerName && { label: "Caisse", value: data.registerName },
    data.cashierName && { label: cashierLabel, value: data.cashierName },
    data.customerName && { label: "Client", value: data.customerName },
    data.customerPhone && { label: "T\xE9l.", value: data.customerPhone },
    ...extra
  ]);
  return [
    { kind: "kv", rows, mode: "inline", role: "body" },
    { kind: "space", size: "xs" },
    { kind: "rule", weight: "light" }
  ];
}
function showsLoyalty(loyalty) {
  if (!loyalty?.show) return false;
  return (loyalty.earned ?? 0) > 0 || (loyalty.used ?? 0) > 0 || loyalty.balance !== void 0;
}
function loyaltyBlocks(loyalty) {
  if (!showsLoyalty(loyalty) || !loyalty) return [];
  const rows = compact([
    (loyalty.earned ?? 0) > 0 && {
      label: "Points gagn\xE9s",
      value: `+${formatPoints2(loyalty.earned)} pts`
    },
    (loyalty.used ?? 0) > 0 && {
      label: "Points utilis\xE9s",
      value: `-${formatPoints2(loyalty.used)} pts`
    },
    loyalty.balance !== void 0 && {
      label: "Solde de points",
      value: `${formatPoints2(loyalty.balance)} pts`,
      strong: true
    }
  ]);
  if (!rows.length) return [];
  return [
    { kind: "space", size: "sm" },
    { kind: "rule", weight: "light" },
    { kind: "text", text: "Fid\xE9lit\xE9", role: "label", align: "center" },
    { kind: "space", size: "xs" },
    { kind: "amounts", rows, role: "body" }
  ];
}
function debtBlocks(debt, overrides) {
  if (!debt || debt.before === void 0 || debt.after === void 0) return [];
  const settled = debt.after <= 5e-3;
  const rows = [
    {
      label: "Dette avant",
      value: formatMoney(debt.before, debt.currency, overrides)
    }
  ];
  if (!settled) {
    rows.push({
      label: "Dette restante",
      value: formatMoney(debt.after, debt.currency, overrides),
      strong: true
    });
  }
  return compact([
    { kind: "space", size: "sm" },
    { kind: "rule", weight: "light" },
    { kind: "amounts", rows, role: "body" },
    settled && { kind: "space", size: "sm" },
    // Pastille inversée plutôt qu'un « SOLDÉE » de 9 pt noyé dans une ligne :
    // c'est l'information que le client est venu chercher.
    settled && { kind: "chip", text: "DETTE SOLD\xC9E" }
  ]);
}

// src/receipt/documents/sale.ts
var PROFORMA_FOOTER = [
  "Document sans valeur comptable.",
  "Ne constitue pas une facture.",
  "Stocks non r\xE9serv\xE9s."
];
var SALE_FOOTER = ["Merci pour votre achat !", "\xC0 bient\xF4t."];
var CREDIT_FOOTER = [
  "Merci pour votre achat !",
  "Conservez ce re\xE7u jusqu'au r\xE8glement complet."
];
function splitDiscount(data) {
  const loyalty = Math.max(0, data.loyaltyRedemptionAmount ?? 0);
  return { commercial: Math.max(0, data.discountAmount - loyalty), loyalty };
}
function discountLabel(data) {
  if ((data.globalDiscountAmount ?? 0) > 0) return "Remise";
  if ((data.globalDiscountPercent ?? 0) > 0) {
    return `Remise (${data.globalDiscountPercent} %)`;
  }
  return "Remises";
}
function buildSaleReceipt(data) {
  const money = (amount, currency = data.currency) => formatMoney(amount, currency, data.currencyOverrides);
  const bare = (amount) => formatBare(amount, data.currency, data.currencyOverrides);
  const isProforma = data.kind === "proforma";
  const discounts = splitDiscount(data);
  const items = data.items.map((item) => ({
    name: item.name,
    quantity: formatQuantity(item.quantity),
    unitPrice: bare(item.unitPrice),
    total: bare(item.total),
    quantityLabel: item.quantityLabel,
    discountPercentage: item.discountPercentage
  }));
  const totalRows = compact([
    { label: "Sous-total", value: bare(data.subtotal) },
    discounts.commercial > 0 && {
      label: discountLabel(data),
      value: `-${bare(discounts.commercial)}`
    },
    discounts.loyalty > 0 && {
      label: "R\xE9gl\xE9 en points",
      value: `-${bare(discounts.loyalty)}`
    },
    data.taxAmount > 0 && {
      label: "TVA",
      value: `+${bare(data.taxAmount)}`
    }
  ]);
  const settlementRows = compact([
    ...data.payments.map((p) => ({
      label: p.method,
      value: money(p.amount, p.currency)
    })),
    (data.changeAmount ?? 0) > 0 && {
      label: "Monnaie rendue",
      value: money(data.changeAmount)
    },
    (data.amountDue ?? 0) > 0 && {
      label: "Reste \xE0 payer",
      value: money(data.amountDue),
      strong: true
    }
  ]);
  const extraInfo = compact([
    data.warehouseName && { label: "D\xE9p\xF4t", value: data.warehouseName },
    data.dueDate && { label: "\xC0 r\xE9gler avant le", value: data.dueDate }
  ]);
  return compact([
    ...orgHeaderBlocks(data.chrome),
    ...identityBlocks(data),
    ...infoBlocks(data, extraInfo),
    { kind: "space", size: "sm" },
    { kind: "items", rows: items },
    { kind: "space", size: "xs" },
    { kind: "rule", weight: "light" },
    { kind: "amounts", rows: totalRows, role: "body" },
    { kind: "space", size: "sm" },
    {
      kind: "total",
      label: isProforma ? "Total estimatif" : "Total \xE0 payer",
      value: money(data.total)
    },
    !isProforma && settlementRows.length > 0 && { kind: "space", size: "sm" },
    !isProforma && settlementRows.length > 0 && {
      kind: "amounts",
      rows: settlementRows,
      role: "body"
    },
    ...isProforma ? [] : debtBlocks(data.debt, data.currencyOverrides),
    ...isProforma ? [] : loyaltyBlocks(data.loyalty),
    ...footerBlocks(
      // Une proforma n'est pas un reçu : son pied ne doit pas pouvoir être
      // remplacé par le message de remerciement configuré pour les ventes.
      isProforma ? { org: data.chrome.org } : data.chrome,
      isProforma ? PROFORMA_FOOTER : data.kind === "credit_sale" ? CREDIT_FOOTER : SALE_FOOTER
    )
  ]);
}

// src/receipt/documents/payment.ts
var FOOTER_BY_KIND = {
  debt_payment: ["Merci pour votre r\xE8glement !", "Ce re\xE7u fait foi de paiement."],
  advance: [
    "Merci pour votre versement !",
    "Cette avance sera imput\xE9e sur vos prochains achats."
  ],
  adjustment: ["Pi\xE8ce interne de r\xE9gularisation de compte."]
};
function totalLabel(kind) {
  if (kind === "advance") return "Avance vers\xE9e";
  if (kind === "adjustment") return "Montant ajust\xE9";
  return "Montant r\xE9gl\xE9";
}
function buildPaymentReceipt(data) {
  const money = (amount, currency) => formatMoney(amount, currency, data.currencyOverrides);
  const invoiceRows = data.invoice ? compact([
    { label: "Facture", value: data.invoice.reference, strong: true },
    {
      label: "Montant facture",
      value: money(data.invoice.total, data.invoice.currency)
    },
    {
      label: "D\xE9j\xE0 r\xE9gl\xE9",
      value: money(data.invoice.previouslyPaid, data.invoice.currency)
    },
    {
      label: "Reste \xE0 payer",
      value: money(data.invoice.remaining, data.invoice.currency),
      strong: true
    }
  ]) : [];
  const settlementRows = compact([
    data.paymentMethod && { label: "Mode", value: data.paymentMethod },
    data.paymentReference && { label: "R\xE9f\xE9rence", value: data.paymentReference },
    // Le montant remis n'apparaît que s'il diffère de l'imputation : sinon la
    // même somme s'imprimerait deux fois à deux lignes d'intervalle.
    data.tenderedAmount !== void 0 && data.tenderedCurrency !== void 0 && data.tenderedCurrency !== data.currency && {
      label: "Remis par le client",
      value: money(data.tenderedAmount, data.tenderedCurrency)
    }
  ]);
  return compact([
    ...orgHeaderBlocks(data.chrome),
    ...identityBlocks(data),
    ...infoBlocks(data, [], "Re\xE7u par"),
    invoiceRows.length > 0 && { kind: "space", size: "sm" },
    invoiceRows.length > 0 && {
      kind: "amounts",
      rows: invoiceRows,
      role: "body"
    },
    (data.settledInvoices?.length ?? 0) > 0 && { kind: "space", size: "sm" },
    (data.settledInvoices?.length ?? 0) > 0 && {
      kind: "text",
      text: "Factures sold\xE9es",
      role: "label",
      align: "left"
    },
    ...(data.settledInvoices ?? []).map(
      (reference) => ({
        kind: "text",
        text: reference,
        role: "body",
        align: "left",
        indent: true
      })
    ),
    settlementRows.length > 0 && { kind: "space", size: "sm" },
    settlementRows.length > 0 && {
      kind: "kv",
      rows: settlementRows,
      mode: "inline",
      role: "body"
    },
    { kind: "space", size: "sm" },
    {
      kind: "total",
      label: totalLabel(data.kind),
      value: money(data.amountPaid, data.currency)
    },
    ...debtBlocks(data.debt, data.currencyOverrides),
    ...loyaltyBlocks(data.loyalty),
    data.notes && { kind: "space", size: "sm" },
    data.notes && {
      kind: "text",
      text: data.notes,
      role: "label",
      align: "left",
      italic: true
    },
    ...footerBlocks(data.chrome, FOOTER_BY_KIND[data.kind])
  ]);
}

// src/receipt/documents/cash-session.ts
function buildCashSessionReceipt(data) {
  const money = (amount, currency) => formatMoney(amount, currency, data.currencyOverrides);
  const info = compact([
    data.warehouseName && { label: "D\xE9p\xF4t", value: data.warehouseName },
    { label: "Ouverte le", value: data.openedAt },
    data.openedByName && { label: "Ouverte par", value: data.openedByName },
    { label: "Ferm\xE9e le", value: data.closedAt },
    data.closedByName && { label: "Ferm\xE9e par", value: data.closedByName }
  ]);
  const currencyBlocks = data.balances.flatMap((line) => {
    const rows = compact([
      { label: "Fond d'ouverture", value: money(line.opening, line.currency) },
      { label: "Attendu en caisse", value: money(line.expected, line.currency) },
      line.counted !== null && {
        label: "Compt\xE9",
        value: money(line.counted, line.currency)
      },
      // Un écart nul ne mérite pas une ligne « Excédent 0,00 » : on le dit en
      // clair, c'est justement la bonne nouvelle que le responsable cherche.
      line.difference !== null && Math.abs(line.difference) > 5e-3 && {
        label: line.difference < 0 ? "Manquant" : "Exc\xE9dent",
        value: money(Math.abs(line.difference), line.currency),
        strong: true
      },
      line.difference !== null && Math.abs(line.difference) <= 5e-3 && {
        label: "\xC9cart",
        value: "aucun"
      }
    ]);
    return [
      { kind: "space", size: "sm" },
      { kind: "text", text: line.currency, role: "chip", align: "left" },
      { kind: "amounts", rows, role: "body" }
    ];
  });
  return compact([
    ...orgHeaderBlocks(data.chrome),
    ...identityBlocks(data),
    ...infoBlocks(data, info),
    { kind: "space", size: "sm" },
    {
      kind: "amounts",
      rows: [{ label: "Ventes de la session", value: String(data.salesCount) }],
      role: "body"
    },
    data.paymentsSummary.length > 0 && { kind: "space", size: "sm" },
    data.paymentsSummary.length > 0 && {
      kind: "text",
      text: "Encaissements par moyen",
      role: "label",
      align: "left"
    },
    data.paymentsSummary.length > 0 && {
      kind: "amounts",
      rows: data.paymentsSummary.map((p) => ({
        label: p.method,
        value: p.total
      })),
      role: "body"
    },
    { kind: "space", size: "sm" },
    { kind: "rule", weight: "light" },
    { kind: "text", text: "Soldes par devise", role: "label", align: "left" },
    ...currencyBlocks,
    { kind: "space", size: "lg" },
    { kind: "rule", weight: "hair" },
    { kind: "text", text: "Caissier", role: "legal", align: "left" },
    { kind: "space", size: "lg" },
    { kind: "rule", weight: "hair" },
    { kind: "text", text: "Responsable", role: "legal", align: "left" },
    ...footerBlocks({ org: data.chrome.org }, [
      "Ticket de contr\xF4le de caisse.",
      "\xC0 conserver avec le fond remis."
    ])
  ]);
}
function buildExpenseReceipt(data) {
  const info = compact([
    data.category && { label: "Cat\xE9gorie", value: data.category },
    data.payee && { label: "B\xE9n\xE9ficiaire", value: data.payee },
    data.paymentMethod && { label: "Mode", value: data.paymentMethod }
  ]);
  return compact([
    ...orgHeaderBlocks(data.chrome),
    ...identityBlocks(data),
    ...infoBlocks(data, info, "Pay\xE9 par"),
    data.description && { kind: "space", size: "sm" },
    data.description && {
      kind: "text",
      text: data.description,
      role: "body",
      align: "left"
    },
    { kind: "space", size: "sm" },
    {
      kind: "total",
      label: "Montant d\xE9caiss\xE9",
      value: formatMoney(data.amount, data.currency, data.currencyOverrides)
    },
    { kind: "space", size: "lg" },
    { kind: "rule", weight: "hair" },
    { kind: "text", text: "B\xE9n\xE9ficiaire", role: "legal", align: "left" },
    ...footerBlocks({ org: data.chrome.org }, [
      "Pi\xE8ce justificative de sortie de caisse."
    ])
  ]);
}

// src/pos/index.ts
var pos_exports = {};
__export(pos_exports, {
  MONEY_EPS: () => MONEY_EPS,
  addableBase: () => addableBase,
  addableChannels: () => addableChannels,
  addableLoose: () => addableLoose,
  addableSealed: () => addableSealed,
  basketTotals: () => basketTotals,
  buildSalePayload: () => buildSalePayload,
  createCurrencyTable: () => createCurrencyTable,
  evaluateCredit: () => evaluateCredit,
  inCart: () => inCart,
  lineGross: () => lineGross,
  looseQuantityOf: () => looseQuantityOf,
  loyaltyDiscount: () => loyaltyDiscount,
  maxGlobalDiscount: () => maxGlobalDiscount,
  maxLoyaltyAmount: () => maxLoyaltyAmount,
  maxUsablePoints: () => maxUsablePoints,
  minPointsToRedeem: () => minPointsToRedeem,
  packagingFactorOf: () => packagingFactorOf,
  pointValue: () => pointValue,
  r2: () => r2,
  roundPoints: () => roundPoints,
  tendersIn: () => tendersIn,
  totalInSaleCurrency: () => totalInSaleCurrency,
  verifierAjout: () => verifierAjout
});

// src/pos/basket.ts
function packagingFactorOf(product) {
  return getPackaging(product)?.factor ?? null;
}
function looseQuantityOf(line) {
  const factor = packagingFactorOf(line.product);
  if (!factor || !line.packageQuantity) return line.quantity;
  return line.quantity - line.packageQuantity * factor;
}
var num = (v) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
function lineGross(line) {
  const factor = packagingFactorOf(line.product);
  if (!factor || line.packageQuantity <= 0) {
    return r2(line.quantity * line.unit_price);
  }
  return r2(
    line.packageQuantity * num(line.product.wholesale_price) + looseQuantityOf(line) * line.unit_price
  );
}
function maxGlobalDiscount(lines2) {
  let subtotal = 0;
  let itemDiscount = 0;
  for (const line of lines2) {
    const gross = lineGross(line);
    subtotal += gross;
    itemDiscount += r2(gross * line.discount_percentage / 100);
  }
  return r2(subtotal - itemDiscount);
}
function basketTotals({ lines: lines2, globalDiscountAmount = 0 }) {
  let subtotal = 0;
  let itemDiscount = 0;
  let tax = 0;
  for (const line of lines2) {
    const gross = lineGross(line);
    const discount = r2(gross * line.discount_percentage / 100);
    subtotal += gross;
    itemDiscount += discount;
    if (line.product.is_taxable) {
      tax += r2(r2(gross - discount) * num(line.product.tax_rate) / 100);
    }
  }
  const globalDiscount = r2(Math.min(globalDiscountAmount, r2(subtotal - itemDiscount)));
  return {
    subtotal,
    itemDiscount,
    globalDiscount,
    tax,
    total: r2(subtotal - itemDiscount - globalDiscount + tax)
  };
}
function totalInSaleCurrency({
  lines: lines2,
  currencies,
  invoiceCurrency,
  globalDiscountAmount = 0,
  loyaltyDiscount: loyaltyDiscount2 = 0
}) {
  const cur = invoiceCurrency || currencies.primary;
  const primary = currencies.primary;
  let subtotal = 0;
  let itemDiscount = 0;
  let tax = 0;
  for (const line of lines2) {
    const unit = currencies.convertMoney(line.unit_price, primary, cur);
    const factor = packagingFactorOf(line.product);
    const gross = factor && line.packageQuantity > 0 ? currencies.round(
      line.packageQuantity * currencies.convertMoney(num(line.product.wholesale_price), primary, cur) + looseQuantityOf(line) * unit,
      cur
    ) : currencies.round(line.quantity * unit, cur);
    const discount = currencies.round(gross * line.discount_percentage / 100, cur);
    subtotal += gross;
    itemDiscount += discount;
    if (line.product.is_taxable) {
      tax += currencies.round((gross - discount) * num(line.product.tax_rate) / 100, cur);
    }
  }
  const { globalDiscount } = basketTotals({ lines: lines2, globalDiscountAmount });
  const globalDisc = currencies.convertMoney(globalDiscount, primary, cur);
  const loyaltyDisc = currencies.convertMoney(loyaltyDiscount2, primary, cur);
  return currencies.round(subtotal - itemDiscount - globalDisc - loyaltyDisc + tax, cur);
}
function tendersIn(tenders, currencies, target) {
  return currencies.round(
    tenders.reduce((s, t) => s + currencies.convert(num(t.amount), t.currency, target), 0),
    target
  );
}

// src/pos/loyalty.ts
function roundPoints(value) {
  return Math.floor(value * 100) / 100;
}
function pointValue(program) {
  const v = program?.point_value != null ? Number(program.point_value) : 1;
  return Number.isFinite(v) && v > 0 ? v : 1;
}
function minPointsToRedeem(program) {
  return program?.min_points_to_redeem ?? 100;
}
function maxLoyaltyAmount(grossTotal, program) {
  const ceiling = Number(program?.max_redemption_percent_ceiling);
  const safeCeiling = Number.isFinite(ceiling) && ceiling > 0 ? ceiling : 70;
  const pct = Number(program?.max_redemption_percent);
  const safePct = Number.isFinite(pct) && pct > 0 ? Math.min(pct, safeCeiling) : safeCeiling;
  return r2(grossTotal * safePct / 100);
}
function maxUsablePoints(grossTotal, pointsBalance, program) {
  return Math.min(
    pointsBalance,
    roundPoints(maxLoyaltyAmount(grossTotal, program) / pointValue(program))
  );
}
function loyaltyDiscount(grossTotal, pointsToUse, program) {
  if (!program?.is_active || pointsToUse <= 0) return 0;
  if (pointsToUse < minPointsToRedeem(program)) return 0;
  return r2(Math.min(pointsToUse * pointValue(program), maxLoyaltyAmount(grossTotal, program)));
}

// src/pos/credit.ts
var num2 = (v) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
function evaluateCredit(customer, netTotal, paidInPrimary, formatMoney2 = (a) => formatPrice(a)) {
  if (!customer) return null;
  const creditLimit = num2(customer.credit_limit);
  const currentBalance = num2(customer.current_balance);
  const creditInPrimary = Math.max(0, netTotal - paidInPrimary);
  const projectedBalance = currentBalance + creditInPrimary;
  const notAllowed = customer.allow_credit === false;
  const overLimit = creditLimit > 0 && projectedBalance > creditLimit;
  return {
    creditLimit,
    currentBalance,
    creditInPrimary,
    projectedBalance,
    notAllowed,
    overLimit,
    blocked: notAllowed || overLimit,
    reason: notAllowed ? `${customer.name || "Ce client"} n'est pas autoris\xE9 \xE0 acheter \xE0 cr\xE9dit.` : overLimit ? `Limite de cr\xE9dit d\xE9pass\xE9e. Limite : ${formatMoney2(creditLimit)}, dette actuelle : ${formatMoney2(currentBalance)}, total projet\xE9 : ${formatMoney2(projectedBalance)}.` : null
  };
}

// src/pos/payload.ts
var num3 = (v) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
function buildSalePayload(input) {
  const {
    lines: lines2,
    currencies,
    invoiceCurrency,
    changeCurrency,
    globalDiscountAmount = 0,
    tenders,
    register,
    warehouse,
    customer,
    isCredit = false,
    dueDate,
    loyaltyProgram,
    pointsToUse = 0,
    isPos = true
  } = input;
  const primary = currencies.primary;
  const cur = invoiceCurrency;
  const items = lines2.map((line) => {
    const base = {
      product: line.product.id,
      unit_price: currencies.convertMoney(line.unit_price, primary, cur),
      discount_percentage: r2(line.discount_percentage)
    };
    if (packagingFactorOf(line.product)) {
      return {
        ...base,
        package_quantity: line.packageQuantity,
        loose_quantity: looseQuantityOf(line),
        package_unit_price: currencies.convertMoney(
          num3(line.product.wholesale_price),
          primary,
          cur
        )
      };
    }
    return { ...base, quantity: line.quantity };
  });
  const payments = tenders.filter((t) => num3(t.amount) > 0 && t.method).map((t) => ({
    payment_method: t.method,
    tendered_amount: currencies.round(num3(t.amount), t.currency),
    currency: t.currency,
    // Taux : devise de la vente pour 1 unité de la devise du règlement.
    ...t.currency === cur ? {} : { exchange_rate: currencies.rateOf(t.currency) / currencies.rateOf(cur) },
    ...t.reference ? { reference: t.reference } : {}
  }));
  const { total, globalDiscount } = basketTotals({ lines: lines2, globalDiscountAmount });
  const discount = loyaltyDiscount(total, pointsToUse, loyaltyProgram);
  return {
    register,
    ...warehouse ? { warehouse } : {},
    ...customer ? { customer } : {},
    sale_type: isCredit ? "credit" : "retail",
    ...isCredit && dueDate ? { due_date: dueDate } : {},
    global_discount_amount: currencies.convertMoney(globalDiscount, primary, cur),
    discount_percentage: 0,
    currency: cur,
    exchange_rate: currencies.rateOf(cur),
    change_currency: changeCurrency || cur,
    is_pos: isPos,
    items,
    payments,
    // Points utilisés. Le serveur plafonne et convertit lui-même. On n'envoie
    // rien quand l'écran n'annonce aucune remise (saisie sous le minimum du
    // programme) : le corps doit dire exactement ce que le caissier a vu.
    ...discount > 0 ? { points_used: pointsToUse } : {}
  };
}

// src/pos/stock.ts
var num4 = (v) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
function ligneDe(lines2, productId) {
  return lines2.find((l) => l.product.id === productId);
}
function inCart(lines2, productId) {
  return ligneDe(lines2, productId)?.quantity ?? 0;
}
function addableBase(product, lines2) {
  if (!product.track_inventory || product.allow_negative_stock) return null;
  return Math.max(0, num4(product.stock_quantity) - inCart(lines2, product.id));
}
function addableChannels(product, lines2, options = {}) {
  if (product.stock_loose === null || product.stock_loose === void 0) {
    return { sealed: null, loose: null };
  }
  const stock = {
    sealed: product.stock_packages === null || product.stock_packages === void 0 ? null : num4(product.stock_packages),
    loose: num4(product.stock_loose)
  };
  const factor = packagingFactorOf(product);
  if (options.ignoreCartLine || !factor) return stock;
  const line = ligneDe(lines2, product.id);
  if (!line) return stock;
  return remainingChannels(
    stock,
    { packages: line.packageQuantity, loose: looseQuantityOf(line) },
    factor
  );
}
function addableSealed(product, lines2, options = {}) {
  if (!product.track_inventory || product.allow_negative_stock) return null;
  return addableChannels(product, lines2, options).sealed;
}
function addableLoose(product, lines2, options = {}) {
  return addableChannels(product, lines2, options).loose;
}
function verifierAjout(product, lines2, saisie) {
  const factor = packagingFactorOf(product);
  const packages = factor ? Math.max(0, Math.floor(saisie.packages)) : 0;
  const loose = Math.max(0, Math.floor(saisie.loose));
  const quantity = factor ? packages * factor + loose : loose;
  const nom = product.name || "Cet article";
  const base = { quantity, packageQuantity: packages };
  if (quantity < 1) {
    return { ...base, ok: false, raison: "Indiquez une quantit\xE9." };
  }
  const dejaAuPanier = inCart(lines2, product.id);
  const borne = addableBase(product, lines2);
  if (borne !== null && quantity > borne) {
    const total = num4(product.stock_quantity);
    return {
      ...base,
      ok: false,
      raison: dejaAuPanier > 0 ? `Stock insuffisant pour ${nom} : ${total} en stock, ${dejaAuPanier} d\xE9j\xE0 au panier.` : `Stock insuffisant pour ${nom} : ${total} en stock.`
    };
  }
  if (packages > 0) {
    const scelles = addableSealed(product, lines2);
    if (scelles !== null && packages > scelles) {
      const mot = product.packaging_unit_name?.trim() || "contenant";
      return {
        ...base,
        ok: false,
        raison: `Il ne reste que ${scelles} ${mot}${scelles > 1 ? "s" : ""} en scell\xE9 pour ${nom}.`
      };
    }
  }
  return { ...base, ok: true, raison: null };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  pos,
  r2,
  receipt,
  remainingChannels,
  retailEquivalent,
  setDefaultCurrency,
  splitPackaged,
  toBaseQuantity,
  weekdayLong
});
//# sourceMappingURL=index.cjs.map