/**
 * Les bornes qui décident des refus au comptoir.
 *
 * Un refus trop strict fait perdre une vente ; un refus manquant la fait échouer
 * au 400 du serveur, client déjà servi. Ces cas fixent la frontière.
 */
import { describe, it, expect } from "vitest";
import {
  addableBase,
  addableChannels,
  addableSealed,
  verifierAjout,
  totauxParDevise,
  createCurrencyTable,
  type BasketLine,
  type BasketProduct,
  type StockedProductLike,
} from "../src/pos/index";

const casier: StockedProductLike = {
  id: "p1",
  name: "Primus 65cl",
  selling_mode: "wholesale_and_retail",
  units_per_package: 12,
  unit_name: "bouteille",
  packaging_unit_name: "casier",
  track_inventory: true,
  allow_negative_stock: false,
  stock_quantity: 39, // 3 casiers scellés + 3 bouteilles
  stock_packages: 3,
  stock_loose: 3,
};

const ligne = (over: Partial<BasketLine> = {}): BasketLine => ({
  product: casier,
  quantity: 0,
  packageQuantity: 0,
  unit_price: 5000,
  discount_percentage: 0,
  ...over,
});

describe("Bornes de stock", () => {
  it("distingue « aucune borne » de « partage inconnu »", () => {
    // Stock non suivi : on peut ajouter autant qu'on veut.
    expect(addableBase({ id: "x", track_inventory: false }, [])).toBeNull();
    // Découvert autorisé : idem, c'est un choix de l'entrepôt.
    expect(
      addableBase({ id: "x", track_inventory: true, allow_negative_stock: true, stock_quantity: 0 }, [])
    ).toBeNull();

    // Partage non renseigné : on ne SAIT pas, et on n'invente pas un zéro.
    const inconnu = addableChannels(
      { id: "x", stock_quantity: 50, stock_packages: null, stock_loose: null }, []
    );
    expect(inconnu).toEqual({ sealed: null, loose: null });
  });

  it("retranche ce que le panier consomme déjà", () => {
    expect(addableBase(casier, [])).toBe(39);
    expect(addableBase(casier, [ligne({ quantity: 15, packageQuantity: 1 })])).toBe(24);
  });

  it("ouvre un contenant pour servir le détail, comme le serveur", () => {
    // 5 bouteilles demandées alors que 3 seulement sont en vrac : un casier
    // s'ouvre, il en reste 2 scellés et 10 bouteilles libres.
    const apres = addableChannels(casier, [ligne({ quantity: 5, packageQuantity: 0 })]);
    expect(apres).toEqual({ sealed: 2, loose: 10 });
  });

  it("refuse le gros quand les contenants manquent, meme si le total suffit", () => {
    // Le rayon porte 60 bouteilles, mais 3 casiers seulement sont scellés : le
    // reste est en vrac. 48 unités « tiennent » donc dans le total sans que le
    // quatrième casier existe. C'est le cas que le total seul laisse passer, et
    // que le serveur refuse ensuite.
    const beaucoupDeVrac = { ...casier, stock_quantity: 60, stock_packages: 3, stock_loose: 24 };
    const v = verifierAjout(beaucoupDeVrac, [], { packages: 4, loose: 0 });
    expect(v.ok).toBe(false);
    expect(v.raison).toBe("Il ne reste que 3 casiers en scellé pour Primus 65cl.");
    expect(verifierAjout(beaucoupDeVrac, [], { packages: 3, loose: 0 }).ok).toBe(true);
  });

  it("laisse le controle du total trancher en premier quand il manque aussi", () => {
    // 4 casiers valent 48 unités pour un rayon qui n'en porte que 39 : c'est le
    // stock global qui manque, pas seulement les scellés. Le message doit le
    // dire, sinon le caissier croit qu'il suffit de vendre au détail.
    expect(verifierAjout(casier, [], { packages: 4, loose: 0 }).raison).toBe(
      "Stock insuffisant pour Primus 65cl : 39 en stock."
    );
  });

  it("accorde le singulier au dernier contenant", () => {
    const unSeulCasier = { ...casier, stock_quantity: 48, stock_packages: 1, stock_loose: 36 };
    expect(verifierAjout(unSeulCasier, [], { packages: 2, loose: 0 }).raison).toBe(
      "Il ne reste que 1 casier en scellé pour Primus 65cl."
    );
  });

  it("dit ce qui est deja au panier quand il fait deborder", () => {
    const sansPanier = verifierAjout(casier, [], { packages: 0, loose: 40 });
    expect(sansPanier.raison).toBe("Stock insuffisant pour Primus 65cl : 39 en stock.");

    const avec = verifierAjout(casier, [ligne({ quantity: 30, packageQuantity: 2 })], {
      packages: 0,
      loose: 15,
    });
    expect(avec.raison).toBe(
      "Stock insuffisant pour Primus 65cl : 39 en stock, 30 déjà au panier."
    );
  });

  it("convertit la saisie en quantite de detail, sans jamais l'inventer", () => {
    const v = verifierAjout(casier, [], { packages: 2, loose: 3 });
    expect(v.ok).toBe(true);
    expect(v.quantity).toBe(27);
    expect(v.packageQuantity).toBe(2);
  });

  it("ignore les contenants d'un produit vendu a l'unite seule", () => {
    const detail: StockedProductLike = {
      id: "p2", name: "Savon", selling_mode: "retail_only",
      track_inventory: true, stock_quantity: 10, stock_packages: null, stock_loose: 10,
    };
    const v = verifierAjout(detail, [], { packages: 5, loose: 2 });
    expect(v.packageQuantity).toBe(0);
    expect(v.quantity).toBe(2);
  });

  it("refuse une saisie vide plutot que d'ajouter une ligne a zero", () => {
    expect(verifierAjout(casier, [], { packages: 0, loose: 0 }).raison).toBe(
      "Indiquez une quantité."
    );
  });

  it("laisse passer quand l'entrepot tolere le decouvert", () => {
    const decouvert = { ...casier, allow_negative_stock: true };
    expect(verifierAjout(decouvert, [], { packages: 99, loose: 0 }).ok).toBe(true);
    expect(addableSealed(decouvert, [])).toBeNull();
  });
});

