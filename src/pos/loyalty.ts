/**
 * Règlement d'une partie de la facture avec la CAGNOTTE du client.
 *
 * Miroir de `LoyaltyProgram.max_redeemable_amount` et de `resolve_redemption`
 * côté serveur. Sans ce miroir, l'écran annonçait une réduction que le serveur
 * refusait ensuite : le caissier encaissait trop peu, et le total ne se
 * rectifiait qu'au retour de la réponse, client déjà parti.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ IL N'Y A PLUS DE POINTS, DONC PLUS D'UNITÉ À TRAVERSER.                 │
 * │                                                                          │
 * │ `pointValue`, `roundPoints`, `minPointsToRedeem` et `maxUsablePoints`    │
 * │ ont disparu avec le barème : la cagnotte est un MONTANT en devise        │
 * │ principale, et la remise qu'elle donne est ce montant lui-même. Ce       │
 * │ module ne fait plus que PLAFONNER.                                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
import { r2 } from "./money";

export interface LoyaltyProgramLike {
  is_active?: boolean | null;
  /** Part de la facture reversée dans la cagnotte, en %. */
  earn_percent?: string | number | null;
  /** Part de la facture réglable avec la cagnotte, réglée par l'organisation. */
  max_redemption_percent?: string | number | null;
  /** Borne dure servie par le serveur ; le réglage ne peut que la durcir. */
  max_redemption_percent_ceiling?: string | number | null;
}

/**
 * Part de la facture réglable avec la cagnotte, en devise principale.
 *
 * La cagnotte ne solde JAMAIS tout : il reste toujours un montant à encaisser
 * en monnaie. Un programme réglé à 100 % rend le plafond inopérant.
 *
 * `grossTotal` est volontairement le total BRUT : c'est lui qui plafonne le
 * montant saisissable, un total déjà net rendrait le calcul circulaire.
 */
export function maxLoyaltyAmount(
  grossTotal: number,
  program?: LoyaltyProgramLike | null
): number {
  const ceiling = Number(program?.max_redemption_percent_ceiling);
  // Repli à 70 si le champ manque (réponse d'une API plus ancienne), jamais à
  // 100 : ce serait desserrer la garantie au lieu de la maintenir.
  const safeCeiling = Number.isFinite(ceiling) && ceiling > 0 ? ceiling : 70;
  const pct = Number(program?.max_redemption_percent);
  // Valeur absente ou illisible : on retombe sur la borne plutôt que sur zéro.
  // Le serveur reste l'autorité et tranchera ; bloquer toute utilisation ici
  // sur une lecture ratée serait le pire des deux comportements.
  const safePct = Number.isFinite(pct) && pct > 0 ? Math.min(pct, safeCeiling) : safeCeiling;
  return r2((grossTotal * safePct) / 100);
}

/**
 * Plus grande part de cagnotte employable : bornée par le solde ET par le
 * programme.
 */
export function maxUsableCredit(
  grossTotal: number,
  balance: number,
  program?: LoyaltyProgramLike | null
): number {
  return r2(Math.min(Math.max(balance, 0), maxLoyaltyAmount(grossTotal, program)));
}

/**
 * Remise obtenue en réglant une part de la vente avec la cagnotte, en devise
 * principale.
 *
 * ⚠ IL N'Y A PLUS DE MINIMUM. `min_points_to_redeem` existait parce qu'un
 * point n'avait pas de valeur lisible ; un montant en a une, et refuser une
 * remise de 300 FC « parce qu'elle est trop petite » n'a aucun sens au
 * comptoir.
 */
export function loyaltyDiscount(
  grossTotal: number,
  creditToUse: number,
  program?: LoyaltyProgramLike | null
): number {
  if (!program?.is_active || creditToUse <= 0) return 0;
  return r2(Math.min(creditToUse, maxLoyaltyAmount(grossTotal, program)));
}

/**
 * Cagnotte gagnée sur une facture, en devise principale.
 *
 * Miroir de `LoyaltyProgram.credit_for`. Le pourcentage est CONTINU : on
 * n'arrondit que la monnaie.
 *
 * ⚠ `grossTotal` DOIT ÊTRE EN DEVISE PRINCIPALE. La cagnotte y est libellée ;
 * une facture en devise secondaire se ramène d'abord à la principale par son
 * taux FIGÉ, jamais par celui du jour.
 */
export function loyaltyEarned(
  grossTotal: number,
  program?: LoyaltyProgramLike | null
): number {
  if (!program?.is_active) return 0;
  const pct = Number(program?.earn_percent);
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  if (!(grossTotal > 0)) return 0;
  return r2((grossTotal * pct) / 100);
}
