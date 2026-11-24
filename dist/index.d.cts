export { C as ChannelAvailability, a as CurrencyFallback, b as CurrencyInfo, c as CurrencyTable, M as MAX_QUANTITY, d as MIN_QUANTITY, e as MONEY_EPS, f as MoneyHelpers, O as OrganizationCurrency, g as OrganizationCurrencyLike, P as PackagedProductLike, h as Packaging, Q as QUANTITY_DECIMALS, i as QUANTITY_INTEGER_DIGITS, S as StockCounters, j as availableBase, k as availableSplit, l as createCurrencyTable, m as createMoneyHelpers, n as formatPackaged, o as formatPackagedDifference, p as formatPackagedSplit, q as formatQuantity, r as formatUnitQuantity, s as getPackaging, t as pos, u as r2, v as remainingChannels, w as roundQuantity, x as splitPackaged, y as toBaseQuantity } from './index-DpNPyo57.cjs';
export { i as receipt } from './index-tCdb6whH.cjs';

/**
 * Formatage français, sans `Intl`.
 *
 * Motif : Hermes, le moteur JavaScript de React Native, n'embarque pas l'ICU
 * complète. `Intl.NumberFormat("fr-CD")` et `toLocaleDateString("fr-CD")` y
 * rendent selon la plateforme, la version d'OS et l'option `jsEngine` : le même
 * montant peut sortir « 1 234,5 » sur un appareil et « 1,234.5 » sur un autre,
 * et un mois court peut revenir en anglais. Sur une application qui imprime des
 * reçus, c'est inacceptable.
 *
 * Ces fonctions reproduisent EXACTEMENT ce que rend `Intl` en `fr-CD` sur un
 * navigateur à ICU complète, relevé et figé ici :
 *   - séparateur de milliers : espace fine insécable U+202F ;
 *   - séparateur décimal : virgule ;
 *   - mois courts : « janv. », « févr. », « août », « déc. » ;
 *   - zéros décimaux de queue supprimés (`maximumFractionDigits` sans minimum).
 *
 * La bascule du web sur ce module est donc à rendu constant.
 *
 * À ne pas confondre avec `receipt/money.ts`, qui groupe avec une espace
 * ORDINAIRE et sépare les décimales par un POINT. Cette divergence est
 * volontaire et documentée : la police Helvetica intégrée à jsPDF rend U+202F
 * en « / ». Les deux conventions coexistent donc, l'une à l'écran, l'autre sur
 * le papier. Les unifier est un changement de rendu, pas un nettoyage.
 */
/** Espace fine insécable, séparateur de milliers du français. */
declare const NNBSP = "\u202F";
declare function monthShort(monthIndex: number): string;
declare function monthLong(monthIndex: number): string;
declare function weekdayLong(dayIndex: number): string;
/**
 * Nombre à la française, décimales de queue supprimées.
 *
 * Équivalent de `Intl.NumberFormat("fr-CD", { minimumFractionDigits: 0,
 * maximumFractionDigits })`. `formatFixed` sert quand le nombre de décimales
 * doit être tenu quoi qu'il arrive (colonnes de montants alignées).
 */
declare function formatNumberFr(value: number, maximumFractionDigits: number): string;
/** Nombre à la française avec un nombre de décimales imposé. */
declare function formatFixedFr(value: number, fractionDigits: number): string;
/** « 28 août 2026 », en heure locale de l'appareil. */
declare function formatDateFr(date: Date): string;
/** « 28 août, 11:30 », en heure locale de l'appareil. */
declare function formatDateTimeFr(date: Date): string;
/** « 11:30 ». */
declare function formatTimeFr(date: Date): string;

/**
 * Utilitaires de formatage pour l'affichage des nombres et prix.
 *
 * **Les montants s'écrivent TOUJOURS en entier.** Pas de « 2,33 M », pas de
 * « 1,2 Md », pas de `notation: "compact"`. La plateforme s'adresse à des
 * commerçants qui ne pratiquent pas forcément cette écriture : un montant
 * abrégé est pour eux un montant qu'ils ne savent pas lire, et un chiffre
 * qu'on ne sait pas lire ne renseigne pas, il inquiète.
 *
 * Quand un montant ne tient pas dans sa carte, c'est la TAILLE DU TEXTE qui
 * cède, jamais le nombre de chiffres (voir `StatValue`).
 *
 * Le rendu passe par `intl-fr.ts` et non par `Intl` : voir l'en-tête de ce
 * module pour le motif (Hermes n'embarque pas l'ICU complète). Le résultat est
 * identique à ce que rendait `Intl.NumberFormat("fr-CD")`.
 */
declare function setDefaultCurrency(symbol: string, decimalPlaces: number, code?: string): void;
declare function getDefaultCurrency(): {
    symbol: string;
    decimal_places: number;
    code: string;
};
/**
 * Formate un prix avec séparateur de milliers et symbole de devise.
 * Utilise la devise par défaut de l'organisation si aucun paramètre n'est fourni.
 * Affiche les décimales exactes de la valeur stockée (ex: 2.3 → "2,3").
 * Ex: formatPrice(20000) → "20 000 FC"
 * Ex: formatPrice(2.3) → "2,3 FC"
 * Ex: formatPrice(10.50) → "10,5 FC"
 */
declare function formatPrice(price: string | number, symbol?: string): string;
/**
 * Formate un nombre entier avec séparateur de milliers.
 * Ex: 20000 → "20 000", 1500 → "1 500"
 */
