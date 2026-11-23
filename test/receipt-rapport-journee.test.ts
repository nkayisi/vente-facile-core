/**
 * Le ticket « rapport de la journée » : une lecture, sans numéro, dont la liste
 * des ventes est bornée.
 */
import { describe, it, expect } from "vitest";
import {
  buildDayReport,
  DOCUMENT_IDENTITIES,
  LIGNES_MAX_RAPPORT,
  type DayReportData,
} from "../src/receipt/index";

const chrome = { org: { name: "Boutique Test" } };

function donnees(p: Partial<DayReportData> = {}): DayReportData {
  return {
    kind: "day_report",
    chrome,
    day: "Lundi 23 novembre 2026",
    closedAt: "14:07",
    scope: "Mes opérations",
    printedBy: "Caissier One",
    currency: "USD",
    sales: { count: 2, total: 1162, onCredit: 12 },
    payments: [{ method: "Espèces", total: 1150 }],
    expenses: { count: 1, total: 7 },
    cash: { cashIn: 1150, cashOut: 7, net: 1143 },
    stock: null,
    lines: [
      { time: "09:12", reference: "VT-20261123-WJFC-0001", amount: 1150, currency: "USD" },
      { time: "10:40", reference: "VT-20261123-WJFC-0002", amount: 27600, currency: "CDF", note: "crédit" },
    ],
    ...p,
  };
}

const texte = (blocs: unknown) => JSON.stringify(blocs);

describe("Rapport de la journée", () => {
  it("porte son bandeau et ne porte AUCUNE ligne de numéro", () => {
    const blocs = buildDayReport(donnees());
    expect(texte(blocs)).toContain("RAPPORT DE LA JOURNÉE");
    expect(DOCUMENT_IDENTITIES.day_report.numberLabel).toBe("");
    expect(texte(blocs)).not.toContain("n°");
  });

  it("dit la journée, l'heure de l'arrêté et la portée", () => {
    const t = texte(buildDayReport(donnees({ scope: "Boutique Nord · toute l'équipe" })));
    expect(t).toContain("Lundi 23 novembre 2026");
    expect(t).toContain("14:07");
    expect(t).toContain("Boutique Nord · toute l'équipe");
  });

  it("chaque vente garde la devise de SA facture", () => {
    const t = texte(buildDayReport(donnees()));
    expect(t).toContain("VT-20261123-WJFC-0002 (crédit)");
    expect(t).toMatch(/27\s?600 FC/);
  });

  it("au-delà de la borne, imprime les plus récentes et renvoie au document A4", () => {
    const lines = Array.from({ length: LIGNES_MAX_RAPPORT + 5 }, (_, i) => ({
      time: "12:00",
      reference: `VT-${String(i + 1).padStart(4, "0")}`,
      amount: 10,
      currency: "USD",
    }));
    const t = texte(buildDayReport(donnees({ lines })));
    expect(t).toContain(`Ventes de la journée (${LIGNES_MAX_RAPPORT + 5})`);
    expect(t).toContain("5 ventes plus anciennes : liste complète dans le document A4.");
    expect(t).not.toContain("VT-0005\"");
    expect(t).toContain("VT-0006");
    expect(t).toContain(`VT-${String(LIGNES_MAX_RAPPORT + 5).padStart(4, "0")}`);
  });

  it("sans droit de lire les ventes, la section n'existe pas", () => {
    const t = texte(buildDayReport(donnees({ lines: null })));
    expect(t).not.toContain("Ventes de la journée");
  });

  it("les mouvements de stock ne paraissent que pour qui peut les lire", () => {
    expect(texte(buildDayReport(donnees()))).not.toContain("Mouvements de stock");
    const t = texte(
      buildDayReport(donnees({ stock: [{ label: "Achat", count: 3 }, { label: "Dommage/Perte", count: 1 }] })),
    );
    expect(t).toContain("Mouvements de stock");
    expect(t).toContain("Dommage/Perte");
  });

  it("une journée vide le dit au lieu de laisser des sections muettes", () => {
    const t = texte(
      buildDayReport(
        donnees({
          sales: { count: 0, total: 0, onCredit: 0 },
          payments: [],
          lines: [],
          stock: [],
        }),
      ),
    );
    expect(t).toContain("Aucun encaissement");
    expect(t).toContain("Aucune vente");
    expect(t).toContain("Aucun mouvement");
    expect(t).not.toContain("dont à crédit");
  });
});
