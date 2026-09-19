import { Pool, Client } from 'pg';

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://robot_hospital_user:robot_hospital_password@localhost:5432/robot_hospital';

const usingRemoteDatabase = process.env.NODE_ENV === 'production';

// Supabase's pooler presents a chain rooted in their own CA rather than a
// publicly-trusted one. `rejectUnauthorized: false` alone was found to
// fail with SELF_SIGNED_CERT_IN_CHAIN specifically from Vercel's
// infrastructure (both build and runtime), even though the identical
// option works from every other environment tested. Explicitly trusting
// Supabase's actual root CA lets the chain validate properly instead of
// bypassing validation, which avoids that gap entirely. This is the same
// cert as certs/supabase-pooler-ca.pem (used by scripts/migrate.js) —
// duplicated here as a string literal, rather than read from disk, since
// this file runs inside Next.js's serverless function bundle and an
// arbitrary file path isn't reliably picked up by Next's automatic file
// tracing. It's the public cert every client receives during the TLS
// handshake, not a secret, and is shared by every Supabase project/pooler
// node, so this same value works for Preview and Production alike. Keep
// in sync with certs/supabase-pooler-ca.pem if Supabase ever rotates it.
const SUPABASE_POOLER_CA = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----
`;
const sslConfig = usingRemoteDatabase ? { ca: SUPABASE_POOLER_CA } : false;

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
    await pool.query('SELECT NOW()');
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
