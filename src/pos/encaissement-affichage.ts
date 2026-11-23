/**
 * Ce que la feuille d'encaissement AFFICHE et PRÉREMPLIT, dans la devise que
 * le caissier encaisse.
 *
 * Les deux comptoirs (le terminal et le back-office) lisaient chacun ces règles
 * de leur côté, et le web ne les avait pas : son bouton annonçait 11,60 $ là où
 * il faut 11,61 $ pour solder une facture de 26 681 FC, et son récapitulatif
 * restait en devise de facture pendant que le caissier encaissait en francs.
 *
 * ⚠ RIEN DE CE QUE LA VENTE ENREGISTRE NE PASSE PAR ICI. La facture et le
 * ticket restent libellés en devise principale ; ce module ne fait que
 * ramener des montants vers la devise ACTIVE de la feuille, et choisir le plus
 * petit montant qui solde.
 */
import { MONEY_EPS } from "./money";
import type { SaleCurrencyTotals } from "./basket";
import { convertirSaisie, lireNombre } from "../nombres";

/** Comptant (le montant reçu doit solder) ou crédit (il n'est qu'un acompte). */
export type ModeReglement = "comptant" | "credit";

// --- Recalage du montant recu ---------------------------------------------

export interface RecalageInput {
  mode: ModeReglement;
  /** Total de la facture dans SA devise, points deja deduits. */
  totalFacture: number;
  deviseFacture: string;
  /** Devise dans laquelle le caissier encaisse. */
  deviseReglement: string;
  /**
   * Conversion PURE, SANS arrondi.
   *
   * ⚠ **Le nom porte le contrat, et ce n'est pas du zele.** `convertMoney` a la
   * MEME signature : la cabler ici compilerait sans un mot, et detruirait
   * l'information dont le plafond a besoin - 26 681 FC / 2300 vaut 11,60043...,
   * et `convertMoney` rend deja 11,60. Plafonner 11,60 rend 11,60, et le
   * sous-paiement revient. C'est `devises.convert` qu'il faut, la seule qui ne
   * perde rien, et l'appelant le lit dans le nom du champ.
   */
  convertirBrut: (montant: number, de: string, vers: string) => number;
  /** Nombre de decimales de la devise : 2 pour le dollar, 0 pour le franc. */
  decimalesDe: (code: string) => number;
}

/** Ce qu'il faut a `montantExigible`, sans le mode ni le reste du recalage. */
export type ExigibleInput = Omit<RecalageInput, "mode">;

