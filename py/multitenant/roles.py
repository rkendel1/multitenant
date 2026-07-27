"""Standard roles for multitenant applications.

Provides a consistent set of roles across all starter applications.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class RoleLevel(Enum):
    """Role hierarchy levels - higher number means more permissions."""
    
    VIEWER = 10
    MEMBER = 20
    ADMIN = 30
    OWNER = 40
    PLATFORM_OWNER = 100


@dataclass
class Role:
    """Definition of a role with its permissions."""
    
    name: str
    level: RoleLevel
    description: str
    permissions: list[str]
    
    def can(self, permission: str) -> bool:
        """Check if this role has a specific permission."""
        return permission in self.permissions or "*" in self.permissions
    
    def is_at_least(self, other: "Role") -> bool:
        """Check if this role is at least as powerful as another."""
        return self.level.value >= other.level.value


# Standard role definitions
VIEWER = Role(
    name="viewer",
    level=RoleLevel.VIEWER,
    description="Can view resources but cannot make changes",
    permissions=[
        "read:*",
    ],
)

MEMBER = Role(
    name="member",
    level=RoleLevel.MEMBER,
    description="Can view and edit resources within their scope",
    permissions=[
        "read:*",
        "write:own",
        "create:*",
    ],
)

ADMIN = Role(
    name="admin",
    level=RoleLevel.ADMIN,
    description="Can manage resources and users within the tenant",
    permissions=[
        "read:*",
        "write:*",
        "create:*",
        "delete:*",
        "manage:users",
        "manage:roles",
        "manage:settings",
    ],
)

OWNER = Role(
    name="owner",
    level=RoleLevel.OWNER,
    description="Full control over the tenant including billing and deletion",
    permissions=[
        "*",
        "manage:billing",
        "manage:tenant",
        "delete:tenant",
    ],
)

PLATFORM_OWNER = Role(
    name="platform_owner",
    level=RoleLevel.PLATFORM_OWNER,
    description="Platform-wide administrator with access to all tenants",
    permissions=[
        "*",
        "platform:*",
        "manage:tenants",
        "manage:platform",
        "impersonate:*",
    ],
)

# Registry of all standard roles
STANDARD_ROLES = {
    "viewer": VIEWER,
    "member": MEMBER,
    "admin": ADMIN,
    "owner": OWNER,
    "platform_owner": PLATFORM_OWNER,
}


def get_role(name: str) -> Optional[Role]:
    """Get a role by name."""
    return STANDARD_ROLES.get(name)


def get_roles_at_level(min_level: RoleLevel) -> list[Role]:
    """Get all roles at or above a certain level."""
    return [
        role for role in STANDARD_ROLES.values()
        if role.level.value >= min_level.value
    ]


def check_permission(role_name: str, permission: str) -> bool:
    """Check if a role has a specific permission."""
    role = get_role(role_name)
    if not role:
        return False
    return role.can(permission)


# Default permissions for common actions
DEFAULT_PERMISSIONS = {
    "view_dashboard": ["read:*"],
    "edit_profile": ["write:own"],
    "create_resource": ["create:*"],
    "delete_resource": ["delete:*"],
    "manage_users": ["manage:users"],
    "manage_settings": ["manage:settings"],
    "manage_billing": ["manage:billing"],
    "manage_tenant": ["manage:tenant"],
}
