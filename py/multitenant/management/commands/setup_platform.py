"""Setup platform with default admin user and roles.

This command initializes the platform with the default platform owner
and standard roles.

Environment variables:
    MULTITENANT_ADMIN_EMAIL: Admin email (default: from settings)
    MULTITENANT_ADMIN_PASSWORD: Admin password (required for first run)
"""

import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from multitenant.roles import STANDARD_ROLES


class Command(BaseCommand):
    help = "Initialize platform with default admin user and roles"

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            help="Platform owner email (overrides env/settings)",
        )
        parser.add_argument(
            "--password",
            type=str,
            help="Platform owner password (overrides env variable)",
        )
        parser.add_argument(
            "--no-input",
            action="store_true",
            help="Do not prompt for input",
        )
        parser.add_argument(
            "--skip-roles",
            action="store_true",
            help="Skip creating roles",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("\n=== Platform Setup ===\n"))
        
        # Create roles if role model exists
        if not options["skip_roles"]:
            self._setup_roles()
        
        # Create platform owner
        self._setup_platform_owner(options)
        
        self.stdout.write(self.style.SUCCESS("\n✓ Platform setup complete!\n"))

    def _setup_roles(self):
        """Create standard roles in the database if Role model exists."""
        self.stdout.write("Setting up standard roles...")
        
        role_model_path = getattr(settings, "MULTITENANT_ROLE_MODEL", None)
        if not role_model_path:
            self.stdout.write(
                self.style.WARNING(
                    "  No MULTITENANT_ROLE_MODEL configured, skipping role creation."
                )
            )
            self.stdout.write(
                "  Standard roles are still available via multitenant.roles module."
            )
            return
        
        from django.apps import apps
        
        try:
            Role = apps.get_model(role_model_path)
        except LookupError:
            self.stdout.write(
                self.style.WARNING(f"  Role model '{role_model_path}' not found.")
            )
            return
        
        for role_name, role_def in STANDARD_ROLES.items():
            role, created = Role.objects.get_or_create(
                name=role_name,
                defaults={
                    "level": role_def.level.value,
                    "description": role_def.description,
                },
            )
            status = "created" if created else "exists"
            self.stdout.write(f"  {role_name}: {status}")
        
        self.stdout.write(self.style.SUCCESS("  ✓ Roles configured"))

    def _setup_platform_owner(self, options):
        """Create or update the platform owner user."""
        self.stdout.write("\nSetting up platform owner...")
        
        User = get_user_model()
        
        # Get email from options, env, or settings
        email = (
            options.get("email")
            or os.environ.get("MULTITENANT_ADMIN_EMAIL")
            or getattr(settings, "MULTITENANT_ADMIN_EMAIL", None)
        )
        
        if not email:
            raise CommandError(
                "Platform owner email is required. Set MULTITENANT_ADMIN_EMAIL "
                "in settings, environment, or use --email flag."
            )
        
        # Get password from options or env
        password = (
            options.get("password")
            or os.environ.get("MULTITENANT_ADMIN_PASSWORD")
        )
        
        # Check if user already exists
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f"  User '{email}' already exists.")
            
            # Update password if provided
            if password:
                user.set_password(password)
                user.save()
                self.stdout.write("  Password updated.")
            
        except User.DoesNotExist:
            if not password:
                if options["no_input"]:
                    raise CommandError(
                        "Password is required when creating a new user with --no-input. "
                        "Set MULTITENANT_ADMIN_PASSWORD environment variable."
                    )
                
                import getpass
                password = getpass.getpass("Enter password for platform owner: ")
                if not password:
                    raise CommandError("Password cannot be empty.")
                
                password_confirm = getpass.getpass("Confirm password: ")
                if password != password_confirm:
                    raise CommandError("Passwords do not match.")
            
            # Create username from email
            username = email.split("@")[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            user = User.objects.create_user(
                username=username,
                email=email,
                ******
            )
            user.is_staff = True
            user.is_superuser = True
            user.save()
            
            self.stdout.write(f"  Created platform owner: {email}")
        
        # Set platform owner role if role field exists
        if hasattr(user, "role"):
            user.role = "platform_owner"
            user.save()
            self.stdout.write("  Role set to: platform_owner")
        
        self.stdout.write(self.style.SUCCESS(f"  ✓ Platform owner configured: {email}"))
