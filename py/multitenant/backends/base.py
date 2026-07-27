"""Abstract base backend for tenant storage."""

from abc import ABC, abstractmethod
from typing import Any, Optional


class TenantBackend(ABC):
    """Abstract interface for tenant persistence backends."""

    @abstractmethod
    def get_tenant_by_domain(self, domain: str) -> Optional[Any]:
        """Return tenant object for the given domain, or None if not found."""
        ...

    @abstractmethod
    def get_tenant_by_id(self, tenant_id: Any) -> Optional[Any]:
        """Return tenant object for the given id, or None if not found."""
        ...

    @abstractmethod
    def list_tenants(self, active_only: bool = True) -> list[Any]:
        """Return list of tenants."""
        ...
