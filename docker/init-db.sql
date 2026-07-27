-- =============================================================================
-- Multitenant PostgreSQL Initialization Script
-- =============================================================================
-- This script runs when the PostgreSQL container is first initialized.
-- It sets up the database schema for the multitenant application.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Tenants Table
-- =============================================================================
-- Stores tenant/organization information.

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    owner_id UUID,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_id);

-- =============================================================================
-- Users Table
-- =============================================================================
-- Stores user accounts.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_platform_owner BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================================
-- Tenant Memberships Table
-- =============================================================================
-- Maps users to tenants with roles.

CREATE TABLE IF NOT EXISTS tenant_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON tenant_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON tenant_memberships(role);

-- =============================================================================
-- Tenant Domains Table
-- =============================================================================
-- Maps custom domains to tenants.

CREATE TABLE IF NOT EXISTS tenant_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL UNIQUE,
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_domains_tenant ON tenant_domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON tenant_domains(domain);

-- =============================================================================
-- OAuth Connections Table
-- =============================================================================
-- Stores OAuth provider connections for users.

CREATE TABLE IF NOT EXISTS oauth_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_connections(provider, provider_user_id);

-- =============================================================================
-- Sessions Table
-- =============================================================================
-- Stores user sessions (optional, for custom session management).

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- =============================================================================
-- Invitations Table
-- =============================================================================
-- Stores pending tenant invitations.

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- =============================================================================
-- Audit Log Table
-- =============================================================================
-- Stores audit trail of important actions.

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_memberships_updated_at ON tenant_memberships;
CREATE TRIGGER update_memberships_updated_at
    BEFORE UPDATE ON tenant_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_oauth_updated_at ON oauth_connections;
CREATE TRIGGER update_oauth_updated_at
    BEFORE UPDATE ON oauth_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Grant Permissions
-- =============================================================================
-- Ensure the application user has proper permissions.

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;

-- =============================================================================
-- Done!
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  Multitenant Database Initialized Successfully               ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
END $$;
