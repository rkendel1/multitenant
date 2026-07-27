import unittest
from unittest.mock import patch

from django.conf import settings

if not settings.configured:
    settings.configure(
        SECRET_KEY="test",
        INSTALLED_APPS=["django.contrib.contenttypes"],
        ALLOWED_HOSTS=["*"],
    )

import django

django.setup()

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, override_settings

from multitenant.context import get_current_tenant
from multitenant.middleware import TenantMiddleware, resolve_tenant_from_request


class RequestStub:
    def __init__(self, host):
        self._host = host

    def get_host(self):
        return self._host


class TenantMiddlewareTests(SimpleTestCase):
    @override_settings(
        MULTITENANT_TENANT_RESOLVER=lambda host, request: {"host": host, "request": request}
    )
    def test_middleware_sets_request_tenant_and_context(self):
        observed = {}

        def get_response(request):
            observed["tenant"] = get_current_tenant()
            observed["request"] = request
            return "ok"

        request = RequestStub("ACME.test:8000")
        response = TenantMiddleware(get_response)(request)

        self.assertEqual("ok", response)
        self.assertEqual({"host": "acme.test", "request": request}, request.tenant)
        self.assertEqual(request.tenant, observed["tenant"])
        self.assertIsNone(get_current_tenant())

    @override_settings()
    def test_resolve_returns_none_without_resolver_or_model(self):
        self.assertIsNone(resolve_tenant_from_request(RequestStub("none.test")))

    @override_settings(MULTITENANT_TENANT_MODEL="app.Tenant")
    def test_model_resolution_uses_normalized_host(self):
        tenant = object()

        class FakeManager:
            def __init__(self):
                self.kwargs = None

            def get(self, **kwargs):
                self.kwargs = kwargs
                return tenant

        class FakeModel:
            DoesNotExist = type("DoesNotExist", (Exception,), {})
            MultipleObjectsReturned = type("MultipleObjectsReturned", (Exception,), {})
            _default_manager = FakeManager()

        with patch("multitenant.middleware.apps.get_model", return_value=FakeModel):
            resolved = resolve_tenant_from_request(RequestStub("Example.com:9000"))

        self.assertIs(tenant, resolved)
        self.assertEqual(
            {"domains__domain": "example.com"}, FakeModel._default_manager.kwargs
        )

    @override_settings(MULTITENANT_TENANT_MODEL="app.Tenant")
    def test_raises_for_multiple_model_matches(self):
        class FakeManager:
            def get(self, **kwargs):
                raise FakeModel.MultipleObjectsReturned("duplicate")

        class FakeModel:
            DoesNotExist = type("DoesNotExist", (Exception,), {})
            MultipleObjectsReturned = type("MultipleObjectsReturned", (Exception,), {})
            _default_manager = FakeManager()

        with patch("multitenant.middleware.apps.get_model", return_value=FakeModel):
            with self.assertRaises(ImproperlyConfigured):
                resolve_tenant_from_request(RequestStub("dup.test"))


if __name__ == "__main__":
    unittest.main()
