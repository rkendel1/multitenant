/**
 * Auth components for React applications.
 * These components provide standard login, signup, logout screens
 * with a header showing login status.
 */

import { createContext, useContext, useState, useEffect, ReactNode, FormEvent } from 'react';

// ============================================================================
// Types
// ============================================================================

export type LoginMethod = 'email' | 'github' | 'google';

export interface User {
  id: string;
  username: string;
  email: string;
  role?: string;
  [key: string]: unknown;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  [key: string]: unknown;
}

export interface AuthContextType {
  user: User | null;
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithOAuth: (provider: LoginMethod) => void;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectTenant: (tenant: Tenant) => void;
}

export interface AuthProviderProps {
  children: ReactNode;
  /** Base URL for auth API endpoints */
  apiBaseUrl?: string;
  /** Enabled login methods */
  loginMethods?: LoginMethod[];
  /** Base domain for subdomain-based tenancy */
  baseDomain?: string;
  /** Custom fetch implementation for API calls */
  fetchFn?: typeof fetch;
  /** Callback when login succeeds */
  onLoginSuccess?: (user: User) => void;
  /** Callback when logout succeeds */
  onLogoutSuccess?: () => void;
  /** Callback when tenant is selected */
  onTenantSelect?: (tenant: Tenant) => void;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({
  children,
  apiBaseUrl = '/api/auth',
  loginMethods = ['email'],
  baseDomain,
  fetchFn = fetch,
  onLoginSuccess,
  onLogoutSuccess,
  onTenantSelect,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetchFn(`${apiBaseUrl}/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data);
        if (data.tenant) setCurrentTenant(data.tenant);
        if (data.tenants) setAvailableTenants(data.tenants);
      }
    } catch {
      // User is not authenticated
    } finally {
      setIsLoading(false);
    }
  }

  async function login(username: string, password: string) {
    const res = await fetchFn(`${apiBaseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(error.message || 'Login failed');
    }

    const data = await res.json();
    const userData = data.user || data;
    setUser(userData);
    if (data.tenants) setAvailableTenants(data.tenants);
    onLoginSuccess?.(userData);
  }

  function loginWithOAuth(provider: LoginMethod) {
    if (provider === 'email') return;
    
    // Store current URL for redirect after OAuth
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('oauth_redirect', window.location.href);
    }
    
    // Redirect to OAuth endpoint
    window.location.href = `${apiBaseUrl}/oauth/${provider}`;
  }

  async function signup(username: string, email: string, password: string) {
    const res = await fetchFn(`${apiBaseUrl}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, email, password }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Signup failed' }));
      throw new Error(error.message || 'Signup failed');
    }

    const data = await res.json();
    const userData = data.user || data;
    setUser(userData);
    onLoginSuccess?.(userData);
  }

  async function logout() {
    await fetchFn(`${apiBaseUrl}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    setCurrentTenant(null);
    setAvailableTenants([]);
    onLogoutSuccess?.();
  }

  function selectTenant(tenant: Tenant) {
    setCurrentTenant(tenant);
    onTenantSelect?.(tenant);
    
    // Redirect to tenant subdomain if baseDomain is configured
    if (baseDomain && typeof window !== 'undefined') {
      const scheme = window.location.protocol;
      window.location.href = `${scheme}//${tenant.slug}.${baseDomain}`;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        currentTenant,
        availableTenants,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithOAuth,
        signup,
        logout,
        selectTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: '400px',
    margin: '3rem auto',
    padding: '2rem',
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    textAlign: 'center' as const,
    marginBottom: '1.5rem',
    color: '#111827',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  label: {
    fontWeight: 500,
    fontSize: '0.875rem',
    color: '#374151',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    padding: '0.75rem',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '0.75rem',
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: '1rem',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  // Header styles
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  headerBrand: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#4f46e5',
    textDecoration: 'none',
  },
  headerNav: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  headerUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  headerUserName: {
    fontWeight: 500,
    color: '#111827',
  },
};

// OAuth button styles
const oauthStyles = {
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.5rem 0',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#d1d5db',
  },
  dividerText: {
    padding: '0 1rem',
  },
  oauthButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  oauthBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  oauthBtnGithub: {
    backgroundColor: '#24292e',
    color: 'white',
    border: '1px solid #24292e',
  },
  oauthBtnGoogle: {
    backgroundColor: 'white',
  },
};

// GitHub icon SVG
function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

// Google icon SVG
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ============================================================================
// Components
// ============================================================================

export interface LoginScreenProps {
  /** Callback when login succeeds */
  onSuccess?: () => void;
  /** Link to signup page */
  signupLink?: string;
  /** Custom signup click handler */
  onSignupClick?: () => void;
  /** Enabled login methods */
  loginMethods?: LoginMethod[];
}

export function LoginScreen({ 
  onSuccess, 
  signupLink = '/signup', 
  onSignupClick,
  loginMethods = ['email'],
}: LoginScreenProps) {
  const { login, loginWithOAuth } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasOAuth = loginMethods.includes('github') || loginMethods.includes('google');
  const hasEmail = loginMethods.includes('email');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(username, password);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome back</h1>

      {error && <div style={styles.error}>{error}</div>}

      {/* OAuth buttons */}
      {hasOAuth && (
        <div style={oauthStyles.oauthButtons}>
          {loginMethods.includes('github') && (
            <button
              style={{ ...oauthStyles.oauthBtn, ...oauthStyles.oauthBtnGithub }}
              onClick={() => loginWithOAuth('github')}
              type="button"
            >
              <GitHubIcon />
              Continue with GitHub
            </button>
          )}
          {loginMethods.includes('google') && (
            <button
              style={{ ...oauthStyles.oauthBtn, ...oauthStyles.oauthBtnGoogle }}
              onClick={() => loginWithOAuth('google')}
              type="button"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          )}
        </div>
      )}

      {/* Divider */}
      {hasOAuth && hasEmail && (
        <div style={oauthStyles.divider}>
          <div style={oauthStyles.dividerLine} />
          <span style={oauthStyles.dividerText}>or continue with email</span>
          <div style={oauthStyles.dividerLine} />
        </div>
      )}

      {/* Email/password form */}
      {hasEmail && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="username">Username or Email</label>
            <input
              style={styles.input}
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              style={styles.input}
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button style={styles.button} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      )}

      <div style={styles.footer}>
        Don't have an account?{' '}
        {onSignupClick ? (
          <span style={styles.link} onClick={onSignupClick}>Sign up</span>
        ) : (
          <a style={styles.link} href={signupLink}>Sign up</a>
        )}
      </div>
    </div>
  );
}

export interface SignupScreenProps {
  /** Callback when signup succeeds */
  onSuccess?: () => void;
  /** Link to login page */
  loginLink?: string;
  /** Custom login click handler */
  onLoginClick?: () => void;
}

export function SignupScreen({ onSuccess, loginLink = '/login', onLoginClick }: SignupScreenProps) {
  const { signup } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(username, email, password);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Create your account</h1>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="username">Username</label>
          <input
            style={styles.input}
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="email">Email</label>
          <input
            style={styles.input}
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="password">Password</label>
          <input
            style={styles.input}
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span style={styles.hint}>Must be at least 8 characters</span>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="passwordConfirm">Confirm Password</label>
          <input
            style={styles.input}
            type="password"
            id="passwordConfirm"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
        </div>

        <button style={styles.button} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <div style={styles.footer}>
        Already have an account?{' '}
        {onLoginClick ? (
          <span style={styles.link} onClick={onLoginClick}>Sign in</span>
        ) : (
          <a style={styles.link} href={loginLink}>Sign in</a>
        )}
      </div>
    </div>
  );
}