/**
 * Le plus petit montant, dans la devise encaissee, qui SOLDE reellement la
 * facture.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ ON ARRONDIT VERS LE HAUT, ET C'EST UN CUL-DE-SAC QU'ON REFERME.         │
 * │                                                                          │
 * │ Le prereemplissage convertissait F -> R et arrondissait AU PLUS PROCHE ; │
 * │ puis `tendersIn` reconvertit R -> F et arrondit dans F. Quand l'unite    │
 * │ mineure de la devise ENCAISSEE vaut plus cher que celle de la devise de  │
 * │ FACTURE, l'aller-retour perd de l'argent :                               │
 * │                                                                          │
 * │   facture 26 681 FC, encaissement en USD, 1 USD = 2300 FC                │
 * │     26 681 / 2300 = 11,60043...  -> arrondi USD -> 11,60                 │
 * │     11,60 x 2300  = 26 680       -> arrondi CDF -> 26 680                │
 * │     26 680 < 26 681  =>  « sous-paye », bouton FERME                     │
 * │                                                                          │
 * │ Et le caissier n'a AUCUN moyen d'y repondre : aucun montant en dollars   │
 * │ ne vaut 26 681 FC. Mesure : 19 132 cas sur 40 000 a ce taux, avec un     │
 * │ manque jusqu'a ceil(taux/100) - 1 FC. C'est la configuration ORDINAIRE   │
 * │ en RDC - on facture en francs, le client paie en dollars.                │
 * │                                                                          │
 * │ Un vrai comptoir encaisse 11,61 $ et rend 22 FC de monnaie. Tolerer le   │
 * │ manque a la place ferait entrer une dette d'une unite mineure sur une    │
 * │ vente que le marchand croit soldee, et le solde du client deriverait     │
 * │ vente apres vente sans que rien ne le dise.                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ LA TOLERANCE EST RELATIVE A L'UNITE MINEURE, JAMAIS A `Number.EPSILON`. │
 * │                                                                          │
 * │ La premiere ecriture retranchait `Number.EPSILON * facteur`, soit une    │
 * │ garde ABSOLUE de 2,22e-14 pour deux decimales - alors que l'erreur       │
 * │ flottante CROIT avec la magnitude. Des que `converti * facteur` tombe un │
 * │ ulp au-dessus de l'entier, `Math.ceil` ajoutait une unite mineure qui    │
 * │ n'avait rien a faire la. Mesure sur 200 000 montants a deux decimales :  │
 * │                                                                          │
 * │   USD -> USD   9 160 sur-arrondis  = 4,58 %   (4,11 sortait a 4,12)      │
 * │   USD -> CDF   6 397 sur-arrondis                                        │
 * │   CDF -> USD     125 sur-arrondis                                        │
 * │                                                                          │
 * │ Et `convert` du noyau rend le montant TEL QUEL quand les deux devises    │
 * │ coincident : le defaut frappait donc le cas MONO-DEVISE, qui est le cas  │
 * │ ordinaire. Sur une vente de 4,11 $, le champ portait 4,11 et le bouton   │
 * │ annoncait « Encaisser 4,12 $ » - deux nombres pour un seul encaissement, │
 * │ et choisir un moyen de paiement suffisait a recaler le champ sur 4,12.   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `MONEY_EPS` est la tolerance deja employee par le projet, et par
 * `blocageEncaissement` sur le MEME couple de montants. Elle est sure dans les
 * deux sens : des milliers de fois au-dessus du bruit flottant, et tres en
 * dessous de ce que `tendersIn` - qui arrondit dans la devise de FACTURE -
 * peut voir. Mesure : zero sous-paiement introduit, dans les quatre
 * combinaisons de devises.
 *
 * ⚠ A devises EGALES, l'operation est neutre : `totalFacture` est deja arrondi
 * dans sa propre devise, donc le plafond ne deplace rien.
 */
export function montantExigible(e: ExigibleInput): number {
  const converti = e.convertirBrut(
    e.totalFacture,
    e.deviseFacture,
    e.deviseReglement,
  );
  const facteur = Math.pow(10, e.decimalesDe(e.deviseReglement));
  const produit = converti * facteur;
  const entier = Math.round(produit);
  // Un ecart de moins d'un millionieme d'unite mineure ne peut pas venir de la
  // CONVERSION : c'est la virgule flottante, et l'entier est ce qu'on veut.
  // Au-dela, le plafond est reel et il faut monter d'une unite.
  return (
    (Math.abs(produit - entier) < MONEY_EPS ? entier : Math.ceil(produit)) /
    facteur
  );
}

/**
 * Le montant a REPOSER dans le champ, ou `null` s'il ne faut pas y toucher.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ SANS CE RECALAGE, APPLIQUER DES POINTS ANNONCE UNE MONNAIE FAUSSE.       │
 * │                                                                          │
 * │ Le champ garde le total BRUT ; le caissier lit alors une « monnaie a     │
 * │ rendre » egale a la valeur des points au lieu du reste du, et il la rend  │
 * │ - le tiroir manque le soir de ce qu'il vient d'offrir deux fois. Le      │
 * │ back-office ferme ce defaut par `syncTenderToTotal` ; c'en est le        │
 * │ miroir.                                                                  │
 * │                                                                          │
 * │ ⚠ EN CREDIT ON NE TOUCHE A RIEN : le champ y est un acompte FACULTATIF,  │
 * │ et le remplir ferait d'une vente a credit une vente soldee, qui          │
 * │ n'inscrirait aucune dette. Le back-office a paye ce defaut.              │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
export function recalerReglement(e: RecalageInput): string | null {
  if (e.mode === "credit") return null;
  return String(montantExigible(e));
}

// --- Bascule de la devise d'encaissement ----------------------------------

export interface BasculeDeviseInput extends ExigibleInput {
  mode: ModeReglement;
  /** Ce que le champ porte AVANT la bascule. */
  saisie: string;
  /** Devise du champ AVANT la bascule. */
  deviseAvant: string;
  /**
   * Conversion PUIS arrondi (`convertMoney`) : celle qui preserve la valeur
   * tapee, et celle que `tendersIn` refait en sens inverse pour juger le
   * paiement. C'est donc elle, et pas `convert`, qui dit si un reglement solde.
   */
  convertirArrondi: (montant: number, de: string, vers: string) => number;
}

