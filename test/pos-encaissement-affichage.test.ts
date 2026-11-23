/**
 * Ce que la feuille d'encaissement affiche et préremplit, dans la devise
 * encaissée. Cas repris du terminal, où ces règles sont nées.
 */
import { describe, it, expect } from "vitest";
import {
  cagnotteVersPrincipale,
  deviseNonActive,
  libelleDuTaux,
  manqueAffiche,
  montantApresBasculeDevise,
  montantExigible,
  recalerReglement,
  recapitulatifAffiche,
  versActive,
  versActiveSansDepasser,
} from "../src/pos/encaissement-affichage";

describe("le recalage du montant recu", () => {
  const decimalesDe = (code: string) => (code === "CDF" ? 0 : 2);
  const arrondir = (m: number, code: string) => {
    const f = Math.pow(10, decimalesDe(code));
    return Math.round((m + Number.EPSILON) * f) / f;
  };

  /** La conversion BRUTE du noyau (`convert`), celle que le plafond recoit. */
  const brut = (m: number, de: string, vers: string) =>
    de === vers ? m : de === "USD" ? m * 2300 : m / 2300;

  const conv = { convertirBrut: brut, decimalesDe };

  /**
   * Ce que `tendersIn` refait en SENS INVERSE pour juger le paiement.
   *
   * ⚠ C'est `convertMoney` - conversion PUIS arrondi - et c'est tout l'enjeu :
   * le defaut vivait dans les deux arrondis successifs, aller et retour. Un
   * test dont le retour n'arrondit pas ne peut RIEN voir.
   */
  const retour = (montant: number, de: string, vers: string) =>
    arrondir(brut(montant, de, vers), vers);

  it("repose le reste du dans la devise ENCAISSEE", () => {
    expect(
      recalerReglement({
        mode: "comptant",
        totalFacture: 20,
        deviseFacture: "USD",
        deviseReglement: "CDF",
        ...conv,
      })
    ).toBe("46000");
  });

  it("laisse le montant tel quel quand les deux devises coincident", () => {
    expect(
      recalerReglement({
        mode: "comptant",
        totalFacture: 11.6,
        deviseFacture: "USD",
        deviseReglement: "USD",
        ...conv,
      })
    ).toBe("11.6");
  });

  /**
   * ⚠ LE CUL-DE-SAC QU'ON REFERME.
   *
   * Facture en CDF, encaissement en USD : `26 681 / 2300 = 11,60043...`. Arrondi
   * AU PLUS PROCHE, cela donnait 11,60 ; `tendersIn` reconvertissait
   * `11,60 x 2300 = 26 680`, soit UN FRANC de moins que la facture. Le bouton
   * « Encaisser » se fermait sur une vente que l'ecran venait lui-meme de
   * preremplir, et aucun montant en dollars ne pouvait la solder.
   */
  it("SOLDE la facture meme quand la devise encaissee est plus grossiere", () => {
    const montant = recalerReglement({
      mode: "comptant",
      totalFacture: 26681,
      deviseFacture: "CDF",
      deviseReglement: "USD",
      ...conv,
    });
    expect(montant).toBe("11.61");
    // Le controle reel : reconverti vers la facture, il ne manque RIEN.
    expect(retour(Number(montant), "USD", "CDF")).toBeGreaterThanOrEqual(26681);
  });

  /**
   * ⚠ LA PLAGE EST LARGE PARCE QU'UNE PLAGE ETROITE EST AVEUGLE.
   *
   * La premiere version balayait `26000..27000`, autour du seul exemple connu.
   * Mesure : cette plage contient ZERO valeur fautive, si bien que le test
   * passait pendant que le defaut vivait. C'est le motif d'echec que ce depot
   * documente deja - un test ecrit sur une valeur imaginee valide
   * l'imagination.
   */
  /**
   * ⚠ LA REFERENCE EST ENTIERE, ET C'EST TOUT L'INTERET.
   *
   * Au taux du jeu d'essai, UN CENT VAUT EXACTEMENT 23 FRANCS : l'attendu se
   * calcule donc en arithmetique entiere, sans jamais emprunter le flottant
   * qu'on eprouve. Une premiere version comparait a
   * `Math.ceil(f / 2300 * 100) / 100`, c'est-a-dire au MEME produit fautif :
   * elle validait le defaut au lieu de l'attraper.
   *
   * La plage est large parce qu'une plage etroite est aveugle. La premiere
   * version balayait `26000..27000`, autour du seul exemple connu ; mesure,
   * cette plage contient ZERO valeur fautive, si bien que le test passait
   * pendant que le defaut vivait. C'est le motif d'echec que ce depot
   * documente deja - un test ecrit sur une valeur imaginee valide
   * l'imagination.
   */
  it("rend le plus petit montant qui solde, facture en francs", () => {
    for (let f = 1; f <= 60000; f += 1) {
      const m = Number(
        recalerReglement({
          mode: "comptant",
          totalFacture: f,
          deviseFacture: "CDF",
          deviseReglement: "USD",
          ...conv,
        })
      );
      // Il SOLDE : reconverti vers la facture, il ne manque rien.
      expect(retour(m, "USD", "CDF")).toBeGreaterThanOrEqual(f);
      // Et c'est le PLUS PETIT : un cent de moins ne solde plus.
      const unCentDeMoins = Math.round((m - 0.01) * 100) / 100;
      if (unCentDeMoins > 0) {
        expect(retour(unCentDeMoins, "USD", "CDF")).toBeLessThan(f);
      }
      // Attendu exact, en cents : 125 valeurs de cette plage en sortaient.
      expect(Math.round(m * 100)).toBe(Math.ceil(f / 23));
    }
  });

  it("solde aussi dans l'autre sens, facture en dollars reglee en francs", () => {
    for (let cents = 1; cents <= 200000; cents += 1) {
      const x = cents / 100;
      const m = Number(
        recalerReglement({
          mode: "comptant",
          totalFacture: x,
          deviseFacture: "USD",
          deviseReglement: "CDF",
          ...conv,
        })
      );
      expect(retour(m, "CDF", "USD")).toBeGreaterThanOrEqual(x);
      // Un cent vaut 23 francs, exactement : l'attendu n'a pas de reste.
      // 6 397 valeurs de cette plage sortaient un franc au-dessus.
      expect(m).toBe(cents * 23);
    }
  });

  /**
   * ⚠ LE CAS ORDINAIRE, ET CELUI QUI ETAIT FAUX.
   *
   * `convert` du noyau rend le montant TEL QUEL quand les deux devises
   * coincident : le plafond ne doit donc RIEN deplacer. La garde absolue
   * ajoutait pourtant une unite mineure sur 4,58 % des montants a deux
   * decimales - sur le chemin mono-devise, qui est celui de presque toutes les
   * ventes. Le champ portait « 4.11 » et le bouton annoncait « 4,12 $ ».
   */
  it("reste neutre a devises egales, sur TOUTE la plage", () => {
    for (let cents = 1; cents <= 200000; cents += 1) {
      const x = cents / 100;
      const rendu = recalerReglement({
        mode: "comptant",
        totalFacture: x,
        deviseFacture: "USD",
        deviseReglement: "USD",
        ...conv,
      });
      if (Number(rendu) !== x) {
        throw new Error(`${x} USD est ressorti a ${rendu}`);
      }
    }
    for (let f = 1; f <= 50000; f += 1) {
      const rendu = recalerReglement({
        mode: "comptant",
        totalFacture: f,
        deviseFacture: "CDF",
        deviseReglement: "CDF",
        ...conv,
      });
      if (Number(rendu) !== f) throw new Error(`${f} CDF est ressorti a ${rendu}`);
    }
  });

  it("rend 4,11 pour une vente de 4,11 $, et c'est la valeur temoin", () => {
    // `4.11 * 100` vaut 411.00000000000006 : un ulp au-dessus de l'entier, donc
    // `Math.ceil` montait a 412. La valeur est nommee pour qu'on ne la perde
    // pas dans un balayage qu'on retrecirait un jour.
    expect(
      recalerReglement({
        mode: "comptant",
        totalFacture: 4.11,
        deviseFacture: "USD",
        deviseReglement: "USD",
        ...conv,
      })
    ).toBe("4.11");
  });

  it("NE TOUCHE A RIEN en credit : l'acompte est facultatif", () => {
    // Le remplir ferait d'une vente a credit une vente soldee, qui
    // n'inscrirait aucune dette. Le back-office a paye ce defaut.
    expect(
      recalerReglement({
        mode: "credit",
        totalFacture: 20,
        deviseFacture: "USD",
        deviseReglement: "USD",
        ...conv,
      })
    ).toBeNull();
  });
});

