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

// Auth components (React)
export {
  AuthProvider,
  useAuth,
  LoginScreen,
  SignupScreen,
  LogoutScreen,
  Header,
  type AuthContextType,
  type AuthProviderProps,
  type User,
  type LoginScreenProps,
  type SignupScreenProps,
  type LogoutScreenProps,
  type HeaderProps,
} from "./components/index.js";

// CLI
export { ConfigureWizard } from "./cli/index.js";