/**
 * Le montant a reposer dans le champ apres un changement de devise.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UNE BASCULE DE DEVISE NE REND JAMAIS INSUFFISANT UN REGLEMENT QUI        │
 * │ SOLDAIT.                                                                 │
 * │                                                                          │
 * │ L'ecran convertissait la saisie AU PLUS PROCHE pendant que la validation │
 * │ et le bouton employaient le PLAFOND :                                    │
 * │                                                                          │
 * │   facture 26 681 FC, 1 USD = 2300 FC                                     │
 * │     champ prerempli  : 26 681 CDF                                        │
 * │     bascule en USD   : 26 681 / 2300 arrondi au plus proche -> 11,60     │
 * │     tendersIn(11,60) : 11,60 x 2300 = 26 680  <  26 681                  │
 * │     => « sous-paye », bouton FERME... qui annonce « Encaisser 11,61 $ »  │
 * │                                                                          │
 * │ Le champ portait 11,60, le bouton disait 11,61, et AUCUN montant en      │
 * │ dollars ne soldait la facture. C'est le cul-de-sac que `montantExigible` │
 * │ a ete ecrit pour refermer, rouvert par une seconde porte - et l'ecran se │
 * │ contredisait lui-meme sur le meme rendu.                                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ **Un montant PARTIEL reste converti, et c'est la moitie de la regle.** La
 * doctrine de `convertirSaisie` ne bouge pas - « on convertit, on n'efface
 * jamais » - et relever un acompte que le caissier a voulu partiel serait lui
 * reprendre sa saisie. On ne repose le plafond que lorsque la bascule vient de
 * faire PERDRE une suffisance qui etait la.
 */
export function montantApresBasculeDevise(e: BasculeDeviseInput): string {
  const converti = convertirSaisie(e.saisie, e.deviseAvant, e.deviseReglement, {
    convertir: e.convertirArrondi,
    decimales: e.decimalesDe,
  });

  // En credit le champ est un ACOMPTE facultatif : il ne solde rien, donc il
  // n'y a aucun plancher a tenir. Lui en imposer un ferait d'une vente a
  // credit une vente soldee, qui n'inscrirait aucune dette.
  if (e.mode === "credit") return converti;

  // « Solder » se lit exactement comme `tendersIn` le calcule sur un reglement
  // unique : conversion PUIS arrondi dans la devise de facture, avec la meme
  // tolerance que le bouton. Une seconde formule ici, et les deux divergeraient.
  const solde = (montant: string, devise: string): boolean => {
    const lu = lireNombre(montant);
    if (!lu.ok || lu.valeur == null) return false;
    return (
      e.convertirArrondi(lu.valeur, devise, e.deviseFacture) + MONEY_EPS >=
      e.totalFacture
    );
  };

  if (!solde(e.saisie, e.deviseAvant)) return converti;
  if (solde(converti, e.deviseReglement)) return converti;
  return String(montantExigible(e));
}

// --- La devise ACTIVE de la feuille ---------------------------------------
//
// ┌──────────────────────────────────────────────────────────────────────────┐
// │ UNE SEULE DEVISE POUR TOUTE LA FEUILLE, ET CE N'EST PAS LA FACTURE.      │
// │                                                                          │
// │ Le caissier choisit la devise dans laquelle il ENCAISSE (celle du        │
// │ règlement), et tous les montants de la feuille se lisent dans celle-là : │
// │ le récapitulatif, le total, ce qu'il manque, la cagnotte, la dette. Sans │
// │ cela il annonçait « 2 645 000 FC » à son client en lisant « 1 150 $ » à  │
// │ l'écran, et faisait la conversion de tête.                               │
// │                                                                          │
// │ ⚠ LA FACTURE, ELLE, NE BOUGE PAS (décision du 2026-11-22) : elle et le   │
// │ ticket restent libellés en devise principale, comme au back-office. Ce   │
// │ qui suit est donc de l'AFFICHAGE, et rien de ce que la vente enregistre  │
// │ ne passe par ici.                                                        │
// └──────────────────────────────────────────────────────────────────────────┘

