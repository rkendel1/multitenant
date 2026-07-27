import type { Tenant } from "../context.js";
import type { TenantBackend } from "./base.js";

export interface ConvexConfig {
  /** Convex deployment URL */
  deploymentUrl: string;
  /** API token for authentication (optional) */
  apiToken?: string;
}

/**
 * Convex backend for tenant storage using Convex HTTP API.
 */
export class ConvexBackend implements TenantBackend {
  private deploymentUrl: string;
  private apiToken?: string;

  constructor(config: ConvexConfig) {
    this.deploymentUrl = config.deploymentUrl;
    this.apiToken = config.apiToken;
  }

  private async callQuery<T>(functionName: string, args: Record<string, unknown>): Promise<T | null> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiToken) {
      headers["Authorization"] = "Bearer " + this.apiToken;
    }

    const res = await fetch(this.deploymentUrl + "/api/query", {
      method: "POST",
      headers,
      body: JSON.stringify({ path: functionName, args }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { value?: T };
    return data.value ?? null;
  }

  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    return this.callQuery<Tenant>("tenants:getByDomain", { domain });
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    return this.callQuery<Tenant>("tenants:getById", { id });
  }

  async listTenants(activeOnly = true): Promise<Tenant[]> {
    const result = await this.callQuery<Tenant[]>("tenants:list", { activeOnly });
    return result ?? [];
  }
}
