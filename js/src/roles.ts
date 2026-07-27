/**
 * Standard roles for multitenant applications.
 * Provides a consistent set of roles across all starter applications.
 */

export enum RoleLevel {
  VIEWER = 10,
  MEMBER = 20,
  ADMIN = 30,
  OWNER = 40,
  PLATFORM_OWNER = 100,
}

export interface Role {
  name: string;
  level: RoleLevel;
  description: string;
  permissions: string[];
}

export const VIEWER: Role = {
  name: 'viewer',
  level: RoleLevel.VIEWER,
  description: 'Can view resources but cannot make changes',
  permissions: ['read:*'],
};

export const MEMBER: Role = {
  name: 'member',
  level: RoleLevel.MEMBER,
  description: 'Can view and edit resources within their scope',
  permissions: ['read:*', 'write:own', 'create:*'],
};

export const ADMIN: Role = {
  name: 'admin',
  level: RoleLevel.ADMIN,
  description: 'Can manage resources and users within the tenant',
  permissions: [
    'read:*',
    'write:*',
    'create:*',
    'delete:*',
    'manage:users',
    'manage:roles',
    'manage:settings',
  ],
};

export const OWNER: Role = {
  name: 'owner',
  level: RoleLevel.OWNER,
  description: 'Full control over the tenant including billing and deletion',
  permissions: ['*', 'manage:billing', 'manage:tenant', 'delete:tenant'],
};

export const PLATFORM_OWNER: Role = {
  name: 'platform_owner',
  level: RoleLevel.PLATFORM_OWNER,
  description: 'Platform-wide administrator with access to all tenants',
  permissions: ['*', 'platform:*', 'manage:tenants', 'manage:platform', 'impersonate:*'],
};

export const STANDARD_ROLES: Record<string, Role> = {
  viewer: VIEWER,
  member: MEMBER,
  admin: ADMIN,
  owner: OWNER,
  platform_owner: PLATFORM_OWNER,
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: Role, permission: string): boolean {
  return role.permissions.includes(permission) || role.permissions.includes('*');
}

/**
 * Check if one role is at least as powerful as another.
 */
export function isAtLeast(role: Role, other: Role): boolean {
  return role.level >= other.level;
}

/**
 * Get a role by name.
 */
export function getRole(name: string): Role | undefined {
  return STANDARD_ROLES[name];
}

/**
 * Get all roles at or above a certain level.
 */
export function getRolesAtLevel(minLevel: RoleLevel): Role[] {
  return Object.values(STANDARD_ROLES).filter((role) => role.level >= minLevel);
}

/**
 * Check if a role name has a specific permission.
 */
export function checkPermission(roleName: string, permission: string): boolean {
  const role = getRole(roleName);
  if (!role) return false;
  return hasPermission(role, permission);
}
