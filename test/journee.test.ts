/**
 * La portée de « Ma journée » : par défaut sa propre journée, les filtres
 * élargissent, et le caissier n'en a aucun.
 */
import { describe, it, expect } from "vitest";
import {
  afficheFiltresDeLaJournee,
  champsDeLaJournee,
  libelleDeLaPortee,
  libelleUtilisateurVide,
  parametresDeLaJournee,
  porteeDeLaJournee,
  proposeSoiMeme,
  proposeTouteLEquipe,
  type ChoixJournee,
} from "../src/journee";
import { CHOIX_TOUS, type MembrePerimetre } from "../src/perimetre";

const NORD = { id: "w-nord", name: "Boutique Nord" };
const RESERVE = { id: "w-res", name: "Réserve" };

function membre(p: Partial<MembrePerimetre> = {}): MembrePerimetre {
  return { role: "manager", consulteTout: false, voitCollegues: true, affectes: [NORD], ...p };
}

const rien: ChoixJournee = { entrepot: null, utilisateur: null };
const MOI = "u-moi";

describe("les champs de Ma journée", () => {
  it("le caissier n'a aucun champ, même avec ses deux cases", () => {
    for (const cases of [
      { consulteTout: false, voitCollegues: false },
      { consulteTout: true, voitCollegues: true },
    ]) {
      const m = membre({ role: "cashier", ...cases });
      expect(champsDeLaJournee(m)).toEqual({
        entrepot: false,
        utilisateur: false,
        tousLesEntrepots: false,
      });
      expect(afficheFiltresDeLaJournee(m)).toBe(false);
    }
  });

  it("le gérant d'UN seul entrepôt a quand même le champ Entrepôt", () => {
    // Sans lui, il n'aurait aucun moyen de voir son entrepôt entier.
    expect(champsDeLaJournee(membre())).toEqual({
      entrepot: true,
      utilisateur: true,
      tousLesEntrepots: false,
    });
  });

  it("le magasinier a les mêmes champs que le gérant", () => {
    expect(champsDeLaJournee(membre({ role: "stock_keeper" })).entrepot).toBe(true);
  });

  it("« Tous les entrepôts » au propriétaire et à la case « Consulter tous »", () => {
    expect(champsDeLaJournee(membre({ role: "owner", affectes: [] })).tousLesEntrepots).toBe(true);
    expect(champsDeLaJournee(membre({ consulteTout: true })).tousLesEntrepots).toBe(true);
    expect(champsDeLaJournee(membre()).tousLesEntrepots).toBe(false);
  });

  it("un gérant sans entrepôt n'a rien à élargir", () => {
    expect(afficheFiltresDeLaJournee(membre({ affectes: [] }))).toBe(false);
  });

  it("un rôle inconnu ne montre rien", () => {
    expect(afficheFiltresDeLaJournee(membre({ role: null }))).toBe(false);
  });
});

describe("la portée appliquée", () => {
  it("rien choisi : moi, quel que soit le rôle", () => {
    for (const role of ["owner", "manager", "stock_keeper", "cashier"] as const) {
      expect(porteeDeLaJournee(membre({ role }), rien)).toEqual({ kind: "moi" });
    }
  });

  it("le caissier reste sur lui-même, même si un choix traîne dans l'état", () => {
    const m = membre({ role: "cashier", voitCollegues: true, consulteTout: true });
    expect(porteeDeLaJournee(m, { entrepot: NORD.id, utilisateur: "u-x" })).toEqual({
      kind: "moi",
    });
  });

  it("choisir un entrepôt, c'est voir TOUTE sa journée", () => {
    expect(porteeDeLaJournee(membre(), { entrepot: NORD.id, utilisateur: null })).toEqual({
      kind: "equipe",
      entrepot: NORD.id,
    });
  });

  it("une personne, éventuellement dans un entrepôt", () => {
    expect(porteeDeLaJournee(membre(), { entrepot: null, utilisateur: "u-x" })).toEqual({
      kind: "membre",
      utilisateur: "u-x",
      entrepot: null,
    });
    expect(porteeDeLaJournee(membre(), { entrepot: NORD.id, utilisateur: "u-x" })).toEqual({
      kind: "membre",
      utilisateur: "u-x",
      entrepot: NORD.id,
    });
  });

  it("« Toute l'équipe » sans entrepôt : toute l'équipe de mes entrepôts", () => {
    expect(porteeDeLaJournee(membre(), { entrepot: null, utilisateur: CHOIX_TOUS })).toEqual({
      kind: "equipe",
      entrepot: null,
    });
  });

  it("un entrepôt hors périmètre est écarté, pas envoyé", () => {
    expect(porteeDeLaJournee(membre(), { entrepot: RESERVE.id, utilisateur: null })).toEqual({
      kind: "moi",
    });
  });

  it("« Tous les entrepôts » n'est recevable que pour qui lit partout", () => {
    expect(porteeDeLaJournee(membre(), { entrepot: CHOIX_TOUS, utilisateur: null })).toEqual({
      kind: "moi",
    });
    expect(
      porteeDeLaJournee(membre({ role: "owner", affectes: [] }), {
        entrepot: CHOIX_TOUS,
        utilisateur: null,
      }),
    ).toEqual({ kind: "equipe", entrepot: CHOIX_TOUS });
  });

  it("le propriétaire vise n'importe quel entrepôt", () => {
    const owner = membre({ role: "owner", affectes: [] });
    expect(porteeDeLaJournee(owner, { entrepot: RESERVE.id, utilisateur: null })).toEqual({
      kind: "equipe",
      entrepot: RESERVE.id,
    });
  });
});

