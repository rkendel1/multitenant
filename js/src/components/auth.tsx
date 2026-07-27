/**
 * Auth components for React applications.
 * These components provide standard login, signup, logout screens
 * with a header showing login status.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, FormEvent } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  [key: string]: unknown;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface AuthProviderProps {
  children: ReactNode;
  /** Base URL for auth API endpoints */
  apiBaseUrl?: string;
  /** Custom fetch implementation for API calls */
  fetchFn?: typeof fetch;
  /** Callback when login succeeds */
  onLoginSuccess?: (user: User) => void;
  /** Callback when logout succeeds */
  onLogoutSuccess?: () => void;
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
  fetchFn = fetch,
  onLoginSuccess,
  onLogoutSuccess,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
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
        const userData = await res.json();
        setUser(userData);
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

    const userData = await res.json();
    setUser(userData);
    onLoginSuccess?.(userData);
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

    const userData = await res.json();
    setUser(userData);
    onLoginSuccess?.(userData);
  }

  async function logout() {
    await fetchFn(`${apiBaseUrl}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    onLogoutSuccess?.();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
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
}

export function LoginScreen({ onSuccess, signupLink = '/signup', onSignupClick }: LoginScreenProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
