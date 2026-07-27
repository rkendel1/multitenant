#!/usr/bin/env node
/**
 * Interactive CLI wizard for configuring multitenant projects.
 * Usage: npx @multitenant/core configure
 */

import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';

const BACKENDS = {
  '1': { label: 'PostgreSQL', value: 'PostgresBackend' },
  '2': { label: 'Convex', value: 'ConvexBackend' },
  '3': { label: 'Custom', value: null },
};

const LOGIN_METHODS = {
  '1': { label: 'Email/Password', value: 'email' },
  '2': { label: 'GitHub OAuth', value: 'github' },
  '3': { label: 'Google OAuth', value: 'google' },
};

interface Config {
  backend: string;
  postgresPool?: boolean;
  databaseUrl?: string;
  convexUrl?: string;
  convexToken?: string;
  useReact?: boolean;
  includeAuth?: boolean;
  loginMethods?: string[];
  apiBaseUrl?: string;
  typescript?: boolean;
  useSubdomain?: boolean;
  baseDomain?: string;
  adminEmail?: string;
}

class ConfigureWizard {
  private rl: readline.Interface;
  private config: Config = { backend: '' };

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async run(): Promise<void> {
    this.printHeader();

    try {
      // Step 1: Choose backend
      await this.chooseBackend();

      // Step 2: Configure backend-specific settings
      if (this.config.backend === 'PostgresBackend') {
        await this.configurePostgres();
      } else if (this.config.backend === 'ConvexBackend') {
        await this.configureConvex();
      }

      // Step 3: Framework configuration
      await this.configureFramework();

      // Step 4: Auth configuration (including login methods)
      await this.configureAuth();

      // Step 5: Subdomain configuration
      await this.configureSubdomain();

      // Step 6: Platform owner configuration
      await this.configurePlatformOwner();

      // Step 7: Generate configuration
      this.generateConfig();

      // Step 8: Generate and write .env file
      await this.generateEnvFile();

      this.printNextSteps();
    } finally {
      this.rl.close();
    }
  }

  private printHeader(): void {
    console.log('\n' + '='.repeat(60));
    console.log('  Multitenant Configuration Wizard');
    console.log('='.repeat(60) + '\n');
  }

  private prompt(question: string, defaultValue?: string): Promise<string> {
    return new Promise((resolve) => {
      const displayQuestion = defaultValue
        ? `${question} [${defaultValue}]: `
        : `${question}: `;

      this.rl.question(displayQuestion, (answer) => {
        resolve(answer.trim() || defaultValue || '');
      });
    });
  }

  private async confirm(question: string, defaultValue = true): Promise<boolean> {
    const defaultStr = defaultValue ? 'Y/n' : 'y/N';
    const answer = await this.prompt(`${question} [${defaultStr}]`);

    if (!answer) return defaultValue;
    return ['y', 'yes', 'true', '1'].includes(answer.toLowerCase());
  }

  private async chooseBackend(): Promise<void> {
    console.log('\x1b[36m[1/7] Choose Backend\x1b[0m\n');
    console.log('Which backend will you use?');

    for (const [key, { label }] of Object.entries(BACKENDS)) {
      console.log(`  ${key}. ${label}`);
    }

    const choice = await this.prompt('Enter choice', '1');

    if (!(choice in BACKENDS)) {
      console.error(`Invalid choice: ${choice}`);
      process.exit(1);
    }

    const backend = BACKENDS[choice as keyof typeof BACKENDS];
    console.log(`\x1b[32m✓ Selected: ${backend.label}\x1b[0m\n`);

    if (backend.value === null) {
      const customBackend = await this.prompt('Enter your custom backend import path');
      this.config.backend = customBackend;
    } else {
      this.config.backend = backend.value;
    }
  }

  private async configurePostgres(): Promise<void> {
    console.log('\x1b[36m[2/7] PostgreSQL Configuration\x1b[0m\n');

    this.config.postgresPool = await this.confirm(
      'Will you provide a pg Pool instance?',
      true
    );
    
    this.config.databaseUrl = await this.prompt(
      'Database URL (or press Enter for default)',
      '******localhost:5432/dbname'
    );
  }

  private async configureConvex(): Promise<void> {
    console.log('\x1b[36m[2/7] Convex Configuration\x1b[0m\n');

    this.config.convexUrl = await this.prompt(
      'Convex deployment URL',
      'https://your-deployment.convex.cloud'
    );

    this.config.convexToken = await this.prompt(
      'Convex API token (leave empty if not required)',
      ''
    );
  }

  private async configureFramework(): Promise<void> {
    console.log('\x1b[36m[3/7] Framework Configuration\x1b[0m\n');

    this.config.useReact = await this.confirm(
      'Will you use React for the frontend?',
      true
    );

    this.config.typescript = await this.confirm(
      'Are you using TypeScript?',
      true
    );
  }

