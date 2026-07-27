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

---

## Backends Supported

| Backend    | Python                          | JS/TS                  |
|------------|---------------------------------|------------------------|
| PostgreSQL | `backends.postgres`             | `PostgresBackend`      |
| Convex     | `backends.convex`               | `ConvexBackend`        |

Custom backends can implement the `TenantBackend` interface.