declare function formatNumber(num: number | string): string;
/**
 * Formate un nombre décimal (ex: quantités) avec séparateur de milliers.
 * Ex: 20000.500 → "20 000,5"
 */
declare function formatDecimal(num: number | string, decimals?: number): string;
/**
 * Formate un prix sans le symbole de devise (pour les exports CSV).
 * Affiche les décimales telles quelles sans forcer un nombre fixe.
 * Ex: formatPriceValue(20000.50) → "20000.5"
 */
declare function formatPriceValue(price: string | number): string;
/**
 * Formate un pourcentage.
 * Ex: 15.5 → "15,5%"
 */
declare function formatPercent(num: number | string): string;
/** Formate une date en format court français : « 28 août 2026 ». */
declare function formatDate(dateStr: string): string;
/** Formate une date avec heure : « 28 août, 11:30 ». */
declare function formatDateTime(dateStr: string): string;

/**
 * Liste complète des devises supportées par la plateforme
 */
interface CurrencyOption {
    code: string;
    name: string;
    symbol: string;
    decimal_places: number;
}
declare const SUPPORTED_CURRENCIES: CurrencyOption[];
/**
 * Obtenir une devise par son code
 */
declare function getCurrencyByCode(code: string): CurrencyOption | undefined;
/**
 * Obtenir le symbole d'une devise par son code
 */
declare function getCurrencySymbol(code: string): string;
/**
 * Obtenir le nom complet d'une devise par son code
 */
declare function getCurrencyName(code: string): string;

/**
 * Les pays proposés à la création d'un établissement, et le pays qu'une devise
 * suggère.
 *
 * Les deux surfaces écrivaient `country: "RDC"` en dur : un marchand de Douala
 * qui choisissait le franc CFA restait domicilié en RDC, sur ses tickets comme
 * dans l'administration, et aucun écran ne lui permettait de le corriger avant
 * d'être entré dans l'application.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ LA DEVISE SUGGÈRE UN PAYS, ELLE NE L'IMPOSE PAS.                         │
 * │                                                                          │
 * │ Le franc CFA de la CEMAC est la monnaie de six pays, l'euro de vingt, et │
 * │ le dollar circule en RDC à côté du franc congolais. Le pays se préremplit│
 * │ depuis la devise tant que le marchand n'en a pas choisi un, puis il est  │
 * │ à lui : changer de devise après coup ne doit pas défaire son choix.      │
 * │ Cette règle-là vit dans l'écran, qui seul sait si le champ a été touché. │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ `value` EST CE QUI S'ENREGISTRE, et c'est un NOM, pas un code ISO.
 *   `Organization.country` est un texte libre depuis l'origine, imprimé tel
 *   quel en tête des tickets, et tous les établissements existants portent
 *   « RDC ». Passer à des codes réécrirait le papier de chacun d'eux ; d'où
 *   « RDC » pour la RDC, et le nom français partout ailleurs.
 *
 * ⚠ L'ORDRE DE LA LISTE EST UNE DÉCISION : le pays suggéré par une devise est
 *   le PREMIER qui l'emploie. C'est ce qui fait suggérer la RDC pour le dollar -
 *   les marchands en dollars de ce produit sont congolais - et le Cameroun pour
 *   le franc CFA de la CEMAC. Un test épingle chaque devise.
 */
interface CountryOption {
    /** Ce qui s'enregistre dans `Organization.country`, et s'imprime. */
    value: string;
    /** Ce que le sélecteur affiche. */
    label: string;
    /** Les devises qu'on y emploie couramment, par ordre d'usage. */
    currencies: string[];
}
declare const SUPPORTED_COUNTRIES: CountryOption[];
/** Le pays par défaut d'un établissement, quand rien d'autre ne le dit. */
declare const DEFAULT_COUNTRY = "RDC";
/**
 * Le pays qu'une devise suggère : le premier de la liste qui l'emploie.
 *
 * Une devise inconnue rend `DEFAULT_COUNTRY` plutôt que rien : le champ est
 * obligatoire côté serveur, et un sélecteur vide se lirait comme un oubli.
 */
declare function defaultCountryForCurrency(code: string): string;
/** Un pays de la liste, par la valeur enregistrée. */
declare function getCountryByValue(value: string): CountryOption | undefined;

declare function pluralizeUnit(word: string, count: number): string;

/**
 * Arithmétique des prix, gros et détail.
 *
 * Miroir client de `apps/products/pricing.py` et de la partie prix de
 * `apps/inventory/packaging.py`. Le serveur reste l'autorité : ces fonctions
 * ne servent qu'à afficher une marge ou une conversion pendant la saisie.
 */
interface Margin {
    /** Bénéfice par unité vendue, dans la devise de l'organisation */
    profit: number;
    /** Taux de marge sur le prix de vente, en pourcentage */
    rate: number;
    /** Vrai quand le prix de vente ne couvre pas le prix d'achat */
    isNonPositive: boolean;
}
/**
 * Marge sur prix de vente : (PV - PA) / PV.
 *
 * Convention unique de l'application. La marge sur prix d'achat (le taux de
 * marque) donne des nombres qui ne parlent à personne : un produit acheté 100
 * et revendu 1 000 y affiche 900 %, alors que la marge sur PV dit 90 %, et
 * qu'elle reste bornée à 100 % quel que soit le produit.
 *
 * Retourne `null` tant que les deux prix ne sont pas renseignés : afficher
 * « 100 % de marge » sur un prix d'achat encore vide serait un mensonge.
 */
