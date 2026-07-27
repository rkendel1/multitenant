import type { IncomingMessage, ServerResponse } from "node:http";
import type { Tenant } from "./context.js";
import { runWithTenant } from "./context.js";
import type { TenantBackend } from "./backends/base.js";

export interface MiddlewareConfig {
  backend: TenantBackend;
  /** Custom resolver: return tenant from host/request, or null */
  resolver?: (host: string, req: IncomingMessage) => Promise<Tenant | null>;
}

function normalizedHost(host: string): string {
  return host.split(":")[0].trim().toLowerCase();
}

/**
 * Express-style middleware that resolves and sets tenant context.
 */
export function tenantMiddleware(config: MiddlewareConfig) {
  return async (
    req: IncomingMessage & { tenant?: Tenant | null },
    res: ServerResponse,
    next: (err?: unknown) => void
  ) => {
    const host = normalizedHost(req.headers.host ?? "");

    let tenant: Tenant | null = null;
    if (config.resolver) {
      tenant = await config.resolver(host, req);
    } else {
      tenant = await config.backend.getTenantByDomain(host);
    }

    req.tenant = tenant;

    runWithTenant(tenant, () => {
      next();
    });
  };
}
