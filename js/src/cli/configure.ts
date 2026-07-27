#!/usr/bin/env node
/**
 * Interactive CLI wizard for configuring multitenant projects.
 * Usage: npx @multitenant/core configure
 */

import * as readline from 'node:readline';

const BACKENDS = {
  '1': { label: 'PostgreSQL', value: 'PostgresBackend' },
  '2': { label: 'Convex', value: 'ConvexBackend' },
  '3': { label: 'Custom', value: null },
};

interface Config {
  backend: string;
  postgresPool?: boolean;
  convexUrl?: string;
  convexToken?: string;
  useReact?: boolean;
  includeAuth?: boolean;
  apiBaseUrl?: string;
  typescript?: boolean;
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

      // Step 4: Auth configuration
      await this.configureAuth();

      // Step 5: Generate configuration
      this.generateConfig();

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
    console.log('\x1b[36m[1/4] Choose Backend\x1b[0m\n');
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
    console.log('\x1b[36m[2/4] PostgreSQL Configuration\x1b[0m\n');

    this.config.postgresPool = await this.confirm(
      'Will you provide a pg Pool instance?',
      true
    );
  }

  private async configureConvex(): Promise<void> {
    console.log('\x1b[36m[2/4] Convex Configuration\x1b[0m\n');

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
    console.log('\x1b[36m[3/4] Framework Configuration\x1b[0m\n');

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
    console.log('\x1b[36m[4/4] Authentication Configuration\x1b[0m\n');

    this.config.includeAuth = await this.confirm(
      'Include authentication components (login/signup/logout)?',
      true
    );

    if (this.config.includeAuth) {
      this.config.apiBaseUrl = await this.prompt(
        'API base URL for auth endpoints',
        '/api/auth'
      );
    }
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
      reactLines.push(`import { AuthProvider, Header, LoginScreen, SignupScreen } from '@multitenant/core/components';`);
      reactLines.push('');
      reactLines.push('function App() {');
      reactLines.push('  return (');
      reactLines.push(`    <AuthProvider apiBaseUrl="${this.config.apiBaseUrl}">`);
      reactLines.push('      <Header brandName="My App" />');
      reactLines.push('      {/* Your routes here */}');
      reactLines.push('    </AuthProvider>');
      reactLines.push('  );');
      reactLines.push('}');

      console.log(`// File: App.${ext}x`);
      console.log(reactLines.join('\n'));
    }

    console.log('\n\x1b[32mConfiguration complete!\x1b[0m');
  }

  private printNextSteps(): void {
    console.log('\n\x1b[36mNext Steps:\x1b[0m');
    console.log('  1. Install the package: npm install @multitenant/core');
    if (this.config.backend === 'PostgresBackend') {
      console.log('  2. Install pg: npm install pg');
    }
    if (this.config.useReact) {
      console.log('  3. Install React: npm install react react-dom');
    }
    console.log('  4. Copy the generated configuration to your project');
    console.log('  5. Set up your environment variables');
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