/**
 * Les quantités fractionnaires, et la borne haute.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ LE COMPTOIR ÉTAIT PLUS STRICT QUE LE SERVEUR, SANS RAISON.               │
 * │                                                                          │
 * │ `verifierAjout` tronquait les deux canaux par `Math.floor` et refusait   │
 * │ en dessous de 1, alors que le serveur accepte 0,001 depuis toujours      │
 * │ (`SaleItem.quantity` : `DecimalField(15, 3)` +                           │
 * │ `MinValueValidator(0.001)`). Un marchand qui pèse 0,5 kg de farine se    │
 * │ voyait répondre « Indiquez une quantité ».                               │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
describe("Quantités fractionnaires", () => {
  const farine: StockedProductLike = {
    id: "p-farine",
    name: "Farine",
    selling_mode: "retail_only",
    units_per_package: null,
    unit_name: "kg",
    track_inventory: true,
    allow_negative_stock: false,
    stock_quantity: 25,
    stock_packages: null,
    stock_loose: null,
  };

  it("accepte un demi-kilo", () => {
    const v = verifierAjout(farine, [], { packages: 0, loose: 0.5 });
    expect(v.ok).toBe(true);
    expect(v.quantity).toBe(0.5);
    expect(v.raison).toBeNull();
  });

  it("accepte le plus petit pas que le serveur enregistre", () => {
    expect(verifierAjout(farine, [], { packages: 0, loose: 0.001 }).ok).toBe(true);
  });

  it("refuse en dessous de ce pas, zéro compris", () => {
    for (const loose of [0, 0.0004]) {
      const v = verifierAjout(farine, [], { packages: 0, loose });
      expect(v.ok).toBe(false);
      expect(v.raison).toBe("Indiquez une quantité.");
    }
  });

  it("ne tronque plus : 2,5 reste 2,5", () => {
    expect(verifierAjout(farine, [], { packages: 0, loose: 2.5 }).quantity).toBe(2.5);
  });

  /**
   * ⚠ Le défaut que la quantisation existe pour fermer. Sans elle,
   * `2 * 12 + 0.3` sort à `24.299999999999997` et ce nombre finit sur un
   * ticket - le serveur, lui, aurait enregistré `24.300`.
   */
  it("quantise le total, au lieu de laisser filer le flottant", () => {
    const v = verifierAjout(casier, [], { packages: 2, loose: 0.3 });
    expect(v.quantity).toBe(24.3);
  });

  it("compte un canal fractionnaire dans le total", () => {
    const v = verifierAjout(casier, [], { packages: 2.5, loose: 0 });
    expect(v.quantity).toBe(30);
    expect(v.packageQuantity).toBe(2.5);
  });

  it("borne par le haut, là où le serveur borne", () => {
    const v = verifierAjout(farine, [], { packages: 0, loose: 1e13 });
    expect(v.ok).toBe(false);
    expect(v.raison).toMatch(/trop grande/);
  });

  /**
   * Le message fait partie de la règle : un nombre à point décimal anglais sous
   * les yeux d'un caissier congolais se lit mal, et le dépôt proscrit `Intl`.
   */
  it("écrit les quantités à la française dans ses refus", () => {
    const petit: StockedProductLike = { ...farine, stock_quantity: 0.5 };
    const v = verifierAjout(petit, [], { packages: 0, loose: 2 });
    expect(v.ok).toBe(false);
    expect(v.raison).toContain("0,5");
    expect(v.raison).not.toContain("0.5");
  });
});

