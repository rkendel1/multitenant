# multitenant

Reusable multitenancy utilities available in **Python** and **JavaScript/TypeScript** so
each project does not need to recreate tenant context handling.

## Features

- 🏢 **Multi-tenant architecture** - Subdomain-based tenancy (tenant.yourapp.com)
- 🔐 **Authentication** - Login, signup, logout screens with OAuth support
- 🔑 **OAuth Providers** - GitHub and Google OAuth out of the box
- 👥 **Role-based access** - Standard roles (viewer, member, admin, owner, platform_owner)
- ⚙️ **CLI Wizard** - Interactive project configuration with `.env` file generation
- 🎨 **Ready-to-use UI** - Styled React components and Django templates

## Choose Your Runtime

| Need          | Install                       |
|---------------|-------------------------------|
| Python/Django | `pip install ./py`            |
| Node/TS       | `npm install ./js`            |

---

## Python (Django)

Located in `py/`.

```bash
pip install -e py/
```

### Quick Start

Run the configuration wizard to set up your project:

```bash
python manage.py configure_multitenant
```

This will:
1. Guide you through backend selection (PostgreSQL/Convex)
2. Configure login methods (Email, GitHub, Google)
3. Set up subdomain-based multitenancy
4. Generate a `.env` file with all required settings

### Configuration (settings.py)

```python
import os

INSTALLED_APPS = [..., "multitenant"]

# Backend selection
MULTITENANT_BACKEND = "multitenant.backends.postgres.PostgresBackend"

# Subdomain-based multitenancy
MULTITENANT_BASE_DOMAIN = os.environ.get("MULTITENANT_BASE_DOMAIN", "localhost")

# Tenant model configuration
MULTITENANT_TENANT_MODEL = "tenants.Tenant"
MULTITENANT_SLUG_FIELD = "slug"  # Field used for subdomain lookup

# Login methods
MULTITENANT_LOGIN_METHODS = ["email", "github", "google"]

# OAuth Configuration
MULTITENANT_OAUTH_GITHUB = {
    "client_id": os.environ.get("GITHUB_CLIENT_ID", ""),
    "client_secret": os.environ.get("GITHUB_CLIENT_SECRET", ""),
}

MULTITENANT_OAUTH_GOOGLE = {
    "client_id": os.environ.get("GOOGLE_CLIENT_ID", ""),
    "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET", ""),
}

# Platform owner
MULTITENANT_ADMIN_EMAIL = os.environ.get("MULTITENANT_ADMIN_EMAIL")
```

### Usage

```python
from multitenant import get_current_tenant

tenant = get_current_tenant()
```

### Authentication Views

The package includes ready-to-use authentication views with templates.

Add to your `urls.py`:

```python
from django.urls import include, path

urlpatterns = [
    path("auth/", include("multitenant.urls")),
]
```

Available URLs:
- `/auth/login/` - Login page (with OAuth buttons)
- `/auth/signup/` - Registration page
- `/auth/logout/` - Logout confirmation page
- `/auth/profile/` - User profile page
- `/auth/select-tenant/` - Tenant/workspace selector
- `/auth/oauth/<provider>/` - OAuth login initiation
- `/auth/oauth/<provider>/callback/` - OAuth callback

### Roles

Standard roles are available via `multitenant.roles`:

```python
from multitenant.roles import STANDARD_ROLES, check_permission

# Available roles: viewer, member, admin, owner, platform_owner
if check_permission(user.role, "manage:users"):
    # User can manage users
    pass
```

### Platform Setup

Initialize the platform with the default admin user:

```bash
# Set credentials via environment
export MULTITENANT_ADMIN_EMAIL=admin@example.com
export MULTITENANT_ADMIN_PASSWORD=your-secure-password

python manage.py setup_platform
```

---

## JavaScript / TypeScript

Located in `js/`.

```bash
cd js && npm install && npm run build
```

### Quick Start

Run the configuration wizard:

```bash
npx @multitenant/core configure
```

This will:
1. Guide you through backend and framework selection
2. Configure login methods (Email, GitHub, Google)
3. Set up subdomain-based multitenancy
4. Generate a `.env` file with all required settings

