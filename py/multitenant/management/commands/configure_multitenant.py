"""Interactive configuration wizard for multitenant Django projects."""

import os
import sys
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Interactive wizard to configure multitenant settings for your Django project"

    BACKENDS = {
        "1": ("PostgreSQL", "multitenant.backends.postgres.PostgresBackend"),
        "2": ("Convex", "multitenant.backends.convex.ConvexBackend"),
        "3": ("Custom", None),
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-color",
            action="store_true",
            help="Disable colored output",
        )
        parser.add_argument(
            "--output",
            type=str,
            help="Output file path for generated settings (default: stdout)",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
        self.stdout.write(self.style.SUCCESS("  Multitenant Configuration Wizard"))
        self.stdout.write(self.style.SUCCESS("=" * 60 + "\n"))

        config = {}

        # Step 1: Choose backend
        config["backend"] = self._choose_backend()

        # Step 2: Configure backend-specific settings
        if "postgres" in config["backend"].lower():
            config.update(self._configure_postgres())
        elif "convex" in config["backend"].lower():
            config.update(self._configure_convex())

        # Step 3: Tenant model configuration
        config.update(self._configure_tenant_model())

        # Step 4: Auth configuration
        config.update(self._configure_auth())

        # Step 5: Generate settings
        settings_code = self._generate_settings(config)

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("  Generated Configuration"))
        self.stdout.write("=" * 60 + "\n")

        if options.get("output"):
            output_path = Path(options["output"])
            output_path.write_text(settings_code)
            self.stdout.write(
                self.style.SUCCESS(f"Configuration written to: {output_path}")
            )
        else:
            self.stdout.write(settings_code)

        self.stdout.write("\n" + self.style.SUCCESS("Configuration complete!"))
        self._print_next_steps()

    def _prompt(self, message, default=None, choices=None):
        """Prompt user for input with optional default and choices."""
        if choices:
            self.stdout.write(f"\n{message}")
            for key, (label, _) in choices.items():
                self.stdout.write(f"  {key}. {label}")
            prompt_text = f"Enter choice [{default or ''}]: "
        else:
            if default:
                prompt_text = f"{message} [{default}]: "
            else:
                prompt_text = f"{message}: "

        self.stdout.write(prompt_text, ending="")
        sys.stdout.flush()

        try:
            user_input = input().strip()
        except EOFError:
            user_input = ""

        if not user_input and default:
            return default
        return user_input

    def _confirm(self, message, default=True):
        """Prompt for yes/no confirmation."""
        default_str = "Y/n" if default else "y/N"
        self.stdout.write(f"{message} [{default_str}]: ", ending="")
        sys.stdout.flush()

        try:
            user_input = input().strip().lower()
        except EOFError:
            user_input = ""

        if not user_input:
            return default
        return user_input in ("y", "yes", "true", "1")

    def _choose_backend(self):
        """Prompt user to choose a backend."""
        self.stdout.write(self.style.HTTP_INFO("\n[1/5] Choose Backend\n"))

        choice = self._prompt(
            "Which backend will you use?",
            default="1",
            choices=self.BACKENDS,
        )

        if choice not in self.BACKENDS:
            raise CommandError(f"Invalid choice: {choice}")

        label, backend_path = self.BACKENDS[choice]
        self.stdout.write(self.style.SUCCESS(f"✓ Selected: {label}"))

        if backend_path is None:
            backend_path = self._prompt("Enter your custom backend path")

        return backend_path

    def _configure_postgres(self):
        """Configure PostgreSQL-specific settings."""
        self.stdout.write(self.style.HTTP_INFO("\n[2/5] PostgreSQL Configuration\n"))

        config = {}
        config["database_url"] = self._prompt(
            "Database URL (or leave empty to use Django's default database)",
            default="",
        )

        return config

    def _configure_convex(self):
        """Configure Convex-specific settings."""
        self.stdout.write(self.style.HTTP_INFO("\n[2/5] Convex Configuration\n"))

        config = {}
        config["convex_url"] = self._prompt(
            "Convex deployment URL",
            default="https://your-deployment.convex.cloud",
        )
        config["convex_token"] = self._prompt(
            "Convex API token (leave empty if not required)",
            default="",
        )

        return config

    def _configure_tenant_model(self):
        """Configure tenant model settings."""
        self.stdout.write(self.style.HTTP_INFO("\n[3/5] Tenant Model Configuration\n"))

        config = {}

        use_model = self._confirm("Use a Django model for tenant lookup?", default=True)

        if use_model:
            config["tenant_model"] = self._prompt(
                "Tenant model path (e.g., tenants.Tenant)",
                default="tenants.Tenant",
            )
            config["domain_lookup"] = self._prompt(
                "Domain lookup field",
                default="domains__domain",
            )
        else:
            config["use_custom_resolver"] = True
            self.stdout.write(
                self.style.WARNING(
                    "You'll need to implement MULTITENANT_TENANT_RESOLVER in settings."
                )
            )

        return config

    def _configure_auth(self):
        """Configure authentication settings."""
        self.stdout.write(self.style.HTTP_INFO("\n[4/5] Authentication Configuration\n"))

        config = {}

        use_auth = self._confirm("Include authentication views (login/signup/logout)?", default=True)
        config["include_auth"] = use_auth

        if use_auth:
            config["login_redirect"] = self._prompt(
                "Login redirect URL",
                default="/",
            )
            config["logout_redirect"] = self._prompt(
                "Logout redirect URL",
                default="/",
            )

        return config

    def _generate_settings(self, config):
        """Generate Django settings code from configuration."""
        lines = [
            "# Multitenant Configuration",
            "# Generated by: python manage.py configure_multitenant",
            "",
            "# Add to INSTALLED_APPS",
            'INSTALLED_APPS += ["multitenant"]',
            "",
            "# Backend",
            f'MULTITENANT_BACKEND = "{config["backend"]}"',
        ]

        # Convex settings
        if config.get("convex_url"):
            lines.append("")
            lines.append("# Convex Configuration")
            lines.append(f'CONVEX_DEPLOYMENT_URL = "{config["convex_url"]}"')
            if config.get("convex_token"):
                lines.append(f'CONVEX_API_TOKEN = "{config["convex_token"]}"')

        # Tenant model settings
        if config.get("tenant_model"):
            lines.append("")
            lines.append("# Tenant Model Configuration")
            lines.append(f'MULTITENANT_TENANT_MODEL = "{config["tenant_model"]}"')
            if config.get("domain_lookup"):
                lines.append(f'MULTITENANT_DOMAIN_LOOKUP = "{config["domain_lookup"]}"')

        # Custom resolver
        if config.get("use_custom_resolver"):
            lines.append("")
            lines.append("# Custom Tenant Resolver")
            lines.append("# MULTITENANT_TENANT_RESOLVER = lambda host, request: my_lookup(host)")

        # Auth settings
        if config.get("include_auth"):
            lines.append("")
            lines.append("# Authentication")
            lines.append(f'MULTITENANT_LOGIN_REDIRECT_URL = "{config.get("login_redirect", "/")}"')
            lines.append(f'MULTITENANT_LOGOUT_REDIRECT_URL = "{config.get("logout_redirect", "/")}"')
            lines.append('LOGIN_URL = "multitenant:login"')

        # Middleware
        lines.append("")
        lines.append("# Add to MIDDLEWARE (after SessionMiddleware)")
        lines.append('MIDDLEWARE += ["multitenant.middleware.TenantMiddleware"]')

        return "\n".join(lines)

    def _print_next_steps(self):
        """Print next steps for the user."""
        self.stdout.write("\n" + self.style.HTTP_INFO("Next Steps:"))
        self.stdout.write("  1. Add the generated configuration to your settings.py")
        self.stdout.write("  2. Add multitenant URLs to your urls.py:")
        self.stdout.write('     path("auth/", include("multitenant.urls"))')
        self.stdout.write("  3. Run migrations: python manage.py migrate")
        self.stdout.write("  4. Create your tenant model if needed")
        self.stdout.write("")