declare function computeMargin(costPrice: number | null | undefined, sellingPrice: number | null | undefined): Margin | null;
/** Prix d'une unité de détail déduit du prix d'un conditionnement. */
declare function retailEquivalent(packagePrice: number | null | undefined, factor: number | null | undefined): number | null;
/** Prix d'un conditionnement déduit du prix d'une unité de détail. */
declare function packageEquivalent(unitPrice: number | null | undefined, factor: number | null | undefined): number | null;
/**
 * Coût unitaire d'une entrée achetée en partie au conditionnement, en partie à
 * l'unité : ce qui a été payé, divisé par ce qui a été reçu.
 *
 * Reproduit `PackagingService.blended_unit_cost`. Le prix manquant est complété
 * par conversion, exactement comme le fait le serveur.
 */
declare function blendedUnitCost({ packageQuantity, packageCost, looseQuantity, looseCost, factor, }: {
    packageQuantity?: number | null;
    packageCost?: number | null;
    looseQuantity?: number | null;
    looseCost?: number | null;
    factor?: number | null;
}): number | null;

type Role = 'owner' | 'manager' | 'stock_keeper' | 'cashier';
declare const ROLE_LABELS: Record<Role, string>;
declare const ROLE_HIERARCHY: Record<Role, number>;
interface ManageableRole {
    value: string;
    label: string;
}
interface UserPermissions {
    role: Role;
    role_display: string;
    /** Permissions héritées du rôle */
    role_permissions?: string[];
    /** Permissions additionnelles accordées individuellement */
    extra_permissions?: string[];
    /** Permissions effectives (role + extra) - utilisées pour les vérifications */
    permissions: string[];
    manageable_roles: ManageableRole[];
    /** Toutes les permissions disponibles dans le système */
    all_permissions?: string[];
    /**
     * Les entrepôts assignés à ce membre. VIDE pour un propriétaire : c'est son
     * rôle qui lui donne tout, et c'est ce qui le rend « partout ».
     *
     * ⚠ Ce champ vivait HORS du paquet, ajouté au type côté back-office, « parce
     * qu'y toucher demande de publier un tag ». C'est la donnée d'entrée de la
     * règle de périmètre : la laisser dehors garantissait que la règle y reste
     * aussi. Facultatif, donc un serveur antérieur ne ment pas en l'omettant.
     */
    assigned_warehouses?: {
        id: string;
        name: string;
        is_active?: boolean;
    }[];
    /**
     * La case « Consulter tous les entrepôts », accordée par le propriétaire :
     * le membre LIT tout, partout, et n'agit que dans ses entrepôts.
     */
    consult_all_warehouses?: boolean;
    /**
     * L'empreinte du périmètre. Elle change dès qu'un rôle, une permission, une
     * affectation ou la case change : un client qui la voit bouger relit ses
     * droits, et le terminal retire ses tables.
     */
    perimetre_version?: string;
}
declare function hasPermission(userPermissions: UserPermissions | null, permission: string): boolean;
declare function hasAnyPermission(userPermissions: UserPermissions | null, permissions: string[]): boolean;
declare function hasAllPermissions(userPermissions: UserPermissions | null, permissions: string[]): boolean;
declare function isRole(userPermissions: UserPermissions | null, role: Role): boolean;
declare function isAtLeastRole(userPermissions: UserPermissions | null, role: Role): boolean;
declare function canManageRole(userPermissions: UserPermissions | null, targetRole: string): boolean;

/**
 * Le périmètre d'un membre : ce qu'il peut LIRE, ce qu'il peut FAIRE, et ce
 * qui lui est imposé.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ DEUX NATURES, ET UNE SEULE RÈGLE PAR NATURE.                            │
 * │                                                                          │
 * │ Par défaut, un membre est ISOLÉ dans ses entrepôts affectés : il lit et  │
 * │ il agit là, et nulle part ailleurs. Le propriétaire peut, membre par     │
 * │ membre, cocher « Consulter tous les entrepôts » : ce membre PEUT alors   │
 * │ lire tout, partout et quel qu'en soit l'auteur, mais il n'AGIT toujours  │
 * │ que dans ses entrepôts. C'est la règle du serveur                        │
 * │ (`apps/core/warehouse_scope.py`), et ce module en est le miroir.         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CE QU'ON PEUT LIRE N'EST PAS CE QU'ON VOIT PAR DÉFAUT (2026-11-16).     │
 * │                                                                          │
 * │ - Le PROPRIÉTAIRE voit tout l'établissement.                             │
 * │ - Le GÉRANT et le MAGASINIER voient toutes les données de leurs          │
 * │   entrepôts.                                                             │
 * │ - Le CAISSIER ne voit que SES données.                                   │
 * │                                                                          │
 * │ Les deux cases n'élargissent que sur FILTRE explicite : « Voir tout dans │
 * │ son entrepôt » laisse le caissier choisir un collègue ou « Tous les      │
 * │ utilisateurs » ; « Consulter tous les entrepôts » laisse choisir un      │
 * │ autre entrepôt ou « Tous les entrepôts ». Sans filtre, l'écran reste au  │
 * │ défaut : c'est `defautDuPerimetre`, et le serveur applique le même       │
 * │ défaut à toute liste qui ne demande rien de plus.                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ L'AUTEUR SUIT UNE PERMISSION, PAS UN RÔLE.                              │
 * │                                                                          │
 * │ Voir le travail de ses collègues (ventes, dépenses, caisse, retours,     │
 * │ devis) tient à `sales.view_all`, que le gérant et le magasinier ont par  │
 * │ leur rôle et que le caissier reçoit par la case « Voir tout ». Le        │
 * │ décider sur le rôle « caissier » rendait la case inopérante sur la       │
 * │ moitié des écrans, et c'est ainsi que les deux surfaces avaient divergé. │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ CE MODULE REND LE VERROU, IL NE DÉCIDE PAS DE CE QU'ON EN FAIT. Sur un
 * membre mono-dépôt, le terminal APPLIQUE son entrepôt là où le back-office ne
 * l'envoie pas : la base locale du terminal est la seule chose qu'il lit, alors
 * que le serveur borne toujours. Imposer l'une des deux lectures ici casserait
 * l'autre.
 */

