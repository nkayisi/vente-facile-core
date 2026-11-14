/**
 * Ce qui ferme l'encaissement, et ce qui ne le ferme pas.
 *
 * Le refus de stock a QUITTÉ l'ajout au panier pour l'encaissement : un article
 * épuisé se compose désormais, se chiffre, et sort en proforma. Ce qui ne doit
 * jamais arriver, c'est qu'un TICKET DE VENTE sorte pour une vente que le
 * serveur refusera - c'est l'invariant que ces cas tiennent.
 */
import { describe, it, expect } from "vitest";
import {
  lignesEnRupture,
  motifsEncaissement,
  motifStockInconnu,
  panierServable,
  type LigneStockee,
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
  stock_quantity: 39, // 3 casiers scellés + 3 bouteilles
  stock_packages: 3,
  stock_loose: 3,
};

const savon: StockedProductLike = {
  id: "p2",
  name: "Savon",
  track_inventory: true,
  stock_quantity: 5,
  stock_packages: null,
  stock_loose: null,
};

const ligne = (
  product: StockedProductLike,
  quantity: number,
  packageQuantity = 0
): LigneStockee => ({
  product: { ...product, id: product.id },
  quantity,
  packageQuantity,
  unit_price: 5000,
  discount_percentage: 0,
});

