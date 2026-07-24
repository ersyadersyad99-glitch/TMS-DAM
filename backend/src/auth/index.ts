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

  trustedOrigins: [process.env.FRONTEND_URL ?? 'http://localhost:5173'],
});

export type Auth = typeof auth;
