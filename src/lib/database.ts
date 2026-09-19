import { Pool, Client } from 'pg';

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://robot_hospital_user:robot_hospital_password@localhost:5432/robot_hospital';

const usingRemoteDatabase = process.env.NODE_ENV === 'production';
const sslConfig = usingRemoteDatabase ? { rejectUnauthorized: false } : false;

// pg's per-connection `ssl: { rejectUnauthorized: false }` isn't always
// enough to get past Supabase's pooler cert chain — confirmed by direct
// testing (see scripts/migrate.js) that it intermittently fails with
// SELF_SIGNED_CERT_IN_CHAIN even with that option alone, while the
// process-level NODE_TLS_REJECT_UNAUTHORIZED=0 override succeeds against
// the exact same connection. Scoped as tightly as possible: set
// immediately before the connection attempt and restored immediately
// after, regardless of outcome — it has no effect on an already-
// established connection once restored.
async function withTlsWorkaround<T>(connect: () => Promise<T>): Promise<T> {
  if (!usingRemoteDatabase) {
    return connect();
  }

  const previousValue = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    return await connect();
  } finally {
    if (previousValue === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousValue;
  }
}

// Global variable to reuse connection in serverless environment
let globalPool: Pool | null = null;

export async function connectToDatabase(): Promise<Pool> {
  // In serverless environments, reuse existing connections
  if (globalPool) {
    try {
      // Test the connection
      await globalPool.query('SELECT 1');
      return globalPool;
    } catch {
      console.log('Existing pool connection failed, creating new one');
      globalPool = null;
    }
  }

  try {
    const pool = new Pool({
      connectionString: POSTGRES_URL,
      ssl: sslConfig,
      // Serverless optimizations
      max: 1, // Limit to 1 connection in serverless
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 0,
    });

    // Test the connection
    await withTlsWorkaround(() => pool.query('SELECT NOW()'));
    console.log('Connected to PostgreSQL database');

    globalPool = pool;
    return globalPool;
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    throw error;
  }
}

// For serverless environments, prefer single queries over pooled connections
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query(text: string, params?: unknown[]): Promise<any> {
  if (process.env.VERCEL) {
    // Use single client for Vercel serverless functions
    const client = new Client({
      connectionString: POSTGRES_URL,
      ssl: sslConfig,
    });

    try {
      await withTlsWorkaround(() => client.connect());
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      await client.end();
    }
  } else {
    // Use pool for local development
    const pool = await connectToDatabase();
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
}