  private async configureAuth(): Promise<void> {
    console.log('\x1b[36m[4/7] Authentication Configuration\x1b[0m\n');

    this.config.includeAuth = await this.confirm(
      'Include authentication components (login/signup/logout)?',
      true
    );

    if (this.config.includeAuth) {
      // Login methods selection
      console.log('\nSelect login methods to enable (comma-separated, e.g., 1,2,3):');
      for (const [key, { label }] of Object.entries(LOGIN_METHODS)) {
        console.log(`  ${key}. ${label}`);
      }
      
      const methodsInput = await this.prompt('Login methods', '1');
      const selectedMethods: string[] = [];
      for (const choice of methodsInput.split(',')) {
        const trimmed = choice.trim();
        if (trimmed in LOGIN_METHODS) {
          selectedMethods.push(LOGIN_METHODS[trimmed as keyof typeof LOGIN_METHODS].value);
        }
      }
      
      this.config.loginMethods = selectedMethods.length > 0 ? selectedMethods : ['email'];
      console.log(`\x1b[32m✓ Enabled: ${this.config.loginMethods.join(', ')}\x1b[0m\n`);

      this.config.apiBaseUrl = await this.prompt(
        'API base URL for auth endpoints',
        '/api/auth'
      );
    }
  }

  private async configureSubdomain(): Promise<void> {
    console.log('\x1b[36m[5/7] Subdomain Configuration\x1b[0m\n');

    this.config.useSubdomain = await this.confirm(
      'Use subdomain-based multitenancy (subdomain.domain.app)?',
      true
    );

    if (this.config.useSubdomain) {
      this.config.baseDomain = await this.prompt(
        'Base domain (e.g., myapp.com)',
        'localhost'
      );
      console.log(`\x1b[32m✓ Tenants will be at: <tenant>.${this.config.baseDomain}\x1b[0m\n`);
    }
  }

  private async configurePlatformOwner(): Promise<void> {
    console.log('\x1b[36m[6/7] Platform Owner Configuration\x1b[0m\n');

    this.config.adminEmail = await this.prompt(
      'Platform owner email',
      'admin@example.com'
    );

    console.log('\x1b[33mNote: Set MULTITENANT_ADMIN_PASSWORD in your .env file for security.\x1b[0m');
  }

  private generateConfig(): void {
    console.log('\n' + '='.repeat(60));
    console.log('  Generated Configuration');
    console.log('='.repeat(60) + '\n');

    const ext = this.config.typescript ? 'ts' : 'js';
    const lines: string[] = [];

    // Backend setup
    lines.push('// Backend setup');

    if (this.config.backend === 'PostgresBackend') {
      lines.push(`import { PostgresBackend, tenantMiddleware } from '@multitenant/core';`);
      if (this.config.postgresPool) {
        lines.push(`import { Pool } from 'pg';`);
        lines.push('');
        lines.push('const pool = new Pool({');
        lines.push("  connectionString: process.env.DATABASE_URL,");
        lines.push('});');
      }
      lines.push('');
      lines.push('const backend = new PostgresBackend({ pool });');
    } else if (this.config.backend === 'ConvexBackend') {
      lines.push(`import { ConvexBackend, tenantMiddleware } from '@multitenant/core';`);
      lines.push('');
      lines.push('const backend = new ConvexBackend({');
      lines.push(`  deploymentUrl: '${this.config.convexUrl}',`);
      if (this.config.convexToken) {
        lines.push(`  apiToken: '${this.config.convexToken}',`);
      }
      lines.push('});');
    } else {
      lines.push(`import { tenantMiddleware } from '@multitenant/core';`);
      lines.push(`import { ${this.config.backend} } from './your-backend';`);
      lines.push('');
      lines.push(`const backend = new ${this.config.backend}();`);
    }

    // Express middleware
    lines.push('');
    lines.push('// Express middleware');
    lines.push("import express from 'express';");
    lines.push('');
    lines.push('const app = express();');
    lines.push('app.use(tenantMiddleware({ backend }));');

    console.log(`// File: backend.${ext}`);
    console.log(lines.join('\n'));

    // React configuration if applicable
    if (this.config.useReact && this.config.includeAuth) {
      console.log('\n' + '-'.repeat(60) + '\n');

      const reactLines: string[] = [];
      reactLines.push('// React app setup');
      reactLines.push(`import { AuthProvider, Header, LoginScreen, SignupScreen, TenantSelector } from '@multitenant/core/components';`);
      reactLines.push('');
      reactLines.push('function App() {');
      reactLines.push('  return (');
      reactLines.push(`    <AuthProvider`);
      reactLines.push(`      apiBaseUrl="${this.config.apiBaseUrl}"`);
      reactLines.push(`      loginMethods={${JSON.stringify(this.config.loginMethods || ['email'])}}`);
      if (this.config.useSubdomain && this.config.baseDomain) {
        reactLines.push(`      baseDomain="${this.config.baseDomain}"`);
      }
      reactLines.push('    >');
      reactLines.push('      <Header brandName="My App" />');
      reactLines.push('      {/* Your routes here */}');
      reactLines.push('    </AuthProvider>');
      reactLines.push('  );');
      reactLines.push('}');

      console.log(`// File: App.${ext}x`);
      console.log(reactLines.join('\n'));
    }
  }

