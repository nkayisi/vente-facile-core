/**
 * La douchette (lecteur de codes-barres) : ce qui distingue un scan d'une
 * frappe, et ce qu'un scan fait pendant une saisie de quantité.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UNE SEULE RÈGLE POUR LES DEUX COMPTOIRS.                                 │
 * │                                                                          │
 * │ Le back-office la tenait dans `frontend/lib/pos/` ; le terminal en a     │
 * │ besoin pour ses lecteurs intégrés, qui se présentent comme un clavier.   │
 * │ Une copie tenue à la main finirait par compter quarante millisecondes   │
 * │ d'un côté et cinquante de l'autre, et un même lecteur scannerait sur le  │
 * │ web sans rien faire au comptoir. La règle vit donc ici, une fois.       │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
import { roundQuantity } from "../packaging";

/**
 * ─── Reconnaître une douchette (lecteur de codes-barres) dans le flux du clavier.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UNE DOUCHETTE EST UN CLAVIER QUI TAPE TRÈS VITE, PUIS ENTRÉE.            │
 * │                                                                          │
 * │ Branchée en USB ou en Bluetooth, elle « tape » le code lu caractère par  │
 * │ caractère, à quelques millisecondes d'intervalle, et finit par Entrée.   │
 * │ Personne ne tape quatre caractères à moins de quarante millisecondes     │
 * │ l'un de l'autre : c'est ce qui sépare un scan d'une frappe, sans rien    │
 * │ demander au vendeur ni lui imposer de cliquer dans un champ.             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Module PUR : l'instant de chaque touche est INJECTÉ, pour que la règle
 * s'éprouve sans navigateur ni horloge.
 */

/** L'écart maximal entre deux caractères d'un même scan. */
export const ECART_MAX_MS = 40;
/** Le délai toléré entre le dernier caractère et Entrée. */
export const ECART_ENTREE_MAX_MS = 120;
/** En deçà, c'est trop court pour un code-barres. */
export const LONGUEUR_MIN = 4;

export interface EtatDouchette {
  /** Les caractères de la rafale en cours, tous tapés à moins d'`ECART_MAX_MS`. */
  tampon: string;
  /** L'instant de la dernière touche, `null` avant la première. */
  dernier: number | null;
}

export const DOUCHETTE_AU_REPOS: EtatDouchette = { tampon: "", dernier: null };

/**
 * Une touche de plus. Rend le nouvel état, et le code lu quand la rafale se
 * termine par Entrée.
 *
 * `touche` est `KeyboardEvent.key` : un caractère imprimable fait une seule
 * lettre, Entrée s'écrit « Enter ». Toute autre touche (Maj, flèches) est
 * ignorée sans rompre la rafale : une douchette en azerty envoie Maj pour
 * chaque chiffre.
 */
export function frapper(
  etat: EtatDouchette,
  touche: string,
  instant: number
): { etat: EtatDouchette; code: string | null } {
  const ecart = etat.dernier == null ? Infinity : instant - etat.dernier;

  if (touche === "Enter") {
    const code =
      etat.tampon.length >= LONGUEUR_MIN && ecart <= ECART_ENTREE_MAX_MS ? etat.tampon : null;
    return { etat: DOUCHETTE_AU_REPOS, code };
  }

  if (touche.length !== 1) return { etat, code: null };

  // Trop lent : une frappe humaine. La rafale repart de cette touche.
  const tampon = ecart <= ECART_MAX_MS ? etat.tampon + touche : touche;
  return { etat: { tampon, dernier: instant }, code: null };
}

