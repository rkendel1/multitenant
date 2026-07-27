"""Convex backend for tenant storage via HTTP API."""

from typing import Any, Optional
import json
import urllib.request
import urllib.error

from django.conf import settings

from .base import TenantBackend


class ConvexBackend(TenantBackend):
    """Convex backend for tenant storage using Convex HTTP API."""

    def __init__(self):
        self.deployment_url = getattr(settings, "CONVEX_DEPLOYMENT_URL", None)
        if not self.deployment_url:
            raise ValueError("CONVEX_DEPLOYMENT_URL setting is required")
        self.api_token = getattr(settings, "CONVEX_API_TOKEN", None)

    def _call_query(self, function_name: str, args: dict) -> Any:
        url = self.deployment_url + "/api/query"
        headers = {"Content-Type": "application/json"}
        if self.api_token:
            headers["Authorization"] = "Bearer " + self.api_token

        payload = json.dumps({"path": function_name, "args": args}).encode()
        req = urllib.request.Request(url, data=payload, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                return data.get("value")
        except urllib.error.HTTPError:
            return None

    def get_tenant_by_domain(self, domain: str) -> Optional[Any]:
        return self._call_query("tenants:getByDomain", {"domain": domain})

    def get_tenant_by_id(self, tenant_id: Any) -> Optional[Any]:
        return self._call_query("tenants:getById", {"id": tenant_id})

    def list_tenants(self, active_only: bool = True) -> list[Any]:
        result = self._call_query("tenants:list", {"activeOnly": active_only})
        return result if isinstance(result, list) else []