/** La permission qui ouvre le travail des collègues, dans ses entrepôts. */
declare const PERMISSION_VOIR_TOUT = "sales.view_all";
/** Ce que le périmètre lit d'un entrepôt. */
interface EntrepotDuMembre {
    id: string;
    name: string;
    /** Absent : actif. Un serveur antérieur n'envoie pas le champ. */
    is_active?: boolean;
}
/** Un membre, tel que ses permissions le décrivent. */
interface MembrePerimetre {
    role: Role | null;
    /** La case « Consulter tous les entrepôts », accordée par le propriétaire. */
    consulteTout: boolean;
    /** `sales.view_all` : voir le travail de ses collègues, dans ses entrepôts. */
    voitCollegues: boolean;
    /** Vide pour un propriétaire : c'est son rôle qui lui donne tout. */
    affectes: readonly EntrepotDuMembre[];
}
/** Lire (consulter, filtrer, exporter) ou agir (vendre, transférer, saisir). */
type NaturePerimetre = 'lecture' | 'action';
/**
 * Le membre décrit par la réponse de `/users/me/permissions/` ou par la
 * charge de réveil du terminal. `null` : rien n'est connu, rien n'est ouvert.
 */
declare function membreDepuisPermissions(p: Pick<UserPermissions, 'role' | 'permissions' | 'assigned_warehouses' | 'consult_all_warehouses'> | null): MembrePerimetre;
/** Le membre lit-il tous les entrepôts ? Le propriétaire, et la case. */
declare function litTousLesEntrepots(m: MembrePerimetre): boolean;
/**
 * Le membre est-il borné à SES propres lignes ?
 *
 * Faux pour le propriétaire ; faux en LECTURE pour la case « Consulter tous
 * les entrepôts » (elle ouvre tous les auteurs) ; sinon, faux seulement avec
 * `sales.view_all`. Un rôle inconnu n'invente pas de borne : le serveur reste
 * seul juge, et une borne inventée viderait un écran sans dire pourquoi.
 */
declare function estBorneParAuteur(m: MembrePerimetre, nature: NaturePerimetre): boolean;
/**
 * Les entrepôts que le membre peut LIRE, parmi ceux qu'on connaît.
 *
 * ⚠ LES INACTIFS EN FONT PARTIE. Un entrepôt désactivé est fermé aux
 * opérations, pas effacé : on doit pouvoir relire son historique, filtrer
 * ses ventes passées, et son badge le dit à l'écran.
 */
declare function entrepotsLisibles<T extends {
    id: string;
}>(m: MembrePerimetre, tous: readonly T[]): T[];
/**
 * Les entrepôts où le membre peut AGIR : ses affectés, actifs.
 *
 * La case « Consulter tous » n'y change rien : elle ouvre la lecture, jamais
 * l'action. Un propriétaire agit partout, mais pas sur un entrepôt désactivé.
 */
declare function entrepotsActionnables<T extends {
    id: string;
    is_active?: boolean;
}>(m: MembrePerimetre, tous: readonly T[]): T[];
/**
 * Les deux cases qu'on règle sur un membre, et ce qu'elles ouvrent.
 *
 * ⚠ « Voir tout » tout court laissait croire à TOUT voir, partout. Il ouvre le
 * travail des COLLÈGUES, dans les entrepôts du membre et nulle part ailleurs :
 * c'est « Consulter tous les entrepôts » qui ouvre les autres dépôts. Les deux
 * surfaces lisent ces libellés ici, pour ne pas les dire de deux façons.
 */
declare const LIBELLES_CASES_PERIMETRE: {
    readonly voirTout: {
        readonly titre: "Voir tout dans son entrepôt";
        readonly aide: string;
    };
    readonly consulterTous: {
        readonly titre: "Consulter tous les entrepôts";
        readonly aide: string;
    };
};
/**
 * La case « Voir tout dans son entrepôt » a-t-elle un sens pour ce rôle ?
 *
 * Seulement pour un CAISSIER : le gérant et le magasinier voient déjà tout le
 * travail de leurs entrepôts par leur rôle, et le propriétaire tout.
 */
declare function caseVoirToutUtile(role: Role | null | undefined): boolean;
/**
 * La case « Consulter tous les entrepôts » a-t-elle un sens pour ce rôle ?
 * Pour tous, sauf le propriétaire, qui voit déjà tout l'établissement.
 */
declare function caseConsulterTousUtile(role: Role | null | undefined): boolean;
/**
 * Le choix qui ÉLARGIT au-delà du défaut : « Tous les entrepôts » ou « Tous
 * les utilisateurs ». `null` est le défaut, un identifiant un choix précis.
 *
 * ⚠ Distinct de `null` parce que le défaut n'est pas toujours « tout » : pour
 * un caissier, `null` veut dire « mes données », et « Tous les utilisateurs »
 * est un geste qu'il fait exprès.
 */
