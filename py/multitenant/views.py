"""Authentication views for multitenant applications."""

import secrets
from urllib.parse import urlencode

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

from .oauth import OAuthConfig, get_oauth_provider
from .subdomain import SubdomainConfig, parse_host

User = get_user_model()


def get_enabled_login_methods():
    """Get the list of enabled login methods from settings."""
    default_methods = ["email"]
    return getattr(settings, "MULTITENANT_LOGIN_METHODS", default_methods)


def get_subdomain_config():
    """Get subdomain configuration from settings."""
    base_domain = getattr(settings, "MULTITENANT_BASE_DOMAIN", "localhost")
    return SubdomainConfig(base_domain=base_domain)


def get_available_tenants(user):
    """Get list of tenants available to a user."""
    tenant_model_path = getattr(settings, "MULTITENANT_TENANT_MODEL", None)
    if not tenant_model_path:
        return []
    
    from django.apps import apps
    tenant_model = apps.get_model(tenant_model_path)
    
    # Check if there's a user relationship
    membership_field = getattr(settings, "MULTITENANT_USER_MEMBERSHIP_FIELD", "members")
    try:
        return list(tenant_model.objects.filter(**{f"{membership_field}__user": user}))
    except Exception:
        # Fallback: return all active tenants
        return list(tenant_model.objects.filter(is_active=True))


def get_redirect_url(request, default="/"):
    """Get the redirect URL from request or settings."""
    next_url = request.GET.get("next") or request.POST.get("next")
    if next_url:
        return next_url
    return getattr(settings, "MULTITENANT_LOGIN_REDIRECT_URL", default)


@require_http_methods(["GET", "POST"])
def login_view(request):
    """Handle user login."""
    if request.user.is_authenticated:
        return redirect(get_redirect_url(request))

    login_methods = get_enabled_login_methods()
    context = {
        "next": request.GET.get("next", ""),
        "login_methods": login_methods,
    }

    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "")

        if not username or not password:
            context["error"] = "Please enter both username and password."
            return render(request, "multitenant/login.html", context)

        user = authenticate(request, username=username, ******
        if user is not None:
            if user.is_active:
                login(request, user)
                messages.success(request, "You have been logged in successfully.")
                return redirect(get_redirect_url(request))
            else:
                context["error"] = "Your account is disabled."
        else:
            context["error"] = "Invalid username or password."

    return render(request, "multitenant/login.html", context)


@require_http_methods(["GET", "POST"])
def signup_view(request):
    """Handle user registration."""
    if request.user.is_authenticated:
        return redirect(get_redirect_url(request))

    context = {"next": request.GET.get("next", "")}

    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        email = request.POST.get("email", "").strip()
        password = request.POST.get("password", "")
        password_confirm = request.POST.get("password_confirm", "")

        # Validation
        errors = []
        if not username:
            errors.append("Username is required.")
        if not email:
            errors.append("Email is required.")
        if not password:
            errors.append("Password is required.")
        if password != password_confirm:
            errors.append("Passwords do not match.")
        if len(password) < 8:
            errors.append("Password must be at least 8 characters.")

        if User.objects.filter(username=username).exists():
            errors.append("Username already exists.")
        if User.objects.filter(email=email).exists():
            errors.append("Email already exists.")

        if errors:
            context["errors"] = errors
            context["username"] = username
            context["email"] = email
            return render(request, "multitenant/signup.html", context)

        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            ******
        )
        login(request, user)
        messages.success(request, "Your account has been created successfully.")
        return redirect(get_redirect_url(request))

    return render(request, "multitenant/signup.html", context)


@require_http_methods(["GET", "POST"])
def logout_view(request):
    """Handle user logout."""
    if request.method == "POST":
        logout(request)
        messages.success(request, "You have been logged out successfully.")
        logout_redirect = getattr(settings, "MULTITENANT_LOGOUT_REDIRECT_URL", "/")
        return redirect(logout_redirect)

    return render(request, "multitenant/logout.html")


@login_required
def profile_view(request):
    """Display user profile page."""
    return render(request, "multitenant/profile.html")


# =============================================================================
# Tenant Selection Views
# =============================================================================

@login_required
def select_tenant_view(request):
    """Allow user to select which tenant to access."""
    tenants = get_available_tenants(request.user)
    config = get_subdomain_config()
    
    if request.method == "POST":
        tenant_slug = request.POST.get("tenant")
        if tenant_slug:
            # Redirect to the tenant's subdomain
            from .subdomain import build_tenant_url
            url = build_tenant_url(tenant_slug, config)
            return redirect(url)
    
    context = {
        "tenants": tenants,
        "base_domain": config.base_domain,
    }
    return render(request, "multitenant/select_tenant.html", context)


