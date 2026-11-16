/**
 * La règle de périmètre, miroir de `apps/core/warehouse_scope.py`.
 *
 * Isolation par défaut ; la case « Consulter tous les entrepôts » ouvre la
 * LECTURE, jamais l'action ; « Voir tout » (`sales.view_all`) ouvre le travail
 * des collègues, dans ses entrepôts seulement.
 */
import { describe, expect, it } from "vitest";

import {
  CHOIX_TOUS,
  caseConsulterTousUtile,
  caseVoirToutUtile,
  defautDuPerimetre,
  libelleDefautEntrepot,
  libelleDefautUtilisateur,
  parametresDuChoix,
  proposeTousLesEntrepots,
  proposeTousLesUtilisateurs,
  afficheFiltreEntrepot,
  afficheFiltresPerimetre,
  afficheFiltreUtilisateur,
  choixEntrepotRecevable,
  LIBELLES_CASES_PERIMETRE,
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

describe("quels champs de filtre s'affichent", () => {
  it("le champ Entrepôt : propriétaire, case « Consulter tous », ou plusieurs entrepôts", () => {
    expect(afficheFiltreEntrepot(membre({ role: "owner", affectes: [] }))).toBe(true);
    expect(afficheFiltreEntrepot(membre({ consulteTout: true }))).toBe(true);
    // Un gérant de plusieurs dépôts garde le filtre, limité aux siens.
    expect(afficheFiltreEntrepot(membre({ affectes: [A, B] }))).toBe(true);
    // Un seul dépôt : rien à choisir.
    expect(afficheFiltreEntrepot(membre({ affectes: [A] }))).toBe(false);
    // Un caissier sans case ne choisit jamais, même sur deux dépôts.
    expect(afficheFiltreEntrepot(membre({ role: "cashier", voitCollegues: false, affectes: [A, B] }))).toBe(false);
  });

  it("le champ Utilisateur n'est montré qu'à qui voit ses collègues", () => {
    expect(afficheFiltreUtilisateur(membre({ role: "owner", affectes: [] }))).toBe(true);
    expect(afficheFiltreUtilisateur(membre({ role: "cashier", voitCollegues: true }))).toBe(true);
    expect(afficheFiltreUtilisateur(membre({ role: "cashier", voitCollegues: false, consulteTout: true }))).toBe(true);
    expect(afficheFiltreUtilisateur(membre({ role: "cashier", voitCollegues: false }))).toBe(false);
  });

  it("sans aucune des deux options, le composant n'apparaît pas", () => {
    expect(afficheFiltresPerimetre(membre({ role: "cashier", voitCollegues: false }))).toBe(false);
    expect(afficheFiltresPerimetre(membre({ role: "cashier", voitCollegues: true }))).toBe(true);
  });

  it("un rôle inconnu ne montre rien", () => {
    expect(afficheFiltresPerimetre(membre({ role: null }))).toBe(false);
  });

  it("« Voir tout » dit désormais son périmètre", () => {
    expect(LIBELLES_CASES_PERIMETRE.voirTout.titre).toBe("Voir tout dans son entrepôt");
    expect(LIBELLES_CASES_PERIMETRE.consulterTous.titre).toBe("Consulter tous les entrepôts");
  });
});

describe("ce que chaque rôle voit par défaut (2026-11-16)", () => {
  it("le propriétaire voit tout l'établissement", () => {
    expect(defautDuPerimetre(membre({ role: "owner", affectes: [] }))).toEqual({
      entrepots: null,
      auteurBorne: false,
    });
  });

  it("le gérant et le magasinier voient toutes les données de leurs entrepôts", () => {
    expect(defautDuPerimetre(membre())).toEqual({ entrepots: null, auteurBorne: false });
    expect(defautDuPerimetre(membre({ role: "stock_keeper" }))).toEqual({
      entrepots: null,
      auteurBorne: false,
    });
  });

  it("la case « Consulter tous » ne change PAS le défaut : ses entrepôts", () => {
    expect(defautDuPerimetre(membre({ consulteTout: true, affectes: [A, B] }))).toEqual({
      entrepots: ["a", "b"],
      auteurBorne: false,
    });
  });

  it("le caissier ne voit que ses données, quelles que soient ses cases", () => {
    for (const cases of [
      {},
      { voitCollegues: true },
      { consulteTout: true },
      { voitCollegues: true, consulteTout: true },
    ]) {
      expect(defautDuPerimetre(membre({ role: "cashier", voitCollegues: false, ...cases })).auteurBorne).toBe(true);
    }
  });

  it("un rôle inconnu n'invente aucune borne", () => {
    expect(defautDuPerimetre(membre({ role: null }))).toEqual({ entrepots: null, auteurBorne: false });
  });
});

describe("les choix qui élargissent", () => {
  it("« Tous les entrepôts » n'est proposé qu'à la case, jamais au propriétaire", () => {
    expect(proposeTousLesEntrepots(membre({ consulteTout: true }))).toBe(true);
    expect(proposeTousLesEntrepots(membre({ role: "owner", consulteTout: true }))).toBe(false);
    expect(proposeTousLesEntrepots(membre({ affectes: [A, B] }))).toBe(false);
  });

  it("« Tous les utilisateurs » n'est proposé qu'au caissier qui a une case", () => {
    expect(proposeTousLesUtilisateurs(membre({ role: "cashier", voitCollegues: true }))).toBe(true);
    expect(proposeTousLesUtilisateurs(membre({ role: "cashier", voitCollegues: false, consulteTout: true }))).toBe(true);
    expect(proposeTousLesUtilisateurs(membre({ role: "cashier", voitCollegues: false }))).toBe(false);
    // Le gérant voit déjà tout le monde par défaut.
    expect(proposeTousLesUtilisateurs(membre())).toBe(false);
  });

  it("le défaut se nomme", () => {
    expect(libelleDefautEntrepot(membre({ role: "owner" }))).toBe("Tous les entrepôts");
    expect(libelleDefautEntrepot(membre({ affectes: [A, B] }))).toBe("Mes entrepôts");
    expect(libelleDefautUtilisateur(membre({ role: "cashier", voitCollegues: true }))).toBe("Moi uniquement");
    expect(libelleDefautUtilisateur(membre())).toBe("Tous les utilisateurs");
  });

  it("le défaut n'envoie RIEN, « tous » envoie le drapeau, un choix envoie l'identifiant", () => {
    expect(parametresDuChoix({ entrepot: null, utilisateur: null })).toEqual({});
    expect(parametresDuChoix({ entrepot: CHOIX_TOUS, utilisateur: CHOIX_TOUS })).toEqual({
      all_warehouses: "1",
      all_users: "1",
    });
    expect(parametresDuChoix({ entrepot: "a", utilisateur: "u" })).toEqual({ warehouse: "a", user: "u" });
  });

  it("« Tous les entrepôts » n'est recevable que pour qui lit partout", () => {
    expect(choixEntrepotRecevable(CHOIX_TOUS, new Set(["a"]), true)).toBe(CHOIX_TOUS);
    expect(choixEntrepotRecevable(CHOIX_TOUS, new Set(["a"]), false)).toBeNull();
  });

  it("« Voir tout dans son entrepôt » n'a de sens que pour un caissier", () => {
    expect(caseVoirToutUtile("cashier")).toBe(true);
    expect(caseVoirToutUtile("manager")).toBe(false);
    expect(caseVoirToutUtile("stock_keeper")).toBe(false);
    expect(caseVoirToutUtile("owner")).toBe(false);
    expect(caseConsulterTousUtile("owner")).toBe(false);
    expect(caseConsulterTousUtile("cashier")).toBe(true);
    expect(caseConsulterTousUtile("manager")).toBe(true);
  });
});
