from django.apps import apps
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .context import clear_current_tenant, set_current_tenant
from .subdomain import SubdomainConfig, parse_host


def _normalized_host(host):
    return host.split(":")[0].strip().lower()


def _get_subdomain_config():
    """Get subdomain configuration from settings."""
    base_domain = getattr(settings, "MULTITENANT_BASE_DOMAIN", None)
    if base_domain:
        return SubdomainConfig(base_domain=base_domain)
    return None


def resolve_tenant_from_request(request):
    """Resolve tenant from request using subdomain or custom resolver."""
    host = _normalized_host(request.get_host())

    # Check for custom resolver first
    resolver = getattr(settings, "MULTITENANT_TENANT_RESOLVER", None)
    if callable(resolver):
        return resolver(host, request)

    # Check for subdomain-based resolution
    subdomain_config = _get_subdomain_config()
    if subdomain_config:
        parsed = parse_host(host, subdomain_config)
        if not parsed.is_valid:
            return None
        if parsed.is_platform:
            # Platform-level request (no tenant)
            return None
        
        # Look up tenant by subdomain (slug)
        model_path = getattr(settings, "MULTITENANT_TENANT_MODEL", None)
        if not model_path:
            return None
        
        tenant_model = apps.get_model(model_path)
        slug_field = getattr(settings, "MULTITENANT_SLUG_FIELD", "slug")
        
        try:
            return tenant_model._default_manager.get(**{slug_field: parsed.subdomain})
        except tenant_model.DoesNotExist:
            return None
        except tenant_model.MultipleObjectsReturned as exc:
            raise ImproperlyConfigured(
                f"Multiple tenants matched subdomain '{parsed.subdomain}'."
            ) from exc

    # Fall back to domain-based lookup
    model_path = getattr(settings, "MULTITENANT_TENANT_MODEL", None)
    if not model_path:
        return None

    domain_lookup = getattr(settings, "MULTITENANT_DOMAIN_LOOKUP", "domains__domain")
    tenant_model = apps.get_model(model_path)

    try:
        return tenant_model._default_manager.get(**{domain_lookup: host})
    except tenant_model.DoesNotExist:
        return None
    except tenant_model.MultipleObjectsReturned as exc:
        raise ImproperlyConfigured(
            f"Multiple tenants matched host '{host}' using '{domain_lookup}'."
        ) from exc


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant = resolve_tenant_from_request(request)
        request.tenant = tenant
        set_current_tenant(tenant)
        try:
            return self.get_response(request)
        finally:
            clear_current_tenant()
