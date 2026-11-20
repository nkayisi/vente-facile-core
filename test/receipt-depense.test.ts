/**
 * La demande se remet à la création, le reçu au paiement.
 *
 * Une dépense ne sort de la caisse qu'au paiement : le reçu imprimé à la
 * création justifiait une sortie qui n'avait pas eu lieu.
 */
import { describe, it, expect } from "vitest";
import {
  buildExpenseReceipt,
  buildExpenseRequest,
  DOCUMENT_IDENTITIES,
} from "../src/receipt/index";

const chrome = { org: { name: "Boutique Test" } };

const texte = (blocs: unknown) => JSON.stringify(blocs);

describe("Demande de dépense", () => {
  const blocs = buildExpenseRequest({
    kind: "expense_request",
    chrome,
    number: "DEP-20261120-B3U7-0001",
    date: "20/11/2026 10:00",
    cashierName: "Caissier One",
    category: "Carburant",
    payee: "Station Total",
    amount: 46_000,
    currency: "CDF",
  });

  it("porte le même numéro et le même préfixe que le reçu qui suivra", () => {
    expect(DOCUMENT_IDENTITIES.expense_request.prefix).toBe(DOCUMENT_IDENTITIES.expense.prefix);
    expect(texte(blocs)).toContain("DEP-20261120-B3U7-0001");
  });

  it("dit deux fois qu'elle ne justifie aucune sortie", () => {
    const t = texte(blocs);
    expect(t).toContain("DEMANDE DE DÉPENSE");
    expect(t).toContain("Ne vaut pas justificatif de sortie de caisse");
    expect(t).toContain("Aucun argent n'est encore sorti");
  });

  it("parle d'un montant demandé, jamais décaissé, et nomme le demandeur", () => {
    const t = texte(blocs);
    expect(t).toContain("Montant demandé");
    expect(t).not.toContain("décaissé");
    expect(t).toContain("Demandée par");
    expect(t).not.toContain("REÇU DE DÉPENSE");
  });
});

describe("Reçu de dépense", () => {
  const blocs = buildExpenseReceipt({
    kind: "expense",
    chrome,
    number: "DEP-20261120-B3U7-0001",
    date: "20/11/2026 14:30",
    cashierName: "Gérant Test",
    registerName: "Caisse Principale",
    category: "Carburant",
    payee: "Station Total",
    paymentMethod: "Espèces",
    paymentReference: "TX-42",
    approvedBy: "Propriétaire",
    amount: 46_000,
    currency: "CDF",
  });

  it("dit qui a payé, depuis quelle caisse, et qui a approuvé", () => {
    const t = texte(blocs);
    expect(t).toContain("REÇU DE DÉPENSE");
    expect(t).toContain("Payé par");
    expect(t).toContain("Gérant Test");
    expect(t).toContain("Caisse Principale");
    expect(t).toContain("Réf. paiement");
    expect(t).toContain("TX-42");
    expect(t).toContain("Approuvée par");
    expect(t).toContain("Montant décaissé");
  });
});
