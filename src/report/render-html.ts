/**
 * `RapportSpec` vers HTML, en A4. **Le même document des deux côtés.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ C'EST CETTE FONCTION QUI PORTE LA PROMESSE.                             │
 * │                                                                          │
 * │ Le back-office l'imprime par le navigateur, le terminal par              │
 * │ `expo-print` : deux moteurs, mais une SEULE chaîne de caractères en      │
 * │ entrée. Il n'y a donc plus de mise en page à tenir en phase - c'est la   │
 * │ leçon déjà tirée sur les tickets, où « une seule mise en page, deux      │
 * │ encodages » a remplacé deux générateurs qu'il fallait corriger deux      │
 * │ fois.                                                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Fonction PURE : ni DOM, ni React, ni accès au système. Elle rend une chaîne,
 * exactement comme `rendreHtml` des tickets.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ TOUT EST EN LIGNE, ET C'EST OBLIGATOIRE.                                │
 * │                                                                          │
 * │ Le document est imprimé par un moteur qui ne verra jamais nos feuilles   │
 * │ de style : `expo-print` reçoit une chaîne isolée, et l'onglet ouvert par │
 * │ le navigateur n'hérite de rien. Une classe Tailwind n'y vaut rien.       │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
import type { ReceiptChrome } from "../receipt/identity";

import { sousCellule, texteCellule, type RapportSpec } from "./spec";

const echapper = (v: string): string =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const lignesDe = (v: string | undefined): string[] =>
  (v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * L'en-tête d'identité, repris des tickets champ pour champ.
 *
 * On ne réemploie PAS `orgHeaderBlocks` : il rend des `Block`, c'est-à-dire une
 * colonne centrée de cinquante-huit millimètres. Sur une page A4, l'identité se
 * range à gauche et les mentions légales tiennent sur une ligne. Ce qui doit
 * être identique, ce sont les CHAMPS et leur ordre, pas leur disposition - un
 * rapport et un reçu de la même liasse doivent se reconnaître, pas se
 * superposer.
 */
function enTete(chrome: ReceiptChrome): string {
  const { org } = chrome;
  const lieu = [org.address, org.city].map((p) => p?.trim()).filter(Boolean).join(", ");
  const legal = [
    org.rccm?.trim() ? `RCCM ${org.rccm.trim()}` : "",
    org.idNat?.trim() ? `ID Nat ${org.idNat.trim()}` : "",
    org.taxId?.trim() ? `NIF ${org.taxId.trim()}` : "",
  ].filter(Boolean);

  const coordonnees = [
    lieu,
    org.phone?.trim() ? `Tél. ${org.phone.trim()}` : "",
    org.email?.trim() ?? "",
  ].filter(Boolean);

  return `<header class="id">
    ${org.logo ? `<img class="logo" src="${org.logo.dataUrl}" alt="" />` : ""}
    <div class="idtxt">
      <div class="org">${echapper(org.name.toUpperCase())}</div>
      ${coordonnees.length ? `<div class="coord">${echapper(coordonnees.join(" · "))}</div>` : ""}
      ${legal.length ? `<div class="legal">${echapper(legal.join(" · "))}</div>` : ""}
      ${lignesDe(chrome.header)
        .map((l) => `<div class="coord">${echapper(l)}</div>`)
        .join("")}
    </div>
  </header>`;
}

function pied(chrome: ReceiptChrome): string {
  const corps = lignesDe(chrome.footer);
  return `<footer class="pied">
    ${corps.map((l) => `<div>${echapper(l)}</div>`).join("")}
    <div class="marque">Powered by Vente Facile</div>
  </footer>`;
}

/** Les filtres, en paires serrées : c'est le périmètre, il se lit d'un coup. */
function filtres(spec: RapportSpec): string {
  if (!spec.filtres?.length) return "";
  return `<div class="filtres">${spec.filtres
    .map(
      ([k, v]) =>
        `<span class="f"><span class="fk">${echapper(k)}</span> ${echapper(v)}</span>`
    )
    .join("")}</div>`;
}

/**
 * La synthèse, en cartouches.
 *
 * Les libellés indentés de deux espaces (les tranches d'une balance âgée, par
 * exemple) sont rendus en RETRAIT plutôt qu'avec leurs espaces : le HTML les
 * réduirait à un seul, et la hiérarchie disparaîtrait.
 */
function synthese(spec: RapportSpec): string {
  if (!spec.synthese?.length) return "";
  return `<div class="synth">${spec.synthese
    .map(([k, v]) => {
      const enfant = k.startsWith("  ");
      return `<div class="s${enfant ? " sc" : ""}">
        <div class="sk">${echapper(k.trim())}</div>
        <div class="sv">${echapper(v)}</div>
      </div>`;
    })
    .join("")}</div>`;
}

function tableau(spec: RapportSpec): string {
  if (spec.lignes.length === 0) {
    return `<p class="vide">${echapper(spec.vide ?? "Aucune ligne sur ce périmètre.")}</p>`;
  }

  // L'en-tête SUIT SA COLONNE : un libellé collé à gauche au-dessus de montants
  // collés à droite oblige à relire l'en-tête pour savoir lequel coiffe quoi.
  const entetes = spec.colonnes
    .map(
      (c) =>
        `<th class="${c.mesure ? "m" : ""}"${
          c.largeur ? ` style="width:${c.largeur}%"` : ""
        }>${echapper(c.entete)}</th>`
    )
    .join("");

  const corps = spec.lignes
    .map(
      (ligne) =>
        `<tr>${spec.colonnes
          .map((c, i) => {
            const cellule = ligne[i];
            const texte = cellule === undefined ? "" : texteCellule(cellule);
            const sous = cellule === undefined ? null : sousCellule(cellule);
            return `<td class="${c.mesure ? "m" : ""}">${echapper(texte)}${
              sous ? `<span class="sous">${echapper(sous)}</span>` : ""
            }</td>`;
          })
          .join("")}</tr>`
    )
    .join("");

  return `<table><thead><tr>${entetes}</tr></thead><tbody>${corps}</tbody></table>`;
}

/**
 * Le document complet.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN SEUL BORD GAUCHE.                                                     │
 * │                                                                          │
 * │ Le bandeau d'identité, le titre, le cartouche de synthèse et le tableau   │
 * │ démarrent à la MÊME abscisse. C'est le défaut que les exports du serveur │
 * │ ont dû corriger en mesurant leur propre flux PDF : trois origines à un   │
 * │ ou deux millimètres près, assez peu pour passer deux relectures, assez   │
 * │ pour que l'œil lise un bord en escalier. Ici c'est le `padding` du       │
 * │ `body` qui le tient, et rien d'autre n'a de marge horizontale.           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `thead` est déclaré `table-header-group` : sur un rapport de trois cents
 * lignes, l'en-tête se répète en tête de chaque page. Sans lui, la deuxième
 * page est un tableau de nombres sans colonnes.
 */
export function rendreRapportHtml(spec: RapportSpec): string {
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
