# multitenant

Reusable multitenancy utilities available in **Python** and **JavaScript/TypeScript** so
each project does not need to recreate tenant context handling.

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

### Configuration (settings.py)

```python
INSTALLED_APPS = [..., "multitenant"]

# Option 1: custom resolver
MULTITENANT_TENANT_RESOLVER = lambda host, request: my_lookup(host)

# Option 2: model-based lookup (default backend is PostgreSQL via ORM)
MULTITENANT_TENANT_MODEL = "tenants.Tenant"
MULTITENANT_DOMAIN_LOOKUP = "domains__domain"  # default

# Backend selection
MULTITENANT_BACKEND = "multitenant.backends.postgres.PostgresBackend"
# or Convex
MULTITENANT_BACKEND = "multitenant.backends.convex.ConvexBackend"
CONVEX_DEPLOYMENT_URL = "https://your-deployment.convex.cloud"
CONVEX_API_TOKEN = "..."  # optional
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
- `/auth/login/` - Login page
- `/auth/signup/` - Registration page
- `/auth/logout/` - Logout confirmation page
- `/auth/profile/` - User profile page (requires login)

Configure redirects in settings:

```python
MULTITENANT_LOGIN_REDIRECT_URL = "/"
MULTITENANT_LOGOUT_REDIRECT_URL = "/"
LOGIN_URL = "multitenant:login"
```

### Configuration Wizard

Run the interactive configuration wizard:

```bash
python manage.py configure_multitenant
```

Options:
- `--output <file>` - Write configuration to a file instead of stdout

---

## JavaScript / TypeScript

Located in `js/`.

```bash
cd js && npm install && npm run build
```

### Backends

```ts
import { PostgresBackend, ConvexBackend, tenantMiddleware, getCurrentTenant } from "@multitenant/core";
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

The package includes React components for authentication with built-in styling.

```tsx
import {
  AuthProvider,
  Header,
  LoginScreen,
  SignupScreen,
  LogoutScreen,
} from "@multitenant/core";

function App() {
  return (
    <AuthProvider apiBaseUrl="/api/auth">
      <Header brandName="My App" />
      {/* Your routes */}
    </AuthProvider>
  );
}

// Login page
function LoginPage() {
  return <LoginScreen onSuccess={() => navigate("/")} />;
}

// Signup page
function SignupPage() {
  return <SignupScreen onSuccess={() => navigate("/")} />;
}

// Logout page
function LogoutPage() {
  return <LogoutScreen onSuccess={() => navigate("/")} />;
}
```

#### AuthProvider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiBaseUrl` | `string` | `/api/auth` | Base URL for auth API endpoints |
| `onLoginSuccess` | `(user) => void` | - | Callback when login succeeds |
| `onLogoutSuccess` | `() => void` | - | Callback when logout succeeds |

#### Header Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `brandName` | `string` | `Multitenant App` | Brand name to display |
| `tenant` | `{ name: string }` | - | Current tenant info |
| `loginLink` | `string` | `/login` | Link to login page |
| `signupLink` | `string` | `/signup` | Link to signup page |

#### useAuth Hook

```ts
const {
  user,           // Current user or null
  isLoading,      // Loading state
  isAuthenticated,// Whether user is logged in
  login,          // Login function
  signup,         // Signup function
  logout,         // Logout function
} = useAuth();
```

### Configuration Wizard (CLI)

Run the interactive configuration wizard:

```bash
npx @multitenant/core configure
```

Or after installation:

```bash
multitenant-configure
```

---

## Backends Supported

| Backend    | Python                          | JS/TS                  |
|------------|---------------------------------|------------------------|
| PostgreSQL | `backends.postgres`             | `PostgresBackend`      |
| Convex     | `backends.convex`               | `ConvexBackend`        |

Custom backends can implement the `TenantBackend` interface.