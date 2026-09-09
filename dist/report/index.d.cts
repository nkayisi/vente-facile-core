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

/**
 * Les périodes de « Rapports & Statistiques », celles du back-office.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ DEUX FAMILLES, ET LE LIBELLÉ DIT LAQUELLE.                              │
 * │                                                                          │
 * │ Les GLISSANTES comptent en arrière depuis aujourd'hui inclus ; les       │
 * │ CALENDAIRES suivent le calendrier (« Ce mois » part du 1er). Les deux    │
 * │ existent côté serveur (`_parse_date_range`) et côté back-office, et le   │
 * │ terminal doit offrir exactement les mêmes.                               │
 * │                                                                          │
 * │ **Le défaut est GLISSANT sur trente jours**, comme le web. Le défaut     │
 * │ calendaire d'avant faisait ouvrir la rubrique sur une fenêtre de deux    │
 * │ jours le 2 du mois : zéro vente en base, « Aucune donnée » sur les huit  │
 * │ onglets, et un marchand qui y lit une perte de données. Le défaut        │
 * │ revenait les premiers jours de CHAQUE mois.                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ ON N'ENVOIE PAS `period=`, ON ENVOIE DES DATES.                         │
 * │                                                                          │
 * │ Le serveur sait résoudre les deux, mais une fenêtre calculée ICI est une │
 * │ fenêtre qu'on peut afficher, tester et comparer au web. Envoyer un mot   │
 * │ clé rendrait la borne invisible depuis le terminal, et le défaut         │
 * │ ci-dessus n'aurait pas été trouvable d'ici.                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Module PUR : aucune base, aucun réseau. `aujourdhui` n'est là que pour les
 * tests, sur des quantièmes choisis dont le 1er d'un mois.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ IL VIT DANS LE PAQUET PARTAGÉ, ET C'EST LE DOCUMENT QUI L'EXIGE.        │
 * │                                                                          │
 * │ Le rapport porte son PÉRIMÈTRE en tête - « Du 2026-08-04 au 2026-09-02 » │
 * │ - et deux surfaces qui calculeraient cette fenêtre séparément            │
 * │ finiraient par en annoncer deux. Relevé en comparant les deux fichiers : │
 * │ le terminal écrivait les bornes, le back-office « ( au ) », parce qu'il  │
 * │ ne les calculait que pour la période personnalisée.                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
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
