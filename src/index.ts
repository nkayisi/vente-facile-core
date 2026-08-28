/**
 * @vente-facile/core
 *
 * Les règles métier que le back-office web et l'application mobile doivent
 * appliquer à l'identique : conditionnement gros/détail, devises et taux,
 * prix et marges, permissions, échéances, formatage, et le modèle de
 * description des documents imprimés.
 *
 * Ce paquet ne connaît ni le DOM, ni React, ni le réseau. Il n'a aucune
 * dépendance d'exécution. Tout ce qui touche à une plateforme (chargement
 * d'image, rendu PDF, appels HTTP) vit dans la surface appelante.
 */

export * from "./intl-fr";
export * from "./format";
export * from "./currencies";
export * from "./currency";
export * from "./units";
export * from "./packaging";
export * from "./pricing";
export * from "./permissions";
export * from "./due-date";

export * as receipt from "./receipt/index";

export * as pos from "./pos/index";
