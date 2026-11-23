/**
 * Types de domaine partagés.
 *
 * Repris tels quels des serializers backend, pour que les deux surfaces
 * décrivent la même chose. Ils sont structurellement identiques aux types
 * déclarés dans `frontend/actions/*.ts`, si bien que le web peut passer ses
 * propres objets à ces fonctions sans conversion.
 */
/** Devise activée par une organisation, avec son taux. */
interface OrganizationCurrency {
    id: string;
    currency: string;
    currency_code: string;
    currency_name: string;
    currency_symbol: string;
    currency_decimal_places: number;
    is_primary: boolean;
    /**
     * Nombre d'unités de la devise PRINCIPALE pour 1 unité de celle-ci.
     * 1 USD = 2800 CDF ⇒ « 2800.000000 ». La principale vaut toujours 1.
     */
    exchange_rate: string;
    is_active: boolean;
    last_rate_update: string;
}
/** Devise par défaut d'une organisation, forme allégée. */
interface CurrencyInfo {
    code: string;
    name: string;
    symbol: string;
    decimal_places: number;
}

/** Tolérance de comparaison partagée entre affichage et validation. */
/**
 * Tolérance de comparaison monétaire : absorbe l'erreur flottante résiduelle
 * après arrondi par devise. Une seule constante pour l'affichage ET pour le
 * bouton « Encaisser », afin qu'ils ne puissent jamais se contredire.
 */
declare const MONEY_EPS = 0.000001;
/** Arrondi à deux décimales, en devise principale. */
declare function r2(n: number): number;
interface OrganizationCurrencyLike {
    currency_code: string;
    exchange_rate: string | number;
    currency_symbol?: string | null;
    currency_decimal_places?: number | null;
    is_primary?: boolean;
}
interface CurrencyTable {
    /** Code de la devise principale de l'organisation. */
    primary: string;
    /** Taux vers la principale ; 1 si la devise est inconnue ou mal réglée. */
    rateOf(code: string): number;
    /** Symbole d'affichage ; le code lui-même à défaut. */
    symbolOf(code: string): string;
    /** Décimales PHYSIQUES de la devise : le CDF en a zéro, l'USD deux. */
    decimalsOf(code: string): number;
    /** Arrondi d'un montant à la plus petite unité physique de sa devise. */
    round(amount: number, code: string): number;
    /** Conversion pure, sans arrondi : à réserver aux sommes intermédiaires. */
    convert(amount: number, from: string, to: string): number;
    /** Conversion PUIS arrondi : la forme à utiliser pour tout prix affiché ou envoyé. */
    convertMoney(amount: number, from: string, to: string): number;
    /** Montant formaté avec son symbole : « 46 000 FC ». */
    money(amount: string | number, code: string): string;
    /** Montant formaté SANS symbole (quand le code est déjà affiché à côté). */
    amountOnly(amount: string | number, code: string): string;
}
/**
 * Table de devises d'une organisation, et les opérations qui en découlent.
 *
 * `exchange_rate` se lit « unités de devise PRINCIPALE pour 1 unité de
 * celle-ci » ; la principale vaut donc 1. Toute conversion passe par la
 * principale, jamais directement de l'une à l'autre : c'est ce que fait le
 * serveur, et un taux croisé calculé autrement dériverait.
 *
 * Domicile UNIQUE de cette arithmétique. Elle vivait aussi en fermetures dans
 * la page POS du back-office, ce qui faisait deux implémentations d'un calcul
 * de monnaie : elles ne restent pas d'accord, et leur désaccord ne se découvre
 * qu'au comptoir, face à un client qui compte ce qu'on lui rend.
 */
declare function createCurrencyTable(currencies: OrganizationCurrencyLike[], fallback: CurrencyFallback): CurrencyTable;
interface CurrencyFallback {
    code: string;
    symbol?: string;
    decimal_places?: number;
}
interface MoneyHelpers {
    /** Devises actives de l'organisation, telles que renvoyées par l'API. */
    currencies: OrganizationCurrency[];
    /** Code de la devise principale. */
    primaryCode: string;
    /** Décimales d'affichage d'une devise (CDF = 0, USD = 2). */
    decimalsOf: (code: string) => number;
    /** Symbole d'une devise (repli : le code lui-même). */
    symbolOf: (code: string) => string;
    /** Taux vers la devise principale (toujours > 0). */
    rateOf: (code: string) => number;
    /** Convertit un montant d'une devise à une autre, via la principale. */
    convertAmount: (amount: number, from: string, to: string) => number;
    /** Arrondit au nombre de décimales de la devise. */
    roundMoney: (amount: number, code: string) => number;
    /** Convertit puis arrondit dans la devise cible. */
    convMoney: (amount: number, from: string, to: string) => number;
    /** Montant formaté avec son symbole : « 46 000 FC ». */
    money: (amount: string | number, code: string) => string;
    /** Montant formaté SANS symbole (quand le code est déjà affiché à côté). */
    amountOnly: (amount: string | number, code: string) => string;
    /** Parité lisible entre deux devises : « 1 USD = 2 300 FC ». */
    rateLabel: (from: string, to: string) => string;
}
/**
 * Construit les helpers à partir des devises de l'organisation.
 *
 * `fallback` sert tant que la liste n'est pas chargée, ou pour une devise
 * inconnue (données historiques) : c'est la devise par défaut de l'org exposée
 * par `useCurrency()`.
 */
declare function createMoneyHelpers(currencies: OrganizationCurrency[], fallback: CurrencyInfo): MoneyHelpers;

/**
 * Décimales d'une QUANTITÉ de produit. Miroir strict du serveur, où tout champ
 * de quantité est un `DecimalField(max_digits=15, decimal_places=3)` et où
 * `PackagingService` quantise par `ZERO = Decimal('0.000')`.
 *
 * Trois décimales parce qu'un commerce ne vend pas que des pièces : on pèse
 * 0,5 kg de farine et on sert 1,5 L au détail.
 */
declare const QUANTITY_DECIMALS = 3;
/**
 * Chiffres entiers d'une quantité, soit `max_digits - decimal_places` côté
 * serveur. Au-delà, le serveur refuse par un 400 que le comptoir ne saurait
 * pas expliquer : autant borner la saisie là où elle se fait.
 */
declare const QUANTITY_INTEGER_DIGITS = 12;
/** La plus grande quantité que le serveur accepte d'enregistrer. */
declare const MAX_QUANTITY: number;
/** La plus petite, hors zéro : `MinValueValidator(Decimal('0.001'))`. */
declare const MIN_QUANTITY: number;
/**
 * Quantise une quantité à trois décimales.
 *
 * ⚠ CE N'EST PAS DE LA COSMÉTIQUE. En flottant, `0.1 + 0.2` ne vaut pas `0.3`,
 * et `2 * 24 + 0.3` peut sortir à `48.300000000000004`. Le serveur, lui,
 * travaille en `Decimal` et quantise : sans ce passage, le comptoir annoncerait
 * une quantité que le serveur enregistrerait autrement, et l'écart ne se verrait
 * que sur un ticket déjà remis au client.
 *
 * L'epsilon absorbe la représentation binaire de `.5` exactement comme
 * `currency.ts` le fait pour les montants.
 */
