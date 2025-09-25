import { Pool, Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://robot_hospital_user:robot_hospital_password@localhost:5432/robot_hospital';

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
    globalPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Serverless optimizations
      max: 1, // Limit to 1 connection in serverless
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 0,
    });

    // Test the connection
    await globalPool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL database');
    
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
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
      await client.connect();
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