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
export function nomDeFichier(nom: string): string {
  return nom
    // Ni séparateur de chemin ni caractère refusé par les systèmes de fichiers.
    .replace(/[/\\:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