declare function roundQuantity(n: number): number;
/** Une quantité telle qu'elle s'écrit au comptoir : « 1 500,5 », jamais « 1500.5 ». */
declare function formatQuantity(n: number): string;
/**
 * Une quantité avec son unité accordée : « 0,5 kg », « 10 PIECES », « 1 paquet ».
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ C'EST LE SEUL ENDROIT OÙ UNE QUANTITÉ SE COLLE À SON UNITÉ.              │
 * │                                                                          │
 * │ Cette fonction interpolait `count` BRUT. Elle rendait donc « 0.5 kg » au │
 * │ point anglais, et « 0.3000000000000007 bouteilles » dès qu'une part vrac │
 * │ était dérivée d'un total quantisé. Une soixantaine de sites des deux     │
 * │ surfaces écrivaient la même forme à la main, et chacun pouvait dériver   │
 * │ de son côté.                                                             │
 * │                                                                          │
 * │ Elle vit ici et non dans `units.ts` parce que `formatQuantity` est ici : │
 * │ `packaging.ts` importe `pluralizeUnit` de `units.ts`, donc l'inverse     │
 * │ ferait un cycle. `index.ts` réexporte les deux modules par `export *`,   │
 * │ l'API publique ne bouge pas.                                             │
 * │                                                                          │
 * │ ⚠ ELLE NE DOIT JAMAIS ATTEINDRE UN DOCUMENT IMPRIMÉ. Son séparateur de  │
 * │ milliers est l'espace fine insécable, que la police helvetica de jsPDF   │
 * │ rend en « / ». Le papier a son propre helper :                           │
 * │ `receipt.formatQuantityWithUnit`.                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
declare function formatUnitQuantity(count: number, word: string): string;
interface PackagedProductLike {
    selling_mode?: string | null;
    units_per_package?: number | null;
    unit_name?: string | null;
    packaging_unit_name?: string | null;
}
interface Packaging {
    /** Nombre d'unités de détail par contenant */
    factor: number;
    /** Libellé de l'unité de détail : bouteille, pièce, sachet… */
    retailWord: string;
    /** Libellé du contenant : carton, casier, paquet… */
    packageWord: string;
    /** Le produit ne se vend que par contenant entier */
    packageOnly: boolean;
}
/**
 * Conditionnement d'un produit, ou `null` s'il se vend à l'unité seule.
 *
 * Un produit mal configuré (mode gros sans nombre d'unités) est traité comme
 * mono-unité plutôt que de faire échouer l'écran, comme le fait
 * `PackagingService.factor` côté serveur.
 */
declare function getPackaging(product?: PackagedProductLike | null): Packaging | null;
/**
 * Partage une quantité de base en (contenants scellés, unités en vrac).
 *
 * Le reste de la division rejoint le vrac : un contenant entamé ne se rescelle
 * pas. Même règle que `PackagingService.split`.
 */
declare function splitPackaged(baseQuantity: number, looseQuantity: number, factor: number): {
    packages: number;
    loose: number;
};
/** Rend une quantité lisible : « 3 cartons + 2 bouteilles ». */
declare function formatPackaged(packaging: Packaging | null, baseQuantity: number, looseQuantity?: number): string;
/**
 * Rend un partage DÉJÀ connu, sans le recalculer : « 3 casiers + 7 bouteilles ».
 *
 * Miroir de `PackagingService.format_split`. À préférer à `formatPackaged` dès
 * que les deux compteurs sont disponibles : repasser par une division du total
 * réécrirait « 3 casiers + 27 bouteilles » en « 4 casiers + 3 bouteilles ».
 */
declare function formatPackagedSplit(packaging: Packaging | null, packages: number, loose: number): string;
/**
 * Rend un ÉCART par canal : « -2 casiers, +5 bouteilles ».
 *
 * Miroir de `PackagingService.format_signed_split`. Un manquant de contenants
 * scellés et un surplus d'unités isolées se compensent dans le total et
 * disparaissent : ventilés, ils désignent chacun leur cause. La virgule
 * remplace le « + » de `formatPackagedSplit` pour qu'on ne lise pas un signe
 * comme une addition.
 */
declare function formatPackagedDifference(packaging: Packaging | null, packageDelta: number, looseDelta: number): string;
/** Somme d'une saisie « X contenants + Y unités » en unité de détail. */
declare function toBaseQuantity(packaging: Packaging | null, packages?: number, loose?: number): number;
/** Ce que les deux canaux d'un stock offrent encore. */
interface ChannelAvailability {
    /** Contenants encore scellés, `null` si le partage n'est pas connu. */
    sealed: number | null;
    /** Unités déjà hors emballage, `null` si le partage n'est pas connu. */
    loose: number | null;
}
/**
 * Retranche d'un stock ce qu'une saisie consomme déjà, canal par canal.
 *
 * Rejoue l'ordre exact du serveur (`SaleStockService.apply_decrement`) : la
 * part en contenants sort du scellé, puis la part au détail puise dans le vrac
 * et, s'il ne suffit pas, ouvre autant de contenants que nécessaire. Sans cette
 * simulation, deux lignes du même produit dans le panier se comptent mal et le
 * caissier découvre le refus seulement à l'encaissement.
 *
 * `null` en entrée signifie « partage inconnu » (stock multi-entrepôts, produit
 * non suivi) et se propage : on n'invente jamais un zéro bloquant.
 */
declare function remainingChannels(stock: ChannelAvailability, used: {
    packages: number;
    loose: number;
}, factor: number): ChannelAvailability;
interface StockCounters {
    /** Quantité en rayon, en unité de détail. */
    quantity: number;
    reserved_quantity?: number | null;
    /** Contenants encore scellés, tels qu'ENREGISTRÉS. */
    package_quantity?: number | null;
    /** Unités hors emballage, telles qu'ENREGISTRÉES. */
    loose_quantity?: number | null;
}
/**
 * Partage la quantité DISPONIBLE (hors réservations) en scellé et vrac.
 *
 * Miroir strict de `PackagingService.available_split`. Le mobile lit les
 * compteurs bruts du tirage ; le serveur, lui, expose un disponible déjà
 * ventilé. Sans ce miroir, l'application afficherait le stock RÉSERVÉ comme
 * vendable et le POS accepterait une vente que le serveur refuse.
 *
 * Une réservation ne porte pas sur des contenants précis : on l'impute donc
 * d'abord au scellé. L'approximation est volontairement conservatrice, elle
 * peut refuser une vente en gros de justesse, jamais en autoriser une qui
 * viderait un contenant déjà promis à un devis.
 */
declare function availableSplit(stock: StockCounters, factor: number | null): {
    packages: number;
    loose: number;
};
/** Quantité disponible, réservations déduites. */
declare function availableBase(stock: StockCounters): number;

/**
 * Totalisation d'un panier de point de vente.
 *
 * MIROIR STRICT de `Sale.calculate_totals()` et `SaleItem.save()` côté serveur.
 * Le serveur reste l'autorité : rien ici n'est envoyé tel quel, on n'envoie que
 * la saisie (quantités, prix unitaires, remises). Ce calcul sert à ce que
 * l'écran annonce AVANT validation le montant que le serveur facturera. Un
 * écart, si petit soit-il, se manifeste par une monnaie rendue fausse.
 *
 * Deux totalisations coexistent, et ce n'est pas une redondance :
 *
 * - `basketTotals()` travaille en devise PRINCIPALE. C'est la devise dans
 *   laquelle sont tenus les soldes clients, les plafonds de crédit et la valeur
 *   des points ; les contrôles s'y font donc.
 * - `totalInSaleCurrency()` travaille dans la devise de FACTURE. Chaque prix
 *   unitaire y est converti PUIS arrondi ligne à ligne, exactement comme le
 *   serveur le fera à partir de ce qu'on lui envoie. Convertir le total agrégé
 *   donnerait un autre chiffre, et c'est celui-là que le client paie.
 */

