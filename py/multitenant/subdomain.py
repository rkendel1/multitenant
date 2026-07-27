"""Subdomain-based tenant resolution utilities.

Handles parsing and validating subdomain.domain.app format.
"""

import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class SubdomainConfig:
    """Configuration for subdomain-based multitenancy."""
    
    # Base domain (e.g., "domain.app")
    base_domain: str
    # Whether to allow www as a valid subdomain
    allow_www: bool = False
    # Reserved subdomains that cannot be used by tenants
    reserved_subdomains: tuple[str, ...] = (
        "www",
        "api",
        "admin",
        "app",
        "auth",
        "login",
        "signup",
        "static",
        "assets",
        "cdn",
        "mail",
        "smtp",
        "ftp",
        "help",
        "support",
        "docs",
        "status",
    )
    # Minimum subdomain length
    min_length: int = 2
    # Maximum subdomain length
    max_length: int = 63
    # Pattern for valid subdomains
    pattern: str = r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$"


@dataclass
class ParsedHost:
    """Result of parsing a host into its components."""
    
    subdomain: Optional[str]
    base_domain: str
    is_valid: bool
    is_platform: bool  # True if this is the main platform (no subdomain)
    error: Optional[str] = None


def parse_host(host: str, config: SubdomainConfig) -> ParsedHost:
    """Parse a host string into subdomain and base domain.
    
    Examples:
        - "tenant1.domain.app" -> subdomain="tenant1", base_domain="domain.app"
        - "domain.app" -> subdomain=None, is_platform=True
        - "www.domain.app" -> subdomain=None (if allow_www) or error
    """
    # Normalize host
    host = host.lower().strip()
    
    # Remove port if present
    if ":" in host:
        host = host.split(":")[0]
    
    base_domain = config.base_domain.lower()
    
    # Check if it's the base domain (platform level)
    if host == base_domain:
        return ParsedHost(
            subdomain=None,
            base_domain=base_domain,
            is_valid=True,
            is_platform=True,
        )
    
    # Check if host ends with base domain
    if not host.endswith(f".{base_domain}"):
        return ParsedHost(
            subdomain=None,
            base_domain=base_domain,
            is_valid=False,
            is_platform=False,
            error=f"Host '{host}' does not match base domain '{base_domain}'",
        )
    
    # Extract subdomain
    subdomain = host[: -(len(base_domain) + 1)]
    
    # Handle www
    if subdomain == "www":
        if config.allow_www:
            return ParsedHost(
                subdomain=None,
                base_domain=base_domain,
                is_valid=True,
                is_platform=True,
            )
        else:
            return ParsedHost(
                subdomain=None,
                base_domain=base_domain,
                is_valid=False,
                is_platform=False,
                error="www subdomain is not allowed",
            )
    
    # Validate subdomain
    validation_error = validate_subdomain(subdomain, config)
    if validation_error:
        return ParsedHost(
            subdomain=subdomain,
            base_domain=base_domain,
            is_valid=False,
            is_platform=False,
            error=validation_error,
        )
    
    return ParsedHost(
        subdomain=subdomain,
        base_domain=base_domain,
        is_valid=True,
        is_platform=False,
    )


def validate_subdomain(subdomain: str, config: SubdomainConfig) -> Optional[str]:
    """Validate a subdomain string. Returns error message or None if valid."""
    
    if not subdomain:
        return "Subdomain cannot be empty"
    
    if len(subdomain) < config.min_length:
        return f"Subdomain must be at least {config.min_length} characters"
    
    if len(subdomain) > config.max_length:
        return f"Subdomain cannot exceed {config.max_length} characters"
    
    if subdomain in config.reserved_subdomains:
        return f"Subdomain '{subdomain}' is reserved"
    
    if not re.match(config.pattern, subdomain):
        return "Subdomain must contain only lowercase letters, numbers, and hyphens"
    
    if subdomain.startswith("-") or subdomain.endswith("-"):
        return "Subdomain cannot start or end with a hyphen"
    
    return None


def build_tenant_url(subdomain: str, config: SubdomainConfig, scheme: str = "https") -> str:
    """Build a full URL for a tenant subdomain."""
    return f"{scheme}://{subdomain}.{config.base_domain}"


def get_available_subdomains(
    requested: str,
    existing: set[str],
    config: SubdomainConfig,
    count: int = 5,
) -> list[str]:
    """Suggest available subdomains based on a requested name.
    
    Useful for signup flows when the requested subdomain is taken.
    """
    suggestions = []
    base = re.sub(r"[^a-z0-9]", "", requested.lower())
    
    if not base:
        base = "team"
    
    # Try the base name first
    if base not in existing and validate_subdomain(base, config) is None:
        suggestions.append(base)
    
    # Try with numbers
    for i in range(1, 100):
        candidate = f"{base}{i}"
        if candidate not in existing and validate_subdomain(candidate, config) is None:
            suggestions.append(candidate)
            if len(suggestions) >= count:
                break
    
    return suggestions
