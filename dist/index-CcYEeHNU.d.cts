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
}
/** Contenu d'un conditionnement, ou `null` si le produit se vend à l'unité. */
declare function packagingFactorOf(product: BasketProduct): number | null;
/** Part de la ligne vendue à l'unité : dérivée, jamais stockée. */
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

interface LoyaltyProgramLike {
    is_active?: boolean | null;
    /** Valeur monétaire d'un point, en devise principale. */
    point_value?: string | number | null;
    min_points_to_redeem?: number | null;
    /** Part de la facture réglable en points, réglée par l'organisation. */
    max_redemption_percent?: string | number | null;
    /** Borne dure servie par le serveur ; le réglage ne peut que la durcir. */
    max_redemption_percent_ceiling?: string | number | null;
}
/** Les points se comptent au centième, toujours par défaut : jamais arrondi au-dessus. */
declare function roundPoints(value: number): number;
/** Valeur monétaire d'un point, en devise principale. Jamais nulle. */
declare function pointValue(program?: LoyaltyProgramLike | null): number;
declare function minPointsToRedeem(program?: LoyaltyProgramLike | null): number;
/**
 * Part de la facture réglable en points, en devise principale.
 *
 * Les points ne soldent JAMAIS tout : il reste toujours un montant à encaisser
 * en monnaie. Un programme réglé à 100 % rend le plafond inopérant.
 *
 * `grossTotal` est volontairement le total BRUT : c'est lui qui plafonne le
 * nombre de points saisissables, un total déjà net rendrait le calcul circulaire.
 */
declare function maxLoyaltyAmount(grossTotal: number, program?: LoyaltyProgramLike | null): number;
/** Plus grand nombre de points saisissable : borné par le solde ET par le programme. */
declare function maxUsablePoints(grossTotal: number, pointsBalance: number, program?: LoyaltyProgramLike | null): number;
/**
 * Remise obtenue en réglant une part de la vente en points, en devise principale.
 *
 * Le minimum du programme est appliqué ici comme côté serveur : une saisie en
 * dessous ne donne AUCUNE remise, elle n'est pas simplement ignorée.
 */
declare function loyaltyDiscount(grossTotal: number, pointsToUse: number, program?: LoyaltyProgramLike | null): number;

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
 * points. Aucun total n'est transmis. Le serveur totalise, plafonne les points,
 * contrôle le crédit et décrémente le stock ; c'est lui l'autorité, et les
 * calculs de `basket.ts` ne servent qu'à annoncer d'avance ce qu'il fera.
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
    pointsToUse?: number;
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
    points_used?: number;
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
 * - `addableBase` rend `null` pour « AUCUNE BORNE » : stock non suivi, ou
 *   entrepôt tolérant le découvert. On peut ajouter autant qu'on veut.
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
    allow_negative_stock?: boolean | null;
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
 * `null` signifie AUCUNE BORNE : le stock n'est pas suivi, ou l'entrepôt tolère
 * le découvert. Le serveur applique la même règle.
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
 * Borne absente si l'entrepôt tolère le découvert, comme le fait
 * `PackagingService.assert_sealed_available`.
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

/**
 * Arithmétique du point de vente, partagée par le back-office et le mobile.
 *
 * Tout ce qui décide d'un montant vit ici. Les deux surfaces peuvent différer
 * sur la disposition, jamais sur le chiffre.
 */