/**
 * Les codes à essayer, dans l'ordre, pour un scan tapé dans la recherche.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN SCAN TRONQUÉ EN TÊTE NE DOIT PAS PROPOSER UN MAUVAIS ARTICLE.         │
 * │                                                                          │
 * │ Si le tout premier caractère arrive un peu tard (lecteur Bluetooth,      │
 * │ poste chargé), la rafale repart du deuxième : « 87687GJHGD » se lit     │
 * │ « 7687GJHGD ». Introuvable, il proposerait de CRÉER un article sous un   │
 * │ code faux. Tapé dans la recherche, le champ porte pourtant le code      │
 * │ entier : il devient le second candidat, essayé si le premier ne trouve  │
 * │ rien. Hors de la recherche il n'y a pas de champ, donc rien à rattraper. │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export function candidatsDuScan(code: string, valeurDuChamp: string | null): string[] {
  const complet = (valeurDuChamp ?? "").trim();
  if (complet && complet !== code && complet.endsWith(code)) return [code, complet];
  return [code];
}

/**
 * ─── Un scan de douchette pendant que la saisie de quantité est ouverte.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ LE CODE-BARRES S'ÉCRIVAIT DANS LE CHAMP QUANTITÉ, PUIS ENTRÉE VALIDAIT.  │
 * │                                                                          │
 * │ La douchette « tape » : re-scanner l'article pendant que sa quantité est │
 * │ ouverte écrivait 600123456789 dans le champ, et l'Entrée de la rafale    │
 * │ ajoutait cette quantité au panier. Le scan est désormais reconnu dans le │
 * │ champ même : la saisie est rétablie telle qu'avant la rafale, le même    │
 * │ article ajoute 1 (scanner deux fois donne 2), un autre est refusé.       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Les caractères de la rafale atteignent le champ avant qu'on sache que c'est
 * un scan : on mémorise donc l'état de la saisie avant la rafale, et on le
 * rend au code lu. « Avant la rafale », c'est la dernière touche venue après
 * une pause plus longue que ce qu'une douchette tolère entre son dernier
 * caractère et Entrée : un premier caractère lu en retard (scan tronqué en
 * tête) ne déplace donc pas ce point de reprise.
 *
 * Module PUR : l'instant de chaque touche est injecté.
 */

export interface EtatRescan<T> {
  douchette: EtatDouchette;
  /** L'état de la saisie avant la rafale en cours, `null` au repos. */
  avant: T | null;
  /** Tout ce qui a été tapé depuis `avant`, pour un scan tronqué en tête. */
  brut: string;
  dernier: number | null;
}

export function rescanAuRepos<T>(): EtatRescan<T> {
  return { douchette: DOUCHETTE_AU_REPOS, avant: null, brut: "", dernier: null };
}

export interface ScanDansLaSaisie<T> {
  /** Les codes à essayer, dans l'ordre (`candidatsDuScan`). */
  candidats: string[];
  /** La saisie à rétablir : celle d'avant la rafale. */
  avant: T;
}

/**
 * Une touche dans le champ quantité. `courant` est l'état de la saisie AVANT
 * cette touche (un `keydown` précède la frappe).
 */
export function frapperDansLaSaisie<T>(
  etat: EtatRescan<T>,
  touche: string,
  instant: number,
  courant: T
): { etat: EtatRescan<T>; scan: ScanDansLaSaisie<T> | null } {
  const r = frapper(etat.douchette, touche, instant);

  if (touche === "Enter") {
    const scan =
      r.code && etat.avant !== null
        ? { candidats: candidatsDuScan(r.code, etat.brut), avant: etat.avant }
        : null;
    return { etat: rescanAuRepos<T>(), scan };
  }

  if (touche.length !== 1) return { etat: { ...etat, douchette: r.etat }, scan: null };

  const pause = etat.dernier == null || instant - etat.dernier > ECART_ENTREE_MAX_MS;
  return {
    etat: {
      douchette: r.etat,
      avant: pause ? courant : etat.avant,
      brut: (pause ? "" : etat.brut) + touche,
      dernier: instant,
    },
    scan: null,
  };
}

/** Le code lu désigne-t-il cet article (code-barres ou SKU, casse ignorée) ? */
export function estLeMemeArticle(
  candidats: string[],
  article: { barcode?: string | null; sku?: string | null }
): boolean {
  const codes = [article.barcode, article.sku]
    .map((c) => (c ?? "").trim().toLowerCase())
    .filter(Boolean);
  return candidats.some((c) => codes.includes(c.trim().toLowerCase()));
}


/**
 * La quantité d'un canal après un re-scan du MÊME article : un de plus.
 *
 * Scanner deux fois donne 2 : c'est le geste du caissier qui compte ses
 * articles en les passant sous le lecteur. Une saisie vide ou illisible
 * repart de zéro, jamais d'un nombre inventé.
 */
export function quantiteApresRescan(valeur: number): number {
  const base = Number.isFinite(valeur) && valeur > 0 ? valeur : 0;
  return roundQuantity(base + 1);
}