  private async generateEnvFile(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('  Generated .env File');
    console.log('='.repeat(60) + '\n');

    const lines: string[] = [
      '# =============================================================================',
      '# Multitenant Configuration',
      '# Generated by: npx @multitenant/core configure',
      '# =============================================================================',
      '',
      '# -----------------------------------------------------------------------------',
      '# Node Environment',
      '# -----------------------------------------------------------------------------',
      'NODE_ENV=development',
      'PORT=3000',
      '',
    ];

    // Database settings
    if (this.config.backend === 'PostgresBackend') {
      lines.push(
        '# -----------------------------------------------------------------------------',
        '# Database (PostgreSQL)',
        '# -----------------------------------------------------------------------------',
        `DATABASE_URL=${this.config.databaseUrl || '******localhost:5432/dbname'}`,
        '',
      );
    }

    // Convex settings
    if (this.config.backend === 'ConvexBackend') {
      lines.push(
        '# -----------------------------------------------------------------------------',
        '# Convex Configuration',
        '# -----------------------------------------------------------------------------',
        `CONVEX_DEPLOYMENT_URL=${this.config.convexUrl || 'https://your-deployment.convex.cloud'}`,
        'CONVEX_API_TOKEN=your-convex-api-token-here',
        '',
      );
    }

    // Subdomain settings
    if (this.config.useSubdomain) {
      lines.push(
        '# -----------------------------------------------------------------------------',
        '# Subdomain Configuration',
        '# -----------------------------------------------------------------------------',
        `MULTITENANT_BASE_DOMAIN=${this.config.baseDomain || 'localhost'}`,
        '',
      );
    }

    // OAuth settings
    const loginMethods = this.config.loginMethods || [];
    if (loginMethods.includes('github') || loginMethods.includes('google')) {
      lines.push(
        '# -----------------------------------------------------------------------------',
        '# OAuth Configuration',
        '# -----------------------------------------------------------------------------',
      );

      if (loginMethods.includes('github')) {
        lines.push(
          '# GitHub OAuth - Get credentials at: https://github.com/settings/developers',
          'GITHUB_CLIENT_ID=your-github-client-id',
          'GITHUB_CLIENT_SECRET=your-github-client-secret',
          '',
        );
      }

      if (loginMethods.includes('google')) {
        lines.push(
          '# Google OAuth - Get credentials at: https://console.cloud.google.com/apis/credentials',
          'GOOGLE_CLIENT_ID=your-google-client-id',
          'GOOGLE_CLIENT_SECRET=your-google-client-secret',
          '',
        );
      }
    }

    // Platform owner
    lines.push(
      '# -----------------------------------------------------------------------------',
      '# Platform Owner (Initial Admin User)',
      '# -----------------------------------------------------------------------------',
      `MULTITENANT_ADMIN_EMAIL=${this.config.adminEmail || 'admin@example.com'}`,
      'MULTITENANT_ADMIN_PASSWORD=your-secure-password-here',
      '',
    );

    const envContent = lines.join('\n');
    console.log(envContent);

    // Ask to write file
    const writeFile = await this.confirm('\nWrite .env file to current directory?', true);
    if (writeFile) {
      const envPath = path.join(process.cwd(), '.env');
      fs.writeFileSync(envPath, envContent);
      console.log(`\x1b[32m✓ .env file written to: ${envPath}\x1b[0m`);
    }

    console.log('\n\x1b[32mConfiguration complete!\x1b[0m');
  }

  private printNextSteps(): void {
    console.log('\n\x1b[36mNext Steps:\x1b[0m');
    console.log('  1. Review and update your .env file with actual credentials');
    console.log('  2. Install the package: npm install @multitenant/core');
    if (this.config.backend === 'PostgresBackend') {
      console.log('  3. Install pg: npm install pg');
    }
    if (this.config.useReact) {
      console.log('  4. Install React: npm install react react-dom');
    }
    console.log('  5. Copy the generated configuration to your project');
    console.log('  6. Set up your database and run migrations');
    console.log('');
  }
}

// Main entry point
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: multitenant-configure [options]

Options:
  --help, -h     Show this help message
  --version, -v  Show version number

This wizard will guide you through configuring a multitenant project.
`);
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('0.1.0');
    process.exit(0);
  }

  const wizard = new ConfigureWizard();
  await wizard.run();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

export { ConfigureWizard };
