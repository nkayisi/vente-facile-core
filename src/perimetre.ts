/**
 * Le périmètre d'un membre : ce qu'il peut LIRE, ce qu'il peut FAIRE, et ce
 * qui lui est imposé.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ DEUX NATURES, ET UNE SEULE RÈGLE PAR NATURE.                            │
 * │                                                                          │
 * │ Par défaut, un membre est ISOLÉ dans ses entrepôts affectés : il lit et  │
 * │ il agit là, et nulle part ailleurs. Le propriétaire peut, membre par     │
 * │ membre, cocher « Consulter tous les entrepôts » : ce membre PEUT alors   │
 * │ lire tout, partout et quel qu'en soit l'auteur, mais il n'AGIT toujours  │
 * │ que dans ses entrepôts. C'est la règle du serveur                        │
 * │ (`apps/core/warehouse_scope.py`), et ce module en est le miroir.         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CE QU'ON PEUT LIRE N'EST PAS CE QU'ON VOIT PAR DÉFAUT (2026-11-16).     │
 * │                                                                          │
 * │ - Le PROPRIÉTAIRE voit tout l'établissement.                             │
 * │ - Le GÉRANT et le MAGASINIER voient toutes les données de leurs          │
 * │   entrepôts.                                                             │
 * │ - Le CAISSIER ne voit que SES données.                                   │
 * │                                                                          │
 * │ Les deux cases n'élargissent que sur FILTRE explicite : « Voir tout dans │
 * │ son entrepôt » laisse le caissier choisir un collègue ou « Tous les      │
 * │ utilisateurs » ; « Consulter tous les entrepôts » laisse choisir un      │
 * │ autre entrepôt ou « Tous les entrepôts ». Sans filtre, l'écran reste au  │
 * │ défaut : c'est `defautDuPerimetre`, et le serveur applique le même       │
 * │ défaut à toute liste qui ne demande rien de plus.                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ L'AUTEUR SUIT UNE PERMISSION, PAS UN RÔLE.                              │
 * │                                                                          │
 * │ Voir le travail de ses collègues (ventes, dépenses, caisse, retours,     │
 * │ devis) tient à `sales.view_all`, que le gérant et le magasinier ont par  │
 * │ leur rôle et que le caissier reçoit par la case « Voir tout ». Le        │
 * │ décider sur le rôle « caissier » rendait la case inopérante sur la       │
 * │ moitié des écrans, et c'est ainsi que les deux surfaces avaient divergé. │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ CE MODULE REND LE VERROU, IL NE DÉCIDE PAS DE CE QU'ON EN FAIT. Sur un
 * membre mono-dépôt, le terminal APPLIQUE son entrepôt là où le back-office ne
 * l'envoie pas : la base locale du terminal est la seule chose qu'il lit, alors
 * que le serveur borne toujours. Imposer l'une des deux lectures ici casserait
 * l'autre.
 */
import type { Role, UserPermissions } from './permissions';

/** La permission qui ouvre le travail des collègues, dans ses entrepôts. */
export const PERMISSION_VOIR_TOUT = 'sales.view_all';

/** Ce que le périmètre lit d'un entrepôt. */
export interface EntrepotDuMembre {
  id: string;
  name: string;
  /** Absent : actif. Un serveur antérieur n'envoie pas le champ. */
  is_active?: boolean;
}

/** Un membre, tel que ses permissions le décrivent. */
export interface MembrePerimetre {
  role: Role | null;
  /** La case « Consulter tous les entrepôts », accordée par le propriétaire. */
  consulteTout: boolean;
  /** `sales.view_all` : voir le travail de ses collègues, dans ses entrepôts. */
  voitCollegues: boolean;
  /** Vide pour un propriétaire : c'est son rôle qui lui donne tout. */
  affectes: readonly EntrepotDuMembre[];
}

/** Lire (consulter, filtrer, exporter) ou agir (vendre, transférer, saisir). */
export type NaturePerimetre = 'lecture' | 'action';

/**
 * Le membre décrit par la réponse de `/users/me/permissions/` ou par la
 * charge de réveil du terminal. `null` : rien n'est connu, rien n'est ouvert.
 */
export function membreDepuisPermissions(
  p: Pick<
    UserPermissions,
    'role' | 'permissions' | 'assigned_warehouses' | 'consult_all_warehouses'
  > | null
): MembrePerimetre {
  return {
    role: p?.role ?? null,
    consulteTout: Boolean(p?.consult_all_warehouses),
    voitCollegues: Boolean(p?.permissions?.includes(PERMISSION_VOIR_TOUT)),
    affectes: p?.assigned_warehouses ?? [],
  };
}

