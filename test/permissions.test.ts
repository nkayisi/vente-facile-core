/**
 * Le contrôle se fait sur des CODES plats, jamais sur la hiérarchie de rôles.
 * Le serveur décide quels codes porte chaque rôle et les renvoie dans
 * `permissions` ; la hiérarchie ne sert qu'à `isAtLeastRole`.
 */
import { describe, expect, it } from "vitest";
import {
  canManageRole,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isAtLeastRole,
  isRole,
  ROLE_HIERARCHY,
  ROLE_LABELS,
  type UserPermissions,
} from "../src/permissions";

const caissier: UserPermissions = {
  role: "cashier",
  role_display: "Caissier",
  permissions: ["sales.view", "sales.create", "products.view", "customers.view"],
  manageable_roles: [],
};

describe("hiérarchie", () => {
  it("ordonne les quatre rôles", () => {
    expect(ROLE_HIERARCHY.owner).toBeGreaterThan(ROLE_HIERARCHY.manager);
    expect(ROLE_HIERARCHY.manager).toBeGreaterThan(ROLE_HIERARCHY.stock_keeper);
    expect(ROLE_HIERARCHY.stock_keeper).toBeGreaterThan(ROLE_HIERARCHY.cashier);
  });

  it("porte les libellés français du produit", () => {
    expect(ROLE_LABELS.owner).toBe("Administrateur");
    expect(ROLE_LABELS.stock_keeper).toBe("Magasinier");
  });
});

describe("contrôles", () => {
  it("accorde ce que le serveur a listé", () => {
    expect(hasPermission(caissier, "sales.create")).toBe(true);
    expect(hasPermission(caissier, "stock.view")).toBe(false);
  });

  it("refuse tout quand les permissions ne sont pas chargées", () => {
    expect(hasPermission(null, "sales.view")).toBe(false);
    expect(hasAnyPermission(null, ["sales.view"])).toBe(false);
    expect(isAtLeastRole(null, "cashier")).toBe(false);
  });

  it("distingue le OU du ET", () => {
    expect(hasAnyPermission(caissier, ["stock.view", "sales.view"])).toBe(true);
    expect(hasAllPermissions(caissier, ["stock.view", "sales.view"])).toBe(false);
    expect(hasAllPermissions(caissier, ["sales.view", "sales.create"])).toBe(true);
  });

  it("compare les rôles par rang", () => {
    expect(isRole(caissier, "cashier")).toBe(true);
    expect(isAtLeastRole(caissier, "cashier")).toBe(true);
    expect(isAtLeastRole(caissier, "manager")).toBe(false);
  });

  it("délègue à la liste des rôles gérables renvoyée par le serveur", () => {
    expect(canManageRole(caissier, "cashier")).toBe(false);
    const gerant: UserPermissions = {
      ...caissier,
      role: "manager",
      manageable_roles: [{ value: "cashier", label: "Caissier" }],
    };
    expect(canManageRole(gerant, "cashier")).toBe(true);
    expect(canManageRole(gerant, "owner")).toBe(false);
  });
});