describe("la bascule de la devise d'encaissement", () => {
  const decimalesDe = (code: string) => (code === "CDF" ? 0 : 2);
  const arrondir = (m: number, code: string) => {
    const f = Math.pow(10, decimalesDe(code));
    return Math.round((m + Number.EPSILON) * f) / f;
  };
  const brut = (m: number, de: string, vers: string) =>
    de === vers ? m : de === "USD" ? m * 2300 : m / 2300;
  const arrondi = (m: number, de: string, vers: string) =>
    arrondir(brut(m, de, vers), vers);

  const conv = {
    convertirBrut: brut,
    convertirArrondi: arrondi,
    decimalesDe,
  };

  /**
   * ⚠ LE CUL-DE-SAC QU'ON REFERME, PAR SA SECONDE PORTE.
   *
   * `montantExigible` le fermait deja au prereemplissage ; la bascule de devise
   * le rouvrait, en convertissant AU PLUS PROCHE. Le champ portait 11,60, le
   * bouton annoncait 11,61, et aucun montant en dollars ne soldait la facture.
   */
  it("SOLDE encore apres etre passe a une devise plus grossiere", () => {
    const m = montantApresBasculeDevise({
      mode: "comptant",
      saisie: "26681",
      deviseAvant: "CDF",
      totalFacture: 26681,
      deviseFacture: "CDF",
      deviseReglement: "USD",
      ...conv,
    });
    expect(m).toBe("11.61");
    // Le controle reel : reconverti vers la facture, il ne manque RIEN.
    expect(arrondi(Number(m), "USD", "CDF")).toBeGreaterThanOrEqual(26681);
  });

  it("ne releve RIEN quand la conversion suffit deja", () => {
    // 23 000 FC valent exactement 10 $ : rien a plafonner.
    expect(
      montantApresBasculeDevise({
        mode: "comptant",
        saisie: "23000",
        deviseAvant: "CDF",
        totalFacture: 23000,
        deviseFacture: "CDF",
        deviseReglement: "USD",
        ...conv,
      })
    ).toBe("10");
  });

  /**
   * ⚠ L'AUTRE MOITIE DE LA REGLE, et celle qu'on casserait en premier.
   *
   * « On convertit, on n'efface jamais » ne bouge pas : relever un montant que
   * le caissier a voulu PARTIEL serait lui reprendre sa saisie.
   */
  it("laisse un montant PARTIEL tel quel, converti", () => {
    expect(
      montantApresBasculeDevise({
        mode: "comptant",
        saisie: "11500",
        deviseAvant: "CDF",
        totalFacture: 26681,
        deviseFacture: "CDF",
        deviseReglement: "USD",
        ...conv,
      })
    ).toBe("5");
  });

  it("NE TOUCHE A RIEN en credit : l'acompte est facultatif", () => {
    expect(
      montantApresBasculeDevise({
        mode: "credit",
        saisie: "26681",
        deviseAvant: "CDF",
        totalFacture: 26681,
        deviseFacture: "CDF",
        deviseReglement: "USD",
        ...conv,
      })
    ).toBe("11.6");
  });

  it("laisse un champ vide vide, et une saisie illisible verbatim", () => {
    const base = {
      mode: "comptant" as const,
      deviseAvant: "CDF",
      totalFacture: 26681,
      deviseFacture: "CDF",
      deviseReglement: "USD",
      ...conv,
    };
    expect(montantApresBasculeDevise({ ...base, saisie: "" })).toBe("");
    expect(montantApresBasculeDevise({ ...base, saisie: "12,5,0" })).toBe("12,5,0");
  });

  it("ne bouge pas quand les deux devises coincident", () => {
    expect(
      montantApresBasculeDevise({
        mode: "comptant",
        saisie: "26681",
        deviseAvant: "CDF",
        totalFacture: 26681,
        deviseFacture: "CDF",
        deviseReglement: "CDF",
        ...conv,
      })
    ).toBe("26681");
  });

  /**
   * Le balayage qui compte : sur toute facture en francs dont le champ porte le
   * montant exact, basculer en dollars doit laisser le bouton OUVERT.
   */
  it("ne ferme JAMAIS le bouton sur une facture qui etait soldee", () => {
    for (let f = 1; f <= 40000; f += 1) {
      const m = montantApresBasculeDevise({
        mode: "comptant",
        saisie: String(f),
        deviseAvant: "CDF",
        totalFacture: f,
        deviseFacture: "CDF",
        deviseReglement: "USD",
        ...conv,
      });
      if (arrondi(Number(m), "USD", "CDF") + 1e-6 < f) {
        throw new Error(`${f} FC bascule en ${m} $, qui ne solde plus`);
      }
    }
  });
});

