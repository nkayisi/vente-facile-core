/**
 * Le périmètre d'un membre : ce qu'il peut LIRE, ce qu'il peut FAIRE, et ce
 * qui lui est imposé.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ DEUX NATURES, ET UNE SEULE RÈGLE PAR NATURE.                            │
 * │                                                                          │
 * │ Par défaut, un membre est ISOLÉ dans ses entrepôts affectés : il lit et  │
 * │ il agit là, et nulle part ailleurs. Le propriétaire peut, membre par     │
 * │ membre, cocher « Consulter tous les entrepôts » : ce membre LIT alors    │
 * │ tout, partout et quel qu'en soit l'auteur, mais il n'AGIT toujours que   │
 * │ dans ses entrepôts. C'est la règle du serveur                            │
 * │ (`apps/core/warehouse_scope.py`), et ce module en est le miroir.         │
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
      "Voir le travail de ses collègues (ventes, dépenses, caisse, retours, devis), " +
      "dans les entrepôts qui lui sont affectés, jamais ailleurs.",
  },
  consulterTous: {
    titre: "Consulter tous les entrepôts",
    aide:
      "Lire les données de tous les entrepôts, quel qu'en soit l'auteur. " +
      "Il n'agit toujours que dans ses entrepôts.",
  },
} as const;

/**
 * Le champ « Entrepôt » d'un filtre s'affiche-t-il ?
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN CHAMP QU'ON NE PEUT PAS CHANGER N'A PAS À ÊTRE MONTRÉ.               │
 * │                                                                          │
 * │ Seuls le propriétaire et un membre à qui l'on a coché « Consulter tous   │
 * │ les entrepôts » choisissent l'entrepôt qu'ils regardent. Pour tous les   │
 * │ autres, le champ n'apparaît pas : un champ fermé avec son motif occupait │
 * │ la feuille pour dire une chose que le membre n'a pas à décider.          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ Masquer n'est pas lever : le périmètre continue de s'appliquer, au serveur
 * comme sur le terminal. Un rôle inconnu ne montre rien.
 */
export function afficheFiltreEntrepot(m: MembrePerimetre): boolean {
  return m.role !== null && litTousLesEntrepots(m);
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
  if (ouvertATous || permis.has(choix)) return choix;
  return null;
}
