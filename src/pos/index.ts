/**
 * Arithmétique du point de vente, partagée par le back-office et le mobile.
 *
 * Tout ce qui décide d'un montant vit ici. Les deux surfaces peuvent différer
 * sur la disposition, jamais sur le chiffre.
 */
export * from "./money";
export * from "./basket";
export * from "./loyalty";
export * from "./credit";
export * from "./payload";
export * from "./stock";
