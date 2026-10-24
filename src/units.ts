/**
 * Mise au pluriel des libellés d'unités saisis par le marchand.
 *
 * Ces libellés sont du texte libre et arrivent tels quels : « pièce »,
 * « PLAQUETTE », « Carton ». Ajouter un « s » minuscule à un mot saisi en
 * majuscules donnait « 10 PIECEs », ce qui saute aux yeux dans une fiche
 * produit. On suit donc la casse du mot d'origine.
 */
/**
 * Les SYMBOLES d'unité, qui ne prennent jamais la marque du pluriel.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ « 2,5 kgs » ET « 1 500 Ls ».                                             │
 * │                                                                          │
 * │ Un symbole d'unité est invariable : on écrit « 2,5 kg », jamais           │
 * │ « 2,5 kgs ». Le défaut existait déjà (« 3 kgs »), mais la vente au poids  │
 * │ l'a rendu courant : un commerce qui pèse sa farine affiche une quantité   │
 * │ fractionnaire à chaque ligne.                                             │
 * │                                                                          │
 * │ ⚠ LA LISTE EST NOMMÉE, ET ELLE NE PEUT PAS ÊTRE DÉDUITE. Le libellé est  │
 * │ du TEXTE LIBRE saisi par le marchand : rien ne distingue « kg », symbole  │
 * │ SI, de « sac », nom commun accordable - ni la longueur (« sac » fait      │
 * │ trois lettres), ni la présence d'une voyelle (« ml » n'en a pas, « sac »  │
 * │ en a une). C'est la même famille de problème que le GENRE d'un nom de     │
 * │ contenant, que ce dépôt a déjà tranchée en reformulant plutôt qu'en       │
 * │ devinant.                                                                 │
 * │                                                                          │
 * │ On s'en tient donc aux symboles SANS AMBIGUÏTÉ. Un libellé absent de      │
 * │ cette liste reste accordé, ce qui est le bon côté de l'erreur : « 3 Ts »  │
 * │ est laid, « 3 sac » est faux.                                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
const SYMBOLES_INVARIABLES = new Set([
  // Masse
  "g", "kg", "mg", "t", "q", "lb",
  // Volume
  "l", "ml", "cl", "dl", "hl", "m3", "cm3", "dm3",
  // Longueur
  "m", "mm", "cm", "dm", "km",
  // Surface et volume bâti
  "m2", "cm2", "ha",
  // Durée. « s » et « h » le sont déjà par la règle finale, on les nomme
  // quand même : la liste doit se lire comme un inventaire, pas comme un reste.
  "s", "min", "h", "j",
]);

export function pluralizeUnit(word: string, count: number): string {
  const mot = (word || "").trim();
  if (!mot) return "";
  if (Math.abs(count) < 2) return mot;
  // Déjà au pluriel ou invariable.
  if (/[sxz]$/i.test(mot)) return mot;
  // ⚠ `toLowerCase` et NON `toLocaleLowerCase` : la seconde suit la locale de
  // l'hôte, où « I » devient « ı » en turc. Un symbole d'unité ne dépend pas
  // de la langue du téléphone.
  if (SYMBOLES_INVARIABLES.has(mot.toLowerCase())) return mot;

  // Un mot entièrement en capitales prend une capitale, pas une minuscule.
  const enCapitales = mot === mot.toUpperCase() && /[A-ZÀ-Ÿ]/.test(mot);
  return `${mot}${enCapitales ? "S" : "s"}`;
}
