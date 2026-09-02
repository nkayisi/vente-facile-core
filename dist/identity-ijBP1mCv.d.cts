/**
 * Jetons de mise en page du ticket thermique.
 *
 * Tout est en millimètres, unité native du PDF produit. L'ancien générateur
 * semait des `y += 0.5`, `y += 1`, `y += 1.5` sans échelle : le rythme vertical
 * était illisible et impossible à corriger sans tout remesurer. Ici, une seule
 * échelle d'espacement et trois épaisseurs de filet porteuses de sens.
 */
type PaperWidth = 58 | 80;
/**
 * Rôles typographiques. Le ticket précédent écrivait presque tout en 9 pt, d'où
 * l'absence de hiérarchie : le client ne savait pas où poser l'œil.
 */
type FontRole = "orgName" | "band" | "total" | "chip" | "body" | "label" | "legal";
interface FontSpec {
    size: number;
    bold: boolean;
}
declare const FONTS: Record<FontRole, FontSpec>;
type SpaceSize = "xs" | "sm" | "md" | "lg";
type RuleWeight = "heavy" | "light" | "hair";
interface Tokens {
    paperWidth: number;
    margin: number;
    /** Largeur réellement écrivable, filets compris. */
    contentWidth: number;
    /** Blanc de tête : confort de découpe sur imprimante thermique. */
    topPadding: number;
    /** Blanc de pied : l'avance papier ne doit pas rogner la dernière ligne. */
    bottomPadding: number;
    space: Record<SpaceSize, number>;
    rule: Record<RuleWeight, number>;
    /** Blanc minimal entre un libellé et son montant sur une ligne justifiée. */
    minGap: number;
    /** Retrait des lignes secondaires (conditionnement, remise de ligne). */
    indent: number;
    /** Hauteur maximale du logo. */
    logoMaxHeight: number;
    /** Bornes horizontales des colonnes du tableau d'articles, en fraction. */
    itemCols: {
        name: number;
        qty: number;
        unitPrice: number;
    };
}
declare function tokensFor(paperWidth: PaperWidth): Tokens;
/**
 * Interligne d'un corps donné.
 *
 * Le facteur 0,385 reproduit l'ancien couple (11 pt → 4,2 mm ; 9 pt → 3,5 mm)
 * pour que la densité du ticket reste celle que les marchands connaissent.
 */
declare function leading(size: number): number;
declare function leadingOf(role: FontRole): number;

/**
 * Modèle déclaratif du ticket.
 *
 * Un document ne se dessine plus : il se décrit. C'est ce qui met fin à la
 * duplication structurelle de l'ancien générateur, où chaque document existait
 * en double (une fonction qui traçait, une fonction miroir qui rejouait les
 * mêmes conditions pour estimer la hauteur en millimètres). Il fallait corriger
 * deux fois, sinon le PDF finissait par une bande blanche ou tronquait sa
 * dernière ligne.
 *
 * Ici, `render-pdf.ts` parcourt cette liste UNE fois : il en tire à la fois la
 * hauteur et les primitives de tracé. Mesure et rendu ne peuvent plus diverger.
 */

