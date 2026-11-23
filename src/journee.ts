/**
 * La portée de « Ma journée » : QUI et OÙ l'écran regarde aujourd'hui.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ PAR DÉFAUT, CHACUN VOIT SA PROPRE JOURNÉE, PROPRIÉTAIRE COMPRIS.        │
 * │                                                                          │
 * │ C'est ce qui distingue cet écran des listes (`perimetre.ts`), où le      │
 * │ gérant voit d'emblée tout son entrepôt. Ici la question est « qu'ai-je   │
 * │ fait aujourd'hui ? », et les filtres ÉLARGISSENT :                       │
 * │                                                                          │
 * │   rien choisi            -> moi                                          │
 * │   un entrepôt            -> TOUTE la journée de cet entrepôt             │
 * │   « Tous les entrepôts » -> tout ce que je peux lire                     │
 * │   une personne           -> sa journée (dans l'entrepôt choisi, s'il y   │
 * │                             en a un)                                     │
 * │   « Toute l'équipe »     -> toute l'équipe de mes entrepôts              │
 * │                                                                          │
 * │ Choisir un entrepôt, c'est regarder sa journée entière : c'est ce qui    │
 * │ donne au gérant « filtrer sur son entrepôt pour voir tout l'entrepôt »,  │
 * │ en un seul geste.                                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ LE CAISSIER N'A AUCUN FILTRE, QUELLES QUE SOIENT SES CASES (décision du
 * 2026-11-22). Ma journée reste strictement personnelle pour lui ; ses cases
 * continuent de s'appliquer aux autres écrans. Le serveur le tient aussi : il
 * refuse à un caissier tout paramètre qui n'est pas lui-même.
 *
 * ⚠ CE MODULE NE VÉRIFIE PAS QUI EST UN COLLÈGUE. La liste des personnes vient
 * de l'équipe que le serveur a déjà bornée ; un identifiant hors périmètre est
 * refusé par le serveur (400), jamais rendu en ensemble vide.
 */
import {
  CHOIX_TOUS,
  choixEntrepotRecevable,
  libelleDefautEntrepot,
  litTousLesEntrepots,
  type MembrePerimetre,
} from "./perimetre";

/** Ce que le membre a choisi : `null` (rien), un identifiant, ou `CHOIX_TOUS`. */
export interface ChoixJournee {
  entrepot: string | null;
  utilisateur: string | null;
}

export const CHOIX_JOURNEE_VIDE: ChoixJournee = { entrepot: null, utilisateur: null };

/** Ce que l'écran propose au membre. */
export interface ChampsJournee {
  /** Le champ « Entrepôt ». */
  entrepot: boolean;
  /** Le champ « Utilisateur ». */
  utilisateur: boolean;
  /** Le choix « Tous les entrepôts » : propriétaire, case « Consulter tous ». */
  tousLesEntrepots: boolean;
}

const AUCUN_CHAMP: ChampsJournee = { entrepot: false, utilisateur: false, tousLesEntrepots: false };

/**
 * Les champs de Ma journée pour ce membre.
 *
 * ⚠ Le gérant et le magasinier ont le champ « Entrepôt » MÊME AVEC UN SEUL
 * entrepôt : sans lui, ils n'auraient aucun moyen de voir leur entrepôt entier
 * (ailleurs, choisir entre une seule chose n'est pas un choix ; ici, c'est le
 * choix entre « moi » et « tout l'entrepôt »). Un membre sans entrepôt n'a rien
 * à élargir.
 */
export function champsDeLaJournee(m: MembrePerimetre): ChampsJournee {
  if (m.role === null || m.role === "cashier") return AUCUN_CHAMP;
  const tous = litTousLesEntrepots(m);
  if (!tous && m.affectes.length === 0) return AUCUN_CHAMP;
  return { entrepot: true, utilisateur: true, tousLesEntrepots: tous };
}

/** Le membre a-t-il le moindre filtre sur Ma journée ? */
export function afficheFiltresDeLaJournee(m: MembrePerimetre): boolean {
  const c = champsDeLaJournee(m);
  return c.entrepot || c.utilisateur;
}

/**
 * La portée APPLIQUÉE.
 *
 * - `moi` : mes opérations, dans tout ce que je peux lire ;
 * - `equipe` : tous les auteurs ; `entrepot` est un identifiant, `CHOIX_TOUS`
 *   (tous les entrepôts lisibles) ou `null` (mes entrepôts) ;
 * - `membre` : une personne, éventuellement dans un entrepôt.
 */
export type PorteeJournee =
  | { kind: "moi" }
  | { kind: "equipe"; entrepot: string | null }
  | { kind: "membre"; utilisateur: string; entrepot: string | null };

export const PORTEE_MOI: PorteeJournee = { kind: "moi" };

