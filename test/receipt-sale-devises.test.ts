/**
 * Le ticket d'une vente annoncée dans deux monnaies.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ C'EST LE PAPIER QUE LE CLIENT EMPORTE.                                   │
 * │                                                                          │
 * │ `bare()` codait la devise sur `data.currency` pour TOUTES les lignes :   │
 * │ une vente annoncée en deux monnaies sortait avec le symbole de la        │
 * │ facture sur chaque prix, et le client lisait des francs là où on lui     │
 * │ avait dit des dollars. `SaleReceiptPayment` portait pourtant déjà sa      │
 * │ devise ; la ligne d'ARTICLE, non.                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
import { describe, it, expect } from "vitest";
import { buildSaleReceipt, type SaleReceiptData } from "../src/receipt/index";

const chrome = { org: { name: "Boutique Test" } };

const base: SaleReceiptData = {
  kind: "sale",
  chrome,
  reference: "VT-1",
  date: "21/10/2026 10:00",
  currency: "CDF",
  items: [],
  subtotal: 0, taxAmount: 0, discountAmount: 0, total: 0,
  payments: [],
};

/** Tout le texte du document, pour chercher ce qui s'imprime vraiment. */
function texte(blocks: ReturnType<typeof buildSaleReceipt>): string {
  return JSON.stringify(blocks);
}

describe("Ticket mono-devise : rien ne change", () => {
  const mono = buildSaleReceipt({
    ...base,
    items: [{ name: "Farine", quantity: 2, unitPrice: 1500, total: 3000 }],
    subtotal: 3000, total: 3000,
  });

  it("n'imprime aucun bloc de ventilation", () => {
    expect(texte(mono)).not.toContain("Annoncé au client");
  });

  it("n'accole aucun code de devise au prix", () => {
    const items = mono.find((b) => b.kind === "items") as { rows: { total: string }[] };
    expect(items.rows[0].total).not.toContain("CDF");
  });
});

describe("Ticket d'une vente annoncée en deux monnaies", () => {
  const mixte = buildSaleReceipt({
    ...base,
    items: [
      { name: "Farine", quantity: 2, unitPrice: 1500, total: 3000 },
      { name: "Savon", quantity: 3, unitPrice: 2, total: 6, currency: "USD" },
    ],
    currencyTotals: [
      { currency: "CDF", total: 3000 },
      { currency: "USD", total: 6 },
    ],
    subtotal: 19800, total: 19800,
  });

  it("imprime les sous-totaux par devise", () => {
    expect(texte(mixte)).toContain("Annoncé au client");
  });

  /**
   * ⚠ LE TOTAL RESTE CELUI DE LA FACTURE. Les sous-totaux ne s'additionnent
   * pas : 3 000 + 6 ne fait pas 19 800, et c'est précisément pourquoi les
   * deux chiffres coexistent.
   */
  it("garde UN total à payer, celui de la facture", () => {
    const totaux = mixte.filter((b) => b.kind === "total");
    expect(totaux).toHaveLength(1);
    expect(JSON.stringify(totaux[0])).toContain("19");
  });

  it("accole le code à la ligne qui sort de la facture", () => {
    const items = mixte.find((b) => b.kind === "items") as { rows: { total: string }[] };
    expect(items.rows[1].total).toContain("USD");
  });

  it("laisse nue la ligne qui suit la facture", () => {
    const items = mixte.find((b) => b.kind === "items") as { rows: { total: string }[] };
    expect(items.rows[0].total).not.toContain("CDF");
  });

  /**
   * Le CDF n'a pas de décimale, l'USD en a deux : le ticket doit respecter
   * chacune, sous peine de réclamer « 3 000.00 FC » pour 3 000 FC.
   *
   * ⚠ LE SÉPARATEUR EST UN POINT, et c'est voulu. Divergence assumée avec
   * l'écran, documentée dans `receipt/money.ts` : la Helvetica de jsPDF rend
   * l'espace fine insécable en « / ». Un test qui exigerait la virgule
   * casserait le papier pour faire plaisir à l'écran.
   */
  it("respecte les décimales de chaque devise", () => {
    const t = texte(mixte);
    expect(t).toContain("6.00");
    expect(t).not.toContain("3 000.00");
  });
});

describe("Une seule devise annoncée n'imprime rien de plus", () => {
  it("ne ventile pas quand il n'y a qu'une entrée", () => {
    const un = buildSaleReceipt({
      ...base,
      items: [{ name: "Farine", quantity: 1, unitPrice: 1500, total: 1500 }],
      currencyTotals: [{ currency: "CDF", total: 1500 }],
      subtotal: 1500, total: 1500,
    });
    expect(texte(un)).not.toContain("Annoncé au client");
  });
});
