"""Authentication views for multitenant applications."""

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

User = get_user_model()


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

    context = {"next": request.GET.get("next", "")}

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
