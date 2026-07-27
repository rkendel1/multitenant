"""URL patterns for multitenant authentication views."""

from django.urls import path

from . import views

app_name = "multitenant"

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("signup/", views.signup_view, name="signup"),
    path("logout/", views.logout_view, name="logout"),
    path("profile/", views.profile_view, name="profile"),
]
