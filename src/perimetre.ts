/**
 * Le périmètre d'un membre : ce qu'il peut filtrer, et ce qui lui est imposé.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ CETTE RÈGLE ÉTAIT ÉCRITE DEUX FOIS, ET ELLE AVAIT DÉJÀ DIVERGÉ.         │
 * │                                                                          │
 * │ `mobile/.../features/perimetre/filtre-perimetre.ts` et                   │
 * │ `frontend/hooks/use-perimeter.ts` portaient les mêmes trois motifs, les  │
 * │ mêmes libellés AU CARACTÈRE PRÈS, et le même arbre de décision - écrits  │
 * │ séparément. Le second le reconnaissait dans son en-tête : « faute d'un   │
 * │ module partagé ; `@vente-facile/core` serait sa place ».                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ CE MODULE REND LE VERROU, IL NE DÉCIDE PAS DE CE QU'ON EN FAIT.
 *
 * Et c'est délibéré : sur un membre mono-dépôt, le terminal APPLIQUE son
 * entrepôt là où le back-office ne l'envoie pas. Les deux ont raison chez eux -
 * la base locale du terminal n'est bornée ni pour les dépenses ni pour les
 * mouvements de caisse, alors que le serveur borne toujours. Imposer l'une des
 * deux lectures ici casserait l'autre.
 */
import type { Role } from './permissions';

/** Pourquoi un filtre d'entrepôt est fermé. `null` : il est ouvert. */
export type MotifVerrouPerimetre =
  | 'cashier'
  | 'un-seul-entrepot'
  | 'aucun-entrepot';

/**
 * Ce qu'on écrit sous un filtre fermé.
 *
 * Un verrou muet se lit comme une panne : le marchand appuie, rien ne bouge, et
 * rien ne lui dit que c'est normal.
 */
export const LIBELLES_VERROU_PERIMETRE: Record<MotifVerrouPerimetre, string> = {
  cashier: 'Vous ne voyez que vos propres données.',
  'un-seul-entrepot': "Vous n'avez accès qu'à un seul entrepôt.",
  'aucun-entrepot':
    "Aucun entrepôt ne vous est assigné. Demandez-en un au gérant.",
};

/**
 * Le verrou qui pèse sur le filtre d'entrepôt.
 *
 * @param role              Le rôle du membre.
 * @param nombreAccessibles Combien d'entrepôts VIVANTS lui sont accessibles.
 *                          Pour un propriétaire, ce nombre n'entre pas en
 *                          compte : son accès vient de son rôle.
 */
export function verrouEntrepot(
  role: Role | null,
  nombreAccessibles: number
): MotifVerrouPerimetre | null {
  // L'ordre porte la règle : un caissier est fermé quel que soit son nombre de
  // dépôts, et un propriétaire ne l'est jamais - il n'a aucune affectation, et
  // c'est précisément ce qui le rend « partout ».
  if (role === 'cashier') return 'cashier';
  if (role === 'owner' || role === null) return null;
  if (nombreAccessibles === 0) return 'aucun-entrepot';
  if (nombreAccessibles === 1) return 'un-seul-entrepot';
  return null;
}

/**
 * Le choix d'entrepôt RECEVABLE, ou `null`.
 *
 * ⚠ UN CHOIX HORS PÉRIMÈTRE EST ÉCARTÉ, PAS ENVOYÉ. Le serveur le refuse
 * désormais par un 400 : l'envoyer ferait crier l'écran pour une règle qu'on
 * connaissait déjà.
 *
 * ⚠ ET UN VERROU N'EST PAS UN CHOIX. Cette fonction ne rend jamais l'entrepôt
 * d'un verrou : c'est à l'appelant de décider s'il l'applique, et les deux
 * surfaces n'y répondent pas pareil (voir l'en-tête).
 */
export function choixEntrepotRecevable(
  choix: string | null | undefined,
  permis: ReadonlySet<string>,
  estProprietaire: boolean
): string | null {
  if (!choix) return null;
  if (estProprietaire || permis.has(choix)) return choix;
  return null;
}