/**
 * Le choix traduit en portée, après en avoir écarté ce qui n'est pas recevable.
 *
 * ⚠ UN CHOIX HORS PÉRIMÈTRE EST ÉCARTÉ, PAS ENVOYÉ : un entrepôt qui n'est pas
 * le sien (un filtre resté d'une session précédente, un rôle changé entre-temps)
 * retombe sur rien. Le caissier ne quitte jamais `moi`.
 */
export function porteeDeLaJournee(m: MembrePerimetre, choix: ChoixJournee): PorteeJournee {
  const champs = champsDeLaJournee(m);
  if (!champs.entrepot && !champs.utilisateur) return PORTEE_MOI;

  const permis = new Set(m.affectes.map((e) => e.id));
  const entrepot = champs.entrepot
    ? choixEntrepotRecevable(choix.entrepot, permis, champs.tousLesEntrepots)
    : null;
  const utilisateur = champs.utilisateur ? choix.utilisateur : null;

  if (utilisateur && utilisateur !== CHOIX_TOUS) {
    return { kind: "membre", utilisateur, entrepot };
  }
  if (utilisateur === CHOIX_TOUS || entrepot) {
    return { kind: "equipe", entrepot };
  }
  return PORTEE_MOI;
}

/**
 * Les paramètres de requête de la portée.
 *
 * Ils servent DEUX endpoints, et c'est voulu : la journée (`my-day`), et la
 * liste des ventes du jour (`/sales/`). `moi` part donc en `user=<moi>`, que les
 * deux comprennent ; `my-day` sans paramètre rend la même chose.
 */
export function parametresDeLaJournee(
  p: PorteeJournee,
  moi: string,
): { warehouse?: string; all_warehouses?: "1"; user?: string; all_users?: "1" } {
  const entrepot = (e: string | null) =>
    e === CHOIX_TOUS ? { all_warehouses: "1" as const } : e ? { warehouse: e } : {};
  switch (p.kind) {
    case "moi":
      return { user: moi };
    case "membre":
      return { user: p.utilisateur, ...entrepot(p.entrepot) };
    case "equipe":
      // Sans entrepôt : toute l'équipe de mes entrepôts. `all_users` le dit
      // explicitement ; sur une liste dont le défaut est déjà tous les auteurs,
      // il n'a aucun effet.
      return p.entrepot ? entrepot(p.entrepot) : { all_users: "1" };
  }
}

/** Ce qu'on lit sur le champ Entrepôt vide. */
export function libelleEntrepotVide(m: MembrePerimetre): string {
  return libelleDefautEntrepot(m);
}

/**
 * Ce qu'on lit sur le champ Utilisateur vide.
 *
 * ⚠ IL DÉPEND DE L'ENTREPÔT : sans entrepôt, le vide veut dire « moi » ; avec
 * un entrepôt choisi, il veut dire toute l'équipe de cet entrepôt. Le champ vide
 * NOMME toujours ce qu'il applique.
 */
export function libelleUtilisateurVide(choix: ChoixJournee): string {
  return choix.entrepot ? LIBELLE_TOUTE_L_EQUIPE : "Moi uniquement";
}

export const LIBELLE_TOUTE_L_EQUIPE = "Toute l'équipe";

/**
 * Faut-il proposer « Toute l'équipe » comme choix du champ Utilisateur ?
 * Seulement sans entrepôt : avec un entrepôt choisi, le vide le dit déjà.
 */
export function proposeTouteLEquipe(choix: ChoixJournee): boolean {
  return !choix.entrepot;
}

/**
 * Faut-il se proposer soi-même parmi les personnes ? Seulement quand un
 * entrepôt est choisi (« moi, dans cet entrepôt ») : sans entrepôt, le champ
 * vide est déjà « moi ».
 */
export function proposeSoiMeme(choix: ChoixJournee): boolean {
  return Boolean(choix.entrepot);
}

/**
 * Le libellé de la portée, pour le sous-titre de l'écran et l'en-tête du
 * rapport : « Mes opérations », « Boutique Nord · toute l'équipe », « Jean K. ».
 */
export function libelleDeLaPortee(
  p: PorteeJournee,
  noms: {
    role: MembrePerimetre["role"];
    entrepot: (id: string) => string | undefined;
    utilisateur: (id: string) => string | undefined;
  },
): string {
  const nomEntrepot = (e: string | null): string | null => {
    if (e === CHOIX_TOUS) return "Tous les entrepôts";
    if (!e) return null;
    return noms.entrepot(e) ?? "Entrepôt";
  };
  switch (p.kind) {
    case "moi":
      return "Mes opérations";
    case "membre": {
      const qui = noms.utilisateur(p.utilisateur) ?? "Membre de l'équipe";
      const ou = nomEntrepot(p.entrepot);
      return ou ? `${qui} · ${ou}` : qui;
    }
    case "equipe": {
      if (p.entrepot === CHOIX_TOUS || (!p.entrepot && noms.role === "owner")) {
        return "Tout l'établissement";
      }
      const ou = nomEntrepot(p.entrepot);
      return ou ? `${ou} · toute l'équipe` : "Toute l'équipe de mes entrepôts";
    }
  }
}
