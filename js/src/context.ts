/**
 * Tenant context is stored in AsyncLocalStorage for request-scoped handling.
 * For worker threads or other contexts, prefer explicit context passing.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  [key: string]: unknown;
}

const tenantStorage = new AsyncLocalStorage<Tenant | null>();

export function setCurrentTenant(tenant: Tenant | null): void {
  // AsyncLocalStorage requires run() to establish context.
  // This helper is for middleware that uses runWithTenant().
  throw new Error("Use runWithTenant() to set tenant context");
}

export function getCurrentTenant(): Tenant | null {
  return tenantStorage.getStore() ?? null;
}

export function runWithTenant<T>(tenant: Tenant | null, fn: () => T): T {
  return tenantStorage.run(tenant, fn);
}