describe("Lignes en rupture", () => {
  it("NE COMPTE PAS une ligne contre elle-même", () => {
    // ┌────────────────────────────────────────────────────────────────────┐
    // │ LE CAS QUI FAIT TOUT BASCULER.                                     │
    // │                                                                    │
    // │ `verifierAjout` retranche ce qui est DÉJÀ au panier. Vérifier une   │
    // │ ligne contre le panier entier la lui fait opposer sa propre         │
    // │ quantité : cinq savons sur cinq en stock deviendraient « dix        │
    // │ demandés pour cinq », et AUCUN panier ne serait plus encaissable.   │
    // └────────────────────────────────────────────────────────────────────┘
    const panier = [ligne(savon, 5)];
    expect(lignesEnRupture(panier)).toEqual([]);
    expect(panierServable(panier)).toBe(true);
  });

  it("signale la ligne qui dépasse le disponible, avec son chiffre", () => {
    const ruptures = lignesEnRupture([ligne(savon, 6)]);
    expect(ruptures).toHaveLength(1);
    expect(ruptures[0].productId).toBe("p2");
    expect(ruptures[0].name).toBe("Savon");
    expect(ruptures[0].raison).toContain("5");
    expect(panierServable([ligne(savon, 6)])).toBe(false);
  });

  it("ne borne RIEN quand le stock n'est pas suivi", () => {
    const libre = { ...savon, id: "p3", track_inventory: false };
    expect(lignesEnRupture([ligne(libre, 9999)])).toEqual([]);
  });

  it("borne MÊME un objet qui porte encore l'ancien drapeau de découvert", () => {
    // Le stock négatif a été retiré de la plateforme : aucun entrepôt n'encaisse
    // au-delà de son disponible. Un champ resté sur un objet venu du réseau ne
    // doit pas rouvrir l'encaissement.
    const decouvert = { ...savon, id: "p4", allow_negative_stock: true } as StockedProductLike;
    const ruptures = lignesEnRupture([ligne(decouvert, 9999)]);
    expect(ruptures).toHaveLength(1);
    expect(ruptures[0].cause).toBe("rupture");
  });

  it("traite un stock INCONNU comme une rupture, et le DIT", () => {
    // `null` ne se lit jamais comme zéro à l'affichage, mais le serveur refuse
    // bel et bien une vente sans ligne de stock pour cet entrepôt : fermer
    // l'encaissement est la lecture conservatrice, et la seule juste. La phrase,
    // elle, ne dit pas « 0 en stock » sous une carte qui annonce « aucun stock ».
    const inconnu = { ...savon, id: "p5", stock_quantity: null };
    const ruptures = lignesEnRupture([ligne(inconnu, 1)]);
    expect(ruptures).toHaveLength(1);
    expect(ruptures[0].cause).toBe("stock-inconnu");
    expect(ruptures[0].raison).toBe(motifStockInconnu("Savon"));
    expect(ruptures[0].raison).not.toContain("0 en stock");
  });

  it("ferme l'encaissement d'un article VERROUILLÉ par un inventaire, en nommant la session", () => {
    // L'article s'ajoute (proforma possible), mais il ne s'encaisse pas : le
    // serveur refuse les produits bloqués AVANT de regarder les quantités.
    const verrous = new Map([["p2", "INV-20261114-0001"]]);
    const ruptures = lignesEnRupture([ligne(savon, 1)], { verrous });
    expect(ruptures).toHaveLength(1);
    expect(ruptures[0].cause).toBe("verrou");
    expect(ruptures[0].raison).toContain("INV-20261114-0001");
    expect(panierServable([ligne(savon, 1)], { verrous })).toBe(false);
    expect(motifsEncaissement([ligne(savon, 1)], { verrous })).toEqual([
      ruptures[0].raison,
    ]);
  });

  it("le verrou passe AVANT la rupture, comme chez le serveur", () => {
    // Dire « stock insuffisant » sur un article sous inventaire enverrait le
    // caissier chercher au dépôt une marchandise qui est là, mais interdite.
    const verrous = new Map([["p2", ""]]);
    const ruptures = lignesEnRupture([ligne(savon, 99)], { verrous });
    expect(ruptures.map((r) => r.cause)).toEqual(["verrou"]);
    expect(ruptures[0].raison).not.toContain("()");
  });

  it("un verrou sur un AUTRE article ne ferme rien", () => {
    const verrous = new Map([["autre", "INV-1"]]);
    expect(panierServable([ligne(savon, 1)], { verrous })).toBe(true);
  });

  it("désigne la BONNE ligne quand une seule manque", () => {
    const panier = [ligne(savon, 5), ligne(casier, 39), ligne(savon, 1)];
    // Les deux lignes de savon demandent 6 pour 5 en stock : les deux sont
    // fautives, et c'est correct - le caissier doit voir les deux.
    const ruptures = lignesEnRupture(panier);
    expect(ruptures.map((r) => r.index)).toEqual([0, 2]);
    expect(ruptures.every((r) => r.productId === "p2")).toBe(true);
  });

  it("refuse des CONTENANTS que le total couvre mais que le scellé ne couvre pas", () => {
    // Quatre casiers font 48 unités pour 39 en stock : le total ne suffit pas
    // non plus. On demande donc 3 casiers (36) alors qu'il n'en reste que 3
    // scellés : cela passe. Puis 4 casiers sur un rayon qui porte assez
    // d'unités mais pas assez de scellés.
    const gros = { ...casier, id: "p6", stock_quantity: 60, stock_packages: 3, stock_loose: 24 };
    expect(lignesEnRupture([ligne(gros, 36, 3)])).toEqual([]);
    const ruptures = lignesEnRupture([ligne(gros, 48, 4)]);
    expect(ruptures).toHaveLength(1);
    expect(ruptures[0].raison).toContain("en scellé");
  });

  it("ignore une ligne vide plutôt que d'en faire une rupture", () => {
    // « Indiquez une quantité » n'a rien à faire dans un bandeau de rupture :
    // ce serait envoyer le caissier chercher du stock pour un défaut de saisie.
    expect(lignesEnRupture([ligne(savon, 0)])).toEqual([]);
  });

  it("CONTRÔLE une ligne sous l'unité, au lieu de la sauter", () => {
    // ┌────────────────────────────────────────────────────────────────────┐
    // │ LE SEUIL ÉTAIT À 1, ET IL OUVRAIT L'ENCAISSEMENT.                  │
    // │                                                                    │
    // │ Une ligne de 0,5 kg n'était JAMAIS vérifiée contre le stock : elle │
    // │ sortait de la boucle avant `verifierAjout`. Le panier se déclarait  │
    // │ servable, le ticket de vente s'imprimait, et le serveur refusait la │
    // │ vente, client déjà parti. C'est l'invariant même que cette suite    │
    // │ existe pour tenir.                                                 │
    // └────────────────────────────────────────────────────────────────────┘
    const farine = { ...savon, id: "p7", name: "Farine", unit_name: "kg", stock_quantity: 0.2 };
    const ruptures = lignesEnRupture([ligne(farine, 0.5)]);
    expect(ruptures).toHaveLength(1);
    expect(ruptures[0].raison).toContain("0,2");
    expect(panierServable([ligne(farine, 0.5)])).toBe(false);
  });

  it("laisse passer un demi-kilo que le stock couvre", () => {
    // Le symétrique du cas ci-dessus : contrôler n'est pas refuser.
    const farine = { ...savon, id: "p8", stock_quantity: 3 };
    expect(lignesEnRupture([ligne(farine, 0.5)])).toEqual([]);
  });

  it("rend le panier vide encaissable", () => {
    expect(panierServable([])).toBe(true);
  });
});
