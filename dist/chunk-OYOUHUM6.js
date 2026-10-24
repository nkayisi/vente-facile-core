// src/units.ts
function pluralizeUnit(word, count) {
  const mot = (word || "").trim();
  if (!mot) return "";
  if (Math.abs(count) < 2) return mot;
  if (/[sxz]$/i.test(mot)) return mot;
  const enCapitales = mot === mot.toUpperCase() && /[A-ZÀ-Ÿ]/.test(mot);
  return `${mot}${enCapitales ? "S" : "s"}`;
}

export {
  pluralizeUnit
};
//# sourceMappingURL=chunk-OYOUHUM6.js.map