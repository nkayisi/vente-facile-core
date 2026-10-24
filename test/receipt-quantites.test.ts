/**
 * La frontière entre le formateur de l'écran et celui du papier.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN FORMATEUR D'ÉCRAN N'ATTEINT JAMAIS UN DOCUMENT.                       │
 * │                                                                          │
 * │ Le noyau groupe les milliers avec une espace fine insécable (U+202F),    │
 * │ que la police helvetica intégrée à jsPDF rend en « / ». C'est pourquoi    │
 * │ deux `formatQuantity` coexistent dans ce paquet, et ce fichier est le     │
 * │ seul garde-fou de leur frontière : avant lui, rien n'empêchait un         │
 * │ libellé d'écran d'arriver sur le ticket que le client emporte.            │
 * │                                                                          │
 * │ Le point décimal est VOLONTAIRE côté papier, et seulement là.             │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
import { describe, it, expect } from "vitest";
import { formatUnitQuantity } from "../src/packaging";
import {
  buildSaleReceipt,
  formatQuantity,
  formatQuantityWithUnit,
  type SaleReceiptData,
} from "../src/receipt/index";

const NNBSP = " ";

describe("Quantité du papier", () => {
  it("écrit un demi avec un point, pas une virgule", () => {
    expect(formatQuantityWithUnit(0.5, "kg")).toBe("0.5 kg");
  });

  it("ne rend jamais « 0 » ni « 1 » pour un demi", () => {
    expect(formatQuantity(0.5)).toBe("0.5");
    expect(formatQuantity(0.3)).toBe("0.3");
  });

  it("absorbe le résidu d'une part vrac dérivée", () => {
    expect(formatQuantityWithUnit(24.3 - 24, "bouteille")).toBe("0.3 bouteille");
  });

  it("accorde l'unité comme l'écran l'accorde", () => {
    expect(formatQuantityWithUnit(2, "PIECE")).toBe("2 PIECES");
    expect(formatQuantityWithUnit(1, "casier")).toBe("1 casier");
  });

  it("NE GROUPE PAS les milliers, là où l'écran le fait", () => {
    // Les deux moitiés du garde-fou, côte à côte : si elles cessaient de
    // différer, c'est que l'un des deux formateurs aurait pris la place de
    // l'autre, et le défaut ne se verrait que sur un rouleau déjà consommé.
    expect(formatUnitQuantity(1500.5, "kg")).toContain(NNBSP);
    expect(formatQuantityWithUnit(1500.5, "kg")).not.toContain(NNBSP);
  });
});

describe("Aucune espace fine insécable dans un ticket", () => {
  const data: SaleReceiptData = {
    kind: "sale",
    chrome: { org: { name: "Boutique Test" } },
    reference: "VT-20261024-0001",
    date: "24/10/2026 10:00",
    currency: "CDF",
    items: [
      {
        name: "Primus 65cl",
        quantity: 2024.3,
        quantityLabel: `${formatQuantityWithUnit(2000, "casier")} + ${formatQuantityWithUnit(24.3 - 24, "bouteille")}`,
        unitPrice: 5000,
        total: 10121500,
      },
      {
        name: "Farine",
        quantity: 0.5,
        quantityLabel: formatQuantityWithUnit(0.5, "kg"),
        unitPrice: 1500,
        total: 750,
      },
    ],
    subtotal: 10122250,
    taxAmount: 0,
    discountAmount: 0,
    total: 10122250,
    payments: [{ method: "Espèces", amount: 10122250 }],
  };

  it("ne laisse entrer aucun U+202F, quantités à sept chiffres comprises", () => {
    // Le document ENTIER, pas seulement sa colonne de quantité : un libellé
    // composé à l'écran et passé en `quantityLabel` est le chemin par lequel
    // le défaut arrivait.
    expect(JSON.stringify(buildSaleReceipt(data))).not.toContain(NNBSP);
  });

  it("imprime bien le demi-kilo, et pas « 0 »", () => {
    const texte = JSON.stringify(buildSaleReceipt(data));
    expect(texte).toContain("0.5 kg");
    expect(texte).toContain("0.3 bouteille");
  });
});
