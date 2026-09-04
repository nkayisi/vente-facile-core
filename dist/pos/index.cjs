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
module.exports = __toCommonJS(pos_exports);

// src/intl-fr.ts
var NNBSP = "\u202F";
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
  const decimalsOf = (code) => {
    const c = find(code);
    if (c && c.currency_decimal_places != null) return c.currency_decimal_places;
    return fallback.decimal_places ?? 2;
  };
  const symbolOf = (code) => find(code)?.currency_symbol || (code === fallback.code ? fallback.symbol || code : code);
  const round = (amount, code) => {
    const f = Math.pow(10, decimalsOf(code));
    return Math.round((amount + Number.EPSILON) * f) / f;
  };
  const convert = (amount, from, to) => {
    if (!amount || from === to) return amount;
    return amount * rateOf(from) / rateOf(to);
  };
  const amountOnly = (amount, code) => {
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
    money: (amount, code) => `${amountOnly(amount, code)} ${symbolOf(code)}`
  };
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
function maxGlobalDiscount(lines) {
  let subtotal = 0;
  let itemDiscount = 0;
  for (const line of lines) {
    const gross = lineGross(line);
    subtotal += gross;
    itemDiscount += r2(gross * line.discount_percentage / 100);
  }
  return r2(subtotal - itemDiscount);
}
function basketTotals({ lines, globalDiscountAmount = 0 }) {
  let subtotal = 0;
  let itemDiscount = 0;
  let tax = 0;
  for (const line of lines) {
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
  lines,
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
  for (const line of lines) {
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
  const { globalDiscount } = basketTotals({ lines, globalDiscountAmount });
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

// src/format.ts
var _defaultSymbol = "FC";
function formatPrice(price, symbol) {
  const num5 = typeof price === "string" ? parseFloat(price) : price;
  const sym = symbol || _defaultSymbol;
  if (isNaN(num5)) return `0 ${sym}`;
  return `${formatNumberFr(num5, 6)} ${sym}`;
}

// src/pos/credit.ts
var num2 = (v) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
function evaluateCredit(customer, netTotal, paidInPrimary, formatMoney = (a) => formatPrice(a)) {
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
    reason: notAllowed ? `${customer.name || "Ce client"} n'est pas autoris\xE9 \xE0 acheter \xE0 cr\xE9dit.` : overLimit ? `Limite de cr\xE9dit d\xE9pass\xE9e. Limite : ${formatMoney(creditLimit)}, dette actuelle : ${formatMoney(currentBalance)}, total projet\xE9 : ${formatMoney(projectedBalance)}.` : null
  };
}

// src/pos/payload.ts
var num3 = (v) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
function buildSalePayload(input) {
  const {
    lines,
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
  const items = lines.map((line) => {
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
  const { total, globalDiscount } = basketTotals({ lines, globalDiscountAmount });
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
function ligneDe(lines, productId) {
  return lines.find((l) => l.product.id === productId);
}
function inCart(lines, productId) {
  return ligneDe(lines, productId)?.quantity ?? 0;
}
function addableBase(product, lines) {
  if (!product.track_inventory || product.allow_negative_stock) return null;
  return Math.max(0, num4(product.stock_quantity) - inCart(lines, product.id));
}
function addableChannels(product, lines, options = {}) {
  if (product.stock_loose === null || product.stock_loose === void 0) {
    return { sealed: null, loose: null };
  }
  const stock = {
    sealed: product.stock_packages === null || product.stock_packages === void 0 ? null : num4(product.stock_packages),
    loose: num4(product.stock_loose)
  };
  const factor = packagingFactorOf(product);
  if (options.ignoreCartLine || !factor) return stock;
  const line = ligneDe(lines, product.id);
  if (!line) return stock;
  return remainingChannels(
    stock,
    { packages: line.packageQuantity, loose: looseQuantityOf(line) },
    factor
  );
}
function addableSealed(product, lines, options = {}) {
  if (!product.track_inventory || product.allow_negative_stock) return null;
  return addableChannels(product, lines, options).sealed;
}
function addableLoose(product, lines, options = {}) {
  return addableChannels(product, lines, options).loose;
}
function verifierAjout(product, lines, saisie) {
  const factor = packagingFactorOf(product);
  const packages = factor ? Math.max(0, Math.floor(saisie.packages)) : 0;
  const loose = Math.max(0, Math.floor(saisie.loose));
  const quantity = factor ? packages * factor + loose : loose;
  const nom = product.name || "Cet article";
  const base = { quantity, packageQuantity: packages };
  if (quantity < 1) {
    return { ...base, ok: false, raison: "Indiquez une quantit\xE9." };
  }
  const dejaAuPanier = inCart(lines, product.id);
  const borne = addableBase(product, lines);
  if (borne !== null && quantity > borne) {
    const total = num4(product.stock_quantity);
    return {
      ...base,
      ok: false,
      raison: dejaAuPanier > 0 ? `Stock insuffisant pour ${nom} : ${total} en stock, ${dejaAuPanier} d\xE9j\xE0 au panier.` : `Stock insuffisant pour ${nom} : ${total} en stock.`
    };
  }
  if (packages > 0) {
    const scelles = addableSealed(product, lines);
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
  addableBase,
  addableChannels,
  addableLoose,
  addableSealed,
  basketTotals,
  buildSalePayload,
  createCurrencyTable,
  evaluateCredit,
  inCart,
  lineGross,
  looseQuantityOf,
  loyaltyDiscount,
  maxGlobalDiscount,
  maxLoyaltyAmount,
  maxUsablePoints,
  minPointsToRedeem,
  packagingFactorOf,
  pointValue,
  r2,
  roundPoints,
  tendersIn,
  totalInSaleCurrency,
  verifierAjout
});
//# sourceMappingURL=index.cjs.map