declare const CHOIX_TOUS = "*";
/** Ce qu'un membre voit SANS RIEN CHOISIR. */
interface DefautPerimetre {
    /**
     * `null` : aucune borne au-delà de son périmètre. Sinon ses entrepôts : c'est
     * le cas d'un membre qui PEUT lire tous les entrepôts (la case) mais ne le
     * fait que sur filtre.
     */
    entrepots: string[] | null;
    /** Vrai : par défaut, il ne voit que ses propres lignes. */
    auteurBorne: boolean;
}
/**
 * Le défaut d'un membre. Un rôle inconnu n'invente aucune borne : le serveur
 * reste seul juge.
 */
declare function defautDuPerimetre(m: MembrePerimetre): DefautPerimetre;
/**
 * Le filtre peut-il proposer « Tous les entrepôts » comme choix EXPLICITE ?
 * Pour la case « Consulter tous », dont le défaut reste ses entrepôts. Le
 * propriétaire n'en a pas besoin : son défaut est déjà tout.
 */
declare function proposeTousLesEntrepots(m: MembrePerimetre): boolean;
/**
 * Le filtre peut-il proposer « Tous les utilisateurs » comme choix EXPLICITE ?
 * Pour qui est borné à ses lignes par défaut mais a le droit de voir celles
 * des autres : le caissier qui a l'une des deux cases.
 */
declare function proposeTousLesUtilisateurs(m: MembrePerimetre): boolean;
/** Ce qu'on lit sur le champ quand rien n'est choisi : le défaut, nommé. */
declare function libelleDefautEntrepot(m: MembrePerimetre): string;
declare function libelleDefautUtilisateur(m: MembrePerimetre): string;
/** Le libellé du choix explicite qui élargit. */
declare const LIBELLE_TOUS_ENTREPOTS = "Tous les entrep\u00F4ts";
declare const LIBELLE_TOUS_UTILISATEURS = "Tous les utilisateurs";
/**
 * Les paramètres de requête d'un choix, pour le serveur.
 *
 * `null` : rien n'est envoyé, le serveur applique le DÉFAUT. `CHOIX_TOUS` :
 * `all_warehouses` / `all_users`. Un identifiant : `warehouse` / `user`.
 */
declare function parametresDuChoix(choix: {
    entrepot: string | null;
    utilisateur: string | null;
}): {
    warehouse?: string;
    all_warehouses?: "1";
    user?: string;
    all_users?: "1";
};
/**
 * Le champ « Entrepôt » d'un filtre s'affiche-t-il ?
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN CHAMP QU'ON NE PEUT PAS CHANGER N'A PAS À ÊTRE MONTRÉ.               │
 * │                                                                          │
 * │ - le propriétaire et la case « Consulter tous les entrepôts » : oui ;   │
 * │ - un membre de PLUSIEURS entrepôts : oui, limité aux siens ;            │
 * │ - un caissier sans aucune case : jamais, il n'a rien à choisir ;        │
 * │ - un membre d'un seul entrepôt : non, choisir entre une seule chose     │
 * │   n'est pas un choix.                                                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ Masquer n'est pas lever : le périmètre continue de s'appliquer, au serveur
 * comme sur le terminal. Un rôle inconnu ne montre rien.
 */
declare function afficheFiltreEntrepot(m: MembrePerimetre): boolean;
/**
 * Le champ « Utilisateur » d'un filtre s'affiche-t-il ?
 *
 * Seulement pour qui VOIT le travail de ses collègues : le propriétaire, la
 * case « Voir tout dans son entrepôt » (`sales.view_all`, que le gérant et le
 * magasinier ont par leur rôle) et la case « Consulter tous les entrepôts ».
 * Un membre qui ne voit que ses propres données n'a personne à choisir.
 */
declare function afficheFiltreUtilisateur(m: MembrePerimetre): boolean;
/**
 * Faut-il montrer le composant de filtres de périmètre ? Faux quand aucun de
 * ses deux champs ne s'affiche : un membre sans aucune des deux options n'a
 * rien à y régler.
 */
declare function afficheFiltresPerimetre(m: MembrePerimetre): boolean;
/** Pourquoi un filtre est fermé. `null` : il est ouvert. */
type MotifVerrouPerimetre = 'propres-donnees' | 'un-seul-entrepot' | 'aucun-entrepot' | 'entrepot-inactif';
/**
 * Ce qu'on écrit sous un filtre fermé.
 *
 * Un verrou muet se lit comme une panne : le marchand appuie, rien ne bouge, et
 * rien ne lui dit que c'est normal.
 */
declare const LIBELLES_VERROU_PERIMETRE: Record<MotifVerrouPerimetre, string>;
/**
 * Le verrou qui pèse sur un choix d'entrepôt.
 *
 * @param nombre Combien d'entrepôts le membre peut viser dans cette nature :
 *               `entrepotsLisibles(...).length` pour un filtre,
 *               `entrepotsActionnables(...).length` pour une saisie.
 *
 * ⚠ `entrepot-inactif` ne vaut qu'en ACTION : en lecture, un entrepôt inactif
 * reste lisible et compte. Il distingue « on ne vous a rien affecté » de « ce
 * qu'on vous a affecté est fermé » : les deux ne se règlent pas pareil.
 */