/** De quoi ramener un montant de la feuille dans la devise active. */
export interface AffichageEnDevise {
  /** La devise de la facture : celle dans laquelle le panier totalise. */
  deviseFacture: string;
  /** La devise choisie dans la feuille, celle du montant reçu. */
  deviseActive: string;
  /** Conversion PUIS arrondi : `convertMoney`. */
  convertirArrondi: (montant: number, de: string, vers: string) => number;
  /** Conversion BRUTE : `convert`. Voir `montantExigible`. */
  convertirBrut: (montant: number, de: string, vers: string) => number;
  decimalesDe: (code: string) => number;
}

/**
 * L'autre devise d'un établissement qui en tient EXACTEMENT deux.
 *
 * C'est elle qui porte l'équivalent entre parenthèses. Au-delà de deux, il n'y
 * a plus « l'autre » devise, et en écrire plusieurs entre parenthèses ferait
 * d'un total une ligne de chiffres : on n'en écrit aucune.
 */
export function deviseNonActive(
  active: string,
  devisesActives: readonly string[],
): string | null {
  const distinctes = [...new Set(devisesActives)];
  if (distinctes.length !== 2 || !distinctes.includes(active)) return null;
  return distinctes.find((c) => c !== active) ?? null;
}

/** Un montant de la feuille, ramené dans la devise active au plus proche. */
export function versActive(
  montant: number,
  depuis: string,
  a: AffichageEnDevise,
): number {
  return depuis === a.deviseActive
    ? montant
    : a.convertirArrondi(montant, depuis, a.deviseActive);
}

/**
 * Un montant ramené dans la devise active SANS JAMAIS LE DÉPASSER.
 *
 * Pour un plafond qu'on préremplit dans un champ : arrondi au plus proche, la
 * cagnotte de 434,78 $ redeviendrait 1 000 001 FC, au-dessus de ce que le
 * client possède, et le champ se refuserait lui-même à l'ouverture.
 */
export function versActiveSansDepasser(
  montant: number,
  depuis: string,
  a: AffichageEnDevise,
): number {
  if (depuis === a.deviseActive) return montant;
  const facteur = Math.pow(10, a.decimalesDe(a.deviseActive));
  const produit = a.convertirBrut(montant, depuis, a.deviseActive) * facteur;
  // ┌──────────────────────────────────────────────────────────────────────┐
  // │ LE TAUX STOCKÉ N'EST PAS EXACT, ET LA TOLÉRANCE DOIT LE SAVOIR.      │
  // │                                                                      │
  // │ Le franc est rangé à 0,000434782609 le dollar, soit 1/2300 arrondi à │
  // │ douze décimales : 360 $ y font 827 999,9994 FC. Avec la tolérance de │
  // │ `montantExigible` (un millionième d'unité), l'arrondi vers le bas    │
  // │ rendait 827 999 FC pour une cagnotte de 828 000 FC (relevé sur le    │
  // │ rk3568). L'erreur RELATIVE d'un taux à douze décimales ne dépasse    │
  // │ pas 2e-9 sur les devises du catalogue : on tolère 1e-8, et pas plus, │
  // │ pour qu'une vraie fraction (999 999,98 FC) reste arrondie vers le    │
  // │ bas.                                                                 │
  // │                                                                      │
  // │ Sans risque, parce qu'un plafond prérempli est REBORNÉ en principale │
  // │ à la validation (`cagnotteVersPrincipale`) : on ne peut pas utiliser │
  // │ un centime de plus que ce que le client possède.                     │
  // └──────────────────────────────────────────────────────────────────────┘
  const tolerance = Math.max(MONEY_EPS, Math.abs(produit) * 1e-8);
  const plancher = Math.floor(produit);
  return (produit - plancher > 1 - tolerance ? plancher + 1 : plancher) / facteur;
}

/** Le total à payer, et son équivalent dans l'autre devise. */
export interface RecapitulatifAffiche {
  devise: string;
  sousTotal: number;
  remisesArticles: number;
  remise: number;
  cagnotte: number;
  taxe: number;
  /**
   * Ce qu'il faut RECEVOIR dans la devise active : `montantExigible`, le même
   * nombre que le bouton « Encaisser » et le champ prérempli. Le total au plus
   * proche annoncerait 11,60 $ là où il faut 11,61 $ pour solder la facture.
   */
  total: number;
  /** L'équivalent entre parenthèses, `null` sans seconde devise. */
  equivalent: { montant: number; devise: string } | null;
  /**
   * La facture est-elle établie dans une AUTRE devise que celle affichée ?
   * Alors les lignes sont des conversions arrondies, qui peuvent différer
   * d'une unité du total, et l'écran le dit.
   */
  convertie: boolean;
}