export interface LogoutScreenProps {
  /** Callback when logout succeeds */
  onSuccess?: () => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Link to redirect on cancel */
  cancelLink?: string;
}

export function LogoutScreen({ onSuccess, onCancel, cancelLink = '/' }: LogoutScreenProps) {
  const { logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      await logout();
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Sign Out</h1>
      <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1.5rem' }}>
        Are you sure you want to sign out?
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        {onCancel ? (
          <button style={{ ...styles.buttonSecondary, flex: 1 }} onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <a style={{ ...styles.buttonSecondary, flex: 1, textAlign: 'center', textDecoration: 'none' }} href={cancelLink}>
            Cancel
          </a>
        )}
        <button style={{ ...styles.button, flex: 1 }} onClick={handleLogout} disabled={isSubmitting}>
          {isSubmitting ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Header Component
// ============================================================================

export interface HeaderProps {
  /** Brand name to display */
  brandName?: string;
  /** Brand link URL */
  brandLink?: string;
  /** Link to login page */
  loginLink?: string;
  /** Link to signup page */
  signupLink?: string;
  /** Link to profile page */
  profileLink?: string;
  /** Custom login click handler */
  onLoginClick?: () => void;
  /** Custom signup click handler */
  onSignupClick?: () => void;
  /** Custom profile click handler */
  onProfileClick?: () => void;
  /** Custom logout click handler */
  onLogoutClick?: () => void;
  /** Current tenant info */
  tenant?: { name: string } | null;
}

export function Header({
  brandName = 'Multitenant App',
  brandLink = '/',
  loginLink = '/login',
  signupLink = '/signup',
  profileLink = '/profile',
  onLoginClick,
  onSignupClick,
  onProfileClick,
  onLogoutClick,
  tenant,
}: HeaderProps) {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  const displayBrandName = tenant?.name || brandName;

  async function handleLogout() {
    if (onLogoutClick) {
      onLogoutClick();
    } else {
      await logout();
    }
  }

  return (
    <header style={styles.header}>
      <a style={styles.headerBrand} href={brandLink}>
        {displayBrandName}
      </a>

      <nav style={styles.headerNav}>
        {isLoading ? (
          <span style={{ color: '#6b7280' }}>Loading...</span>
        ) : isAuthenticated && user ? (
          <div style={styles.headerUser}>
            <span style={styles.headerUserName}>{user.username}</span>
            {onProfileClick ? (
              <button style={styles.buttonSecondary} onClick={onProfileClick}>
                Profile
              </button>
            ) : (
              <a style={{ ...styles.buttonSecondary, textDecoration: 'none' }} href={profileLink}>
                Profile
              </a>
            )}
            <button style={styles.buttonSecondary} onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <>
            {onLoginClick ? (
              <button style={styles.buttonSecondary} onClick={onLoginClick}>
                Login
              </button>
            ) : (
              <a style={{ ...styles.buttonSecondary, textDecoration: 'none' }} href={loginLink}>
                Login
              </a>
            )}
            {onSignupClick ? (
              <button style={styles.button} onClick={onSignupClick}>
                Sign Up
              </button>
            ) : (
              <a style={{ ...styles.button, textDecoration: 'none' }} href={signupLink}>
                Sign Up
              </a>
            )}
          </>
        )}
      </nav>
    </header>
  );
}

// ============================================================================
// Tenant Selector Component
// ============================================================================

const tenantSelectorStyles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: '500px',
    margin: '3rem auto',
    padding: '2rem',
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    textAlign: 'center' as const,
    marginBottom: '0.5rem',
    color: '#111827',
  },
  subtitle: {
    textAlign: 'center' as const,
    color: '#6b7280',
    marginBottom: '2rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  itemName: {
    fontWeight: 600,
    color: '#111827',
  },
  itemSlug: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  itemArrow: {
    color: '#6b7280',
    fontSize: '1.25rem',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '2rem',
    color: '#6b7280',
  },
};

export interface TenantSelectorProps {
  /** Base domain for displaying tenant URLs */
  baseDomain?: string;
  /** Callback when a tenant is selected */
  onSelect?: (tenant: Tenant) => void;
  /** Custom empty state message */
  emptyMessage?: string;
}

export function TenantSelector({
  baseDomain = 'example.com',
  onSelect,
  emptyMessage = "You don't have access to any workspaces yet.",
}: TenantSelectorProps) {
  const { availableTenants, selectTenant } = useAuth();

  function handleSelect(tenant: Tenant) {
    selectTenant(tenant);
    onSelect?.(tenant);
  }

  return (
    <div style={tenantSelectorStyles.container}>
      <h1 style={tenantSelectorStyles.title}>Select a workspace</h1>
      <p style={tenantSelectorStyles.subtitle}>Choose which workspace you want to access</p>

      {availableTenants.length > 0 ? (
        <div style={tenantSelectorStyles.list}>
          {availableTenants.map((tenant) => (
            <button
              key={tenant.id}
              style={tenantSelectorStyles.item}
              onClick={() => handleSelect(tenant)}
            >
              <div style={tenantSelectorStyles.itemInfo}>
                <span style={tenantSelectorStyles.itemName}>{tenant.name}</span>
                <span style={tenantSelectorStyles.itemSlug}>{tenant.slug}.{baseDomain}</span>
              </div>
              <span style={tenantSelectorStyles.itemArrow}>→</span>
            </button>
          ))}
        </div>
      ) : (
        <div style={tenantSelectorStyles.empty}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