declare function verrouEntrepot(m: MembrePerimetre, nombre: number, nature?: NaturePerimetre): MotifVerrouPerimetre | null;
/** Le verrou qui pèse sur le filtre « Utilisateur ». */
declare function verrouUtilisateur(m: MembrePerimetre, nature?: NaturePerimetre): MotifVerrouPerimetre | null;
/**
 * Le choix d'entrepôt RECEVABLE, ou `null`.
 *
 * ⚠ UN CHOIX HORS PÉRIMÈTRE EST ÉCARTÉ, PAS ENVOYÉ. Le serveur le refuse par un
 * 400 : l'envoyer ferait crier l'écran pour une règle qu'on connaissait déjà.
 *
 * ⚠ ET UN VERROU N'EST PAS UN CHOIX. Cette fonction ne rend jamais l'entrepôt
 * d'un verrou : c'est à l'appelant de décider s'il l'applique.
 */
declare function choixEntrepotRecevable(choix: string | null | undefined, permis: ReadonlySet<string>, ouvertATous: boolean): string | null;

/**
 * Échéances de crédit.
 *
 * `Sale.due_date` existait depuis l'origine côté backend, exposé par l'API et
 * typé côté client, mais aucune surface ne le renseignait ni ne l'affichait :
 * il n'y avait aucune notion de retard dans l'application. Ces helpers donnent
 * une seule définition du « retard », partagée par toutes les surfaces.
 */
/** Une facture est en retard le lendemain de son échéance, pas le jour même. */
declare function isOverdue(dueDate?: string | null): boolean;
/** Jours de retard (négatif si l'échéance est encore devant). */
declare function daysLate(dueDate?: string | null): number;
/** Libellé court : « En retard de 5 j », « Échoit dans 3 j », « Échoit aujourd'hui ». */
declare function dueDateLabel(dueDate?: string | null): string | null;

/**
 * La casse d'un nom d'article, telle que la carte du comptoir l'affiche.
 *
 * Les marchands saisissent souvent leur catalogue en capitales
 * (« ALDACTONE 25MG 5CES ») : sur une grille de trente cartes, un mur de
 * majuscules se lit mal et chaque nom pèse autant que son voisin. La carte
 * écrit donc « Aldactone 25mg 5ces ».
 *
 * ⚠ C'EST UN AFFICHAGE. La base locale, la recherche, le ticket et le serveur
 * gardent le nom tel que le marchand l'a saisi : on ne réécrit pas une donnée
 * pour la montrer autrement.
 *
 * ⚠ `toLowerCase` ET JAMAIS `toLocaleLowerCase`. La seconde suit la langue du
 * système (« I » devient « ı » en turc), et le moteur Hermes n'embarque pas les
 * données complètes de langue : c'est le piège déjà proscrit pour `Intl`.
 */
declare function casseDeTitre(nom: string): string;

/**
 * Lire un nombre TAPÉ À LA MAIN, sur un pavé décimal de terminal.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ TROIS ÉCRANS LISAIENT UNE SAISIE, DE TROIS FAÇONS DIFFÉRENTES.          │
 * │                                                                          │
 * │ L'ouverture de caisse envoyait la chaîne telle quelle, et le serveur     │
 * │ refusait la virgule ; la clôture faisait `replace(",", ".")` ; le devis  │
 * │ faisait de même mais tombait sur les ESPACES, un « 12 500 » donnant      │
 * │ `NaN`, ramené à zéro, puis silencieusement refusé par un bouton qui ne   │
 * │ réagissait pas. Trois lectures pour un seul geste : taper un nombre.     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * **Le MOTIF est rendu, pas la phrase.** Un fonds de caisse négatif et une
 * quantité négative ne se disent pas de la même façon, et la phrase qu'un
 * marchand lit appartient à l'écran qui la lui montre. Ce module tranche la
 * seule chose qui ne dépend pas du contexte : ce que la chaîne VAUT.
 *
 * Module PUR : il décide de ce qui part au serveur, il doit s'éprouver sans
 * appareil.
 */
type MotifRefus = "negatif" | "illisible";
type LectureNombre = 
/** `valeur` à `null` : la saisie est VIDE. À l'appelant de dire ce que ça veut dire. */
{
    ok: true;
    valeur: number | null;
} | {
    ok: false;
    motif: MotifRefus;
};
declare function lireNombre(saisie: string): LectureNombre;
/**
 * Ce qu'un changement de devise fait au montant déjà tapé.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ ON CONVERTIT, ON N'EFFACE JAMAIS.                                       │
 * │                                                                          │
 * │ C'est la règle de `CurrencyAmountInput.selectCurrency` du back-office,   │
 * │ et son commentaire la dit mieux que nous : « changer de devise ne doit   │
 * │ pas changer la valeur voulue par le marchand ». Un caissier qui tape     │
 * │ 46 000 en francs puis bascule en dollars veut toujours la même somme,    │
 * │ pas un champ vide ni quarante-six mille dollars.                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ ON LIT PAR `lireNombre`, ET SURTOUT PAS PAR `parseFloat`.               │
 * │                                                                          │
 * │ Le web fait `parseFloat`, et c'est inoffensif chez lui : son champ est   │
 * │ un `<input type="number">` où l'espace ne se tape pas. Au pouce, sur un  │
 * │ pavé décimal, « 12 500 » s'écrit tous les jours - et `parseFloat` en     │
 * │ tire DOUZE. Le montant serait converti à partir d'une valeur fausse,     │
 * │ sans que rien ne le signale.                                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Module PUR : il décide de ce qui part au serveur, il doit s'éprouver sans
 * appareil. Aucune arithmétique n'y est écrite - `convMoney` vient du noyau,
 * qui est la seule vérité sur les taux (§5.1).
 */
