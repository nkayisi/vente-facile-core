/**
 * Un rapport en CSV, pour l'« Export Excel » des deux surfaces.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ POINT-VIRGULE ET BOM, ET LES DEUX SONT NÉCESSAIRES.                     │
 * │                                                                          │
 * │ Excel choisit son séparateur d'après la locale du système : en français  │
 * │ c'est le POINT-VIRGULE, et un fichier à virgules s'y ouvre en une seule  │
 * │ colonne. Le BOM UTF-8, lui, est ce qui fait afficher « Créances » au     │
 * │ lieu de « CrÃ©ances » - sans lui, Excel lit le fichier en ANSI.          │
 * │                                                                          │
 * │ Les deux ensemble : le marchand ouvre le fichier et il est droit.        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Vit dans le paquet partagé pour que le fichier produit par le back-office et
 * celui produit par le terminal soient le MÊME fichier. Le back-office en avait
 * une version maison (`exportToCSV`) qui n'échappait rien.
 */
import { sousCellule, texteCellule, type RapportSpec } from "./spec";

const SEPARATEUR = ";";
const BOM = "﻿";

/**
 * Échappe une cellule.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ PRESQUE TOUT MONTANT EST CONCERNÉ, ET C'EST LA DÉCIMALE FRANÇAISE.      │
 * │                                                                          │
 * │ « 560 287,70 $ » porte une virgule. Sans guillemets, un tableur réglé    │
 * │ sur la virgule y voit deux colonnes et décale toute la ligne. Ce n'est   │
 * │ donc pas un cas rare mais le cas GÉNÉRAL de ce produit, où chaque        │
 * │ cellule d'argent porte une décimale française. Un point-virgule dans une │
 * │ description de mouvement, une virgule dans un nom d'établissement, un    │
 * │ guillemet dans une note : mêmes dégâts, aucune erreur nulle part.        │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export function cellule(valeur: string): string {
  const v = valeur ?? "";
  return /["\n\r;,]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Le contenu du fichier, à partir de la même description que le PDF. */
export function contenuCsv(spec: RapportSpec): string {
  const lignes: string[] = [];

  lignes.push(cellule(spec.titre));
  if (spec.sousTitre) lignes.push(cellule(spec.sousTitre));

  // Le PÉRIMÈTRE d'abord : un tableau sans ses filtres laisse croire au
  // lecteur qu'il a tout sous les yeux.
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
      spec.colonnes
        .map((_, i) => {
          const c = l[i];
          if (c === undefined) return "";
          const sous = sousCellule(c);
          // La sous-ligne rejoint sa cellule entre parenthèses : une colonne de
          // plus déplacerait toutes les suivantes, et le tableur d'en face n'a
          // pas la notion de seconde ligne dans une cellule.
          return cellule(sous ? `${texteCellule(c)} (${sous})` : texteCellule(c));
        })
        .join(SEPARATEUR)
    );
  }
  if (spec.lignes.length === 0 && spec.vide) lignes.push(cellule(spec.vide));

  // CRLF : c'est la fin de ligne qu'attend un tableur sous Windows, et la
  // seule que tous acceptent.
  return BOM + lignes.join("\r\n") + "\r\n";
}

/**
 * Le nom du fichier, sans extension.
 *
 * `expo-print` nomme le sien en UUID, et un `<a download>` sans nom hérite de
 * l'URL du blob : des deux côtés, trois exports arrivent indiscernables dans le
 * dossier de téléchargements. Un document qu'on ne sait pas retrouver n'a pas
 * été exporté, il a été perdu.
 */
export function nomDeFichier(nom: string): string {
  return nom
    // Ni séparateur de chemin ni caractère refusé par les systèmes de fichiers.
    .replace(/[/\\:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** « 2026-09-02 05h27 » : lisible, triable, sans `Intl` (proscrit ici). */
export function horodatage(d = new Date()): string {
  const deux = (n: number) => (n < 10 ? `0${n}` : String(n));
  return (
    `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())} ` +
    `${deux(d.getHours())}h${deux(d.getMinutes())}`
  );
}
