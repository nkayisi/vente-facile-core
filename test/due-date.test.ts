/** Une facture est en retard le LENDEMAIN de son échéance, pas le jour même. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { daysLate, dueDateLabel, isOverdue } from "../src/due-date";

const AUJOURDHUI = new Date(2026, 7, 28, 14, 30);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AUJOURDHUI);
});
afterEach(() => vi.useRealTimers());

describe("isOverdue", () => {
  it("n'est pas en retard le jour de l'échéance", () => {
    expect(isOverdue("2026-08-28")).toBe(false);
  });

  it("est en retard le lendemain", () => {
    expect(isOverdue("2026-08-27")).toBe(true);
  });

  it("ne l'est pas avant l'échéance", () => {
    expect(isOverdue("2026-09-30")).toBe(false);
  });

  it("tolère l'absence d'échéance", () => {
    expect(isOverdue(null)).toBe(false);
    expect(isOverdue(undefined)).toBe(false);
    expect(isOverdue("")).toBe(false);
  });
});

describe("daysLate et dueDateLabel", () => {
  it("compte les jours de retard", () => {
    expect(daysLate("2026-08-23")).toBe(5);
    expect(dueDateLabel("2026-08-23")).toBe("En retard de 5 j");
  });

  it("nomme le jour même", () => {
    expect(daysLate("2026-08-28")).toBe(0);
    expect(dueDateLabel("2026-08-28")).toBe("Échoit aujourd'hui");
  });

  it("compte les jours restants", () => {
    expect(daysLate("2026-08-31")).toBe(-3);
    expect(dueDateLabel("2026-08-31")).toBe("Échoit dans 3 j");
  });

  it("interprète la date en heure locale, pas en UTC", () => {
    // Une date nue interprétée en UTC puis affichée en local décalerait d'un
    // jour à l'ouest de Greenwich.
    expect(daysLate("2026-08-28")).toBe(0);
  });
});
