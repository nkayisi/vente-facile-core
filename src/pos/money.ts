/**
 * L'arithmétique monétaire du POS vit dans `../currency`.
 *
 * Elle y était déjà, sous le nom de `createMoneyHelpers`, quand l'extraction du
 * point de vente l'a fait réapparaître ici : deux tables de devises dans un même
 * paquet dont l'objet est justement d'empêcher les doubles. Ce fichier n'est
 * plus qu'une porte, pour que les écrans du comptoir importent tout ce qui les
 * concerne depuis `@vente-facile/core/pos`.
 */
export {
  MONEY_EPS,
  r2,
  createCurrencyTable,
  type OrganizationCurrencyLike,
  type CurrencyFallback,
  type CurrencyTable,
} from "../currency";
