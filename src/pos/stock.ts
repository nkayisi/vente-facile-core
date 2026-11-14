/**
 * Ce que le comptoir peut encore ajouter au panier.
 *
 * Ces bornes décident des REFUS. Un refus trop strict fait perdre une vente, un
 * refus manquant la fait échouer au 400 du serveur, client déjà servi. Les deux
 * surfaces doivent donc trancher pareil.
 *
 * ATTENTION, deux sens de `null` cohabitent ici, et les confondre inverse la
 * décision :
 *
 * - `addableBase` rend `null` pour « AUCUNE BORNE » : stock non suivi. On peut
 *   ajouter autant qu'on veut. Il n'y a plus d'autre cas : le stock négatif a
 *   été retiré de la plateforme, aucune sortie ne passe sous zéro.
 * - `addableChannels` rend `null` pour « PARTAGE INCONNU » : la ligne de stock
 *   ne dit pas ce qui est scellé et ce qui est en vrac. On ne sait rien, et on
 *   n'invente surtout pas un zéro bloquant : le serveur reste seul juge.
 *
 * Les deux se lisent « pas de nombre à opposer au caissier », ce qui est
 * précisément pourquoi ils ne peuvent pas porter le même nom.
 */
import {
  remainingChannels,
  roundQuantity,
  formatQuantity,
  MIN_QUANTITY,
  MAX_QUANTITY,
  type ChannelAvailability,
} from "../packaging";
import {
  packagingFactorOf,
  looseQuantityOf,
  type BasketLine,
  type BasketProduct,
} from "./basket";

export interface StockedProductLike {
  id: string;
  name?: string | null;
  selling_mode?: string | null;
  units_per_package?: number | null;
  unit_name?: string | null;
  packaging_unit_name?: string | null;
  track_inventory?: boolean | null;
  /** Disponible total, en unité de détail. */
  stock_quantity?: number | string | null;
  /** Contenants encore scellés. `null` : partage non renseigné. */
  stock_packages?: number | string | null;
  /** Unités hors emballage. `null` : partage non renseigné. */
  stock_loose?: number | string | null;
}

const num = (v: string | number | null | undefined): number => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** La ligne du panier portant ce produit, s'il y en a une. */
function ligneDe(lines: BasketLine[], productId: string): BasketLine | undefined {
  return lines.find((l) => l.product.id === productId);
}

/** Quantité déjà au panier pour ce produit. */
export function inCart(lines: BasketLine[], productId: string): number {
  return ligneDe(lines, productId)?.quantity ?? 0;
}

/**
 * Quantité encore ajoutable, en unité de détail.
 *
 * `null` signifie AUCUNE BORNE : le stock n'est pas suivi. Le serveur applique
 * la même règle.
 */
export function addableBase(
  product: StockedProductLike,
  lines: BasketLine[]
): number | null {
  if (!product.track_inventory) return null;
  return Math.max(0, num(product.stock_quantity) - inCart(lines, product.id));
}

/**
 * Ce que chaque canal offre encore, une fois retranché ce que le panier
 * consomme déjà. `null` signifie PARTAGE INCONNU.
 *
 * La simulation rejoue l'ordre du serveur (contenants scellés d'abord, puis
 * ouverture d'un contenant pour servir le détail qui manque), sans quoi deux
 * saisies successives sur le même produit se compteraient mal et le refus
 * n'arriverait qu'à l'encaissement.
 */
export function addableChannels(
  product: StockedProductLike,
  lines: BasketLine[],
  options: { ignoreCartLine?: boolean } = {}
): ChannelAvailability {
  if (product.stock_loose === null || product.stock_loose === undefined) {
    return { sealed: null, loose: null };
  }
  const stock: ChannelAvailability = {
    sealed:
      product.stock_packages === null || product.stock_packages === undefined
        ? null
        : num(product.stock_packages),
    loose: num(product.stock_loose),
  };

  const factor = packagingFactorOf(product);
  if (options.ignoreCartLine || !factor) return stock;

  const line = ligneDe(lines, product.id);
  if (!line) return stock;

  return remainingChannels(
    stock,
    { packages: line.packageQuantity, loose: looseQuantityOf(line) },
    factor
  );
}

/**
 * Contenants encore scellés, donc réellement vendables en gros.
 *
 * Borne absente pour un article dont le stock n'est pas suivi.
 */
export function addableSealed(
  product: StockedProductLike,
  lines: BasketLine[],
  options: { ignoreCartLine?: boolean } = {}
): number | null {
  if (!product.track_inventory) return null;
  return addableChannels(product, lines, options).sealed;
}

export function addableLoose(
  product: StockedProductLike,
  lines: BasketLine[],
  options: { ignoreCartLine?: boolean } = {}
): number | null {
  return addableChannels(product, lines, options).loose;
}

export interface Saisie {
  /** Contenants entiers demandés. */
  packages: number;
  /** Unités de détail demandées, en plus des contenants. */
  loose: number;
}

export interface VerdictAjout {
  ok: boolean;
  /** Quantité totale en unité de détail, miroir de `PackagingService.to_base`. */
  quantity: number;
  packageQuantity: number;
  /** Message destiné au caissier, en français, ou `null` si l'ajout passe. */
  raison: string | null;
}

