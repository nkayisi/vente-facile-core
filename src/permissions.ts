// Types et constantes pour le système RBAC

export type Role = 'owner' | 'manager' | 'stock_keeper' | 'cashier';

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Administrateur',
  manager: 'Gérant',
  stock_keeper: 'Magasinier',
  cashier: 'Caissier',
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  manager: 3,
  stock_keeper: 2,
  cashier: 1,
};

export interface ManageableRole {
  value: string;
  label: string;
}

export interface UserPermissions {
  role: Role;
  role_display: string;
  /** Permissions héritées du rôle */
  role_permissions?: string[];
  /** Permissions additionnelles accordées individuellement */
  extra_permissions?: string[];
  /** Permissions effectives (role + extra) - utilisées pour les vérifications */
  permissions: string[];
  manageable_roles: ManageableRole[];
  /** Toutes les permissions disponibles dans le système */
  all_permissions?: string[];
  /**
   * Les entrepôts assignés à ce membre. VIDE pour un propriétaire : c'est son
   * rôle qui lui donne tout, et c'est ce qui le rend « partout ».
   *
   * ⚠ Ce champ vivait HORS du paquet, ajouté au type côté back-office, « parce
   * qu'y toucher demande de publier un tag ». C'est la donnée d'entrée de la
   * règle de périmètre : la laisser dehors garantissait que la règle y reste
   * aussi. Facultatif, donc un serveur antérieur ne ment pas en l'omettant.
   */
  assigned_warehouses?: { id: string; name: string }[];
}

export function hasPermission(
  userPermissions: UserPermissions | null,
  permission: string
): boolean {
  if (!userPermissions) return false;
  return userPermissions.permissions.includes(permission);
}

export function hasAnyPermission(
  userPermissions: UserPermissions | null,
  permissions: string[]
): boolean {
  if (!userPermissions) return false;
  return permissions.some((p) => userPermissions.permissions.includes(p));
}

export function hasAllPermissions(
  userPermissions: UserPermissions | null,
  permissions: string[]
): boolean {
  if (!userPermissions) return false;
  return permissions.every((p) => userPermissions.permissions.includes(p));
}

export function isRole(
  userPermissions: UserPermissions | null,
  role: Role
): boolean {
  if (!userPermissions) return false;
  return userPermissions.role === role;
}

export function isAtLeastRole(
  userPermissions: UserPermissions | null,
  role: Role
): boolean {
  if (!userPermissions) return false;
  return (ROLE_HIERARCHY[userPermissions.role] || 0) >= (ROLE_HIERARCHY[role] || 0);
}

export function canManageRole(
  userPermissions: UserPermissions | null,
  targetRole: string
): boolean {
  if (!userPermissions) return false;
  return userPermissions.manageable_roles.some((r) => r.value === targetRole);
}
