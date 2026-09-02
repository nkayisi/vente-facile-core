/**
 * Les bornes des rapports, contre celles du serveur.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CE QUE CES TESTS DÉFENDENT : « AUCUNE DONNÉE » SUR LES HUIT ONGLETS.    │
 * │                                                                          │
 * │ Le défaut du serveur était `month`, CALENDAIRE : le 2 septembre 2026, la │
 * │ fenêtre couvrait DEUX JOURS. Mesuré en base : 0 vente, contre 18 sur     │
 * │ trente jours glissants. Le terminal, qui n'envoyait aucune date, y       │
 * │ tombait toujours - et le défaut revenait les premiers jours de chaque    │
 * │ mois.                                                                    │
 * │                                                                          │
 * │ Les bornes sont désormais calculées ICI et envoyées explicitement. Elles │
 * │ doivent donc valoir celles de `_parse_date_range` au jour près, sinon    │
 * │ les deux surfaces montrent deux chiffres pour le même établissement.     │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
import { describe, expect, it } from "vitest";

import { bornesRapport, libellePeriode, PERIODES_RAPPORT } from "../src/report/periodes";

/** Mercredi 2 septembre 2026. */
const REF = new Date(2026, 8, 2);

describe("les fenêtres glissantes", () => {
  it("le défaut couvre trente jours, aujourd'hui inclus", () => {
    expect(bornesRapport("last_30_days", undefined, REF)).toEqual({
      debut: "2026-08-04",
      fin: "2026-09-02",
    });
  });

  it("sept jours en compte SEPT, pas huit", () => {
    // Huit fausserait la comparaison à la période précédente, qui a la même
    // longueur : deux fenêtres inégales inventent une variation.
    expect(bornesRapport("last_7_days", undefined, REF)).toEqual({
      debut: "2026-08-27",
      fin: "2026-09-02",
    });
  });

  it("douze mois part du PREMIER d'un mois", () => {
    // Le graphique groupe par mois : une fenêtre à cheval rendrait treize
    // seaux dont deux partiels, avec deux étiquettes « sept. » sur le même axe.
    expect(bornesRapport("last_12_months", undefined, REF).debut).toBe("2025-10-01");
  });

  it("elles s'emboîtent, quel que soit le quantième", () => {
    // C'est ce que le calendaire ne garantit pas, et c'est tout le défaut : un
    // marchand qui voit « 30 jours » rendre MOINS que « 7 jours » conclut à
    // une panne.
    for (const j of [
      new Date(2026, 8, 1),
      new Date(2026, 8, 2),
      new Date(2026, 0, 1),
      new Date(2026, 1, 28),
      new Date(2028, 1, 29),
    ]) {
      const d7 = bornesRapport("last_7_days", undefined, j);
      const d30 = bornesRapport("last_30_days", undefined, j);
      const d12 = bornesRapport("last_12_months", undefined, j);
      expect(d7.debut >= d30.debut).toBe(true);
      expect(d30.debut >= d12.debut).toBe(true);
      expect(d7.fin).toBe(d30.fin);
      expect(d30.fin).toBe(d12.fin);
    }
  });
});

describe("les fenêtres calendaires", () => {
  it("« Ce mois » part du 1er, et c'est son libellé qui l'annonce", () => {
    // On ne les corrige pas : « Ce mois » DOIT suivre le calendrier, sinon le
    // libellé ment. Ce qui était faux, c'était de l'imposer par défaut.
    expect(bornesRapport("month", undefined, REF).debut).toBe("2026-09-01");
  });

  it("« Cette semaine » part du LUNDI, comme le serveur", () => {
    // `today - today.weekday()` côté Python : lundi vaut 0. `getDay()` de
    // JavaScript rend 0 pour DIMANCHE, d'où le décalage à ne pas oublier.
    // Le 2 septembre 2026 est un mercredi : la semaine part du 31 août.
    expect(bornesRapport("week", undefined, REF).debut).toBe("2026-08-31");
    // Et un dimanche appartient à la semaine qui a commencé le lundi d'avant.
    const dimanche = new Date(2026, 8, 6);
    expect(bornesRapport("week", undefined, dimanche).debut).toBe("2026-08-31");
  });

  it("« Ce trimestre » part du premier mois de son trimestre", () => {
    expect(bornesRapport("quarter", undefined, REF).debut).toBe("2026-07-01");
    expect(bornesRapport("quarter", undefined, new Date(2026, 0, 15)).debut).toBe(
      "2026-01-01"
    );
  });

  it("« Cette année » part du 1er janvier, « Aujourd'hui » du jour même", () => {
    expect(bornesRapport("year", undefined, REF).debut).toBe("2026-01-01");
    expect(bornesRapport("today", undefined, REF)).toEqual({
      debut: "2026-09-02",
      fin: "2026-09-02",
    });
  });
});

describe("la période personnalisée", () => {
  it("rend les bornes fournies, sans y toucher", () => {
    expect(
      bornesRapport("custom", { debut: "2026-01-01", fin: "2026-01-31" }, REF)
    ).toEqual({ debut: "2026-01-01", fin: "2026-01-31" });
  });

  it("sans bornes, elle ne fabrique pas une fenêtre au hasard", () => {
    // Une fenêtre inventée ferait afficher des chiffres que personne n'a
    // demandés. La journée du jour est le choix le plus étroit et le plus
    // visible : l'écran ne peut pas la faire passer pour autre chose.
    expect(bornesRapport("custom", undefined, REF)).toEqual({
      debut: "2026-09-02",
      fin: "2026-09-02",
    });
  });
});

describe("les libellés", () => {
  it("sont ceux du back-office, au caractère près", () => {
    // Deux surfaces qui nomment différemment la même fenêtre font douter qu'il
    // s'agisse de la même.
    expect(PERIODES_RAPPORT.map((p) => p.label)).toEqual([
      "7 derniers jours",
      "30 derniers jours",
      "12 derniers mois",
      "Aujourd'hui",
      "Cette semaine",
      "Ce mois",
      "Ce trimestre",
      "Cette année",
      "Personnalisé",
    ]);
    expect(libellePeriode("last_30_days")).toBe("30 derniers jours");
  });
});