/**
 * Décide si une saisie peut rejoindre le panier, et le dit en français.
 *
 * Le message fait partie de la règle : « Stock insuffisant » sans le chiffre
 * disponible n'apprend rien à qui doit servir un client qui attend.
 */
export function verifierAjout(
  product: StockedProductLike,
  lines: BasketLine[],
  saisie: Saisie
): VerdictAjout {
  const factor = packagingFactorOf(product);
  // ┌────────────────────────────────────────────────────────────────────────┐
  // │ UNE QUANTITÉ N'EST PAS UN ENTIER, ET NE L'A JAMAIS ÉTÉ CÔTÉ SERVEUR.   │
  // │                                                                        │
  // │ `Math.floor` tronquait ici les DEUX canaux, et le seuil était `< 1` :  │
  // │ un marchand qui pèse 0,5 kg de farine se voyait répondre « Indiquez    │
  // │ une quantité » sur une saisie parfaitement valide. Pendant ce temps le │
  // │ serveur acceptait 0,001 depuis toujours                                │
  // │ (`DecimalField(15, 3)` + `MinValueValidator(0.001)`), si bien que le   │
  // │ comptoir était plus strict que lui, sans raison.                       │
  // │                                                                        │
  // │ On quantise au lieu de tronquer : le serveur travaille en `Decimal` et │
  // │ quantise aussi, et une divergence d'arrondi ne se verrait que sur un   │
  // │ ticket déjà remis au client.                                           │
  // └────────────────────────────────────────────────────────────────────────┘
  const packages = factor ? Math.max(0, roundQuantity(saisie.packages)) : 0;
  const loose = Math.max(0, roundQuantity(saisie.loose));
  const quantity = factor ? roundQuantity(packages * factor + loose) : loose;
  const nom = product.name || "Cet article";
  const base = { quantity, packageQuantity: packages };

  if (quantity < MIN_QUANTITY) {
    return { ...base, ok: false, raison: "Indiquez une quantité." };
  }

  // La borne haute est celle du serveur. Sans elle, le refus arrive en 400 sur
  // une vente déjà annoncée au client, et son message parle de `max_digits`.
  if (quantity > MAX_QUANTITY) {
    return {
      ...base,
      ok: false,
      raison: `Quantité trop grande : au plus ${formatQuantity(MAX_QUANTITY)}.`,
    };
  }

  const dejaAuPanier = inCart(lines, product.id);
  const borne = addableBase(product, lines);
  if (borne !== null && quantity > borne) {
    const total = num(product.stock_quantity);
    return {
      ...base,
      ok: false,
      raison:
        dejaAuPanier > 0
          ? `Stock insuffisant pour ${nom} : ${formatQuantity(total)} en stock, ${formatQuantity(dejaAuPanier)} déjà au panier.`
          : `Stock insuffisant pour ${nom} : ${formatQuantity(total)} en stock.`,
    };
  }

  // Le total peut suffire alors que les CONTENANTS manquent : sept bouteilles
  // isolées ne font pas un casier scellé. Le serveur refuse dans ce cas, autant
  // le dire au comptoir plutôt qu'à l'encaissement.
  if (packages > 0) {
    const scelles = addableSealed(product, lines);
    if (scelles !== null && packages > scelles) {
      const mot = product.packaging_unit_name?.trim() || "contenant";
      // ┌──────────────────────────────────────────────────────────────────┐
      // │ « EN SCELLÉ », LOCUTION INVARIABLE.                              │
      // │                                                                  │
      // │ Le message accordait « scellé » au masculin pluriel, ce qui       │
      // │ donnait « 3 BOITES scellés » sous les yeux du caissier. Le GENRE  │
      // │ d'un nom de contenant n'est pas dérivable - il vient du marchand, │
      // │ souvent en capitales et parfois déjà au pluriel - et aucun        │
      // │ lexique ne le tranchera. La locution invariable marche pour les   │
      // │ deux genres, comme « ouvrir des BOITES » l'a fait au lot 7.       │
      // │                                                                  │
      // │ Le `s` du contenant reste, lui, un pari assumé sur une saisie au  │
      // │ singulier : c'est la convention du reste du produit.              │
      // └──────────────────────────────────────────────────────────────────┘
      return {
        ...base,
        ok: false,
        raison: `Il ne reste que ${formatQuantity(scelles)} ${mot}${
          scelles > 1 ? "s" : ""
        } en scellé pour ${nom}.`,
      };
    }
  }

  return { ...base, ok: true, raison: null };
}

/** Une ligne du panier dont le produit porte ses compteurs de stock. */
export interface LigneStockee extends BasketLine {
  product: BasketProduct & StockedProductLike;
}

/** Pourquoi une ligne ne s'encaisse pas, dans l'ORDRE DU SERVEUR. */
export type CauseRefusEncaissement = "verrou" | "stock-inconnu" | "rupture";

