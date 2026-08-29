export { C as ChannelAvailability, a as CurrencyFallback, b as CurrencyInfo, c as CurrencyTable, M as MONEY_EPS, d as MoneyHelpers, O as OrganizationCurrency, e as OrganizationCurrencyLike, P as PackagedProductLike, f as Packaging, S as StockCounters, g as availableBase, h as availableSplit, i as createCurrencyTable, j as createMoneyHelpers, k as formatPackaged, l as formatPackagedDifference, m as formatPackagedSplit, n as getPackaging, o as pos, r as r2, p as remainingChannels, s as splitPackaged, t as toBaseQuantity } from './index-Cf7i-3xO.cjs';
export { i as receipt } from './index-B9iBirVA.cjs';

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
 * Formate un nombre de points de fidélité.
 *
 * Les points sont fractionnaires depuis qu'un barème en pourcentage sur une
 * devise forte peut produire 0,58 point : les tronquer les faisait disparaître.
 * On affiche donc la fraction quand elle existe, et rien de plus quand le
 * compte tombe juste : « 3 pts », jamais « 3,00 pts ».
 *
 * Ex : 3 → "3" ; 0.58 → "0,58" ; 4.5 → "4,5" ; 1234.25 → "1 234,25"
 */
declare function formatPoints(points: number | string | null | undefined): string;

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
 * Mise au pluriel des libellés d'unités saisis par le marchand.
 *
 * Ces libellés sont du texte libre et arrivent tels quels : « pièce »,
 * « PLAQUETTE », « Carton ». Ajouter un « s » minuscule à un mot saisi en
 * majuscules donnait « 10 PIECEs », ce qui saute aux yeux dans une fiche
 * produit. On suit donc la casse du mot d'origine.
 */
declare function pluralizeUnit(word: string, count: number): string;
/**
 * Formate une quantité avec son unité accordée : « 10 PIECES », « 1 paquet ».
 */
declare function formatUnitQuantity(count: number, word: string): string;

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
}
declare function hasPermission(userPermissions: UserPermissions | null, permission: string): boolean;
declare function hasAnyPermission(userPermissions: UserPermissions | null, permissions: string[]): boolean;
declare function hasAllPermissions(userPermissions: UserPermissions | null, permissions: string[]): boolean;
declare function isRole(userPermissions: UserPermissions | null, role: Role): boolean;
declare function isAtLeastRole(userPermissions: UserPermissions | null, role: Role): boolean;
declare function canManageRole(userPermissions: UserPermissions | null, targetRole: string): boolean;

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

export { type CurrencyOption, type ManageableRole, type Margin, NNBSP, ROLE_HIERARCHY, ROLE_LABELS, type Role, SUPPORTED_CURRENCIES, type UserPermissions, blendedUnitCost, canManageRole, computeMargin, daysLate, dueDateLabel, formatDate, formatDateFr, formatDateTime, formatDateTimeFr, formatDecimal, formatFixedFr, formatNumber, formatNumberFr, formatPercent, formatPoints, formatPrice, formatPriceValue, formatTimeFr, formatUnitQuantity, getCurrencyByCode, getCurrencyName, getCurrencySymbol, getDefaultCurrency, hasAllPermissions, hasAnyPermission, hasPermission, isAtLeastRole, isOverdue, isRole, monthLong, monthShort, packageEquivalent, pluralizeUnit, retailEquivalent, setDefaultCurrency, weekdayLong };
