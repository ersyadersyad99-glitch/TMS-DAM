import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user:         schema.users,
      session:      schema.sessions,
      account:      schema.accounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // disable for internal tool
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },

  /**
   * Extend the user model with custom fields.
   * Better Auth merges these into the `user` table.
   */
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'viewer',
        // Only admins can change roles — enforced at route level
      },
      status: {
        type: 'string',
        required: false,
        defaultValue: 'active',
      },
    },
  },

  /**
   * Trusted origins for Better Auth CSRF protection and cookie scoping.
   * Must include all domains from which the frontend sends authenticated requests.
   *
   * Built dynamically from environment variables to avoid hardcoded URLs.
   * Mirrors the CORS allowlist in index.ts.
   */
  trustedOrigins: (request?: Request) => {
    const origins: string[] = [];

    // Primary: comma-separated CORS_ORIGINS env var
    const corsOrigins = process.env.CORS_ORIGINS;
    if (corsOrigins) {
      corsOrigins.split(',').map(o => o.trim()).filter(Boolean).forEach(o => origins.push(o));
    }

    // Secondary: single FRONTEND_URL (backward compat)
    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl && !origins.includes(frontendUrl)) {
      origins.push(frontendUrl);
    }

    // Development fallbacks — include localhost & incoming origin header
    if (process.env.NODE_ENV !== 'production') {
      ['http://localhost:5173', 'http://127.0.0.1:5173'].forEach(o => {
        if (!origins.includes(o)) origins.push(o);
      });
      const reqOrigin = request?.headers?.get('origin');
      if (reqOrigin && !origins.includes(reqOrigin)) {
        origins.push(reqOrigin);
      }
    }

    return origins;
  },
});

export type Auth = typeof auth;
