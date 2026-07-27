/**
 * OAuth providers for JavaScript/TypeScript applications.
 * Supports GitHub and Google OAuth flows.
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  scopes?: string[];
}

export interface OAuthUserInfo {
  provider: string;
  providerId: string;
  username: string;
  email: string;
  name: string;
  avatarUrl?: string;
  raw: Record<string, unknown>;
}

export interface OAuthProvider {
  name: string;
  getAuthorizationUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string }>;
  getUserInfo(accessToken: string): Promise<OAuthUserInfo>;
}

/**
 * GitHub OAuth provider
 */
export class GitHubOAuth implements OAuthProvider {
  name = 'github';
  private config: OAuthConfig;
  private scopes: string[];

  private static AUTHORIZATION_URL = 'https://github.com/login/oauth/authorize';
  private static TOKEN_URL = 'https://github.com/login/oauth/access_token';
  private static USER_INFO_URL = 'https://api.github.com/user';
  private static USER_EMAILS_URL = 'https://api.github.com/user/emails';
  private static DEFAULT_SCOPES = ['read:user', 'user:email'];

  constructor(config: OAuthConfig) {
    this.config = config;
    this.scopes = config.scopes || GitHubOAuth.DEFAULT_SCOPES;
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(' '),
      state,
    });
    return `${GitHubOAuth.AUTHORIZATION_URL}?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string }> {
    const res = await fetch(GitHubOAuth.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret || '',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json();
    return { accessToken: data.access_token };
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const headers = {
      Authorization: `token ${accessToken}`,
      Accept: 'application/json',
    };

    // Get user info
    const userRes = await fetch(GitHubOAuth.USER_INFO_URL, { headers });
    const userData = await userRes.json();

    // Get primary email
    const emailsRes = await fetch(GitHubOAuth.USER_EMAILS_URL, { headers });
    const emails = await emailsRes.json();
    const primaryEmail = emails.find((e: { primary: boolean }) => e.primary)?.email || emails[0]?.email;

    return {
      provider: 'github',
      providerId: String(userData.id),
      username: userData.login,
      email: primaryEmail,
      name: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
      raw: userData,
    };
  }
}

/**
 * Google OAuth provider
 */
export class GoogleOAuth implements OAuthProvider {
  name = 'google';
  private config: OAuthConfig;
  private scopes: string[];

  private static AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private static TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private static USER_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
  private static DEFAULT_SCOPES = ['openid', 'email', 'profile'];

  constructor(config: OAuthConfig) {
    this.config = config;
    this.scopes = config.scopes || GoogleOAuth.DEFAULT_SCOPES;
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: this.scopes.join(' '),
      state,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${GoogleOAuth.AUTHORIZATION_URL}?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const res = await fetch(GoogleOAuth.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret || '',
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const res = await fetch(GoogleOAuth.USER_INFO_URL, {
      headers: { Authorization: `****** },
    });

    const userData = await res.json();

    return {
      provider: 'google',
      providerId: userData.id,
      username: userData.email.split('@')[0],
      email: userData.email,
      name: userData.name || '',
      avatarUrl: userData.picture,
      raw: userData,
    };
  }
}

// Registry of OAuth providers
export const OAUTH_PROVIDERS: Record<string, new (config: OAuthConfig) => OAuthProvider> = {
  github: GitHubOAuth,
  google: GoogleOAuth,
};

export function getOAuthProvider(name: string, config: OAuthConfig): OAuthProvider {
  const Provider = OAUTH_PROVIDERS[name];
  if (!Provider) {
    throw new Error(`Unknown OAuth provider: ${name}`);
  }
  return new Provider(config);
}
