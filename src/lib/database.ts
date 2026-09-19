import { Pool, Client } from 'pg';

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://robot_hospital_user:robot_hospital_password@localhost:5432/robot_hospital';

const usingRemoteDatabase = process.env.NODE_ENV === 'production';
const sslConfig = usingRemoteDatabase ? { rejectUnauthorized: false } : false;

// pg's per-connection `ssl: { rejectUnauthorized: false }` isn't enough to
// get past Supabase's pooler cert chain from Vercel's infrastructure —
// confirmed by direct testing that it fails with SELF_SIGNED_CERT_IN_CHAIN
// with that option alone. Explicitly trusting Supabase's actual root CA
// via ssl.ca was also tried and *also* fails with the identical error in
// this same environment (the chain, DNS, and every backend IP all
// validate cleanly with that CA from every other environment tested, so
// this is a defect specific to how Vercel validates an explicitly-trusted
// custom CA, not a real problem with the certificate). Only this
// process-level override, which operates through a different Node TLS
// code path, has been empirically shown to work here.
//
// Unlike scripts/migrate.js (a single-threaded, one-shot script), this
// module's query() can be invoked concurrently within the same warm
// Vercel function instance, and NODE_TLS_REJECT_UNAUTHORIZED is process-
// global — two overlapping connection attempts could otherwise race on
// setting/restoring it (one restoring the real value while another
// handshake still needs it disabled, or leaving it permanently disabled).
// Serialize every use of the override through this promise chain so only
// one connection attempt is ever inside the mutated-env window at a time.
let tlsWorkaroundQueue: Promise<unknown> = Promise.resolve();
function withTlsWorkaround<T>(connect: () => Promise<T>): Promise<T> {
  if (!usingRemoteDatabase) {
    return connect();
  }

  const run = tlsWorkaroundQueue.then(async () => {
    const previousValue = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      return await connect();
    } finally {
      if (previousValue === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousValue;
    }
  });

  // Keep the queue alive even if this attempt fails, so a failed
  // connection doesn't permanently wedge every later call behind a
  // rejected promise.
  tlsWorkaroundQueue = run.catch(() => undefined);

  return run;
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