interface BasketProduct extends PackagedProductLike {
    /**
     * Identifiant du produit. Facultatif pour totaliser, indispensable dès qu'il
     * faut retrouver la ligne d'un produit dans le panier (contrôle de stock) ou
     * la nommer au serveur (corps de la vente).
     */
    id?: string;
    wholesale_price?: string | number | null;
    is_taxable?: boolean | null;
    tax_rate?: string | number | null;
}
interface BasketLine {
    product: BasketProduct;
    /**
     * Quantité totale en unité de détail, miroir exact du champ serveur : pour un
     * produit vendu en gros elle vaut `packageQuantity × facteur + part au détail`.
     */
    quantity: number;
    /** Conditionnements entiers sur cette ligne (0 pour une vente à l'unité). */
    packageQuantity: number;
    /** Prix d'une unité de détail, en devise principale. */
    unit_price: number;
    discount_percentage: number;
    /**
     * Devise dans laquelle le prix de CETTE ligne est annoncé au client.
     *
     * ┌────────────────────────────────────────────────────────────────────────┐
     * │ `unit_price` RESTE EN DEVISE PRINCIPALE, et c'est délibéré.            │
     * │                                                                        │
     * │ Changer sa devise aurait fait porter la conversion à toute             │
     * │ l'arithmétique du panier - donc aux CONTRÔLES, qui sont en principale  │
     * │ par construction : solde du client, plafond de crédit, valeur des      │
     * │ points. Ce champ ne dit QUE dans quelle monnaie la ligne est           │
     * │ ANNONCÉE ; la conversion a lieu au moment d'afficher et d'envoyer.     │
     * │                                                                        │
     * │ Absente : la ligne suit la devise de la facture, ce qu'elle a toujours │
     * │ fait. Aucune vente existante ne change de comportement.                │
     * └────────────────────────────────────────────────────────────────────────┘
     */
    priceCurrency?: string;
}
/** Contenu d'un conditionnement, ou `null` si le produit se vend à l'unité. */
declare function packagingFactorOf(product: BasketProduct): number | null;
/**
 * Part de la ligne vendue à l'unité : dérivée, jamais stockée.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ LA SOUSTRACTION SE QUANTISE, ET CE N'EST PAS DE LA COSMÉTIQUE.           │
 * │                                                                          │
 * │ `verifierAjout` quantise déjà le total : une ligne de 2 contenants plus   │
 * │ 0,3 unité à facteur 12 porte `quantity = 24,3`. La soustraction nue      │
 * │ `24,3 - 24` rend alors `0.3000000000000007`, qui partait tel quel dans   │
 * │ `buildSalePayload` sous `loose_quantity`, dont le serializer est un      │
 * │ `DecimalField(max_digits=15, decimal_places=3)` : DRF lève               │
 * │ `max_decimal_places`, et la vente est REFUSÉE après que le ticket est    │
 * │ sorti et que le client est parti.                                        │
 * │                                                                          │
 * │ C'était la seule dérivation de quantité du module à ne pas passer par    │
 * │ `roundQuantity`.                                                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
declare function looseQuantityOf(line: BasketLine): number;
/**
 * Montant brut d'une ligne, en devise principale.
 *
 * Le prix d'un conditionnement n'est PAS le prix unitaire multiplié par son
 * contenu : c'est précisément l'intérêt commercial du gros. Une ligne mixte
 * additionne donc les deux tarifs.
 */
declare function lineGross(line: BasketLine): number;
interface BasketTotals {
    subtotal: number;
    itemDiscount: number;
    /** Remise globale effectivement applicable, plafonnée au net des lignes. */
    globalDiscount: number;
    tax: number;
    /** Total BRUT, avant remise fidélité. */
    total: number;
}
interface BasketInput {
    lines: BasketLine[];
    /** Remise globale saisie par le caissier, en devise principale. */
    globalDiscountAmount?: number;
}
/** Plafond de la remise globale : on ne descend jamais sous zéro. */
declare function maxGlobalDiscount(lines: BasketLine[]): number;
declare function basketTotals({ lines, globalDiscountAmount }: BasketInput): BasketTotals;
interface SaleCurrencyInput extends BasketInput {
    currencies: CurrencyTable;
    /** Devise de facture ; la principale si absente. */
    invoiceCurrency?: string | null;
    /** Remise fidélité, en devise PRINCIPALE (c'est là que `point_value` est libellé). */
    loyaltyDiscount?: number;
}
/** Ce qu'une ligne pèse dans la devise de FACTURE. */
interface SaleCurrencyLine {
    /** Brut de la ligne, conditionnements et détail réunis. */
    gross: number;
    /** Remise de ligne, déjà arrondie dans la devise de facture. */
    discount: number;
    /** Prix d'une unité de détail. */
    unitPrice: number;
    /** Prix d'un conditionnement ; sans objet pour un produit vendu à l'unité. */
    packageUnitPrice: number;
}
/** Ventilation d'une facture, dans sa propre devise. Miroir de `BasketTotals`. */
interface SaleCurrencyTotals {
    /** La devise dans laquelle TOUS les champs qui suivent sont exprimés. */
    currency: string;
    subtotal: number;
    itemDiscount: number;
    globalDiscount: number;
    loyaltyDiscount: number;
    tax: number;
    /** Total net, remise fidélité comprise. */
    total: number;
    /** Une entrée par ligne du panier, DANS L'ORDRE. */
    lines: SaleCurrencyLine[];
}
/**
 * Ventilation complète de la facture, exprimée dans SA PROPRE devise.
 *
 * L'ordre des opérations n'est pas négociable : convertir puis arrondir CHAQUE
 * prix unitaire, puis sommer. C'est ce que le serveur fera de ce qu'on lui
 * envoie. Sommer d'abord et convertir ensuite donne un montant qui diverge de
 * la facture émise, donc un `amount_due` et une monnaie rendue faux.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CETTE VENTILATION EST CELLE QUE LE CLIENT LIT.                          │
 * │                                                                          │
 * │ `basketTotals()` rend la même chose en devise PRINCIPALE, et les deux ne │
 * │ sont pas interchangeables : la principale sert aux CONTRÔLES (solde du   │
 * │ client, plafond de crédit, valeur des points), celle-ci sert à tout ce   │
 * │ qui s'affiche et s'imprime - le total annoncé, la monnaie rendue, le     │
 * │ ticket. Prendre l'une pour l'autre écrit un montant juste sous une       │
 * │ étiquette fausse, ce qui ne se voit pas tant que l'établissement facture │
 * │ dans sa devise principale, et se voit sur le papier du client dès qu'il  │
 * │ facture ailleurs.                                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
declare function saleCurrencyTotals({ lines, currencies, invoiceCurrency, globalDiscountAmount, loyaltyDiscount, }: SaleCurrencyInput): SaleCurrencyTotals;
/** Un sous-total de panier, pour une devise d'annonce. */
interface TotalParDevise {
    currency: string;
    subtotal: number;
    itemDiscount: number;
    tax: number;
    total: number;
}
/**
 * Ventile le panier par devise d'ANNONCE : ce que le client lit sur son ticket.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CES SOUS-TOTAUX NE S'ADDITIONNENT PAS, ET C'EST TOUT LEUR OBJET.         │
 * │                                                                          │
 * │ Un marchand annonce la farine en francs et le savon importé en dollars.  │
 * │ Les deux chiffres sont vrais, et leur somme n'existe dans aucune         │
 * │ monnaie : c'est `saleCurrencyTotals` qui donne le total de la FACTURE,   │
 * │ en convertissant chaque ligne au taux de sa devise.                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Miroir de `apps/sales/currency_totals.py::ventiler`. L'ordre d'opérations y
 * est le même : convertir puis arrondir CHAQUE prix unitaire, puis sommer.
 */
declare function totauxParDevise({ lines, currencies, invoiceCurrency, }: SaleCurrencyInput): TotalParDevise[];
/**
 * Total de la facture, exprimé dans sa propre devise.
 *
 * Accesseur de `saleCurrencyTotals` : c'est la lecture la plus fréquente, et
 * elle a des appelants dans les deux surfaces.
 */
declare function totalInSaleCurrency(input: SaleCurrencyInput): number;
interface TenderLike {
    currency: string;
    amount: string | number;
}
/** Somme des règlements, convertie et arrondie dans la devise demandée. */
declare function tendersIn(tenders: TenderLike[], currencies: CurrencyTable, target: string): number;
interface MonnaieInput {
    tenders: TenderLike[];
    /** Total de la facture, dans `invoiceCurrency`. */
    total: number;
    invoiceCurrency: string;
    /** Devise des billets que le caissier rend. */
    changeCurrency: string;
    currencies: CurrencyTable;
}
/**
 * La monnaie à rendre, dans la devise des billets rendus.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN SEUL ARRONDI, À LA FIN, DANS LA DEVISE DE LA MONNAIE.                │
 * │                                                                          │
 * │ L'ancien calcul convertissait les billets remis vers la devise de la     │
 * │ facture, ARRONDISSAIT au centime, prenait le surplus, puis le            │
 * │ reconvertissait. Une vente de 575 $ réglée 1 700 000 FC (1 $ = 2 300 FC) │
 * │ y perdait un franc : 739,13 $ remis, 164,13 $ de surplus, 377 499 FC     │
 * │ rendus, quand le client attend 1 700 000 - 1 322 500 = 377 500. Un       │
 * │ centime de dollar vaut 23 francs : jusqu'à onze francs par règlement     │
 * │ étranger, gardés par le tiroir et comptés en excédent au Z.              │
 * │                                                                          │
 * │ On convertit donc chaque billet remis ET le total directement vers la    │
 * │ devise de la monnaie, sans arrondi intermédiaire.                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * La facture doit être couverte, mesurée comme le serveur décide du statut
 * (somme arrondie dans la devise de facture) : en deçà il n'y a rien à rendre,
 * il reste à payer. Le serveur rejoue la même règle dans `resolve_change`
 * (`apps/sales/services.py`) ; leurs tests portent les MÊMES cas.
 */