describe("les paramètres envoyés", () => {
  it("moi part en user=<moi>, que la liste des ventes comprend aussi", () => {
    expect(parametresDeLaJournee({ kind: "moi" }, MOI)).toEqual({ user: MOI });
  });

  it("un entrepôt seul ne borne pas l'auteur", () => {
    expect(parametresDeLaJournee({ kind: "equipe", entrepot: NORD.id }, MOI)).toEqual({
      warehouse: NORD.id,
    });
  });

  it("tous les entrepôts et toute l'équipe sont des choix explicites", () => {
    expect(parametresDeLaJournee({ kind: "equipe", entrepot: CHOIX_TOUS }, MOI)).toEqual({
      all_warehouses: "1",
    });
    expect(parametresDeLaJournee({ kind: "equipe", entrepot: null }, MOI)).toEqual({
      all_users: "1",
    });
  });

  it("une personne dans un entrepôt", () => {
    expect(
      parametresDeLaJournee({ kind: "membre", utilisateur: "u-x", entrepot: NORD.id }, MOI),
    ).toEqual({ user: "u-x", warehouse: NORD.id });
  });
});

describe("ce que le champ vide dit", () => {
  it("« Moi uniquement » sans entrepôt, « Toute l'équipe » avec un entrepôt", () => {
    expect(libelleUtilisateurVide(rien)).toBe("Moi uniquement");
    expect(libelleUtilisateurVide({ entrepot: NORD.id, utilisateur: null })).toBe(
      "Toute l'équipe",
    );
  });

  it("« Toute l'équipe » n'est proposé que sans entrepôt, soi-même qu'avec un entrepôt", () => {
    expect(proposeTouteLEquipe(rien)).toBe(true);
    expect(proposeTouteLEquipe({ entrepot: NORD.id, utilisateur: null })).toBe(false);
    expect(proposeSoiMeme(rien)).toBe(false);
    expect(proposeSoiMeme({ entrepot: NORD.id, utilisateur: null })).toBe(true);
  });
});

describe("le libellé de la portée", () => {
  const noms = {
    role: "manager" as const,
    entrepot: (id: string) => (id === NORD.id ? NORD.name : undefined),
    utilisateur: (id: string) => (id === "u-x" ? "Jean K." : undefined),
  };

  it("nomme ce que l'écran couvre", () => {
    expect(libelleDeLaPortee({ kind: "moi" }, noms)).toBe("Mes opérations");
    expect(libelleDeLaPortee({ kind: "equipe", entrepot: NORD.id }, noms)).toBe(
      "Boutique Nord · toute l'équipe",
    );
    expect(libelleDeLaPortee({ kind: "equipe", entrepot: null }, noms)).toBe(
      "Toute l'équipe de mes entrepôts",
    );
    expect(libelleDeLaPortee({ kind: "membre", utilisateur: "u-x", entrepot: null }, noms)).toBe(
      "Jean K.",
    );
  });

  it("tout l'établissement pour le propriétaire", () => {
    expect(
      libelleDeLaPortee({ kind: "equipe", entrepot: CHOIX_TOUS }, { ...noms, role: "owner" }),
    ).toBe("Tout l'établissement");
  });
});
