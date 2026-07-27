import type { Tenant } from "../context.js";

/**
 * Abstract interface for tenant persistence backends.
 */
export interface TenantBackend {
  getTenantByDomain(domain: string): Promise<Tenant | null>;
  getTenantById(id: string): Promise<Tenant | null>;
  listTenants(activeOnly?: boolean): Promise<Tenant[]>;
}
