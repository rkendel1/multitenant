import type { Tenant } from "../context.js";
import type { TenantBackend } from "./base.js";

export interface PostgresConfig {
  /** pg Pool instance */
  pool: unknown;
  /** Table name for tenants. Default: "tenants" */
  tableName?: string;
  /** Domain lookup table. Default: "tenant_domains" */
  domainTable?: string;
}

/**
 * PostgreSQL backend for tenant storage using node-postgres.
 */
export class PostgresBackend implements TenantBackend {
  private pool: unknown;
  private tableName: string;
  private domainTable: string;

  constructor(config: PostgresConfig) {
    this.pool = config.pool;
    this.tableName = config.tableName ?? "tenants";
    this.domainTable = config.domainTable ?? "tenant_domains";
  }

  async getTenantByDomain(domain: string): Promise<Tenant | null> {
    const pool = this.pool as { query: (sql: string, params: unknown[]) => Promise<{ rows: Tenant[] }> };
    const result = await pool.query(
      `SELECT t.* FROM ${this.tableName} t
       JOIN ${this.domainTable} d ON d.tenant_id = t.id
       WHERE LOWER(d.domain) = LOWER($1)
       LIMIT 1`,
      [domain]
    );
    return result.rows[0] ?? null;
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    const pool = this.pool as { query: (sql: string, params: unknown[]) => Promise<{ rows: Tenant[] }> };
    const result = await pool.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async listTenants(activeOnly = true): Promise<Tenant[]> {
    const pool = this.pool as { query: (sql: string, params?: unknown[]) => Promise<{ rows: Tenant[] }> };
    const sql = activeOnly
      ? `SELECT * FROM ${this.tableName} WHERE is_active = true`
      : `SELECT * FROM ${this.tableName}`;
    const result = await pool.query(sql);
    return result.rows;
  }
}
