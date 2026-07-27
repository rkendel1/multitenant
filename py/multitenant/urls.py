"""URL patterns for multitenant authentication views."""

from django.urls import path

from . import views

app_name = "multitenant"

urlpatterns = [
    # Standard auth
    path("login/", views.login_view, name="login"),
    path("signup/", views.signup_view, name="signup"),
    path("logout/", views.logout_view, name="logout"),
    path("profile/", views.profile_view, name="profile"),
    
    # Tenant selection
    path("select-tenant/", views.select_tenant_view, name="select_tenant"),
    
    # OAuth routes
    path("oauth/<str:provider_name>/", views.oauth_login_view, name="oauth_login"),
    path("oauth/<str:provider_name>/callback/", views.oauth_callback_view, name="oauth_callback"),
]