/** Ligne clé / valeur. */
interface KvRow {
    label: string;
    value: string;
    /** Met la valeur en gras : réservé à la ligne qui porte le sens du bloc. */
    strong?: boolean;
}
/** Ligne de montant : la valeur est un montant déjà formaté. */
interface AmountRow {
    label: string;
    value: string;
    strong?: boolean;
}
interface ItemRow {
    name: string;
    /** Quantité brute, telle qu'elle tient dans la colonne. */
    quantity: string;
    unitPrice: string;
    total: string;
    /**
     * Conditionnement lisible par le client : « 2 cartons + 3 bouteilles ».
     * La colonne quantité est trop étroite pour le porter, il passe en dessous.
     */
    quantityLabel?: string;
    /** Remise de ligne, en pourcentage. */
    discountPercentage?: number;
}
type Block = 
/**
 * Logo déjà chargé en dataURL, avec son rapport largeur / hauteur : la mise en
 * page se calcule avant tout tracé et ne peut donc pas interroger l'image.
 * Bloc simplement absent si le chargement a échoué.
 */
{
    kind: "logo";
    dataUrl: string;
    format: "PNG" | "JPEG";
    aspectRatio: number;
}
/** Texte, replié sur la largeur utile. */
 | {
    kind: "text";
    text: string;
    role: FontRole;
    align?: "left" | "center";
    italic?: boolean;
    muted?: boolean;
    indent?: boolean;
}
/**
 * Bandeau d'identification du document, en vidéo inversée.
 * Sur du papier thermique monochrome, c'est le seul dispositif qui se repère
 * dans une liasse sans avoir à lire.
 */
 | {
    kind: "band";
    text: string;
    sub?: string;
}
/** Pastille inversée, plus courte que le bandeau : DUPLICATA, DETTE SOLDÉE. */
 | {
    kind: "chip";
    text: string;
}
/**
 * Bloc clé / valeur.
 * `inline` colle la valeur au libellé et replie en retrait : c'est le mode des
 * champs d'identité, où justifier à droite laissait 28 mm de vide entre
 * « Client: » et le nom sur un ticket de 53 mm.
 * `justified` pousse la valeur à droite : réservé aux colonnes de chiffres,
 * là où l'œil balaie verticalement.
 */
 | {
    kind: "kv";
    rows: KvRow[];
    mode: "inline" | "justified";
    role?: FontRole;
}
/** Tableau des articles, en-tête compris. */
 | {
    kind: "items";
    rows: ItemRow[];
}
/** Colonne de montants justifiés, mesurés avant tracé. */
 | {
    kind: "amounts";
    rows: AmountRow[];
    role?: FontRole;
}
/** Le chiffre du document : libellé discret, montant en grand dessous. */
 | {
    kind: "total";
    label: string;
    value: string;
} | {
    kind: "rule";
    weight: RuleWeight;
} | {
    kind: "space";
    size: SpaceSize;
};
/**
 * Retire les entrées absentes pour que les documents s'écrivent en une seule
 * expression, conditions comprises. Générique : sert autant aux blocs qu'aux
 * lignes clé / valeur.
 */
declare function compact<T>(items: (T | null | false | undefined | "")[]): T[];

/**
 * En-tête et pied communs à tous les documents imprimés.
 *
 * La base porte depuis toujours `logo`, `address`, `city`, `phone`, `rccm`,
 * `id_nat` et `tax_id` sur l'organisation : rien ne les imprimait. Les tickets
 * sortaient avec le seul nom de la boutique, sans même l'adresse, ce qui est un
 * problème d'identification autant que de conformité pour un commerçant en RDC.
 */

interface OrgIdentity {
    name: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    /** Registre du commerce. */
    rccm?: string;
    /** Identification nationale. */
    idNat?: string;
    /** Numéro impôt. */
    taxId?: string;
    logo?: LoadedLogo;
}
interface LoadedLogo {
    dataUrl: string;
    format: "PNG" | "JPEG";
    aspectRatio: number;
}
interface ReceiptChrome {
    org: OrgIdentity;
    /**
     * En-tête libre saisi par le marchand. Il COMPLÈTE désormais le bloc
     * d'identité au lieu de le remplacer : l'ancien générateur écrasait nom,
     * adresse et téléphone dès qu'un en-tête personnalisé existait, si bien qu'un
     * marchand qui voulait ajouter un slogan perdait ses coordonnées.
     */
    header?: string;
    footer?: string;
}
/** Blocs d'en-tête : logo, identité, coordonnées, mentions légales. */
declare function orgHeaderBlocks(chrome: ReceiptChrome): Block[];
/**
 * Blocs de pied. `defaultLines` sert quand le marchand n'a rien personnalisé :
 * chaque document propose sa propre formule de politesse.
 */
declare function footerBlocks(chrome: ReceiptChrome, defaultLines: string[]): Block[];

export { type AmountRow as A, type Block as B, FONTS as F, type ItemRow as I, type KvRow as K, type LoadedLogo as L, type OrgIdentity as O, type PaperWidth as P, type ReceiptChrome as R, type SpaceSize as S, type Tokens as T, type FontRole as a, type FontSpec as b, type RuleWeight as c, compact as d, leadingOf as e, footerBlocks as f, leading as l, orgHeaderBlocks as o, tokensFor as t };
