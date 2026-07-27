# multitenant

Reusable Django multitenancy utilities extracted into a drop-in package so each
project does not need to reimplement tenant context and request tenant
resolution.

Configuration:
- `MULTITENANT_TENANT_RESOLVER`: optional callable `(host, request) -> tenant`
- `MULTITENANT_TENANT_MODEL`: optional `"app_label.ModelName"` fallback lookup
- `MULTITENANT_DOMAIN_LOOKUP`: optional model lookup path, defaults to
  `domains__domain`