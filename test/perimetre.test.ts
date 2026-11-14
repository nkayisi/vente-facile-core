/**
 * La règle de périmètre, miroir de `apps/core/warehouse_scope.py`.
 *
 * Isolation par défaut ; la case « Consulter tous les entrepôts » ouvre la
 * LECTURE, jamais l'action ; « Voir tout » (`sales.view_all`) ouvre le travail
 * des collègues, dans ses entrepôts seulement.
 */
import { describe, expect, it } from "vitest";

import {
  choixEntrepotRecevable,
  entrepotsActionnables,
  entrepotsLisibles,
  estBorneParAuteur,
  LIBELLES_VERROU_PERIMETRE,
  litTousLesEntrepots,
  membreDepuisPermissions,
  verrouEntrepot,
  verrouUtilisateur,
  type MembrePerimetre,
  type MotifVerrouPerimetre,
} from "../src/perimetre";

const A = { id: "a", name: "Principal", is_active: true };
const B = { id: "b", name: "Boutique Nord", is_active: true };
const C = { id: "c", name: "Dépôt fermé", is_active: false };
const TOUS = [A, B, C];

const membre = (over: Partial<MembrePerimetre> = {}): MembrePerimetre => ({
  role: "manager",
  consulteTout: false,
  voitCollegues: true,
  affectes: [A],
  ...over,
});

describe("membreDepuisPermissions", () => {
  it("lit la case, la permission « Voir tout » et les affectations", () => {
    const m = membreDepuisPermissions({
      role: "cashier",
      permissions: ["sales.view", "sales.view_all"],
      assigned_warehouses: [A],
      consult_all_warehouses: true,
    });
    expect(m).toEqual({
      role: "cashier",
      consulteTout: true,
      voitCollegues: true,
      affectes: [A],
    });
  });

  it("rien de connu : rien n'est ouvert", () => {
    expect(membreDepuisPermissions(null)).toEqual({
      role: null,
      consulteTout: false,
      voitCollegues: false,
      affectes: [],
    });
  });
});

describe("entrepotsLisibles", () => {
  it("un membre isolé ne lit que ses entrepôts affectés", () => {
    expect(entrepotsLisibles(membre({ affectes: [B] }), TOUS)).toEqual([B]);
  });

  it("un entrepôt désactivé reste LISIBLE : on relit son passé", () => {
    expect(entrepotsLisibles(membre({ affectes: [C] }), TOUS)).toEqual([C]);
  });

  it("la case « Consulter tous » ouvre tous les entrepôts en lecture", () => {
    expect(entrepotsLisibles(membre({ consulteTout: true }), TOUS)).toEqual(TOUS);
  });

  it("le propriétaire lit tout, sans affectation", () => {
    expect(entrepotsLisibles(membre({ role: "owner", affectes: [] }), TOUS)).toEqual(TOUS);
    expect(litTousLesEntrepots(membre({ role: "owner", affectes: [] }))).toBe(true);
  });
});

describe("entrepotsActionnables", () => {
  it("la case « Consulter tous » N'OUVRE PAS l'action", () => {
    // C'est la moitié de la règle qui protège : un membre qui lit partout ne
    // vend, n'encaisse et ne transfère toujours que dans ses entrepôts.
    expect(entrepotsActionnables(membre({ consulteTout: true }), TOUS)).toEqual([A]);
  });

  it("un entrepôt désactivé est fermé à l'action, même affecté", () => {
    expect(entrepotsActionnables(membre({ affectes: [A, C] }), TOUS)).toEqual([A]);
  });

  it("c'est la liste des entrepôts qui dit l'état, pas une affectation périmée", () => {
    // L'affectation vient de la session ; la liste, du tirage ou du serveur.
    // Les deux ne se rafraîchissent pas au même moment : un entrepôt désactivé
    // depuis doit se fermer même si l'affectation le croit encore ouvert.
    const affectationPerimee = { id: "c", name: "Dépôt fermé" };
    expect(entrepotsActionnables(membre({ affectes: [A, affectationPerimee] }), TOUS)).toEqual([
      A,
    ]);
  });

  it("le propriétaire agit partout, sauf sur un entrepôt désactivé", () => {
    expect(entrepotsActionnables(membre({ role: "owner", affectes: [] }), TOUS)).toEqual([A, B]);
  });

  it("un entrepôt sans `is_active` est actif (serveur antérieur)", () => {
    const ancien = { id: "a", name: "Principal" };
    expect(entrepotsActionnables(membre({ affectes: [ancien] }), [ancien])).toEqual([ancien]);
  });
});