declare function monnaieARendre({ tenders, total, invoiceCurrency, changeCurrency, currencies, }: MonnaieInput): number;

interface LoyaltyProgramLike {
    is_active?: boolean | null;
    /** Part de la facture reversée dans la cagnotte, en %. */
    earn_percent?: string | number | null;
    /** Part de la facture réglable avec la cagnotte, réglée par l'organisation. */
    max_redemption_percent?: string | number | null;
    /** Borne dure servie par le serveur ; le réglage ne peut que la durcir. */
    max_redemption_percent_ceiling?: string | number | null;
}
/**
 * Part de la facture réglable avec la cagnotte, en devise principale.
 *
 * La cagnotte ne solde JAMAIS tout : il reste toujours un montant à encaisser
 * en monnaie. Un programme réglé à 100 % rend le plafond inopérant.
 *
 * `grossTotal` est volontairement le total BRUT : c'est lui qui plafonne le
 * montant saisissable, un total déjà net rendrait le calcul circulaire.
 */
declare function maxLoyaltyAmount(grossTotal: number, program?: LoyaltyProgramLike | null): number;
/**
 * Plus grande part de cagnotte employable : bornée par le solde ET par le
 * programme.
 */
declare function maxUsableCredit(grossTotal: number, balance: number, program?: LoyaltyProgramLike | null): number;
/**
 * Remise obtenue en réglant une part de la vente avec la cagnotte, en devise
 * principale.
 *
 * ⚠ IL N'Y A PLUS DE MINIMUM. `min_points_to_redeem` existait parce qu'un
 * point n'avait pas de valeur lisible ; un montant en a une, et refuser une
 * remise de 300 FC « parce qu'elle est trop petite » n'a aucun sens au
 * comptoir.
 */
declare function loyaltyDiscount(grossTotal: number, creditToUse: number, program?: LoyaltyProgramLike | null): number;
/**
 * Cagnotte gagnée sur une facture, en devise principale.
 *
 * Miroir de `LoyaltyProgram.credit_for`. Le pourcentage est CONTINU : on
 * n'arrondit que la monnaie.
 *
 * ⚠ `grossTotal` DOIT ÊTRE EN DEVISE PRINCIPALE. La cagnotte y est libellée ;
 * une facture en devise secondaire se ramène d'abord à la principale par son
 * taux FIGÉ, jamais par celui du jour.
 */
declare function loyaltyEarned(grossTotal: number, program?: LoyaltyProgramLike | null): number;

interface CreditCustomerLike {
    name?: string | null;
    /** `false` interdit le crédit. Distinct du plafond, voir plus bas. */
    allow_credit?: boolean | null;
    credit_limit?: string | number | null;
    current_balance?: string | number | null;
}
interface CreditVerdict {
    creditLimit: number;
    currentBalance: number;
    /** Part de la vente qui partira à crédit, en devise principale. */
    creditInPrimary: number;
    projectedBalance: number;
    notAllowed: boolean;
    overLimit: boolean;
    blocked: boolean;
    reason: string | null;
}
declare function evaluateCredit(customer: CreditCustomerLike | null | undefined, 
/** Total net de la vente, en devise principale. */
netTotal: number, 
/** Somme déjà réglée, convertie en devise principale. */
paidInPrimary: number, formatMoney?: (amount: number) => string): CreditVerdict | null;

/**
 * Corps de requête d'une vente, tel que `SaleCreateSerializer` l'attend.
 *
 * Partagé pour une raison précise : le backend prouve déjà, par test, que
 * l'opération `sale.create` du journal hors ligne et l'appel direct
 * `POST /sales/` laissent le même état. Cette preuve ne vaut que si les deux
 * surfaces envoient la même chose. En construisant le corps ici, la parité
 * cesse de reposer sur la vigilance de qui touchera l'un des deux écrans.
 *
 * On n'envoie que la SAISIE du caissier : quantités, prix unitaires, remises,
 * cagnotte. Aucun total n'est transmis. Le serveur totalise, plafonne la
 * cagnotte, contrôle le crédit et décrémente le stock ; c'est lui l'autorité,
 * et les calculs de `basket.ts` ne servent qu'à annoncer d'avance ce qu'il
 * fera.
 */

interface SaleTender {
    /** Identifiant du `PaymentMethod`, jamais un libellé. */
    method: string;
    currency: string;
    amount: string | number;
    reference?: string;
}
interface SalePayloadInput {
    /** Chaque produit doit porter son `id` : c'est ce que le serveur reçoit. */
    lines: (BasketLine & {
        product: {
            id: string;
        };
    })[];
    currencies: CurrencyTable;
    invoiceCurrency: string;
    changeCurrency?: string | null;
    globalDiscountAmount?: number;
    tenders: SaleTender[];
    register: string;
    warehouse?: string | null;
    customer?: string | null;
    /** Vente portée au compte du client : le reliquat devient une dette. */
    isCredit?: boolean;
    /** Échéance, seulement si le caissier en a fixé une sur une vente à crédit. */
    dueDate?: string | null;
    loyaltyProgram?: LoyaltyProgramLike | null;
    /** Part de cagnotte employée, en devise PRINCIPALE. */
    loyaltyToUse?: number;
    isPos?: boolean;
}
interface SaleItemPayload {
    product: string;
    unit_price: number;
    discount_percentage: number;
    quantity?: number;
    package_quantity?: number;
    loose_quantity?: number;
    package_unit_price?: number;
    /** Devise d'annonce de la ligne. Absente : celle de la facture. */
    price_currency?: string;
}
interface SalePaymentPayload {
    payment_method: string;
    tendered_amount: number;
    currency: string;
    exchange_rate?: number;
    reference?: string;
}
interface SalePayload {
    register: string;
    warehouse?: string;
    customer?: string;
    sale_type: "retail" | "credit";
    due_date?: string;
    global_discount_amount: number;
    discount_percentage: number;
    currency: string;
    exchange_rate: number;
    change_currency: string;
    is_pos: boolean;
    items: SaleItemPayload[];
    payments: SalePaymentPayload[];
    loyalty_amount_used?: number;
}
declare function buildSalePayload(input: SalePayloadInput): SalePayload;

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