export function recapitulatifAffiche(
  e: AffichageEnDevise & {
    facture: Pick<
      SaleCurrencyTotals,
      "subtotal" | "itemDiscount" | "globalDiscount" | "loyaltyDiscount" | "tax"
    >;
    /** Total de la facture dans SA devise, cagnotte déduite. */
    totalFacture: number;
    devisesActives: readonly string[];
  },
): RecapitulatifAffiche {
  const ligne = (m: number) => versActive(m, e.deviseFacture, e);
  const autre = deviseNonActive(e.deviseActive, e.devisesActives);
  return {
    devise: e.deviseActive,
    sousTotal: ligne(e.facture.subtotal),
    remisesArticles: ligne(e.facture.itemDiscount),
    remise: ligne(e.facture.globalDiscount),
    cagnotte: ligne(e.facture.loyaltyDiscount),
    taxe: ligne(e.facture.tax),
    total: montantExigible({
      totalFacture: e.totalFacture,
      deviseFacture: e.deviseFacture,
      deviseReglement: e.deviseActive,
      convertirBrut: e.convertirBrut,
      decimalesDe: e.decimalesDe,
    }),
    equivalent: autre
      ? {
          // L'autre devise est la FACTURE : c'est son total exact qu'on écrit,
          // pas une conversion aller-retour.
          montant:
            autre === e.deviseFacture
              ? e.totalFacture
              : e.convertirArrondi(e.totalFacture, e.deviseFacture, autre),
          devise: autre,
        }
      : null,
    convertie: e.deviseActive !== e.deviseFacture,
  };
}

/**
 * Ce qu'il manque, dans la devise active : ce qu'il faut ENCORE remettre.
 *
 * Par `montantExigible`, comme le total : « il manque 11,60 $ » alors que
 * 11,60 $ ne suffisent pas ferait refaire un aller-retour au caissier.
 */
export function manqueAffiche(manque: number, a: AffichageEnDevise): number {
  if (manque <= 0) return 0;
  return montantExigible({
    totalFacture: manque,
    deviseFacture: a.deviseFacture,
    deviseReglement: a.deviseActive,
    convertirBrut: a.convertirBrut,
    decimalesDe: a.decimalesDe,
  });
}

/**
 * Le montant de cagnotte saisi dans la devise active, ramené dans la devise
 * PRINCIPALE où la cagnotte est tenue, et borné par le plafond de la vente.
 *
 * ⚠ ARRONDI AUX DÉCIMALES DE LA PRINCIPALE : 1 000 000 FC valent 434,7826 $,
 * et le serveur refuse un montant à quatre décimales - la vente entière
 * partirait en quarantaine, ticket imprimé.
 */
export function cagnotteVersPrincipale(e: {
  saisie: number;
  deviseActive: string;
  principale: string;
  /** Le plafond de la vente, en principale. */
  plafond: number;
  convertirBrut: (montant: number, de: string, vers: string) => number;
  arrondir: (montant: number, code: string) => number;
}): number {
  const enPrincipale =
    e.deviseActive === e.principale
      ? e.saisie
      : e.arrondir(e.convertirBrut(e.saisie, e.deviseActive, e.principale), e.principale);
  return Math.max(0, Math.min(enPrincipale, e.plafond));
}

/**
 * Le repère de taux, « 1 USD = 2 300 FC », dans le sens où le nombre se lit.
 *
 * ⚠ « 1 CDF = 0 $ » sortait d'un franc converti en dollars puis arrondi au
 * centime : un repère qui ne dit rien. On écrit toujours la devise FORTE à
 * gauche, quelle que soit la devise reçue.
 */
export function libelleDuTaux(
  deviseRecue: string,
  deviseFacture: string,
  convertirArrondi: (montant: number, de: string, vers: string) => number,
  argent: (montant: number, code: string) => string,
): string {
  const [forte, faible] =
    convertirArrondi(1, deviseRecue, deviseFacture) >= 1
      ? [deviseRecue, deviseFacture]
      : [deviseFacture, deviseRecue];
  return `1 ${forte} = ${argent(convertirArrondi(1, forte, faible), faible)}`;
}