const actif = (e: { is_active?: boolean }) => e.is_active !== false;

/** Le membre lit-il tous les entrepôts ? Le propriétaire, et la case. */
export function litTousLesEntrepots(m: MembrePerimetre): boolean {
  return m.role === 'owner' || m.consulteTout;
}

/**
 * Le membre est-il borné à SES propres lignes ?
 *
 * Faux pour le propriétaire ; faux en LECTURE pour la case « Consulter tous
 * les entrepôts » (elle ouvre tous les auteurs) ; sinon, faux seulement avec
 * `sales.view_all`. Un rôle inconnu n'invente pas de borne : le serveur reste
 * seul juge, et une borne inventée viderait un écran sans dire pourquoi.
 */
export function estBorneParAuteur(
  m: MembrePerimetre,
  nature: NaturePerimetre
): boolean {
  if (m.role === null || m.role === 'owner') return false;
  if (nature === 'lecture' && m.consulteTout) return false;
  return !m.voitCollegues;
}

/**
 * Les entrepôts que le membre peut LIRE, parmi ceux qu'on connaît.
 *
 * ⚠ LES INACTIFS EN FONT PARTIE. Un entrepôt désactivé est fermé aux
 * opérations, pas effacé : on doit pouvoir relire son historique, filtrer
 * ses ventes passées, et son badge le dit à l'écran.
 */
export function entrepotsLisibles<T extends { id: string }>(
  m: MembrePerimetre,
  tous: readonly T[]
): T[] {
  if (litTousLesEntrepots(m)) return [...tous];
  const permis = new Set(m.affectes.map((e) => e.id));
  return tous.filter((e) => permis.has(e.id));
}

/**
 * Les entrepôts où le membre peut AGIR : ses affectés, actifs.
 *
 * La case « Consulter tous » n'y change rien : elle ouvre la lecture, jamais
 * l'action. Un propriétaire agit partout, mais pas sur un entrepôt désactivé.
 */
export function entrepotsActionnables<T extends { id: string; is_active?: boolean }>(
  m: MembrePerimetre,
  tous: readonly T[]
): T[] {
  if (m.role === 'owner') return tous.filter(actif);
  const permis = new Set(m.affectes.filter(actif).map((e) => e.id));
  return tous.filter((e) => actif(e) && permis.has(e.id));
}

/**
 * Les deux cases qu'on règle sur un membre, et ce qu'elles ouvrent.
 *
 * ⚠ « Voir tout » tout court laissait croire à TOUT voir, partout. Il ouvre le
 * travail des COLLÈGUES, dans les entrepôts du membre et nulle part ailleurs :
 * c'est « Consulter tous les entrepôts » qui ouvre les autres dépôts. Les deux
 * surfaces lisent ces libellés ici, pour ne pas les dire de deux façons.
 */
export const LIBELLES_CASES_PERIMETRE = {
  voirTout: {
    titre: "Voir tout dans son entrepôt",
    aide:
      "Par défaut, un caissier ne voit que ses propres données. Cochée, il peut " +
      "afficher par le filtre le travail de ses collègues (ventes, dépenses, " +
      "caisse, retours, devis), dans ses entrepôts seulement.",
  },
  consulterTous: {
    titre: "Consulter tous les entrepôts",
    aide:
      "Par défaut, il voit ses entrepôts. Cochée, il peut afficher par le " +
      "filtre les données d'un autre entrepôt ou de tous, quel qu'en soit " +
      "l'auteur. Il n'agit toujours que dans ses entrepôts.",
  },
} as const;

/**
 * La case « Voir tout dans son entrepôt » a-t-elle un sens pour ce rôle ?
 *
 * Seulement pour un CAISSIER : le gérant et le magasinier voient déjà tout le
 * travail de leurs entrepôts par leur rôle, et le propriétaire tout.
 */
export function caseVoirToutUtile(role: Role | null | undefined): boolean {
  return role === "cashier";
}

/**
 * La case « Consulter tous les entrepôts » a-t-elle un sens pour ce rôle ?
 * Pour tous, sauf le propriétaire, qui voit déjà tout l'établissement.
 */
export function caseConsulterTousUtile(role: Role | null | undefined): boolean {
  return Boolean(role) && role !== "owner";
}

/**
 * Le choix qui ÉLARGIT au-delà du défaut : « Tous les entrepôts » ou « Tous
 * les utilisateurs ». `null` est le défaut, un identifiant un choix précis.
 *
 * ⚠ Distinct de `null` parce que le défaut n'est pas toujours « tout » : pour
 * un caissier, `null` veut dire « mes données », et « Tous les utilisateurs »
 * est un geste qu'il fait exprès.
 */