interface StockedProductLike {
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
/** Quantité déjà au panier pour ce produit. */
declare function inCart(lines: BasketLine[], productId: string): number;
/**
 * Quantité encore ajoutable, en unité de détail.
 *
 * `null` signifie AUCUNE BORNE : le stock n'est pas suivi. Le serveur applique
 * la même règle.
 */
declare function addableBase(product: StockedProductLike, lines: BasketLine[]): number | null;
/**
 * Ce que chaque canal offre encore, une fois retranché ce que le panier
 * consomme déjà. `null` signifie PARTAGE INCONNU.
 *
 * La simulation rejoue l'ordre du serveur (contenants scellés d'abord, puis
 * ouverture d'un contenant pour servir le détail qui manque), sans quoi deux
 * saisies successives sur le même produit se compteraient mal et le refus
 * n'arriverait qu'à l'encaissement.
 */
declare function addableChannels(product: StockedProductLike, lines: BasketLine[], options?: {
    ignoreCartLine?: boolean;
}): ChannelAvailability;
/**
 * Contenants encore scellés, donc réellement vendables en gros.
 *
 * Borne absente pour un article dont le stock n'est pas suivi.
 */
declare function addableSealed(product: StockedProductLike, lines: BasketLine[], options?: {
    ignoreCartLine?: boolean;
}): number | null;
declare function addableLoose(product: StockedProductLike, lines: BasketLine[], options?: {
    ignoreCartLine?: boolean;
}): number | null;
interface Saisie {
    /** Contenants entiers demandés. */
    packages: number;
    /** Unités de détail demandées, en plus des contenants. */
    loose: number;
}
interface VerdictAjout {
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
declare function verifierAjout(product: StockedProductLike, lines: BasketLine[], saisie: Saisie): VerdictAjout;
/** Une ligne du panier dont le produit porte ses compteurs de stock. */
interface LigneStockee extends BasketLine {
    product: BasketProduct & StockedProductLike;
}
/** Pourquoi une ligne ne s'encaisse pas, dans l'ORDRE DU SERVEUR. */
type CauseRefusEncaissement = "verrou" | "stock-inconnu" | "rupture";
/** Ce qui empêche une ligne d'être encaissée. */
interface Rupture {
    /** Rang de la ligne dans le panier, pour la désigner à l'écran. */
    index: number;
    productId: string;
    name: string;
    cause: CauseRefusEncaissement;
    /** La phrase destinée au caissier, en français, avec son chiffre. */
    raison: string;
}
interface OptionsEncaissement {
    /**
     * Les articles verrouillés par un inventaire en cours DANS L'ENTREPÔT DE LA
     * CAISSE : identifiant d'article → référence de la session (`INV-…`). La
     * référence peut être vide : on dit alors « un inventaire en cours ».
     */
    verrous?: ReadonlyMap<string, string>;
}
/** La phrase du serveur, ramenée à un seul article. */
declare function motifDuVerrou(nomArticle: string, reference: string): string;
/**
 * Un stock INCONNU n'est pas un stock nul, et la phrase doit le dire.
 *
 * Le VERDICT est le même - sans ligne de stock dans cet entrepôt, le serveur
 * refuse aussi (`available = stock.available_quantity if stock else 0`) - mais
 * « 0 en stock » sous une carte qui annonce « aucun stock ici » donnerait au
 * caissier deux affirmations contradictoires sur le même écran.
 */
declare function motifStockInconnu(nomArticle: string): string;
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
declare function lignesEnRupture(lines: LigneStockee[], options?: OptionsEncaissement): Rupture[];
/** Les phrases qui ferment « Encaisser », une par ligne en cause. */
declare function motifsEncaissement(lines: LigneStockee[], options?: OptionsEncaissement): string[];
/**
 * Le panier peut-il être encaissé ?
 *
 * Faux dès qu'une ligne est en rupture ou verrouillée. La proforma, elle, reste
 * ouverte : c'est tout l'intérêt de séparer les deux.
 */
declare function panierServable(lines: LigneStockee[], options?: OptionsEncaissement): boolean;

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

type CanalQuantite = "retail" | "package";
interface EtatQuantite {
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
interface QuantiteInitialeInput {
    /** `getPackaging(article)`, `null` pour un article vendu à l'unité seule. */
    packaging: Pick<Packaging, "packageOnly"> | null;
    /** La ligne déjà au panier, en modification. */
    initiale?: {
        packages: number;
        loose: number;
    } | null;
    /**
     * Le motif que la surface opposerait à une saisie de 1 dans ce canal, ou
     * `null`. N'y entrent que les motifs qui FERMERAIENT l'encaissement : stock
     * insuffisant ou inconnu, scellés manquants, verrou d'inventaire. L'avis
     * d'ouverture automatique d'un contenant n'en est pas un : il informe.
     */
    alerteSiUn: (canal: CanalQuantite) => string | null;
}
/** Canal ouvert par défaut : le contenant pour un article vendu en gros seul. */
declare function canalParDefaut(packaging: Pick<Packaging, "packageOnly"> | null): CanalQuantite;
declare function quantiteInitiale({ packaging, initiale, alerteSiUn, }: QuantiteInitialeInput): EtatQuantite;
/**
 * Change de canal.
 *
 * ⚠ UNE PROPOSITION INTACTE SUIT LE CANAL. Sans cela, le caissier qui ouvre un
 * article proposé à « 1 bouteille » et passe aux cartons pour en taper deux
 * vendrait « 2 cartons + 1 bouteille » : la bouteille qu'il n'a jamais demandée
 * resterait dans l'autre canal. Dès que le caissier a touché la quantité, elle
 * est à lui, et les deux canaux gardent ce qu'il y a mis.
 */
declare function basculerCanal(etat: EtatQuantite, canal: CanalQuantite, alerteSiUn: QuantiteInitialeInput["alerteSiUn"]): EtatQuantite;
/**
 * Texte d'un champ de quantité : « 1 », « 0,5 », vide pour zéro.
 *
 * ⚠ Virgule, et SANS séparateur de milliers : c'est la valeur d'un champ de
 * saisie, pas un affichage. `String(0.5)` donnait « 0.5 », qu'une virgule
 * tapée ensuite rendait illisible (« 0.5, »).
 */
declare function saisieDeQuantite(n: number): string;

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
declare const ECART_MAX_MS = 40;
/** Le délai toléré entre le dernier caractère et Entrée. */
declare const ECART_ENTREE_MAX_MS = 120;
/** En deçà, c'est trop court pour un code-barres. */
declare const LONGUEUR_MIN = 4;
interface EtatDouchette {
    /** Les caractères de la rafale en cours, tous tapés à moins d'`ECART_MAX_MS`. */
    tampon: string;
    /** L'instant de la dernière touche, `null` avant la première. */
    dernier: number | null;
}
declare const DOUCHETTE_AU_REPOS: EtatDouchette;
/**
 * Une touche de plus. Rend le nouvel état, et le code lu quand la rafale se
 * termine par Entrée.
 *
 * `touche` est `KeyboardEvent.key` : un caractère imprimable fait une seule
 * lettre, Entrée s'écrit « Enter ». Toute autre touche (Maj, flèches) est
 * ignorée sans rompre la rafale : une douchette en azerty envoie Maj pour
 * chaque chiffre.
 */
declare function frapper(etat: EtatDouchette, touche: string, instant: number): {
    etat: EtatDouchette;
    code: string | null;
};
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
declare function candidatsDuScan(code: string, valeurDuChamp: string | null): string[];
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
interface EtatRescan<T> {
    douchette: EtatDouchette;
    /** L'état de la saisie avant la rafale en cours, `null` au repos. */
    avant: T | null;
    /** Tout ce qui a été tapé depuis `avant`, pour un scan tronqué en tête. */
    brut: string;
    dernier: number | null;
}
declare function rescanAuRepos<T>(): EtatRescan<T>;
interface ScanDansLaSaisie<T> {
    /** Les codes à essayer, dans l'ordre (`candidatsDuScan`). */
    candidats: string[];
    /** La saisie à rétablir : celle d'avant la rafale. */
    avant: T;
}
/**
 * Une touche dans le champ quantité. `courant` est l'état de la saisie AVANT
 * cette touche (un `keydown` précède la frappe).
 */
declare function frapperDansLaSaisie<T>(etat: EtatRescan<T>, touche: string, instant: number, courant: T): {
    etat: EtatRescan<T>;
    scan: ScanDansLaSaisie<T> | null;
};
/** Le code lu désigne-t-il cet article (code-barres ou SKU, casse ignorée) ? */
declare function estLeMemeArticle(candidats: string[], article: {
    barcode?: string | null;
    sku?: string | null;
}): boolean;
/**
 * La quantité d'un canal après un re-scan du MÊME article : un de plus.
 *
 * Scanner deux fois donne 2 : c'est le geste du caissier qui compte ses
 * articles en les passant sous le lecteur. Une saisie vide ou illisible
 * repart de zéro, jamais d'un nombre inventé.
 */
declare function quantiteApresRescan(valeur: number): number;

/**
 * Afficher un prix de catalogue dans une AUTRE devise, au taux en vigueur.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ T10 DU RETOUR DE TEST : « convertir les produits selon le taux ».       │
 * │                                                                          │
 * │ Un marchand dont le catalogue est tenu en dollars doit pouvoir annoncer  │
 * │ un prix en francs à son client, sans calculer de tête. C'est tout ce que │
 * │ cette demande couvre.                                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ C'EST UN AFFICHAGE, PAS UNE DEVISE PAR PRODUIT, et la distinction est
 * structurelle. Vérifié : le catalogue n'a AUCUNE colonne de devise, et toute
 * l'arithmétique de marge repose sur la convention « le coût est déjà en devise
 * principale », précisément parce qu'il n'est jamais converti. Ajouter une
 * devise par produit serait un changement de schéma qui toucherait la marge,
 * les vingt et un agrégats de rapports, les exports et les documents imprimés -
 * c'est-à-dire des chiffres déjà sortis sur du papier remis à des clients.
 *
 * ⚠ RIEN N'EST ADDITIONNÉ ICI. La règle du dépôt - « aucun écran n'additionne
 * deux monnaies » - tient : on convertit UN prix pour le montrer, le panier
 * continue de totaliser en principale, et la facture reste libellée en
 * principale. Le ticket n'est pas touché.
 */

interface PrixAvecEquivalent {
    /** Le prix tel qu'il sera FACTURÉ, en devise principale. Toujours là. */
    facture: string;
    /**
     * Le même prix dans l'AUTRE devise de l'établissement, au taux en vigueur.
     * `null` sur un établissement mono-devise.
     *
     * ⚠ IL NE REMPLACE JAMAIS `facture`, il le suit entre parenthèses. Un prix
     * converti affiché seul se lit comme le prix de vente, et le ticket
     * sortirait alors dans une autre monnaie que celle annoncée au client.
     */
    equivalent: string | null;
}
/**
 * Les devises qu'on peut proposer à l'affichage.
 *
 * La principale EN TÊTE : c'est la devise de facturation, donc le défaut, et
 * l'ordre dit lequel des deux chiffres est le prix.
 */
declare function devisesAffichables(money: MoneyHelpers): string[];
/**
 * La devise dans laquelle la carte donne l'équivalent d'un prix.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ L'ÉQUIVALENT EST TOUJOURS LÀ, ET IL N'Y A PLUS RIEN À CHOISIR.           │
 * │                                                                          │
 * │ La rangée « Afficher en » du comptoir faisait choisir une devise         │
 * │ d'affichage, rangée par appareil : le caissier devait savoir qu'elle     │
 * │ existait, et un terminal réglé hier sur la principale n'annonçait plus  │
 * │ rien en francs. L'équivalent suit désormais le prix sur chaque carte.   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * La première autre devise ACTIVE, dans l'ordre de `devisesAffichables`. Une
 * devise désactivée n'est pas proposée : le marchand l'a retirée de sa caisse,
 * et l'annoncer au client serait lui promettre un règlement qu'on refusera.
 */
declare function deviseEquivalente(money: MoneyHelpers): string | null;
/**
 * Le prix facturé et son équivalent dans l'autre devise.
 *
 * ⚠ UNE DEVISE INCONNUE NE CONVERTIT RIEN. `rateOf` rend 1 pour une devise
 * qu'elle ne connaît pas : convertir quand même afficherait le même nombre
 * sous un autre symbole, c'est-à-dire un prix faux présenté comme exact.
 */
declare function prixAvecEquivalent(prix: number, money: MoneyHelpers): PrixAvecEquivalent;

/**
 * Ce que la carte d'un article dit de son stock, PUR.
 *
 * Miroir de la carte du point de vente du back-office : un bandeau posé sur la
 * vignette, vert quand il y en a, ambre sous le seuil, rouge quand il n'y en a
 * plus. Le caissier repère ce qu'il peut vendre sans lire un seul chiffre.
 *
 * ⚠ LE ROUGE NE DIT PAS « ZÉRO ». Un article sans aucune ligne de stock dans
 * cet entrepôt est rouge parce qu'il ne s'encaissera pas ici, mais son libellé
 * reste « Aucun stock » : `null` ne se lit jamais « Épuisé ».
 */

/**
 * Ce que la carte lit d'un article. L'article du comptoir mobile le satisfait
 * tel quel ; le back-office y projette son produit de catalogue.
 */
interface ArticleDeCarte extends PackagedProductLike {
    /** Non nul : l'article est sous un inventaire en cours dans cet entrepôt. */
    verrou_inventaire: unknown;
    track_inventory: boolean;
    /**
     * Disponible de l'entrepôt de la caisse. `null` : l'article n'y a AUCUNE
     * ligne de stock, ce qui n'est pas zéro.
     */
    stock_quantity: number | null;
    /** Contenants scellés disponibles, `null` si l'article ne se conditionne pas. */
    stock_packages: number | null;
    /** Unités au détail disponibles, `null` si l'article ne se conditionne pas. */
    stock_loose: number | null;
    /** Seuil de réassort, en chaîne comme en base. */
    reorder_point?: string | null;
    unit_symbol?: string | null;
    packaging_unit_symbol?: string | null;
    /** Les emplacements de l'article dans cet entrepôt, séparés par des virgules. */
    emplacement?: string | null;
}
type EtatDeStock = "verrouille" | "non_suivi" | "aucun" | "epuise" | "bas" | "ok";
/**
 * L'état de la carte, compte tenu de ce qui est déjà au panier : le dernier
 * article qu'on vient d'y mettre fait passer la carte au rouge tout de suite.
 */
declare function etatDeLaCarte(article: ArticleDeCarte, auPanier?: number): EtatDeStock;
/**
 * Le texte du bandeau.
 *
 * `court` : la vignette de 76 points n'a pas la place de « 13 BOITES + 14
 * AMPOULES », on y écrit les symboles d'unité, comme le back-office.
 *
 * Le partage scellé / détail est LU, jamais recalculé : un rayon de 3 casiers
 * et 7 bouteilles ne se présente pas comme « 43 ».
 */
declare function libelleDuBandeau(article: ArticleDeCarte, court?: boolean): string;
/**
 * Où trouver l'article : son emplacement, puis l'entrepôt de la caisse.
 *
 * Sans ligne de stock ici il n'est nulle part dans ce dépôt, et nommer
 * l'entrepôt l'y ferait chercher.
 */
declare function lieuDeLArticle(article: ArticleDeCarte, entrepot: string | null | undefined): string;

/** Comptant (le montant reçu doit solder) ou crédit (il n'est qu'un acompte). */
type ModeReglement = "comptant" | "credit";
interface RecalageInput {
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
type ExigibleInput = Omit<RecalageInput, "mode">;
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
declare function montantExigible(e: ExigibleInput): number;
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
declare function recalerReglement(e: RecalageInput): string | null;
interface BasculeDeviseInput extends ExigibleInput {
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
declare function montantApresBasculeDevise(e: BasculeDeviseInput): string;
/** De quoi ramener un montant de la feuille dans la devise active. */
interface AffichageEnDevise {
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
declare function deviseNonActive(active: string, devisesActives: readonly string[]): string | null;
/** Un montant de la feuille, ramené dans la devise active au plus proche. */
declare function versActive(montant: number, depuis: string, a: AffichageEnDevise): number;
/**
 * Un montant ramené dans la devise active SANS JAMAIS LE DÉPASSER.
 *
 * Pour un plafond qu'on préremplit dans un champ : arrondi au plus proche, la
 * cagnotte de 434,78 $ redeviendrait 1 000 001 FC, au-dessus de ce que le
 * client possède, et le champ se refuserait lui-même à l'ouverture.
 */
declare function versActiveSansDepasser(montant: number, depuis: string, a: AffichageEnDevise): number;
/** Le total à payer, et son équivalent dans l'autre devise. */
interface RecapitulatifAffiche {
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
    equivalent: {
        montant: number;
        devise: string;
    } | null;
    /**
     * La facture est-elle établie dans une AUTRE devise que celle affichée ?
     * Alors les lignes sont des conversions arrondies, qui peuvent différer
     * d'une unité du total, et l'écran le dit.
     */
    convertie: boolean;
}
declare function recapitulatifAffiche(e: AffichageEnDevise & {
    facture: Pick<SaleCurrencyTotals, "subtotal" | "itemDiscount" | "globalDiscount" | "loyaltyDiscount" | "tax">;
    /** Total de la facture dans SA devise, cagnotte déduite. */
    totalFacture: number;
    devisesActives: readonly string[];
}): RecapitulatifAffiche;
/**
 * Ce qu'il manque, dans la devise active : ce qu'il faut ENCORE remettre.
 *
 * Par `montantExigible`, comme le total : « il manque 11,60 $ » alors que
 * 11,60 $ ne suffisent pas ferait refaire un aller-retour au caissier.
 */
declare function manqueAffiche(manque: number, a: AffichageEnDevise): number;
/**
 * Le montant de cagnotte saisi dans la devise active, ramené dans la devise
 * PRINCIPALE où la cagnotte est tenue, et borné par le plafond de la vente.
 *
 * ⚠ ARRONDI AUX DÉCIMALES DE LA PRINCIPALE : 1 000 000 FC valent 434,7826 $,
 * et le serveur refuse un montant à quatre décimales - la vente entière
 * partirait en quarantaine, ticket imprimé.
 */
declare function cagnotteVersPrincipale(e: {
    saisie: number;
    deviseActive: string;
    principale: string;
    /** Le plafond de la vente, en principale. */
    plafond: number;
    convertirBrut: (montant: number, de: string, vers: string) => number;
    arrondir: (montant: number, code: string) => number;
}): number;
/**
 * Le repère de taux, « 1 USD = 2 300 FC », dans le sens où le nombre se lit.
 *
 * ⚠ « 1 CDF = 0 $ » sortait d'un franc converti en dollars puis arrondi au
 * centime : un repère qui ne dit rien. On écrit toujours la devise FORTE à
 * gauche, quelle que soit la devise reçue.
 */
declare function libelleDuTaux(deviseRecue: string, deviseFacture: string, convertirArrondi: (montant: number, de: string, vers: string) => number, argent: (montant: number, code: string) => string): string;

/**
 * Arithmétique du point de vente, partagée par le back-office et le mobile.
 *
 * Tout ce qui décide d'un montant vit ici. Les deux surfaces peuvent différer
 * sur la disposition, jamais sur le chiffre.
 */

type index_AffichageEnDevise = AffichageEnDevise;
type index_ArticleDeCarte = ArticleDeCarte;
type index_BasculeDeviseInput = BasculeDeviseInput;
type index_BasketInput = BasketInput;
type index_BasketLine = BasketLine;
type index_BasketProduct = BasketProduct;
type index_BasketTotals = BasketTotals;
type index_CanalQuantite = CanalQuantite;
type index_CauseRefusEncaissement = CauseRefusEncaissement;
type index_CreditCustomerLike = CreditCustomerLike;
type index_CreditVerdict = CreditVerdict;
type index_CurrencyFallback = CurrencyFallback;
type index_CurrencyTable = CurrencyTable;
declare const index_DOUCHETTE_AU_REPOS: typeof DOUCHETTE_AU_REPOS;
declare const index_ECART_ENTREE_MAX_MS: typeof ECART_ENTREE_MAX_MS;
declare const index_ECART_MAX_MS: typeof ECART_MAX_MS;
type index_EtatDeStock = EtatDeStock;
type index_EtatDouchette = EtatDouchette;
type index_EtatQuantite = EtatQuantite;
type index_EtatRescan<T> = EtatRescan<T>;
type index_ExigibleInput = ExigibleInput;
declare const index_LONGUEUR_MIN: typeof LONGUEUR_MIN;
type index_LigneStockee = LigneStockee;
type index_LoyaltyProgramLike = LoyaltyProgramLike;
declare const index_MONEY_EPS: typeof MONEY_EPS;
type index_ModeReglement = ModeReglement;
type index_MonnaieInput = MonnaieInput;
type index_OptionsEncaissement = OptionsEncaissement;
type index_OrganizationCurrencyLike = OrganizationCurrencyLike;
type index_PrixAvecEquivalent = PrixAvecEquivalent;
type index_QuantiteInitialeInput = QuantiteInitialeInput;
type index_RecalageInput = RecalageInput;
type index_RecapitulatifAffiche = RecapitulatifAffiche;
type index_Rupture = Rupture;
type index_Saisie = Saisie;
type index_SaleCurrencyInput = SaleCurrencyInput;
type index_SaleCurrencyLine = SaleCurrencyLine;
type index_SaleCurrencyTotals = SaleCurrencyTotals;
type index_SaleItemPayload = SaleItemPayload;
type index_SalePayload = SalePayload;
type index_SalePayloadInput = SalePayloadInput;
type index_SalePaymentPayload = SalePaymentPayload;
type index_SaleTender = SaleTender;
type index_ScanDansLaSaisie<T> = ScanDansLaSaisie<T>;
type index_StockedProductLike = StockedProductLike;
type index_TenderLike = TenderLike;
type index_TotalParDevise = TotalParDevise;
type index_VerdictAjout = VerdictAjout;
declare const index_addableBase: typeof addableBase;
declare const index_addableChannels: typeof addableChannels;
declare const index_addableLoose: typeof addableLoose;
declare const index_addableSealed: typeof addableSealed;
declare const index_basculerCanal: typeof basculerCanal;
declare const index_basketTotals: typeof basketTotals;
declare const index_buildSalePayload: typeof buildSalePayload;
declare const index_cagnotteVersPrincipale: typeof cagnotteVersPrincipale;
declare const index_canalParDefaut: typeof canalParDefaut;
declare const index_candidatsDuScan: typeof candidatsDuScan;
declare const index_createCurrencyTable: typeof createCurrencyTable;
declare const index_deviseEquivalente: typeof deviseEquivalente;
declare const index_deviseNonActive: typeof deviseNonActive;
declare const index_devisesAffichables: typeof devisesAffichables;
declare const index_estLeMemeArticle: typeof estLeMemeArticle;
declare const index_etatDeLaCarte: typeof etatDeLaCarte;
declare const index_evaluateCredit: typeof evaluateCredit;
declare const index_frapper: typeof frapper;
declare const index_frapperDansLaSaisie: typeof frapperDansLaSaisie;
declare const index_inCart: typeof inCart;
declare const index_libelleDuBandeau: typeof libelleDuBandeau;
declare const index_libelleDuTaux: typeof libelleDuTaux;
declare const index_lieuDeLArticle: typeof lieuDeLArticle;
declare const index_lignesEnRupture: typeof lignesEnRupture;
declare const index_lineGross: typeof lineGross;
declare const index_looseQuantityOf: typeof looseQuantityOf;
declare const index_loyaltyDiscount: typeof loyaltyDiscount;
declare const index_loyaltyEarned: typeof loyaltyEarned;
declare const index_manqueAffiche: typeof manqueAffiche;
declare const index_maxGlobalDiscount: typeof maxGlobalDiscount;
declare const index_maxLoyaltyAmount: typeof maxLoyaltyAmount;
declare const index_maxUsableCredit: typeof maxUsableCredit;
declare const index_monnaieARendre: typeof monnaieARendre;
declare const index_montantApresBasculeDevise: typeof montantApresBasculeDevise;
declare const index_montantExigible: typeof montantExigible;
declare const index_motifDuVerrou: typeof motifDuVerrou;
declare const index_motifStockInconnu: typeof motifStockInconnu;
declare const index_motifsEncaissement: typeof motifsEncaissement;
declare const index_packagingFactorOf: typeof packagingFactorOf;
declare const index_panierServable: typeof panierServable;
declare const index_prixAvecEquivalent: typeof prixAvecEquivalent;
declare const index_quantiteApresRescan: typeof quantiteApresRescan;
declare const index_quantiteInitiale: typeof quantiteInitiale;
declare const index_r2: typeof r2;
declare const index_recalerReglement: typeof recalerReglement;
declare const index_recapitulatifAffiche: typeof recapitulatifAffiche;
declare const index_rescanAuRepos: typeof rescanAuRepos;
declare const index_saisieDeQuantite: typeof saisieDeQuantite;
declare const index_saleCurrencyTotals: typeof saleCurrencyTotals;
declare const index_tendersIn: typeof tendersIn;
declare const index_totalInSaleCurrency: typeof totalInSaleCurrency;
declare const index_totauxParDevise: typeof totauxParDevise;
declare const index_verifierAjout: typeof verifierAjout;
declare const index_versActive: typeof versActive;
declare const index_versActiveSansDepasser: typeof versActiveSansDepasser;
declare namespace index {
  export { type index_AffichageEnDevise as AffichageEnDevise, type index_ArticleDeCarte as ArticleDeCarte, type index_BasculeDeviseInput as BasculeDeviseInput, type index_BasketInput as BasketInput, type index_BasketLine as BasketLine, type index_BasketProduct as BasketProduct, type index_BasketTotals as BasketTotals, type index_CanalQuantite as CanalQuantite, type index_CauseRefusEncaissement as CauseRefusEncaissement, type index_CreditCustomerLike as CreditCustomerLike, type index_CreditVerdict as CreditVerdict, type index_CurrencyFallback as CurrencyFallback, type index_CurrencyTable as CurrencyTable, index_DOUCHETTE_AU_REPOS as DOUCHETTE_AU_REPOS, index_ECART_ENTREE_MAX_MS as ECART_ENTREE_MAX_MS, index_ECART_MAX_MS as ECART_MAX_MS, type index_EtatDeStock as EtatDeStock, type index_EtatDouchette as EtatDouchette, type index_EtatQuantite as EtatQuantite, type index_EtatRescan as EtatRescan, type index_ExigibleInput as ExigibleInput, index_LONGUEUR_MIN as LONGUEUR_MIN, type index_LigneStockee as LigneStockee, type index_LoyaltyProgramLike as LoyaltyProgramLike, index_MONEY_EPS as MONEY_EPS, type index_ModeReglement as ModeReglement, type index_MonnaieInput as MonnaieInput, type index_OptionsEncaissement as OptionsEncaissement, type index_OrganizationCurrencyLike as OrganizationCurrencyLike, type index_PrixAvecEquivalent as PrixAvecEquivalent, type index_QuantiteInitialeInput as QuantiteInitialeInput, type index_RecalageInput as RecalageInput, type index_RecapitulatifAffiche as RecapitulatifAffiche, type index_Rupture as Rupture, type index_Saisie as Saisie, type index_SaleCurrencyInput as SaleCurrencyInput, type index_SaleCurrencyLine as SaleCurrencyLine, type index_SaleCurrencyTotals as SaleCurrencyTotals, type index_SaleItemPayload as SaleItemPayload, type index_SalePayload as SalePayload, type index_SalePayloadInput as SalePayloadInput, type index_SalePaymentPayload as SalePaymentPayload, type index_SaleTender as SaleTender, type index_ScanDansLaSaisie as ScanDansLaSaisie, type index_StockedProductLike as StockedProductLike, type index_TenderLike as TenderLike, type index_TotalParDevise as TotalParDevise, type index_VerdictAjout as VerdictAjout, index_addableBase as addableBase, index_addableChannels as addableChannels, index_addableLoose as addableLoose, index_addableSealed as addableSealed, index_basculerCanal as basculerCanal, index_basketTotals as basketTotals, index_buildSalePayload as buildSalePayload, index_cagnotteVersPrincipale as cagnotteVersPrincipale, index_canalParDefaut as canalParDefaut, index_candidatsDuScan as candidatsDuScan, index_createCurrencyTable as createCurrencyTable, index_deviseEquivalente as deviseEquivalente, index_deviseNonActive as deviseNonActive, index_devisesAffichables as devisesAffichables, index_estLeMemeArticle as estLeMemeArticle, index_etatDeLaCarte as etatDeLaCarte, index_evaluateCredit as evaluateCredit, index_frapper as frapper, index_frapperDansLaSaisie as frapperDansLaSaisie, index_inCart as inCart, index_libelleDuBandeau as libelleDuBandeau, index_libelleDuTaux as libelleDuTaux, index_lieuDeLArticle as lieuDeLArticle, index_lignesEnRupture as lignesEnRupture, index_lineGross as lineGross, index_looseQuantityOf as looseQuantityOf, index_loyaltyDiscount as loyaltyDiscount, index_loyaltyEarned as loyaltyEarned, index_manqueAffiche as manqueAffiche, index_maxGlobalDiscount as maxGlobalDiscount, index_maxLoyaltyAmount as maxLoyaltyAmount, index_maxUsableCredit as maxUsableCredit, index_monnaieARendre as monnaieARendre, index_montantApresBasculeDevise as montantApresBasculeDevise, index_montantExigible as montantExigible, index_motifDuVerrou as motifDuVerrou, index_motifStockInconnu as motifStockInconnu, index_motifsEncaissement as motifsEncaissement, index_packagingFactorOf as packagingFactorOf, index_panierServable as panierServable, index_prixAvecEquivalent as prixAvecEquivalent, index_quantiteApresRescan as quantiteApresRescan, index_quantiteInitiale as quantiteInitiale, index_r2 as r2, index_recalerReglement as recalerReglement, index_recapitulatifAffiche as recapitulatifAffiche, index_rescanAuRepos as rescanAuRepos, index_saisieDeQuantite as saisieDeQuantite, index_saleCurrencyTotals as saleCurrencyTotals, index_tendersIn as tendersIn, index_totalInSaleCurrency as totalInSaleCurrency, index_totauxParDevise as totauxParDevise, index_verifierAjout as verifierAjout, index_versActive as versActive, index_versActiveSansDepasser as versActiveSansDepasser };
}

export { type ModeReglement as $, type AffichageEnDevise as A, type BasculeDeviseInput as B, type ChannelAvailability as C, type BasketInput as D, type BasketLine as E, type BasketProduct as F, type BasketTotals as G, type CanalQuantite as H, type CauseRefusEncaissement as I, type CreditCustomerLike as J, type CreditVerdict as K, DOUCHETTE_AU_REPOS as L, MAX_QUANTITY as M, ECART_ENTREE_MAX_MS as N, type OrganizationCurrency as O, type PackagedProductLike as P, QUANTITY_DECIMALS as Q, ECART_MAX_MS as R, type StockCounters as S, type EtatDeStock as T, type EtatDouchette as U, type EtatQuantite as V, type EtatRescan as W, type ExigibleInput as X, LONGUEUR_MIN as Y, type LigneStockee as Z, type LoyaltyProgramLike as _, type CurrencyFallback as a, recalerReglement as a$, type MonnaieInput as a0, type OptionsEncaissement as a1, type PrixAvecEquivalent as a2, type QuantiteInitialeInput as a3, type RecalageInput as a4, type RecapitulatifAffiche as a5, type Rupture as a6, type Saisie as a7, type SaleCurrencyInput as a8, type SaleCurrencyLine as a9, evaluateCredit as aA, frapper as aB, frapperDansLaSaisie as aC, inCart as aD, libelleDuBandeau as aE, libelleDuTaux as aF, lieuDeLArticle as aG, lignesEnRupture as aH, lineGross as aI, looseQuantityOf as aJ, loyaltyDiscount as aK, loyaltyEarned as aL, manqueAffiche as aM, maxGlobalDiscount as aN, maxLoyaltyAmount as aO, maxUsableCredit as aP, monnaieARendre as aQ, montantApresBasculeDevise as aR, montantExigible as aS, motifDuVerrou as aT, motifStockInconnu as aU, motifsEncaissement as aV, packagingFactorOf as aW, panierServable as aX, prixAvecEquivalent as aY, quantiteApresRescan as aZ, quantiteInitiale as a_, type SaleCurrencyTotals as aa, type SaleItemPayload as ab, type SalePayload as ac, type SalePayloadInput as ad, type SalePaymentPayload as ae, type SaleTender as af, type ScanDansLaSaisie as ag, type StockedProductLike as ah, type TenderLike as ai, type TotalParDevise as aj, type VerdictAjout as ak, addableBase as al, addableChannels as am, addableLoose as an, addableSealed as ao, basculerCanal as ap, basketTotals as aq, buildSalePayload as ar, cagnotteVersPrincipale as as, canalParDefaut as at, candidatsDuScan as au, deviseEquivalente as av, deviseNonActive as aw, devisesAffichables as ax, estLeMemeArticle as ay, etatDeLaCarte as az, type CurrencyInfo as b, recapitulatifAffiche as b0, rescanAuRepos as b1, saisieDeQuantite as b2, saleCurrencyTotals as b3, tendersIn as b4, totalInSaleCurrency as b5, totauxParDevise as b6, verifierAjout as b7, versActive as b8, versActiveSansDepasser as b9, type CurrencyTable as c, MIN_QUANTITY as d, MONEY_EPS as e, type MoneyHelpers as f, type OrganizationCurrencyLike as g, type Packaging as h, QUANTITY_INTEGER_DIGITS as i, availableBase as j, availableSplit as k, createCurrencyTable as l, createMoneyHelpers as m, formatPackaged as n, formatPackagedDifference as o, formatPackagedSplit as p, formatQuantity as q, formatUnitQuantity as r, getPackaging as s, index as t, r2 as u, remainingChannels as v, roundQuantity as w, splitPackaged as x, toBaseQuantity as y, type ArticleDeCarte as z };