type index_BasketInput = BasketInput;
type index_BasketLine = BasketLine;
type index_BasketProduct = BasketProduct;
type index_BasketTotals = BasketTotals;
type index_CreditCustomerLike = CreditCustomerLike;
type index_CreditVerdict = CreditVerdict;
type index_CurrencyFallback = CurrencyFallback;
type index_CurrencyTable = CurrencyTable;
type index_LoyaltyProgramLike = LoyaltyProgramLike;
declare const index_MONEY_EPS: typeof MONEY_EPS;
type index_OrganizationCurrencyLike = OrganizationCurrencyLike;
type index_Saisie = Saisie;
type index_SaleCurrencyInput = SaleCurrencyInput;
type index_SaleCurrencyLine = SaleCurrencyLine;
type index_SaleCurrencyTotals = SaleCurrencyTotals;
type index_SaleItemPayload = SaleItemPayload;
type index_SalePayload = SalePayload;
type index_SalePayloadInput = SalePayloadInput;
type index_SalePaymentPayload = SalePaymentPayload;
type index_SaleTender = SaleTender;
type index_StockedProductLike = StockedProductLike;
type index_TenderLike = TenderLike;
type index_VerdictAjout = VerdictAjout;
declare const index_addableBase: typeof addableBase;
declare const index_addableChannels: typeof addableChannels;
declare const index_addableLoose: typeof addableLoose;
declare const index_addableSealed: typeof addableSealed;
declare const index_basketTotals: typeof basketTotals;
declare const index_buildSalePayload: typeof buildSalePayload;
declare const index_createCurrencyTable: typeof createCurrencyTable;
declare const index_evaluateCredit: typeof evaluateCredit;
declare const index_inCart: typeof inCart;
declare const index_lineGross: typeof lineGross;
declare const index_looseQuantityOf: typeof looseQuantityOf;
declare const index_loyaltyDiscount: typeof loyaltyDiscount;
declare const index_maxGlobalDiscount: typeof maxGlobalDiscount;
declare const index_maxLoyaltyAmount: typeof maxLoyaltyAmount;
declare const index_maxUsablePoints: typeof maxUsablePoints;
declare const index_minPointsToRedeem: typeof minPointsToRedeem;
declare const index_packagingFactorOf: typeof packagingFactorOf;
declare const index_pointValue: typeof pointValue;
declare const index_r2: typeof r2;
declare const index_roundPoints: typeof roundPoints;
declare const index_saleCurrencyTotals: typeof saleCurrencyTotals;
declare const index_tendersIn: typeof tendersIn;
declare const index_totalInSaleCurrency: typeof totalInSaleCurrency;
declare const index_verifierAjout: typeof verifierAjout;
declare namespace index {
  export { type index_BasketInput as BasketInput, type index_BasketLine as BasketLine, type index_BasketProduct as BasketProduct, type index_BasketTotals as BasketTotals, type index_CreditCustomerLike as CreditCustomerLike, type index_CreditVerdict as CreditVerdict, type index_CurrencyFallback as CurrencyFallback, type index_CurrencyTable as CurrencyTable, type index_LoyaltyProgramLike as LoyaltyProgramLike, index_MONEY_EPS as MONEY_EPS, type index_OrganizationCurrencyLike as OrganizationCurrencyLike, type index_Saisie as Saisie, type index_SaleCurrencyInput as SaleCurrencyInput, type index_SaleCurrencyLine as SaleCurrencyLine, type index_SaleCurrencyTotals as SaleCurrencyTotals, type index_SaleItemPayload as SaleItemPayload, type index_SalePayload as SalePayload, type index_SalePayloadInput as SalePayloadInput, type index_SalePaymentPayload as SalePaymentPayload, type index_SaleTender as SaleTender, type index_StockedProductLike as StockedProductLike, type index_TenderLike as TenderLike, type index_VerdictAjout as VerdictAjout, index_addableBase as addableBase, index_addableChannels as addableChannels, index_addableLoose as addableLoose, index_addableSealed as addableSealed, index_basketTotals as basketTotals, index_buildSalePayload as buildSalePayload, index_createCurrencyTable as createCurrencyTable, index_evaluateCredit as evaluateCredit, index_inCart as inCart, index_lineGross as lineGross, index_looseQuantityOf as looseQuantityOf, index_loyaltyDiscount as loyaltyDiscount, index_maxGlobalDiscount as maxGlobalDiscount, index_maxLoyaltyAmount as maxLoyaltyAmount, index_maxUsablePoints as maxUsablePoints, index_minPointsToRedeem as minPointsToRedeem, index_packagingFactorOf as packagingFactorOf, index_pointValue as pointValue, index_r2 as r2, index_roundPoints as roundPoints, index_saleCurrencyTotals as saleCurrencyTotals, index_tendersIn as tendersIn, index_totalInSaleCurrency as totalInSaleCurrency, index_verifierAjout as verifierAjout };
}

export { loyaltyDiscount as $, type SaleCurrencyLine as A, type BasketInput as B, type ChannelAvailability as C, type SaleCurrencyTotals as D, type SaleItemPayload as E, type SalePayload as F, type SalePayloadInput as G, type SalePaymentPayload as H, type SaleTender as I, type StockedProductLike as J, addableBase as K, type LoyaltyProgramLike as L, MONEY_EPS as M, addableChannels as N, type OrganizationCurrency as O, type PackagedProductLike as P, addableLoose as Q, addableSealed as R, type StockCounters as S, type TenderLike as T, basketTotals as U, type VerdictAjout as V, buildSalePayload as W, evaluateCredit as X, inCart as Y, lineGross as Z, looseQuantityOf as _, type CurrencyFallback as a, maxGlobalDiscount as a0, maxLoyaltyAmount as a1, maxUsablePoints as a2, minPointsToRedeem as a3, packagingFactorOf as a4, pointValue as a5, roundPoints as a6, saleCurrencyTotals as a7, tendersIn as a8, totalInSaleCurrency as a9, verifierAjout as aa, type CurrencyInfo as b, type CurrencyTable as c, type MoneyHelpers as d, type OrganizationCurrencyLike as e, type Packaging as f, availableBase as g, availableSplit as h, createCurrencyTable as i, createMoneyHelpers as j, formatPackaged as k, formatPackagedDifference as l, formatPackagedSplit as m, getPackaging as n, index as o, remainingChannels as p, type BasketLine as q, r2 as r, splitPackaged as s, toBaseQuantity as t, type BasketProduct as u, type BasketTotals as v, type CreditCustomerLike as w, type CreditVerdict as x, type Saisie as y, type SaleCurrencyInput as z };