export const CHOIX_TOUS = "*";

/** Ce qu'un membre voit SANS RIEN CHOISIR. */
export interface DefautPerimetre {
  /**
   * `null` : aucune borne au-delà de son périmètre. Sinon ses entrepôts : c'est
   * le cas d'un membre qui PEUT lire tous les entrepôts (la case) mais ne le
   * fait que sur filtre.
   */
  entrepots: string[] | null;
  /** Vrai : par défaut, il ne voit que ses propres lignes. */
  auteurBorne: boolean;
}

/**
 * Le défaut d'un membre. Un rôle inconnu n'invente aucune borne : le serveur
 * reste seul juge.
 */
export function defautDuPerimetre(m: MembrePerimetre): DefautPerimetre {
  if (m.role === null || m.role === "owner") {
    return { entrepots: null, auteurBorne: false };
  }
  return {
    entrepots: m.consulteTout ? m.affectes.map((e) => e.id) : null,
    auteurBorne: m.role === "cashier" || estBorneParAuteur(m, "lecture"),
  };
}

/**
 * Le filtre peut-il proposer « Tous les entrepôts » comme choix EXPLICITE ?
 * Pour la case « Consulter tous », dont le défaut reste ses entrepôts. Le
 * propriétaire n'en a pas besoin : son défaut est déjà tout.
 */
export function proposeTousLesEntrepots(m: MembrePerimetre): boolean {
  return m.role !== null && m.role !== "owner" && m.consulteTout;
}

/**
 * Le filtre peut-il proposer « Tous les utilisateurs » comme choix EXPLICITE ?
 * Pour qui est borné à ses lignes par défaut mais a le droit de voir celles
 * des autres : le caissier qui a l'une des deux cases.
 */
export function proposeTousLesUtilisateurs(m: MembrePerimetre): boolean {
  return defautDuPerimetre(m).auteurBorne && afficheFiltreUtilisateur(m);
}

/** Ce qu'on lit sur le champ quand rien n'est choisi : le défaut, nommé. */
export function libelleDefautEntrepot(m: MembrePerimetre): string {
  return m.role === "owner" ? "Tous les entrepôts" : "Mes entrepôts";
}

export function libelleDefautUtilisateur(m: MembrePerimetre): string {
  return defautDuPerimetre(m).auteurBorne ? "Moi uniquement" : "Tous les utilisateurs";
}

/** Le libellé du choix explicite qui élargit. */
export const LIBELLE_TOUS_ENTREPOTS = "Tous les entrepôts";
export const LIBELLE_TOUS_UTILISATEURS = "Tous les utilisateurs";

/**
 * Les paramètres de requête d'un choix, pour le serveur.
 *
 * `null` : rien n'est envoyé, le serveur applique le DÉFAUT. `CHOIX_TOUS` :
 * `all_warehouses` / `all_users`. Un identifiant : `warehouse` / `user`.
 */
export function parametresDuChoix(choix: {
  entrepot: string | null;
  utilisateur: string | null;
}): { warehouse?: string; all_warehouses?: "1"; user?: string; all_users?: "1" } {
  const p: { warehouse?: string; all_warehouses?: "1"; user?: string; all_users?: "1" } = {};
  if (choix.entrepot === CHOIX_TOUS) p.all_warehouses = "1";
  else if (choix.entrepot) p.warehouse = choix.entrepot;
  if (choix.utilisateur === CHOIX_TOUS) p.all_users = "1";
  else if (choix.utilisateur) p.user = choix.utilisateur;
  return p;
}

/**
 * Le champ « Entrepôt » d'un filtre s'affiche-t-il ?
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN CHAMP QU'ON NE PEUT PAS CHANGER N'A PAS À ÊTRE MONTRÉ.               │
 * │                                                                          │
 * │ - le propriétaire et la case « Consulter tous les entrepôts » : oui ;   │
 * │ - un membre de PLUSIEURS entrepôts : oui, limité aux siens ;            │
 * │ - un caissier sans aucune case : jamais, il n'a rien à choisir ;        │
 * │ - un membre d'un seul entrepôt : non, choisir entre une seule chose     │
 * │   n'est pas un choix.                                                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ Masquer n'est pas lever : le périmètre continue de s'appliquer, au serveur
 * comme sur le terminal. Un rôle inconnu ne montre rien.
 */
