// src/units.ts
var SYMBOLES_INVARIABLES = /* @__PURE__ */ new Set([
  // Masse
  "g",
  "kg",
  "mg",
  "t",
  "q",
  "lb",
  // Volume
  "l",
  "ml",
  "cl",
  "dl",
  "hl",
  "m3",
  "cm3",
  "dm3",
  // Longueur
  "m",
  "mm",
  "cm",
  "dm",
  "km",
  // Surface et volume bâti
  "m2",
  "cm2",
  "ha",
  // Durée. « s » et « h » le sont déjà par la règle finale, on les nomme
  // quand même : la liste doit se lire comme un inventaire, pas comme un reste.
  "s",
  "min",
  "h",
  "j"
]);
function pluralizeUnit(word, count) {
  const mot = (word || "").trim();
  if (!mot) return "";
  if (Math.abs(count) < 2) return mot;
  if (/[sxz]$/i.test(mot)) return mot;
  if (SYMBOLES_INVARIABLES.has(mot.toLowerCase())) return mot;
  const enCapitales = mot === mot.toUpperCase() && /[A-ZÀ-Ÿ]/.test(mot);
  return `${mot}${enCapitales ? "S" : "s"}`;
}

export {
  pluralizeUnit
};
//# sourceMappingURL=chunk-B5W4KJNN.js.map