### Backends

```ts
import { PostgresBackend, ConvexBackend, tenantMiddleware } from "@multitenant/core";
import { Pool } from "pg";

// PostgreSQL
const backend = new PostgresBackend({ pool: new Pool() });

// Convex
const backend = new ConvexBackend({ deploymentUrl: "https://your.convex.cloud" });
```

### Express middleware

```ts
import express from "express";
import { tenantMiddleware, getCurrentTenant } from "@multitenant/core";

const app = express();
app.use(tenantMiddleware({ backend }));

app.get("/", (req, res) => {
  res.json({ tenant: req.tenant ?? getCurrentTenant() });
});
```

### React Authentication Components

```tsx
import {
  AuthProvider,
  Header,
  LoginScreen,
  SignupScreen,
  LogoutScreen,
  TenantSelector,
} from "@multitenant/core";

function App() {
  return (
    <AuthProvider 
      apiBaseUrl="/api/auth"
      loginMethods={['email', 'github', 'google']}
      baseDomain="yourapp.com"
    >
      <Header brandName="My App" />
      {/* Your routes */}
    </AuthProvider>
  );
}

// Login page with OAuth
function LoginPage() {
  return (
    <LoginScreen 
      loginMethods={['email', 'github', 'google']}
      onSuccess={() => navigate("/")} 
    />
  );
}

// Tenant selector (after login)
function SelectWorkspace() {
  return (
    <TenantSelector 
      baseDomain="yourapp.com"
      onSelect={(tenant) => console.log('Selected:', tenant)}
    />
  );
}
```

#### AuthProvider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiBaseUrl` | `string` | `/api/auth` | Base URL for auth API endpoints |
| `loginMethods` | `('email'\|'github'\|'google')[]` | `['email']` | Enabled login methods |
| `baseDomain` | `string` | - | Base domain for subdomain redirects |
| `onLoginSuccess` | `(user) => void` | - | Callback when login succeeds |
| `onLogoutSuccess` | `() => void` | - | Callback when logout succeeds |
| `onTenantSelect` | `(tenant) => void` | - | Callback when tenant is selected |

#### useAuth Hook

```ts
const {
  user,              // Current user or null
  currentTenant,     // Current tenant or null
  availableTenants,  // List of user's tenants
  isLoading,         // Loading state
  isAuthenticated,   // Whether user is logged in
  login,             // Email/password login
  loginWithOAuth,    // OAuth login (redirects to provider)
  signup,            // Create account
  logout,            // Sign out
  selectTenant,      // Select and redirect to tenant
} = useAuth();
```

### Subdomain Utilities

```ts
import { parseHost, buildTenantUrl, getCurrentSubdomain } from "@multitenant/core";

const config = { baseDomain: "yourapp.com" };

// Parse current host
const parsed = parseHost("tenant1.yourapp.com", config);
// { subdomain: "tenant1", baseDomain: "yourapp.com", isValid: true, isPlatform: false }

// Build tenant URL
const url = buildTenantUrl("tenant1", config);
// "https://tenant1.yourapp.com"

// Get current subdomain (in browser)
const subdomain = getCurrentSubdomain(config);
```

### Roles

```ts
import { STANDARD_ROLES, checkPermission, RoleLevel } from "@multitenant/core";

// Available roles: viewer, member, admin, owner, platform_owner
if (checkPermission('admin', 'manage:users')) {
  // Admin can manage users
}
```

---

## Environment Variables

The CLI wizards generate a `.env` file with these variables:

```env
# Database
DATABASE_URL=******localhost:5432/dbname

# Subdomain Configuration
MULTITENANT_BASE_DOMAIN=yourapp.com

# OAuth - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Platform Owner
MULTITENANT_ADMIN_EMAIL=admin@example.com
MULTITENANT_ADMIN_PASSWORD=your-secure-password
```

---

## Backends Supported

| Backend    | Python                          | JS/TS                  |
|------------|---------------------------------|------------------------|
| PostgreSQL | `backends.postgres`             | `PostgresBackend`      |
| Convex     | `backends.convex`               | `ConvexBackend`        |

Custom backends can implement the `TenantBackend` interface.