/** Ce qui empêche une ligne d'être encaissée. */
export interface Rupture {
  /** Rang de la ligne dans le panier, pour la désigner à l'écran. */
  index: number;
  productId: string;
  name: string;
  cause: CauseRefusEncaissement;
  /** La phrase destinée au caissier, en français, avec son chiffre. */
  raison: string;
}

export interface OptionsEncaissement {
  /**
   * Les articles verrouillés par un inventaire en cours DANS L'ENTREPÔT DE LA
   * CAISSE : identifiant d'article → référence de la session (`INV-…`). La
   * référence peut être vide : on dit alors « un inventaire en cours ».
   */
  verrous?: ReadonlyMap<string, string>;
}

/** La phrase du serveur, ramenée à un seul article. */
export function motifDuVerrou(nomArticle: string, reference: string): string {
  const session = reference ? ` (${reference})` : "";
  return (
    `${nomArticle} est bloqué par un inventaire en cours${session}. ` +
    `Attendez la fin de l'inventaire pour l'encaisser.`
  );
}

/**
 * Un stock INCONNU n'est pas un stock nul, et la phrase doit le dire.
 *
 * Le VERDICT est le même - sans ligne de stock dans cet entrepôt, le serveur
 * refuse aussi (`available = stock.available_quantity if stock else 0`) - mais
 * « 0 en stock » sous une carte qui annonce « aucun stock ici » donnerait au
 * caissier deux affirmations contradictoires sur le même écran.
 */
export function motifStockInconnu(nomArticle: string): string {
  return (
    `Aucun stock de ${nomArticle} dans cet entrepôt : ` +
    `enregistrez une entrée de stock avant de l'encaisser.`
  );
}

const stockInconnu = (p: StockedProductLike): boolean =>
  Boolean(p.track_inventory) &&
  (p.stock_quantity === null || p.stock_quantity === undefined);

/**
 * Les lignes qui empêchent l'encaissement.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ RIEN NE FERME L'AJOUT, TOUT FERME L'ENCAISSEMENT.                       │
 * │                                                                          │
 * │ Tout le catalogue s'ajoute au panier, en toute quantité, même sans stock │
 * │ et même sous inventaire : c'est ce qui permet de chiffrer une commande   │
 * │ et d'en sortir une PROFORMA, document qui dit lui-même n'être pas un     │
 * │ reçu. L'invariant qui compte est ailleurs, et il est intact : aucun      │
 * │ ticket de vente n'est jamais imprimé pour une vente que le serveur       │
 * │ refusera. Le stock négatif n'existe plus : aucun entrepôt ne laisse      │
 * │ encaisser au-delà de son disponible.                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ LE VERROU PASSE AVANT LE STOCK, comme chez le serveur, qui refuse les
 * produits bloqués avant de regarder les quantités : dire « stock
 * insuffisant » sur un article sous inventaire enverrait chercher au dépôt une
 * marchandise qui est là, mais interdite à la vente.
 *
 * ⚠ CHAQUE LIGNE SE VÉRIFIE CONTRE LE PANIER PRIVÉ D'ELLE-MÊME. `verifierAjout`
 * compte ce qui est déjà au panier ; lui passer la liste entière ferait qu'une
 * ligne posée exactement sur le disponible se compterait CONTRE ELLE-MÊME.
 */
export function lignesEnRupture(
  lines: LigneStockee[],
  options: OptionsEncaissement = {}
): Rupture[] {
  const ruptures: Rupture[] = [];

  lines.forEach((ligne, index) => {
    // ⚠ LE SEUIL EST `MIN_QUANTITY`, JAMAIS 1 : une ligne de 0,5 kg n'est pas
    // vide, et un seuil à 1 la laissait passer sans contrôle de stock.
    if (ligne.quantity < MIN_QUANTITY) return;

    const name = ligne.product.name || "Cet article";
    const base = { index, productId: ligne.product.id, name };

    const reference = options.verrous?.get(ligne.product.id);
    if (reference !== undefined) {
      ruptures.push({ ...base, cause: "verrou", raison: motifDuVerrou(name, reference) });
      return;
    }

    const autres = lines.filter((_, i) => i !== index);
    const verdict = verifierAjout(ligne.product, autres, {
      packages: ligne.packageQuantity,
      loose: looseQuantityOf(ligne),
    });
    if (verdict.ok || verdict.raison === null) return;

    if (stockInconnu(ligne.product)) {
      ruptures.push({ ...base, cause: "stock-inconnu", raison: motifStockInconnu(name) });
      return;
    }
    ruptures.push({ ...base, cause: "rupture", raison: verdict.raison });
  });

  return ruptures;
}

/** Les phrases qui ferment « Encaisser », une par ligne en cause. */
export function motifsEncaissement(
  lines: LigneStockee[],
  options: OptionsEncaissement = {}
): string[] {
  return lignesEnRupture(lines, options).map((r) => r.raison);
}

/**
 * Le panier peut-il être encaissé ?
 *
 * Faux dès qu'une ligne est en rupture ou verrouillée. La proforma, elle, reste
 * ouverte : c'est tout l'intérêt de séparer les deux.
 */
export function panierServable(
  lines: LigneStockee[],
  options: OptionsEncaissement = {}
): boolean {
  return lignesEnRupture(lines, options).length === 0;
}
