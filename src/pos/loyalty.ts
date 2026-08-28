/**
 * Règlement d'une partie de la facture en points de fidélité.
 *
 * Miroir de `LoyaltyProgram.max_redeemable_amount` et de `resolve_redemption`
 * côté serveur. Sans ce miroir, l'écran annonçait une réduction que le serveur
 * refusait ensuite : le caissier encaissait trop peu, et le total ne se
 * rectifiait qu'au retour de la réponse, client déjà parti.
 */
import { r2 } from "./money";

export interface LoyaltyProgramLike {
  is_active?: boolean | null;
  /** Valeur monétaire d'un point, en devise principale. */
  point_value?: string | number | null;
  min_points_to_redeem?: number | null;
  /** Part de la facture réglable en points, réglée par l'organisation. */
  max_redemption_percent?: string | number | null;
  /** Borne dure servie par le serveur ; le réglage ne peut que la durcir. */
  max_redemption_percent_ceiling?: string | number | null;
}

/** Les points se comptent au centième, toujours par défaut : jamais arrondi au-dessus. */
export function roundPoints(value: number): number {
  return Math.floor(value * 100) / 100;
}

/** Valeur monétaire d'un point, en devise principale. Jamais nulle. */
export function pointValue(program?: LoyaltyProgramLike | null): number {
  const v = program?.point_value != null ? Number(program.point_value) : 1;
  return Number.isFinite(v) && v > 0 ? v : 1;
}

export function minPointsToRedeem(program?: LoyaltyProgramLike | null): number {
  return program?.min_points_to_redeem ?? 100;
}

/**
 * Part de la facture réglable en points, en devise principale.
 *
 * Les points ne soldent JAMAIS tout : il reste toujours un montant à encaisser
 * en monnaie. Un programme réglé à 100 % rend le plafond inopérant.
 *
 * `grossTotal` est volontairement le total BRUT : c'est lui qui plafonne le
 * nombre de points saisissables, un total déjà net rendrait le calcul circulaire.
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

/** Plus grand nombre de points saisissable : borné par le solde ET par le programme. */
export function maxUsablePoints(
  grossTotal: number,
  pointsBalance: number,
  program?: LoyaltyProgramLike | null
): number {
  return Math.min(
    pointsBalance,
    roundPoints(maxLoyaltyAmount(grossTotal, program) / pointValue(program))
  );
}

/**
 * Remise obtenue en réglant une part de la vente en points, en devise principale.
 *
 * Le minimum du programme est appliqué ici comme côté serveur : une saisie en
 * dessous ne donne AUCUNE remise, elle n'est pas simplement ignorée.
 */
export function loyaltyDiscount(
  grossTotal: number,
  pointsToUse: number,
  program?: LoyaltyProgramLike | null
): number {
  if (!program?.is_active || pointsToUse <= 0) return 0;
  if (pointsToUse < minPointsToRedeem(program)) return 0;
  return r2(Math.min(pointsToUse * pointValue(program), maxLoyaltyAmount(grossTotal, program)));
}
