import {
  __export
} from "./chunk-PZ5AY32C.js";

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
  formatPoints: () => formatPoints,
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
function formatPoints(points) {
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
      value: `+${formatPoints(loyalty.earned)} pts`
    },
    (loyalty.used ?? 0) > 0 && {
      label: "Points utilis\xE9s",
      value: `-${formatPoints(loyalty.used)} pts`
    },
    loyalty.balance !== void 0 && {
      label: "Solde de points",
      value: `${formatPoints(loyalty.balance)} pts`,
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

export {
  SUPPORTED_CURRENCIES,
  getCurrencyByCode,
  getCurrencySymbol,
  getCurrencyName,
  compact,
  FONTS,
  tokensFor,
  leading,
  leadingOf,
  decimalsOf,
  symbolOf,
  formatAmount,
  formatMoney,
  formatBare,
  formatPoints,
  formatQuantity,
  deaccent,
  orgHeaderBlocks,
  footerBlocks,
  DOCUMENT_IDENTITIES,
  DUPLICATE_CHIP,
  buildSaleReceipt,
  buildPaymentReceipt,
  buildCashSessionReceipt,
  buildExpenseReceipt,
  receipt_exports
};
//# sourceMappingURL=chunk-3QGXYJKJ.js.map