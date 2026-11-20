/**
 * Ce que le sélecteur de quantité affiche à son ouverture.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ ON PROPOSE 1, ET LA PREMIÈRE TOUCHE LE REMPLACE.                        │
 * │                                                                          │
 * │ Le sélecteur s'ouvrait vide : le caissier tapait « 1 » sur presque       │
 * │ chaque article, et un scan ne se validait pas d'Entrée. La crainte qui   │
 * │ justifiait le champ vide - un 1 validé par inadvertance - ne vaut que si │
 * │ ce 1 fait du tort : il ne fait du tort que quand il fermerait            │
 * │ l'encaissement. Dans ce cas-là, et dans lui seul, le champ reste vide et │
 * │ le motif s'affiche dès l'ouverture, avant la moindre frappe.             │
 * │                                                                          │
 * │ La valeur proposée est sélectionnée : taper « 3 » donne 3, jamais 13.    │
 * │ Le web le doit à `select()`, le terminal à son drapeau de remplacement.  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Les deux surfaces passent ici, pour ne pas proposer deux choses différentes
 * du même article. Chacune fournit SON contrôle de stock (`alerteSiUn`) : le
 * web lit le disponible du dépôt, le terminal y retranche ses ventes en file.
 */
import { MIN_QUANTITY, roundQuantity, type Packaging } from "../packaging";

export type CanalQuantite = "retail" | "package";

export interface EtatQuantite {
  canal: CanalQuantite;
  packages: number;
  loose: number;
  /**
   * La quantité vient de nous, pas du caissier. Tant qu'elle n'a pas été
   * touchée, elle suit le canal (voir `basculerCanal`).
   */
  proposee: boolean;
  /**
   * Pourquoi rien n'est proposé : le motif que la surface opposerait à 1.
   * `null` dès qu'une quantité est affichée.
   */
  motifVide: string | null;
}

export interface QuantiteInitialeInput {
  /** `getPackaging(article)`, `null` pour un article vendu à l'unité seule. */
  packaging: Pick<Packaging, "packageOnly"> | null;
  /** La ligne déjà au panier, en modification. */
  initiale?: { packages: number; loose: number } | null;
  /**
   * Le motif que la surface opposerait à une saisie de 1 dans ce canal, ou
   * `null`. N'y entrent que les motifs qui FERMERAIENT l'encaissement : stock
   * insuffisant ou inconnu, scellés manquants, verrou d'inventaire. L'avis
   * d'ouverture automatique d'un contenant n'en est pas un : il informe.
   */
  alerteSiUn: (canal: CanalQuantite) => string | null;
}

/** Canal ouvert par défaut : le contenant pour un article vendu en gros seul. */
export function canalParDefaut(packaging: Pick<Packaging, "packageOnly"> | null): CanalQuantite {
  return packaging?.packageOnly ? "package" : "retail";
}

function proposer(canal: CanalQuantite, alerteSiUn: QuantiteInitialeInput["alerteSiUn"]): EtatQuantite {
  const motif = alerteSiUn(canal);
  if (motif) return { canal, packages: 0, loose: 0, proposee: false, motifVide: motif };
  return {
    canal,
    packages: canal === "package" ? 1 : 0,
    loose: canal === "retail" ? 1 : 0,
    proposee: true,
    motifVide: null,
  };
}

export function quantiteInitiale({
  packaging,
  initiale,
  alerteSiUn,
}: QuantiteInitialeInput): EtatQuantite {
  const packages = Math.max(0, initiale?.packages ?? 0);
  const loose = Math.max(0, initiale?.loose ?? 0);

  if (packages > 0 || loose > 0) {
    // Une ligne déjà au panier rouvre sur le canal qu'elle utilise : une ligne
    // de deux cartons rouverte sur le détail ferait taper des bouteilles.
    const canal: CanalQuantite =
      packaging && (packaging.packageOnly || (packages > 0 && loose === 0)) ? "package" : "retail";
    return { canal, packages, loose, proposee: false, motifVide: null };
  }

  return proposer(canalParDefaut(packaging), alerteSiUn);
}

/**
 * Change de canal.
 *
 * ⚠ UNE PROPOSITION INTACTE SUIT LE CANAL. Sans cela, le caissier qui ouvre un
 * article proposé à « 1 bouteille » et passe aux cartons pour en taper deux
 * vendrait « 2 cartons + 1 bouteille » : la bouteille qu'il n'a jamais demandée
 * resterait dans l'autre canal. Dès que le caissier a touché la quantité, elle
 * est à lui, et les deux canaux gardent ce qu'il y a mis.
 */
export function basculerCanal(
  etat: EtatQuantite,
  canal: CanalQuantite,
  alerteSiUn: QuantiteInitialeInput["alerteSiUn"]
): EtatQuantite {
  if (canal === etat.canal) return etat;
  if (etat.proposee || (etat.motifVide !== null && etat.packages === 0 && etat.loose === 0)) {
    return proposer(canal, alerteSiUn);
  }
  return { ...etat, canal, motifVide: null };
}

/**
 * Texte d'un champ de quantité : « 1 », « 0,5 », vide pour zéro.
 *
 * ⚠ Virgule, et SANS séparateur de milliers : c'est la valeur d'un champ de
 * saisie, pas un affichage. `String(0.5)` donnait « 0.5 », qu'une virgule
 * tapée ensuite rendait illisible (« 0.5, »).
 */
export function saisieDeQuantite(n: number): string {
  const q = roundQuantity(n);
  return q >= MIN_QUANTITY ? String(q).replace(".", ",") : "";
}
