"""OAuth providers for multitenant authentication.

Supports GitHub and Google OAuth flows.
"""

from dataclasses import dataclass
from typing import Optional, Protocol
from urllib.parse import urlencode
import json


class OAuthProvider(Protocol):
    """Protocol for OAuth providers."""
    
    name: str
    
    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Get the URL to redirect users to for authorization."""
        ...
    
    def exchange_code(self, code: str, redirect_uri: str) -> dict:
        """Exchange authorization code for tokens."""
        ...
    
    def get_user_info(self, access_token: str) -> dict:
        """Get user information from the provider."""
        ...


@dataclass
class OAuthConfig:
    """Configuration for OAuth providers."""
    
    client_id: str
    client_secret: str
    # Optional scopes override
    scopes: Optional[list[str]] = None


class GitHubOAuth:
    """GitHub OAuth provider."""
    
    name = "github"
    authorization_url = "https://github.com/login/oauth/authorize"
    token_url = "https://github.com/login/oauth/access_token"
    user_info_url = "https://api.github.com/user"
    user_emails_url = "https://api.github.com/user/emails"
    default_scopes = ["read:user", "user:email"]
    
    def __init__(self, config: OAuthConfig):
        self.config = config
        self.scopes = config.scopes or self.default_scopes
    
    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Get GitHub authorization URL."""
        params = {
            "client_id": self.config.client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(self.scopes),
            "state": state,
        }
        return f"{self.authorization_url}?{urlencode(params)}"
    
    def exchange_code(self, code: str, redirect_uri: str) -> dict:
        """Exchange code for access token."""
        import urllib.request
        
        data = urlencode({
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        }).encode()
        
        req = urllib.request.Request(
            self.token_url,
            data=data,
            headers={"Accept": "application/json"},
        )
        
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    
    def get_user_info(self, access_token: str) -> dict:
        """Get user info from GitHub."""
        import urllib.request
        
        headers = {
            "Authorization": f"******",
            "Accept": "application/json",
        }
        
        # Get basic user info
        req = urllib.request.Request(self.user_info_url, headers=headers)
        with urllib.request.urlopen(req) as response:
            user_data = json.loads(response.read().decode())
        
        # Get primary email
        req = urllib.request.Request(self.user_emails_url, headers=headers)
        with urllib.request.urlopen(req) as response:
            emails = json.loads(response.read().decode())
            primary_email = next(
                (e["email"] for e in emails if e.get("primary")),
                emails[0]["email"] if emails else None
            )
        
        return {
            "provider": "github",
            "provider_id": str(user_data["id"]),
            "username": user_data["login"],
            "email": primary_email,
            "name": user_data.get("name") or user_data["login"],
            "avatar_url": user_data.get("avatar_url"),
            "raw": user_data,
        }


class GoogleOAuth:
    """Google OAuth provider."""
    
    name = "google"
    authorization_url = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url = "https://oauth2.googleapis.com/token"
    user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    default_scopes = ["openid", "email", "profile"]
    
    def __init__(self, config: OAuthConfig):
        self.config = config
        self.scopes = config.scopes or self.default_scopes
    
    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Get Google authorization URL."""
        params = {
            "client_id": self.config.client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(self.scopes),
            "state": state,
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"{self.authorization_url}?{urlencode(params)}"
    
    def exchange_code(self, code: str, redirect_uri: str) -> dict:
        """Exchange code for access token."""
        import urllib.request
        
        data = urlencode({
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }).encode()
        
        req = urllib.request.Request(
            self.token_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    
    def get_user_info(self, access_token: str) -> dict:
        """Get user info from Google."""
        import urllib.request
        
        headers = {"Authorization": f"******"}
        
        req = urllib.request.Request(self.user_info_url, headers=headers)
        with urllib.request.urlopen(req) as response:
            user_data = json.loads(response.read().decode())
        
        return {
            "provider": "google",
            "provider_id": user_data["id"],
            "username": user_data["email"].split("@")[0],
            "email": user_data["email"],
            "name": user_data.get("name", ""),
            "avatar_url": user_data.get("picture"),
            "raw": user_data,
        }


# Registry of available providers
OAUTH_PROVIDERS = {
    "github": GitHubOAuth,
    "google": GoogleOAuth,
}


def get_oauth_provider(name: str, config: OAuthConfig) -> OAuthProvider:
    """Get an OAuth provider instance by name."""
    if name not in OAUTH_PROVIDERS:
        raise ValueError(f"Unknown OAuth provider: {name}")
    return OAUTH_PROVIDERS[name](config)
