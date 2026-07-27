/**
 * Subdomain utilities for multitenant applications.
 * Handles parsing and validating subdomain.domain.app format.
 */

export interface SubdomainConfig {
  /** Base domain (e.g., "domain.app") */
  baseDomain: string;
  /** Whether to allow www as a valid subdomain */
  allowWww?: boolean;
  /** Reserved subdomains that cannot be used by tenants */
  reservedSubdomains?: string[];
  /** Minimum subdomain length */
  minLength?: number;
  /** Maximum subdomain length */
  maxLength?: number;
}

export interface ParsedHost {
  subdomain: string | null;
  baseDomain: string;
  isValid: boolean;
  isPlatform: boolean;
  error?: string;
}

const DEFAULT_RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'admin',
  'app',
  'auth',
  'login',
  'signup',
  'static',
  'assets',
  'cdn',
  'mail',
  'smtp',
  'ftp',
  'help',
  'support',
  'docs',
  'status',
];

const SUBDOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/**
 * Parse a host string into subdomain and base domain.
 */
export function parseHost(host: string, config: SubdomainConfig): ParsedHost {
  const {
    baseDomain,
    allowWww = false,
    reservedSubdomains = DEFAULT_RESERVED_SUBDOMAINS,
    minLength = 2,
    maxLength = 63,
  } = config;

  // Normalize host
  let normalizedHost = host.toLowerCase().trim();

  // Remove port if present
  if (normalizedHost.includes(':')) {
    normalizedHost = normalizedHost.split(':')[0];
  }

  const normalizedBase = baseDomain.toLowerCase();

  // Check if it's the base domain (platform level)
  if (normalizedHost === normalizedBase) {
    return {
      subdomain: null,
      baseDomain: normalizedBase,
      isValid: true,
      isPlatform: true,
    };
  }

  // Check if host ends with base domain
  if (!normalizedHost.endsWith(`.${normalizedBase}`)) {
    return {
      subdomain: null,
      baseDomain: normalizedBase,
      isValid: false,
      isPlatform: false,
      error: `Host '${host}' does not match base domain '${baseDomain}'`,
    };
  }

  // Extract subdomain
  const subdomain = normalizedHost.slice(0, -(normalizedBase.length + 1));

  // Handle www
  if (subdomain === 'www') {
    if (allowWww) {
      return {
        subdomain: null,
        baseDomain: normalizedBase,
        isValid: true,
        isPlatform: true,
      };
    } else {
      return {
        subdomain: null,
        baseDomain: normalizedBase,
        isValid: false,
        isPlatform: false,
        error: 'www subdomain is not allowed',
      };
    }
  }

  // Validate subdomain
  const validationError = validateSubdomain(subdomain, {
    reservedSubdomains,
    minLength,
    maxLength,
  });

  if (validationError) {
    return {
      subdomain,
      baseDomain: normalizedBase,
      isValid: false,
      isPlatform: false,
      error: validationError,
    };
  }

  return {
    subdomain,
    baseDomain: normalizedBase,
    isValid: true,
    isPlatform: false,
  };
}

/**
 * Validate a subdomain string.
 */
export function validateSubdomain(
  subdomain: string,
  options: {
    reservedSubdomains?: string[];
    minLength?: number;
    maxLength?: number;
  } = {}
): string | null {
  const {
    reservedSubdomains = DEFAULT_RESERVED_SUBDOMAINS,
    minLength = 2,
    maxLength = 63,
  } = options;

  if (!subdomain) {
    return 'Subdomain cannot be empty';
  }

  if (subdomain.length < minLength) {
    return `Subdomain must be at least ${minLength} characters`;
  }

  if (subdomain.length > maxLength) {
    return `Subdomain cannot exceed ${maxLength} characters`;
  }

  if (reservedSubdomains.includes(subdomain)) {
    return `Subdomain '${subdomain}' is reserved`;
  }

  if (!SUBDOMAIN_PATTERN.test(subdomain)) {
    return 'Subdomain must contain only lowercase letters, numbers, and hyphens';
  }

  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return 'Subdomain cannot start or end with a hyphen';
  }

  return null;
}

/**
 * Build a full URL for a tenant subdomain.
 */
export function buildTenantUrl(
  subdomain: string,
  config: SubdomainConfig,
  scheme: string = 'https'
): string {
  return `${scheme}://${subdomain}.${config.baseDomain}`;
}

/**
 * Get the current subdomain from window.location.
 */
export function getCurrentSubdomain(config: SubdomainConfig): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const parsed = parseHost(window.location.host, config);
  return parsed.subdomain;
}

/**
 * Suggest available subdomains based on a requested name.
 */
export function suggestSubdomains(
  requested: string,
  existingSubdomains: Set<string>,
  config: SubdomainConfig,
  count: number = 5
): string[] {
  const suggestions: string[] = [];
  const base = requested.toLowerCase().replace(/[^a-z0-9]/g, '') || 'team';

  // Try the base name first
  if (!existingSubdomains.has(base) && !validateSubdomain(base, config)) {
    suggestions.push(base);
  }

  // Try with numbers
  for (let i = 1; i < 100 && suggestions.length < count; i++) {
    const candidate = `${base}${i}`;
    if (!existingSubdomains.has(candidate) && !validateSubdomain(candidate, config)) {
      suggestions.push(candidate);
    }
  }

  return suggestions;
}