describe("la devise active de la feuille", () => {
  // Un établissement en USD qui encaisse aussi des francs, à 2 300 FC le dollar.
  const decimalesDe = (code: string) => (code === "CDF" ? 0 : 2);
  const arrondir = (m: number, code: string) => {
    const f = Math.pow(10, decimalesDe(code));
    return Math.round((m + Number.EPSILON) * f) / f;
  };
  const convertirBrut = (m: number, de: string, vers: string) =>
    de === vers ? m : de === "USD" ? m * 2300 : m / 2300;
  const convertirArrondi = (m: number, de: string, vers: string) =>
    arrondir(convertirBrut(m, de, vers), vers);
  const affichage = (deviseFacture: string, deviseActive: string) => ({
    deviseFacture,
    deviseActive,
    convertirArrondi,
    convertirBrut,
    decimalesDe,
  });
  const FACTURE = {
    subtotal: 1200,
    itemDiscount: 30,
    globalDiscount: 20,
    loyaltyDiscount: 0,
    tax: 0,
  };

  it("n'a d'équivalent que sur un établissement à DEUX devises", () => {
    expect(deviseNonActive("USD", ["USD", "CDF"])).toBe("CDF");
    expect(deviseNonActive("CDF", ["USD", "CDF"])).toBe("USD");
    expect(deviseNonActive("USD", ["USD"])).toBeNull();
    // Au-delà de deux, il n'y a plus « l'autre » devise.
    expect(deviseNonActive("USD", ["USD", "CDF", "EUR"])).toBeNull();
  });

  it("à devises égales, ne convertit rien et donne l'équivalent en francs", () => {
    const r = recapitulatifAffiche({
      ...affichage("USD", "USD"),
      facture: FACTURE,
      totalFacture: 1150,
      devisesActives: ["USD", "CDF"],
    });
    expect(r.sousTotal).toBe(1200);
    expect(r.remisesArticles).toBe(30);
    expect(r.total).toBe(1150);
    expect(r.equivalent).toEqual({ montant: 2645000, devise: "CDF" });
    expect(r.convertie).toBe(false);
  });

  it("en francs, tout se lit en francs, et la parenthèse est le total EXACT de la facture", () => {
    const r = recapitulatifAffiche({
      ...affichage("USD", "CDF"),
      facture: FACTURE,
      totalFacture: 1150,
      devisesActives: ["USD", "CDF"],
    });
    expect(r.devise).toBe("CDF");
    expect(r.sousTotal).toBe(2760000);
    expect(r.remise).toBe(46000);
    expect(r.total).toBe(2645000);
    expect(r.equivalent).toEqual({ montant: 1150, devise: "USD" });
    expect(r.convertie).toBe(true);
  });

  it("le total est ce qu'il faut RECEVOIR : 26 681 FC demandent 11,61 $, pas 11,60 $", () => {
    // 26 681 / 2300 = 11,60043... Au plus proche, 11,60 $ ne soldent pas la
    // facture (11,60 x 2300 = 26 680). Le total doit être celui du bouton.
    const r = recapitulatifAffiche({
      ...affichage("CDF", "USD"),
      facture: { ...FACTURE, subtotal: 26681, itemDiscount: 0, globalDiscount: 0 },
      totalFacture: 26681,
      devisesActives: ["USD", "CDF"],
    });
    expect(r.total).toBe(11.61);
    expect(r.total * 2300).toBeGreaterThanOrEqual(26681);
  });

  it("n'écrit aucun équivalent avec trois devises", () => {
    const r = recapitulatifAffiche({
      ...affichage("USD", "USD"),
      facture: FACTURE,
      totalFacture: 1150,
      devisesActives: ["USD", "CDF", "EUR"],
    });
    expect(r.equivalent).toBeNull();
  });

  it("dit ce qu'il manque par ce qui suffit, pas par l'arrondi au plus proche", () => {
    expect(manqueAffiche(26681, affichage("CDF", "USD"))).toBe(11.61);
    expect(manqueAffiche(0, affichage("CDF", "USD"))).toBe(0);
    expect(manqueAffiche(-5, affichage("CDF", "USD"))).toBe(0);
  });

  it("préremplit un plafond SANS JAMAIS le dépasser", () => {
    // 434,7826 $ font 999 999,98 FC : au plus proche, 1 000 000 FC
    // dépasseraient la cagnotte du client.
    expect(versActiveSansDepasser(434.7826, "USD", affichage("USD", "CDF"))).toBe(999999);
    // Un nombre rond ne perd rien à la conversion.
    expect(versActiveSansDepasser(10, "USD", affichage("USD", "CDF"))).toBe(23000);
    expect(versActiveSansDepasser(10, "USD", affichage("USD", "USD"))).toBe(10);
  });

  it("ne retire pas un franc pour l'imprécision du taux stocké", () => {
    // Le serveur range le franc à 0,000434782609 le dollar (1/2300 à douze
    // décimales) : 360 $ y font 827 999,9994 FC. C'est 828 000 FC, pas
    // 827 999 FC (relevé sur le rk3568, sur une vraie cagnotte de 360 $).
    const tauxStocke = 0.000434782609;
    const brut = (m: number, de: string, vers: string) =>
      de === vers ? m : de === "USD" ? m / tauxStocke : m * tauxStocke;
    const a = { ...affichage("USD", "CDF"), convertirBrut: brut };
    expect(versActiveSansDepasser(360, "USD", a)).toBe(828000);
    // Et sur un grand montant, où l'erreur relative du taux pèse plus lourd.
    expect(versActiveSansDepasser(43000, "USD", a)).toBe(98900000);
  });

  it("ramène la cagnotte saisie en francs dans la principale, arrondie et bornée", () => {
    const base = {
      deviseActive: "CDF",
      principale: "USD",
      convertirBrut,
      arrondir,
    };
    // 1 000 000 FC = 434,78 $ : deux décimales, jamais quatre.
    expect(cagnotteVersPrincipale({ ...base, saisie: 1000000, plafond: 500 })).toBe(434.78);
    // Jamais au-dessus du plafond de la vente.
    expect(cagnotteVersPrincipale({ ...base, saisie: 1000000, plafond: 300 })).toBe(300);
    // En principale, la saisie passe telle quelle.
    expect(
      cagnotteVersPrincipale({ ...base, deviseActive: "USD", saisie: 12.5, plafond: 300 })
    ).toBe(12.5);
  });
});

describe("le repère de taux", () => {
  const conv = (m: number, de: string, vers: string) =>
    de === vers ? m : de === "USD" ? m * 2300 : Math.round((m / 2300) * 100) / 100;
  const argent = (m: number, code: string) => `${m} ${code}`;

  it("écrit toujours la devise forte à gauche, quelle que soit la devise reçue", () => {
    expect(libelleDuTaux("CDF", "USD", conv, argent)).toBe("1 USD = 2300 CDF");
    expect(libelleDuTaux("USD", "CDF", conv, argent)).toBe("1 USD = 2300 CDF");
  });
});
