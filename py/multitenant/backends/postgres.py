"""PostgreSQL backend using Django ORM for tenant storage."""

from typing import Any, Optional

from django.apps import apps
from django.conf import settings

from .base import TenantBackend


class PostgresBackend(TenantBackend):
    """Default Django ORM backend for PostgreSQL tenant storage."""

    def __init__(self):
        model_path = getattr(settings, "MULTITENANT_TENANT_MODEL", None)
        if not model_path:
            raise ValueError("MULTITENANT_TENANT_MODEL setting is required")
        self.model = apps.get_model(model_path)
        self.domain_lookup = getattr(
            settings, "MULTITENANT_DOMAIN_LOOKUP", "domains__domain"
        )

    def get_tenant_by_domain(self, domain: str) -> Optional[Any]:
        try:
            return self.model._default_manager.get(**{self.domain_lookup: domain})
        except self.model.DoesNotExist:
            return None

    def get_tenant_by_id(self, tenant_id: Any) -> Optional[Any]:
        try:
            return self.model._default_manager.get(pk=tenant_id)
        except self.model.DoesNotExist:
            return None

    def list_tenants(self, active_only: bool = True) -> list[Any]:
        qs = self.model._default_manager.all()
        if active_only and hasattr(self.model, "is_active"):
            qs = qs.filter(is_active=True)
        return list(qs)