describe("estBorneParAuteur", () => {
  it("un caissier sans « Voir tout » ne voit que ses lignes, en lecture comme en action", () => {
    const c = membre({ role: "cashier", voitCollegues: false });
    expect(estBorneParAuteur(c, "lecture")).toBe(true);
    expect(estBorneParAuteur(c, "action")).toBe(true);
  });

  it("« Voir tout » ouvre le travail des collègues", () => {
    expect(estBorneParAuteur(membre({ role: "cashier", voitCollegues: true }), "lecture")).toBe(false);
  });

  it("la case « Consulter tous » ouvre tous les auteurs EN LECTURE seulement", () => {
    const c = membre({ role: "cashier", voitCollegues: false, consulteTout: true });
    expect(estBorneParAuteur(c, "lecture")).toBe(false);
    expect(estBorneParAuteur(c, "action")).toBe(true);
  });

  it("l'auteur suit la PERMISSION, pas le rôle", () => {
    // Un gérant à qui l'on aurait retiré `sales.view_all` est borné comme un
    // caissier : c'est ce que fait le serveur, et c'est ce qui rend la case
    // « Voir tout » opérante partout.
    expect(estBorneParAuteur(membre({ voitCollegues: false }), "lecture")).toBe(true);
  });

  it("le propriétaire n'est jamais borné, un rôle inconnu non plus", () => {
    expect(estBorneParAuteur(membre({ role: "owner", voitCollegues: false }), "lecture")).toBe(false);
    expect(estBorneParAuteur(membre({ role: null, voitCollegues: false }), "lecture")).toBe(false);
  });
});

describe("verrouEntrepot", () => {
  it("un propriétaire n'est JAMAIS fermé", () => {
    expect(verrouEntrepot(membre({ role: "owner", affectes: [] }), 0)).toBeNull();
  });

  it("un rôle borné sans affectation le DIT", () => {
    expect(verrouEntrepot(membre({ affectes: [] }), 0)).toBe("aucun-entrepot");
    expect(verrouEntrepot(membre({ role: "stock_keeper", affectes: [] }), 0, "action")).toBe(
      "aucun-entrepot"
    );
  });

  it("un membre dont l'entrepôt est désactivé ne lit pas « aucun entrepôt » en action", () => {
    // Les deux ne se règlent pas pareil : l'un demande une affectation, l'autre
    // une réactivation ou une autre affectation.
    expect(verrouEntrepot(membre({ affectes: [C] }), 0, "action")).toBe("entrepot-inactif");
  });

  it("choisir entre une seule chose n'est pas un choix, caissier compris", () => {
    expect(verrouEntrepot(membre(), 1)).toBe("un-seul-entrepot");
    expect(verrouEntrepot(membre({ role: "cashier" }), 1)).toBe("un-seul-entrepot");
  });

  it("la case « Consulter tous » ouvre le filtre en lecture, pas le choix en action", () => {
    const m = membre({ consulteTout: true });
    expect(verrouEntrepot(m, 1, "lecture")).toBeNull();
    expect(verrouEntrepot(m, 1, "action")).toBe("un-seul-entrepot");
  });

  it("au-delà de deux dépôts, le filtre est ouvert", () => {
    expect(verrouEntrepot(membre({ affectes: [A, B] }), 2)).toBeNull();
  });

  it("un rôle inconnu n'invente pas de verrou", () => {
    expect(verrouEntrepot(membre({ role: null }), 0)).toBeNull();
  });
});

describe("verrouUtilisateur", () => {
  it("se ferme sur ses propres données quand le membre est borné par auteur", () => {
    expect(verrouUtilisateur(membre({ role: "cashier", voitCollegues: false }))).toBe(
      "propres-donnees"
    );
    expect(verrouUtilisateur(membre({ role: "cashier", voitCollegues: true }))).toBeNull();
  });
});

describe("libellés", () => {
  it("chaque motif a un libellé, et aucun n'est muet", () => {
    const motifs: MotifVerrouPerimetre[] = [
      "propres-donnees",
      "un-seul-entrepot",
      "aucun-entrepot",
      "entrepot-inactif",
    ];
    for (const motif of motifs) {
      expect(LIBELLES_VERROU_PERIMETRE[motif].length).toBeGreaterThan(10);
    }
  });
});

describe("choixEntrepotRecevable", () => {
  const permis = new Set(["a"]);

  it("un choix dans le périmètre passe", () => {
    expect(choixEntrepotRecevable("a", permis, false)).toBe("a");
  });

  it("un choix HORS périmètre est écarté, jamais envoyé", () => {
    expect(choixEntrepotRecevable("b", permis, false)).toBeNull();
  });

  it("qui lit partout choisit n'importe lequel", () => {
    expect(choixEntrepotRecevable("b", permis, true)).toBe("b");
  });

  it("l'absence de choix n'est pas un choix", () => {
    expect(choixEntrepotRecevable(null, permis, true)).toBeNull();
    expect(choixEntrepotRecevable("", permis, true)).toBeNull();
  });
});
