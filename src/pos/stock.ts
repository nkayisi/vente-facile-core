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
 * - `addableBase` rend `null` pour « AUCUNE BORNE » : stock non suivi, ou
 *   entrepôt tolérant le découvert. On peut ajouter autant qu'on veut.
 * - `addableChannels` rend `null` pour « PARTAGE INCONNU » : la ligne de stock
 *   ne dit pas ce qui est scellé et ce qui est en vrac. On ne sait rien, et on
 *   n'invente surtout pas un zéro bloquant : le serveur reste seul juge.
 *
 * Les deux se lisent « pas de nombre à opposer au caissier », ce qui est
 * précisément pourquoi ils ne peuvent pas porter le même nom.
 */
import { remainingChannels, type ChannelAvailability } from "../packaging";
import { packagingFactorOf, looseQuantityOf, type BasketLine } from "./basket";

export interface StockedProductLike {
  id: string;
  name?: string | null;
  selling_mode?: string | null;
  units_per_package?: number | null;
  unit_name?: string | null;
  packaging_unit_name?: string | null;
  track_inventory?: boolean | null;
  allow_negative_stock?: boolean | null;
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
 * `null` signifie AUCUNE BORNE : le stock n'est pas suivi, ou l'entrepôt tolère
 * le découvert. Le serveur applique la même règle.
 */
export function addableBase(
  product: StockedProductLike,
  lines: BasketLine[]
): number | null {
  if (!product.track_inventory || product.allow_negative_stock) return null;
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
 * Borne absente si l'entrepôt tolère le découvert, comme le fait
 * `PackagingService.assert_sealed_available`.
 */
export function addableSealed(
  product: StockedProductLike,
  lines: BasketLine[],
  options: { ignoreCartLine?: boolean } = {}
): number | null {
  if (!product.track_inventory || product.allow_negative_stock) return null;
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
  const packages = factor ? Math.max(0, Math.floor(saisie.packages)) : 0;
  const loose = Math.max(0, Math.floor(saisie.loose));
  const quantity = factor ? packages * factor + loose : loose;
  const nom = product.name || "Cet article";
  const base = { quantity, packageQuantity: packages };

  if (quantity < 1) {
    return { ...base, ok: false, raison: "Indiquez une quantité." };
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
          ? `Stock insuffisant pour ${nom} : ${total} en stock, ${dejaAuPanier} déjà au panier.`
          : `Stock insuffisant pour ${nom} : ${total} en stock.`,
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
        raison: `Il ne reste que ${scelles} ${mot}${
          scelles > 1 ? "s" : ""
        } en scellé pour ${nom}.`,
      };
    }
  }

  return { ...base, ok: true, raison: null };
}
