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
/**
 * « 2026-08-31 », sur les composantes LOCALES.
 *
 * `toISOString()` bascule en UTC : une borne choisie le soir à Kinshasa s'y
 * daterait du lendemain, et le rapport porterait la mauvaise fenêtre.
 */
function jourISO(d: Date): string {
  const deux = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

export type PeriodeRapport =
  | "last_7_days"
  | "last_30_days"
  | "last_12_months"
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";

/** Les libellés du back-office, au caractère près (`PERIOD_OPTIONS`). */
export const PERIODES_RAPPORT: { valeur: PeriodeRapport; label: string }[] = [
  { valeur: "last_7_days", label: "7 derniers jours" },
  { valeur: "last_30_days", label: "30 derniers jours" },
  { valeur: "last_12_months", label: "12 derniers mois" },
  { valeur: "today", label: "Aujourd'hui" },
  { valeur: "week", label: "Cette semaine" },
  { valeur: "month", label: "Ce mois" },
  { valeur: "quarter", label: "Ce trimestre" },
  { valeur: "year", label: "Cette année" },
  { valeur: "custom", label: "Personnalisé" },
];

export type GroupBy = "day" | "week" | "month";

/** « Grouper par » du back-office. */
export const GROUPEMENTS: { valeur: GroupBy; label: string }[] = [
  { valeur: "day", label: "Jour" },
  { valeur: "week", label: "Semaine" },
  { valeur: "month", label: "Mois" },
];

export function libellePeriode(p: PeriodeRapport): string {
  return PERIODES_RAPPORT.find((o) => o.valeur === p)?.label ?? "";
}

const jour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function reculeJours(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - n);
  return r;
}

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
export function bornesRapport(
  periode: PeriodeRapport,
  personnalisee?: { debut: string; fin: string },
  aujourdhui: Date = new Date()
): { debut: string; fin: string } {
  const auj = jour(aujourdhui);
  const fin = jourISO(auj);

  switch (periode) {
    case "custom":
      return personnalisee ?? { debut: fin, fin };

    case "today":
      return { debut: fin, fin };

    case "week": {
      // « Cette semaine » du serveur part du LUNDI (`today - today.weekday()`).
      // `getDay()` rend 0 pour dimanche : le ramener à 6 place le lundi en tête.
      const jourDeSemaine = (auj.getDay() + 6) % 7;
      return { debut: jourISO(reculeJours(auj, jourDeSemaine)), fin };
    }

    case "month":
      return { debut: jourISO(new Date(auj.getFullYear(), auj.getMonth(), 1)), fin };

    case "quarter": {
      const trimestre = Math.floor(auj.getMonth() / 3);
      return { debut: jourISO(new Date(auj.getFullYear(), trimestre * 3, 1)), fin };
    }

    case "year":
      return { debut: jourISO(new Date(auj.getFullYear(), 0, 1)), fin };

    case "last_7_days":
      // Sept jours AUJOURD'HUI INCLUS : huit fausserait la comparaison à la
      // période précédente, qui a la même longueur.
      return { debut: jourISO(reculeJours(auj, 6)), fin };

    case "last_12_months": {
      // Douze mois PLEINS, dont le mois en cours : on part du 1er du mois situé
      // onze mois en arrière. Une fenêtre à cheval rendrait treize seaux dont
      // deux partiels, avec deux étiquettes « sept. » sur le même axe.
      const recule = auj.getFullYear() * 12 + (auj.getMonth() - 11);
      return {
        debut: jourISO(new Date(Math.floor(recule / 12), ((recule % 12) + 12) % 12, 1)),
        fin,
      };
    }

    case "last_30_days":
    default:
      return { debut: jourISO(reculeJours(auj, 29)), fin };
  }
}
