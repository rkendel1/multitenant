export type { Tenant } from "./context.js";
export { getCurrentTenant, runWithTenant } from "./context.js";
export { tenantMiddleware, type MiddlewareConfig } from "./middleware.js";
export {
  type TenantBackend,
  PostgresBackend,
  type PostgresConfig,
  ConvexBackend,
  type ConvexConfig,
} from "./backends/index.js";

// OAuth
export {
  GitHubOAuth,
  GoogleOAuth,
  getOAuthProvider,
  OAUTH_PROVIDERS,
  type OAuthConfig,
  type OAuthUserInfo,
  type OAuthProvider,
} from "./oauth.js";

// Subdomain utilities
export {
  parseHost,
  validateSubdomain,
  buildTenantUrl,
  getCurrentSubdomain,
  suggestSubdomains,
  type SubdomainConfig,
  type ParsedHost,
} from "./subdomain.js";

// Roles
export {
  RoleLevel,
  STANDARD_ROLES,
  VIEWER,
  MEMBER,
  ADMIN,
  OWNER,
  PLATFORM_OWNER,
  hasPermission,
  isAtLeast,
  getRole,
  getRolesAtLevel,
  checkPermission,
  type Role,
} from "./roles.js";

// Auth components (React)
export {
  AuthProvider,
  useAuth,
  LoginScreen,
  SignupScreen,
  LogoutScreen,
  Header,
  TenantSelector,
  type AuthContextType,
  type AuthProviderProps,
  type User,
  type LoginScreenProps,
  type SignupScreenProps,
  type LogoutScreenProps,
  type HeaderProps,
  type TenantSelectorProps,
  type LoginMethod,
} from "./components/index.js";

// CLI
export { ConfigureWizard } from "./cli/index.js";
