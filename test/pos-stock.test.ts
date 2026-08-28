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
  type BasketLine,
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
    expect(v.raison).toBe("Il ne reste que 3 casiers scellés pour Primus 65cl.");
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
      "Il ne reste que 1 casier scellé pour Primus 65cl."
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