/**
 * La devise d'annonce par ligne.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ LES SOUS-TOTAUX NE S'ADDITIONNENT PAS, ET C'EST LEUR OBJET.              │
 * │                                                                          │
 * │ Un marchand annonce la farine en francs et le savon importé en dollars.  │
 * │ Les deux chiffres sont vrais ; leur somme n'existe dans aucune monnaie.  │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
describe("Ventilation du panier par devise", () => {
  const devises = createCurrencyTable(
    [
      { currency_code: "CDF", exchange_rate: 1, is_primary: true },
      { currency_code: "USD", exchange_rate: 2800 },
    ],
    "CDF"
  );

  const article = (id: string, prix: number): StockedProductLike & BasketProduct =>
    ({
      id,
      name: id,
      selling_mode: "retail_only",
      units_per_package: null,
      track_inventory: true,
      stock_quantity: 100,
      stock_packages: null,
      stock_loose: null,
      is_taxable: false,
      tax_rate: 0,
      selling_price: prix,
    }) as StockedProductLike & BasketProduct;

  const ligneDe = (p: string, q: number, prix: number, cur?: string): BasketLine => ({
    product: article(p, prix),
    quantity: q,
    packageQuantity: 0,
    unit_price: prix,
    discount_percentage: 0,
    ...(cur ? { priceCurrency: cur } : {}),
  });

  it("rend une seule ligne quand tout partage la devise de facture", () => {
    const r = totauxParDevise({
      lines: [ligneDe("farine", 2, 1500)],
      currencies: devises,
      invoiceCurrency: "CDF",
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ currency: "CDF", total: 3000 });
  });

  it("sépare les deux devises, sans jamais les sommer", () => {
    const r = totauxParDevise({
      lines: [ligneDe("farine", 2, 1500), ligneDe("savon", 3, 5600, "USD")],
      currencies: devises,
      invoiceCurrency: "CDF",
    });
    expect(r.map((x) => x.currency)).toEqual(["CDF", "USD"]);
    expect(r.find((x) => x.currency === "CDF")!.total).toBe(3000);
    // 5 600 FC valent 2 $ au taux de 2 800 : trois en font six.
    expect(r.find((x) => x.currency === "USD")!.total).toBe(6);
  });

  it("garde un ordre stable d'un rendu à l'autre", () => {
    const lignes = [ligneDe("a", 1, 2800, "USD"), ligneDe("b", 1, 1000)];
    const r1 = totauxParDevise({ lines: lignes, currencies: devises, invoiceCurrency: "CDF" });
    const r2 = totauxParDevise({
      lines: [...lignes].reverse(),
      currencies: devises,
      invoiceCurrency: "CDF",
    });
    expect(r1.map((x) => x.currency)).toEqual(r2.map((x) => x.currency));
  });

  it("une ligne sans devise suit la facture", () => {
    const r = totauxParDevise({
      lines: [ligneDe("farine", 1, 2800)],
      currencies: devises,
      invoiceCurrency: "USD",
    });
    expect(r[0].currency).toBe("USD");
    expect(r[0].total).toBe(1);
  });
});