# =============================================================================
# OAuth Views
# =============================================================================

def _get_oauth_redirect_uri(request, provider_name):
    """Build OAuth redirect URI."""
    scheme = "https" if request.is_secure() else "http"
    host = request.get_host()
    return f"{scheme}://{host}/auth/oauth/{provider_name}/callback/"


@require_http_methods(["GET"])
def oauth_login_view(request, provider_name):
    """Initiate OAuth login flow."""
    enabled_methods = get_enabled_login_methods()
    
    if provider_name not in enabled_methods:
        messages.error(request, f"Login with {provider_name} is not enabled.")
        return redirect("multitenant:login")
    
    # Get OAuth configuration from settings
    config_key = f"MULTITENANT_OAUTH_{provider_name.upper()}"
    oauth_settings = getattr(settings, config_key, None)
    
    if not oauth_settings:
        messages.error(request, f"{provider_name} OAuth is not configured.")
        return redirect("multitenant:login")
    
    config = OAuthConfig(
        client_id=oauth_settings.get("client_id"),
        client_secret=oauth_settings.get("client_secret"),
    )
    
    provider = get_oauth_provider(provider_name, config)
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state
    request.session["oauth_next"] = request.GET.get("next", "")
    
    redirect_uri = _get_oauth_redirect_uri(request, provider_name)
    auth_url = provider.get_authorization_url(redirect_uri, state)
    
    return redirect(auth_url)


@require_http_methods(["GET"])
def oauth_callback_view(request, provider_name):
    """Handle OAuth callback."""
    # Verify state
    state = request.GET.get("state")
    saved_state = request.session.pop("oauth_state", None)
    
    if not state or state != saved_state:
        messages.error(request, "Invalid OAuth state. Please try again.")
        return redirect("multitenant:login")
    
    # Check for errors
    error = request.GET.get("error")
    if error:
        error_desc = request.GET.get("error_description", error)
        messages.error(request, f"OAuth error: {error_desc}")
        return redirect("multitenant:login")
    
    code = request.GET.get("code")
    if not code:
        messages.error(request, "No authorization code received.")
        return redirect("multitenant:login")
    
    # Get OAuth configuration
    config_key = f"MULTITENANT_OAUTH_{provider_name.upper()}"
    oauth_settings = getattr(settings, config_key, None)
    
    if not oauth_settings:
        messages.error(request, f"{provider_name} OAuth is not configured.")
        return redirect("multitenant:login")
    
    config = OAuthConfig(
        client_id=oauth_settings.get("client_id"),
        client_secret=oauth_settings.get("client_secret"),
    )
    
    provider = get_oauth_provider(provider_name, config)
    redirect_uri = _get_oauth_redirect_uri(request, provider_name)
    
    try:
        # Exchange code for token
        tokens = provider.exchange_code(code, redirect_uri)
        access_token = tokens.get("access_token")
        
        if not access_token:
            raise ValueError("No access token received")
        
        # Get user info
        user_info = provider.get_user_info(access_token)
        
        # Find or create user
        user = _get_or_create_oauth_user(user_info, provider_name)
        
        # Log in the user
        login(request, user)
        messages.success(request, f"Logged in with {provider_name}.")
        
        # Redirect to tenant selection if needed, or to the next URL
        next_url = request.session.pop("oauth_next", "") or get_redirect_url(request)
        
        # If user has multiple tenants, redirect to selection
        tenants = get_available_tenants(user)
        if len(tenants) > 1:
            return redirect("multitenant:select_tenant")
        
        return redirect(next_url)
        
    except Exception as e:
        messages.error(request, f"OAuth login failed: {str(e)}")
        return redirect("multitenant:login")


def _get_or_create_oauth_user(user_info, provider_name):
    """Get or create a user from OAuth user info."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    email = user_info.get("email")
    if not email:
        raise ValueError("Email is required for OAuth login")
    
    # Try to find existing user by email
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Create new user
        username = user_info.get("username", email.split("@")[0])
        
        # Ensure username is unique
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = User.objects.create_user(
            username=username,
            email=email,
            ******  # No password for OAuth users
        )
        
        # Store OAuth provider info if the model supports it
        if hasattr(user, "oauth_provider"):
            user.oauth_provider = provider_name
            user.oauth_id = user_info.get("provider_id")
            user.save()
    
    return user
