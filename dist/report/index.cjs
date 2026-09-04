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

// src/report/index.ts
var report_exports = {};
__export(report_exports, {
  GROUPEMENTS: () => GROUPEMENTS,
  PERIODES_RAPPORT: () => PERIODES_RAPPORT,
  bornesRapport: () => bornesRapport,
  libellePeriode: () => libellePeriode,
  nomDeFichier: () => nomDeFichier
});
module.exports = __toCommonJS(report_exports);

// src/report/nom-fichier.ts
function nomDeFichier(nom) {
  return nom.replace(/[/\\:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

// src/report/periodes.ts
function jourISO(d) {
  const deux = (n) => n < 10 ? `0${n}` : String(n);
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}
var PERIODES_RAPPORT = [
  { valeur: "last_7_days", label: "7 derniers jours" },
  { valeur: "last_30_days", label: "30 derniers jours" },
  { valeur: "last_12_months", label: "12 derniers mois" },
  { valeur: "today", label: "Aujourd'hui" },
  { valeur: "week", label: "Cette semaine" },
  { valeur: "month", label: "Ce mois" },
  { valeur: "quarter", label: "Ce trimestre" },
  { valeur: "year", label: "Cette ann\xE9e" },
  { valeur: "custom", label: "Personnalis\xE9" }
];
var GROUPEMENTS = [
  { valeur: "day", label: "Jour" },
  { valeur: "week", label: "Semaine" },
  { valeur: "month", label: "Mois" }
];
function libellePeriode(p) {
  return PERIODES_RAPPORT.find((o) => o.valeur === p)?.label ?? "";
}
var jour = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
function reculeJours(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}
function bornesRapport(periode, personnalisee, aujourdhui = /* @__PURE__ */ new Date()) {
  const auj = jour(aujourdhui);
  const fin = jourISO(auj);
  switch (periode) {
    case "custom":
      return personnalisee ?? { debut: fin, fin };
    case "today":
      return { debut: fin, fin };
    case "week": {
      const jourDeSemaine = (auj.getDay() + 6) % 7;
      return { debut: jourISO(reculeJours(auj, jourDeSemaine)), fin };
    }
    case "month":
      return { debut: jourISO(new Date(auj.getFullYear(), auj.getMonth(), 1)), fin };
    case "quarter": {
      const trimestre = Math.floor(auj.getMonth() / 3);
      return { debut: jourISO(new Date(auj.getFullYear(), trimestre * 3, 1)), fin };
    }
    case "year":
      return { debut: jourISO(new Date(auj.getFullYear(), 0, 1)), fin };
    case "last_7_days":
      return { debut: jourISO(reculeJours(auj, 6)), fin };
    case "last_12_months": {
      const recule = auj.getFullYear() * 12 + (auj.getMonth() - 11);
      return {
        debut: jourISO(new Date(Math.floor(recule / 12), (recule % 12 + 12) % 12, 1)),
        fin
      };
    }
    case "last_30_days":
    default:
      return { debut: jourISO(reculeJours(auj, 29)), fin };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GROUPEMENTS,
  PERIODES_RAPPORT,
  bornesRapport,
  libellePeriode,
  nomDeFichier
});
//# sourceMappingURL=index.cjs.map