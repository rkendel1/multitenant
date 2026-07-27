from django.apps import apps
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .context import clear_current_tenant, set_current_tenant


def _normalized_host(host):
    return host.split(":")[0].strip().lower()


def resolve_tenant_from_request(request):
    host = _normalized_host(request.get_host())

    resolver = getattr(settings, "MULTITENANT_TENANT_RESOLVER", None)
    if callable(resolver):
        return resolver(host, request)

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