/** Ce que le noyau fournit, réduit à ce dont ce module a besoin. */
interface Conversion {
    /** `money.convMoney` : convertit par la devise principale, puis arrondit. */
    convertir: (montant: number, de: string, vers: string) => number;
    /** Décimales de la devise, pour ne pas rendre « 46000.000000001 ». */
    decimales: (code: string) => number;
}
/**
 * Le montant tapé, ré-exprimé dans la devise choisie.
 *
 * Rend TOUJOURS une chaîne : les décimales voyagent en texte, jamais en
 * nombre (§5.3 règle 3). Une saisie vide, illisible ou nulle est rendue
 * VERBATIM - c'est ce que fait le web, et c'est ce qui permet de basculer de
 * devise avant d'avoir tapé quoi que ce soit.
 */
declare function convertirSaisie(saisie: string, de: string, vers: string, conv: Conversion): string;
/**
 * Faut-il montrer le repère « = 46 000 FC · 1 USD = 2 300 FC » ?
 *
 * Les trois conditions du web (`showConversion`), dans le même ordre :
 * l'établissement est multi-devise, la devise choisie n'est pas la principale,
 * et le montant lu est strictement positif. Un repère affiché sur un champ
 * vide ne renseigne personne et occupe une ligne.
 */
declare function montrerConversion(saisie: string, devise: string, principale: string, nombreDeDevises: number): boolean;

/**
 * La portée de « Ma journée » : QUI et OÙ l'écran regarde aujourd'hui.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ PAR DÉFAUT, CHACUN VOIT SA PROPRE JOURNÉE, PROPRIÉTAIRE COMPRIS.        │
 * │                                                                          │
 * │ C'est ce qui distingue cet écran des listes (`perimetre.ts`), où le      │
 * │ gérant voit d'emblée tout son entrepôt. Ici la question est « qu'ai-je   │
 * │ fait aujourd'hui ? », et les filtres ÉLARGISSENT :                       │
 * │                                                                          │
 * │   rien choisi            -> moi                                          │
 * │   un entrepôt            -> TOUTE la journée de cet entrepôt             │
 * │   « Tous les entrepôts » -> tout ce que je peux lire                     │
 * │   une personne           -> sa journée (dans l'entrepôt choisi, s'il y   │
 * │                             en a un)                                     │
 * │   « Toute l'équipe »     -> toute l'équipe de mes entrepôts              │
 * │                                                                          │
 * │ Choisir un entrepôt, c'est regarder sa journée entière : c'est ce qui    │
 * │ donne au gérant « filtrer sur son entrepôt pour voir tout l'entrepôt »,  │
 * │ en un seul geste.                                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ LE CAISSIER N'A AUCUN FILTRE, QUELLES QUE SOIENT SES CASES (décision du
 * 2026-11-22). Ma journée reste strictement personnelle pour lui ; ses cases
 * continuent de s'appliquer aux autres écrans. Le serveur le tient aussi : il
 * refuse à un caissier tout paramètre qui n'est pas lui-même.
 *
 * ⚠ CE MODULE NE VÉRIFIE PAS QUI EST UN COLLÈGUE. La liste des personnes vient
 * de l'équipe que le serveur a déjà bornée ; un identifiant hors périmètre est
 * refusé par le serveur (400), jamais rendu en ensemble vide.
 */

/** Ce que le membre a choisi : `null` (rien), un identifiant, ou `CHOIX_TOUS`. */
interface ChoixJournee {
    entrepot: string | null;
    utilisateur: string | null;
}
declare const CHOIX_JOURNEE_VIDE: ChoixJournee;
/** Ce que l'écran propose au membre. */
interface ChampsJournee {
    /** Le champ « Entrepôt ». */
    entrepot: boolean;
    /** Le champ « Utilisateur ». */
    utilisateur: boolean;
    /**
     * Le choix « Tous les entrepôts » : la case « Consulter tous », et elle seule.
     *
     * ⚠ PAS LE PROPRIÉTAIRE. Son champ vide se lit déjà « Tous les entrepôts »
     * (il lit tout par défaut), et la liste affichait alors DEUX entrées du même
     * nom pour deux portées différentes - vu sur le terminal. Tout l'établissement
     * lui reste à un geste : « Toute l'équipe ». C'est la règle des listes
     * (`proposeTousLesEntrepots`), qui ne propose pas non plus ce choix au
     * propriétaire.
     */
    tousLesEntrepots: boolean;
}
/**
 * Les champs de Ma journée pour ce membre.
 *
 * ⚠ Le gérant et le magasinier ont le champ « Entrepôt » MÊME AVEC UN SEUL
 * entrepôt : sans lui, ils n'auraient aucun moyen de voir leur entrepôt entier
 * (ailleurs, choisir entre une seule chose n'est pas un choix ; ici, c'est le
 * choix entre « moi » et « tout l'entrepôt »). Un membre sans entrepôt n'a rien
 * à élargir.
 */
declare function champsDeLaJournee(m: MembrePerimetre): ChampsJournee;
/** Le membre a-t-il le moindre filtre sur Ma journée ? */
declare function afficheFiltresDeLaJournee(m: MembrePerimetre): boolean;
/**
 * La portée APPLIQUÉE.
 *
 * - `moi` : mes opérations, dans tout ce que je peux lire ;
 * - `equipe` : tous les auteurs ; `entrepot` est un identifiant, `CHOIX_TOUS`
 *   (tous les entrepôts lisibles) ou `null` (mes entrepôts) ;
 * - `membre` : une personne, éventuellement dans un entrepôt.
 */
