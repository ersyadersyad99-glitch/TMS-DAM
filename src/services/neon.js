import { createClient } from '@neondatabase/serverless';

export const neonClient = createClient({
  url: import.meta.env.VITE_NEON_DATA_API_URL || '',
  authUrl: import.meta.env.VITE_NEON_AUTH_URL || '',
});

export default neonClient;
