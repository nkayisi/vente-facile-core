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
  cellule: () => cellule,
  contenuCsv: () => contenuCsv,
  horodatage: () => horodatage,
  nomDeFichier: () => nomDeFichier,
  rendreRapportHtml: () => rendreRapportHtml,
  sousCellule: () => sousCellule,
  texteCellule: () => texteCellule
});
module.exports = __toCommonJS(report_exports);

// src/report/spec.ts
function texteCellule(c) {
  return typeof c === "string" ? c : c.texte;
}
function sousCellule(c) {
  return typeof c === "string" ? null : c.sous ?? null;
}

// src/report/render-html.ts
var echapper = (v) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var lignesDe = (v) => (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
function enTete(chrome) {
  const { org } = chrome;
  const lieu = [org.address, org.city].map((p) => p?.trim()).filter(Boolean).join(", ");
  const legal = [
    org.rccm?.trim() ? `RCCM ${org.rccm.trim()}` : "",
    org.idNat?.trim() ? `ID Nat ${org.idNat.trim()}` : "",
    org.taxId?.trim() ? `NIF ${org.taxId.trim()}` : ""
  ].filter(Boolean);
  const coordonnees = [
    lieu,
    org.phone?.trim() ? `T\xE9l. ${org.phone.trim()}` : "",
    org.email?.trim() ?? ""
  ].filter(Boolean);
  return `<header class="id">
    ${org.logo ? `<img class="logo" src="${org.logo.dataUrl}" alt="" />` : ""}
    <div class="idtxt">
      <div class="org">${echapper(org.name.toUpperCase())}</div>
      ${coordonnees.length ? `<div class="coord">${echapper(coordonnees.join(" \xB7 "))}</div>` : ""}
      ${legal.length ? `<div class="legal">${echapper(legal.join(" \xB7 "))}</div>` : ""}
      ${lignesDe(chrome.header).map((l) => `<div class="coord">${echapper(l)}</div>`).join("")}
    </div>
  </header>`;
}
function pied(chrome) {
  const corps = lignesDe(chrome.footer);
  return `<footer class="pied">
    ${corps.map((l) => `<div>${echapper(l)}</div>`).join("")}
    <div class="marque">Powered by Vente Facile</div>
  </footer>`;
}
function filtres(spec) {
  if (!spec.filtres?.length) return "";
  return `<div class="filtres">${spec.filtres.map(
    ([k, v]) => `<span class="f"><span class="fk">${echapper(k)}</span> ${echapper(v)}</span>`
  ).join("")}</div>`;
}
function synthese(spec) {
  if (!spec.synthese?.length) return "";
  return `<div class="synth">${spec.synthese.map(([k, v]) => {
    const enfant = k.startsWith("  ");
    return `<div class="s${enfant ? " sc" : ""}">
        <div class="sk">${echapper(k.trim())}</div>
        <div class="sv">${echapper(v)}</div>
      </div>`;
  }).join("")}</div>`;
}
function tableau(spec) {
  if (spec.lignes.length === 0) {
    return `<p class="vide">${echapper(spec.vide ?? "Aucune ligne sur ce p\xE9rim\xE8tre.")}</p>`;
  }
  const entetes = spec.colonnes.map(
    (c) => `<th class="${c.mesure ? "m" : ""}"${c.largeur ? ` style="width:${c.largeur}%"` : ""}>${echapper(c.entete)}</th>`
  ).join("");
  const corps = spec.lignes.map(
    (ligne) => `<tr>${spec.colonnes.map((c, i) => {
      const cellule2 = ligne[i];
      const texte = cellule2 === void 0 ? "" : texteCellule(cellule2);
      const sous = cellule2 === void 0 ? null : sousCellule(cellule2);
      return `<td class="${c.mesure ? "m" : ""}">${echapper(texte)}${sous ? `<span class="sous">${echapper(sous)}</span>` : ""}</td>`;
    }).join("")}</tr>`
  ).join("");
  return `<table><thead><tr>${entetes}</tr></thead><tbody>${corps}</tbody></table>`;
}
function rendreRapportHtml(spec) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" />
<title>${echapper(spec.titre)}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 9pt; line-height: 1.35; color: #111827;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .id { display: flex; align-items: center; gap: 8mm; margin-bottom: 3mm; }
  .logo { height: 14mm; width: auto; }
  .org { font-size: 13pt; font-weight: 700; letter-spacing: 0.2px; }
  .coord { font-size: 8pt; color: #4b5563; }
  .legal { font-size: 7.5pt; color: #6b7280; }
  .band { border-top: 1.2px solid #111827; border-bottom: 1.2px solid #111827;
          padding: 2mm 0; margin-bottom: 3mm; }
  .titre { font-size: 11pt; font-weight: 700; text-transform: uppercase;
           letter-spacing: 0.4px; }
  .sstitre { font-size: 8.5pt; color: #4b5563; margin-top: 0.6mm; }
  .filtres { display: flex; flex-wrap: wrap; gap: 1.5mm 5mm; margin-bottom: 3mm;
             font-size: 8pt; color: #374151; }
  .fk { color: #6b7280; }
  .synth { display: flex; flex-wrap: wrap; gap: 2mm; margin-bottom: 4mm; }
  .s { border: 0.5px solid #d1d5db; border-radius: 1.5mm; padding: 1.6mm 2.4mm;
       min-width: 34mm; }
  .sc { margin-left: 4mm; border-style: dashed; }
  .sk { font-size: 7.5pt; color: #6b7280; }
  .sv { font-size: 9.5pt; font-weight: 600; font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.3px;
       color: #6b7280; font-weight: 600; text-align: left;
       border-bottom: 1px solid #111827; padding: 1.6mm 2mm 1.2mm 0; }
  td { font-size: 8.5pt; padding: 1.6mm 2mm 1.6mm 0; vertical-align: top;
       border-bottom: 0.4px solid #e5e7eb; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th.m, td.m { text-align: right; padding-right: 0; padding-left: 2mm;
               font-variant-numeric: tabular-nums; }
  .sous { display: block; font-size: 7pt; color: #6b7280; }
  .vide { font-size: 9pt; color: #6b7280; text-align: center; padding: 8mm 0; }
  .pied { margin-top: 6mm; padding-top: 2mm; border-top: 0.5px solid #d1d5db;
          font-size: 7.5pt; color: #6b7280; text-align: center; }
  .marque { margin-top: 1mm; color: #9ca3af; }
</style></head><body>
${enTete(spec.identite)}
<div class="band">
  <div class="titre">${echapper(spec.titre)}</div>
  ${spec.sousTitre ? `<div class="sstitre">${echapper(spec.sousTitre)}</div>` : ""}
</div>
${filtres(spec)}
${synthese(spec)}
${tableau(spec)}
${pied(spec.identite)}
</body></html>`;
}

// src/report/csv.ts
var SEPARATEUR = ";";
var BOM = "\uFEFF";
function cellule(valeur) {
  const v = valeur ?? "";
  return /["\n\r;,]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
function contenuCsv(spec) {
  const lignes = [];
  lignes.push(cellule(spec.titre));
  if (spec.sousTitre) lignes.push(cellule(spec.sousTitre));
  for (const [k, v] of spec.filtres ?? []) {
    lignes.push([cellule(k), cellule(v)].join(SEPARATEUR));
  }
  if ((spec.filtres?.length ?? 0) > 0) lignes.push("");
  for (const [k, v] of spec.synthese ?? []) {
    lignes.push([cellule(k.trim()), cellule(v)].join(SEPARATEUR));
  }
  if ((spec.synthese?.length ?? 0) > 0) lignes.push("");
  lignes.push(spec.colonnes.map((c) => cellule(c.entete)).join(SEPARATEUR));
  for (const l of spec.lignes) {
    lignes.push(
      spec.colonnes.map((_, i) => {
        const c = l[i];
        if (c === void 0) return "";
        const sous = sousCellule(c);
        return cellule(sous ? `${texteCellule(c)} (${sous})` : texteCellule(c));
      }).join(SEPARATEUR)
    );
  }
  if (spec.lignes.length === 0 && spec.vide) lignes.push(cellule(spec.vide));
  return BOM + lignes.join("\r\n") + "\r\n";
}
function nomDeFichier(nom) {
  return nom.replace(/[/\\:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}
function horodatage(d = /* @__PURE__ */ new Date()) {
  const deux = (n) => n < 10 ? `0${n}` : String(n);
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())} ${deux(d.getHours())}h${deux(d.getMinutes())}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cellule,
  contenuCsv,
  horodatage,
  nomDeFichier,
  rendreRapportHtml,
  sousCellule,
  texteCellule
});
//# sourceMappingURL=index.cjs.map