export function afficheFiltreEntrepot(m: MembrePerimetre): boolean {
  if (m.role === null) return false;
  if (litTousLesEntrepots(m)) return true;
  if (m.role === "cashier" && !m.voitCollegues) return false;
  return m.affectes.length >= 2;
}

/**
 * Le champ « Utilisateur » d'un filtre s'affiche-t-il ?
 *
 * Seulement pour qui VOIT le travail de ses collègues : le propriétaire, la
 * case « Voir tout dans son entrepôt » (`sales.view_all`, que le gérant et le
 * magasinier ont par leur rôle) et la case « Consulter tous les entrepôts ».
 * Un membre qui ne voit que ses propres données n'a personne à choisir.
 */
export function afficheFiltreUtilisateur(m: MembrePerimetre): boolean {
  return m.role !== null && !estBorneParAuteur(m, "lecture");
}

/**
 * Faut-il montrer le composant de filtres de périmètre ? Faux quand aucun de
 * ses deux champs ne s'affiche : un membre sans aucune des deux options n'a
 * rien à y régler.
 */
export function afficheFiltresPerimetre(m: MembrePerimetre): boolean {
  return afficheFiltreEntrepot(m) || afficheFiltreUtilisateur(m);
}

/** Pourquoi un filtre est fermé. `null` : il est ouvert. */
export type MotifVerrouPerimetre =
  | 'propres-donnees'
  | 'un-seul-entrepot'
  | 'aucun-entrepot'
  | 'entrepot-inactif';

/**
 * Ce qu'on écrit sous un filtre fermé.
 *
 * Un verrou muet se lit comme une panne : le marchand appuie, rien ne bouge, et
 * rien ne lui dit que c'est normal.
 */
export const LIBELLES_VERROU_PERIMETRE: Record<MotifVerrouPerimetre, string> = {
  'propres-donnees': 'Vous ne voyez que vos propres données.',
  'un-seul-entrepot': "Vous n'avez accès qu'à un seul entrepôt.",
  'aucun-entrepot':
    'Aucun entrepôt ne vous est assigné. Demandez-en un au propriétaire.',
  'entrepot-inactif':
    'Votre entrepôt est désactivé. Demandez au propriétaire de vous en affecter un autre.',
};

/**
 * Le verrou qui pèse sur un choix d'entrepôt.
 *
 * @param nombre Combien d'entrepôts le membre peut viser dans cette nature :
 *               `entrepotsLisibles(...).length` pour un filtre,
 *               `entrepotsActionnables(...).length` pour une saisie.
 *
 * ⚠ `entrepot-inactif` ne vaut qu'en ACTION : en lecture, un entrepôt inactif
 * reste lisible et compte. Il distingue « on ne vous a rien affecté » de « ce
 * qu'on vous a affecté est fermé » : les deux ne se règlent pas pareil.
 */
export function verrouEntrepot(
  m: MembrePerimetre,
  nombre: number,
  nature: NaturePerimetre = 'lecture'
): MotifVerrouPerimetre | null {
  if (m.role === null || m.role === 'owner') return null;
  if (nature === 'lecture' && m.consulteTout) return null;
  if (nombre === 0) {
    return nature === 'action' && m.affectes.length > 0
      ? 'entrepot-inactif'
      : 'aucun-entrepot';
  }
  if (nombre === 1) return 'un-seul-entrepot';
  return null;
}

/** Le verrou qui pèse sur le filtre « Utilisateur ». */
export function verrouUtilisateur(
  m: MembrePerimetre,
  nature: NaturePerimetre = 'lecture'
): MotifVerrouPerimetre | null {
  return estBorneParAuteur(m, nature) ? 'propres-donnees' : null;
}

/**
 * Le choix d'entrepôt RECEVABLE, ou `null`.
 *
 * ⚠ UN CHOIX HORS PÉRIMÈTRE EST ÉCARTÉ, PAS ENVOYÉ. Le serveur le refuse par un
 * 400 : l'envoyer ferait crier l'écran pour une règle qu'on connaissait déjà.
 *
 * ⚠ ET UN VERROU N'EST PAS UN CHOIX. Cette fonction ne rend jamais l'entrepôt
 * d'un verrou : c'est à l'appelant de décider s'il l'applique.
 */
export function choixEntrepotRecevable(
  choix: string | null | undefined,
  permis: ReadonlySet<string>,
  ouvertATous: boolean
): string | null {
  if (!choix) return null;
  // « Tous les entrepôts » n'est recevable que pour qui peut lire partout.
  if (choix === CHOIX_TOUS) return ouvertATous ? CHOIX_TOUS : null;
  if (ouvertATous || permis.has(choix)) return choix;
  return null;
}