type PorteeJournee = {
    kind: "moi";
} | {
    kind: "equipe";
    entrepot: string | null;
} | {
    kind: "membre";
    utilisateur: string;
    entrepot: string | null;
};
declare const PORTEE_MOI: PorteeJournee;
/**
 * Le choix traduit en portée, après en avoir écarté ce qui n'est pas recevable.
 *
 * ⚠ UN CHOIX HORS PÉRIMÈTRE EST ÉCARTÉ, PAS ENVOYÉ : un entrepôt qui n'est pas
 * le sien (un filtre resté d'une session précédente, un rôle changé entre-temps)
 * retombe sur rien. Le caissier ne quitte jamais `moi`.
 */
declare function porteeDeLaJournee(m: MembrePerimetre, choix: ChoixJournee): PorteeJournee;
/**
 * Les paramètres de requête de la portée.
 *
 * Ils servent DEUX endpoints, et c'est voulu : la journée (`my-day`), et la
 * liste des ventes du jour (`/sales/`). `moi` part donc en `user=<moi>`, que les
 * deux comprennent ; `my-day` sans paramètre rend la même chose.
 */
declare function parametresDeLaJournee(p: PorteeJournee, moi: string): {
    warehouse?: string;
    all_warehouses?: "1";
    user?: string;
    all_users?: "1";
};
/** Ce qu'on lit sur le champ Entrepôt vide. */
declare function libelleEntrepotVide(m: MembrePerimetre): string;
/**
 * Ce qu'on lit sur le champ Utilisateur vide.
 *
 * ⚠ IL DÉPEND DE L'ENTREPÔT : sans entrepôt, le vide veut dire « moi » ; avec
 * un entrepôt choisi, il veut dire toute l'équipe de cet entrepôt. Le champ vide
 * NOMME toujours ce qu'il applique.
 */
declare function libelleUtilisateurVide(choix: ChoixJournee): string;
declare const LIBELLE_TOUTE_L_EQUIPE = "Toute l'\u00E9quipe";
/**
 * Faut-il proposer « Toute l'équipe » comme choix du champ Utilisateur ?
 * Seulement sans entrepôt : avec un entrepôt choisi, le vide le dit déjà.
 */
declare function proposeTouteLEquipe(choix: ChoixJournee): boolean;
/**
 * Faut-il se proposer soi-même parmi les personnes ? Seulement quand un
 * entrepôt est choisi (« moi, dans cet entrepôt ») : sans entrepôt, le champ
 * vide est déjà « moi ».
 */
declare function proposeSoiMeme(choix: ChoixJournee): boolean;
/**
 * Le libellé de la portée, pour le sous-titre de l'écran et l'en-tête du
 * rapport : « Mes opérations », « Boutique Nord · toute l'équipe », « Jean K. ».
 */
declare function libelleDeLaPortee(p: PorteeJournee, noms: {
    role: MembrePerimetre["role"];
    entrepot: (id: string) => string | undefined;
    utilisateur: (id: string) => string | undefined;
}): string;

export { CHOIX_JOURNEE_VIDE, CHOIX_TOUS, type ChampsJournee, type ChoixJournee, type Conversion, type CountryOption, type CurrencyOption, DEFAULT_COUNTRY, type DefautPerimetre, type EntrepotDuMembre, LIBELLES_CASES_PERIMETRE, LIBELLES_VERROU_PERIMETRE, LIBELLE_TOUS_ENTREPOTS, LIBELLE_TOUS_UTILISATEURS, LIBELLE_TOUTE_L_EQUIPE, type LectureNombre, type ManageableRole, type Margin, type MembrePerimetre, type MotifRefus, type MotifVerrouPerimetre, NNBSP, type NaturePerimetre, PERMISSION_VOIR_TOUT, PORTEE_MOI, type PorteeJournee, ROLE_HIERARCHY, ROLE_LABELS, type Role, SUPPORTED_COUNTRIES, SUPPORTED_CURRENCIES, type UserPermissions, afficheFiltreEntrepot, afficheFiltreUtilisateur, afficheFiltresDeLaJournee, afficheFiltresPerimetre, blendedUnitCost, canManageRole, caseConsulterTousUtile, caseVoirToutUtile, casseDeTitre, champsDeLaJournee, choixEntrepotRecevable, computeMargin, convertirSaisie, daysLate, defaultCountryForCurrency, defautDuPerimetre, dueDateLabel, entrepotsActionnables, entrepotsLisibles, estBorneParAuteur, formatDate, formatDateFr, formatDateTime, formatDateTimeFr, formatDecimal, formatFixedFr, formatNumber, formatNumberFr, formatPercent, formatPrice, formatPriceValue, formatTimeFr, getCountryByValue, getCurrencyByCode, getCurrencyName, getCurrencySymbol, getDefaultCurrency, hasAllPermissions, hasAnyPermission, hasPermission, isAtLeastRole, isOverdue, isRole, libelleDeLaPortee, libelleDefautEntrepot, libelleDefautUtilisateur, libelleEntrepotVide, libelleUtilisateurVide, lireNombre, litTousLesEntrepots, membreDepuisPermissions, monthLong, monthShort, montrerConversion, packageEquivalent, parametresDeLaJournee, parametresDuChoix, pluralizeUnit, porteeDeLaJournee, proposeSoiMeme, proposeTousLesEntrepots, proposeTousLesUtilisateurs, proposeTouteLEquipe, retailEquivalent, setDefaultCurrency, verrouEntrepot, verrouUtilisateur, weekdayLong };
