/**
 * Le nom d'un document exporté, partagé par les deux surfaces.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ UN DOCUMENT QU'ON NE SAIT PAS RETROUVER N'A PAS ÉTÉ EXPORTÉ.            │
 * │                                                                          │
 * │ `expo-print` nomme le sien en UUID, et un `<a download>` sans nom hérite │
 * │ de l'URL du blob : des deux côtés, trois exports arrivent indiscernables │
 * │ dans le dossier de téléchargements.                                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Ce module est ce qui RESTE de `@vente-facile/core/report` côté rendu : les
 * rapports A4 sont désormais fabriqués par le serveur, qui sert le PDF, le
 * classeur et le CSV. La description (`RapportSpec`), la mise en page HTML et
 * le rendu CSV vivaient ici et ont été retirés faute d'appelant. Ce qui subsiste
 * est ce que le serveur ne peut pas faire : nommer le fichier au moment où
 * l'appareil le range.
 */
/** Le nom du fichier, sans extension. */
declare function nomDeFichier(nom: string): string;

type PeriodeRapport = "last_7_days" | "last_30_days" | "last_12_months" | "today" | "week" | "month" | "quarter" | "year" | "custom";
/** Les libellés du back-office, au caractère près (`PERIOD_OPTIONS`). */
declare const PERIODES_RAPPORT: {
    valeur: PeriodeRapport;
    label: string;
}[];
type GroupBy = "day" | "week" | "month";
/** « Grouper par » du back-office. */
declare const GROUPEMENTS: {
    valeur: GroupBy;
    label: string;
}[];
declare function libellePeriode(p: PeriodeRapport): string;
/**
 * Bornes INCLUSIVES au format `AAAA-MM-JJ`, comme l'API les attend
 * (`sale_date__date__gte` / `__lte`).
 *
 * Les composantes sont LOCALES, comme `day_bounds()` du serveur : une vente
 * saisie à 23h30 est déjà le lendemain en UTC et disparaîtrait du rapport du
 * jour.
 *
 * `custom` rend les bornes fournies telles quelles ; à l'appelant de ne pas
 * l'employer sans elles.
 */
declare function bornesRapport(periode: PeriodeRapport, personnalisee?: {
    debut: string;
    fin: string;
}, aujourdhui?: Date): {
    debut: string;
    fin: string;
};

export { GROUPEMENTS, type GroupBy, PERIODES_RAPPORT, type PeriodeRapport, bornesRapport, libellePeriode, nomDeFichier };
