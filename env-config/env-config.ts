import { readFile } from "fs/promises";
import path from "path";

/**
 * env-config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for ALL blog-system configuration.
 *
 * Priority (highest → lowest):
 *   1. Environment variables  → always wins (Vercel, Railway, Render, any CI/CD)
 *   2. data/blog_system_config.json → written by the setup wizard (local dev)
 *   3. Empty string / built-in default
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO USE ON VERCEL
 * ─────────────────────────────────────────────────────────────────────────────
 * Vercel Dashboard → Your Project → Settings → Environment Variables
 * Copy the block for your chosen DB provider and your chosen storage provider.
 * The in-app setup wizard is completely optional when env vars are present.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * DATABASE PROVIDERS  — pick exactly ONE block
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * ┌─ SUPABASE ─────────────────────────────────────────────────────────────────
 * │  BLOG_DB_PROVIDER          = supabase
 * │  BLOG_SUPABASE_URL         = https://xxxxxxxxxxxx.supabase.co
 * │  BLOG_SUPABASE_ANON_KEY    = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * │  BLOG_SUPABASE_SERVICE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  ← optional, for admin ops
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ┌─ POSTGRESQL ───────────────────────────────────────────────────────────────
 * │  BLOG_DB_PROVIDER = postgres
 * │  BLOG_DB_HOST     = db.example.com
 * │  BLOG_DB_PORT     = 5432
 * │  BLOG_DB_NAME     = my_database
 * │  BLOG_DB_USER     = db_user
 * │  BLOG_DB_PASSWORD = db_password
 * │  BLOG_DB_SSL      = true                ← optional, recommended for cloud
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ┌─ MYSQL ────────────────────────────────────────────────────────────────────
 * │  BLOG_DB_PROVIDER = mysql
 * │  BLOG_DB_HOST     = db.example.com
 * │  BLOG_DB_PORT     = 3306
 * │  BLOG_DB_NAME     = my_database
 * │  BLOG_DB_USER     = db_user
 * │  BLOG_DB_PASSWORD = db_password
 * │  BLOG_DB_SSL      = true                ← optional
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ┌─ DIGITALOCEAN MANAGED DATABASE (Postgres or MySQL) ────────────────────────
 * │  BLOG_DB_PROVIDER    = digitalocean_db
 * │  BLOG_DB_HOST        = db-postgresql-nyc3-xxxxx.db.ondigitalocean.com
 * │  BLOG_DB_PORT        = 25060
 * │  BLOG_DB_NAME        = defaultdb
 * │  BLOG_DB_USER        = doadmin
 * │  BLOG_DB_PASSWORD    = your_password
 * │  BLOG_DB_SSL         = true             ← required for DigitalOcean
 * │  BLOG_DB_CA_CERT     = -----BEGIN CERTIFICATE-----\n...  ← optional, paste CA cert
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ┌─ AWS RDS (Postgres or MySQL) ──────────────────────────────────────────────
 * │  BLOG_DB_PROVIDER = aws_rds
 * │  BLOG_DB_HOST     = mydb.xxxxxxxxx.us-east-1.rds.amazonaws.com
 * │  BLOG_DB_PORT     = 5432               ← 5432 for Postgres, 3306 for MySQL
 * │  BLOG_DB_NAME     = mydb
 * │  BLOG_DB_USER     = admin
 * │  BLOG_DB_PASSWORD = your_password
 * │  BLOG_DB_SSL      = true               ← recommended for RDS
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ┌─ MONGODB ATLAS (or self-hosted) ───────────────────────────────────────────
 * │  BLOG_DB_PROVIDER          = mongodb
 * │  BLOG_DB_CONNECTION_STRING = mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/dbname?retryWrites=true&w=majority
 * │
 * │  OR if you prefer individual fields:
 * │  BLOG_MONGODB_HOST     = cluster0.xxxxx.mongodb.net
 * │  BLOG_MONGODB_PORT     = 27017          ← omit for Atlas SRV
 * │  BLOG_MONGODB_DB_NAME  = mydb
 * │  BLOG_MONGODB_USER     = myuser
 * │  BLOG_MONGODB_PASSWORD = mypassword
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ┌─ FIREBASE FIRESTORE ───────────────────────────────────────────────────────
 * │  BLOG_DB_PROVIDER           = firebase
 * │  BLOG_FIREBASE_API_KEY      = AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
 * │  BLOG_FIREBASE_PROJECT_ID   = my-project-12345
 * │  BLOG_FIREBASE_AUTH_DOMAIN  = my-project-12345.firebaseapp.com   ← optional
 * │  BLOG_FIREBASE_APP_ID       = 1:123456789:web:abcdef123456       ← optional
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * STORAGE PROVIDERS  — pick exactly ONE block
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * ┌─ CLOUDINARY ───────────────────────────────────────────────────────────────
 * │  BLOG_STORAGE_PROVIDER = cloudinary
 * │  CLOUDINARY_CLOUD_NAME = my_cloud_name
 * │  CLOUDINARY_API_KEY    = 123456789012345
 * │  CLOUDINARY_API_SECRET = abcdefghijklmnopqrstuvwxyz012345
 * │  CLOUDINARY_FOLDER     = blog            ← optional, default: "blog"
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ┌─ AWS S3 ───────────────────────────────────────────────────────────────────
 * │  BLOG_STORAGE_PROVIDER  = aws_s3
 * │  AWS_ACCESS_KEY_ID      = AKIAIOSFODNN7EXAMPLE
 * │  AWS_SECRET_ACCESS_KEY  = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
 * │  AWS_REGION             = us-east-1
 * │  AWS_BUCKET_NAME        = my-blog-bucket
 * │  AWS_S3_ACL             = public-read    ← optional, default: "public-read"
 * │  AWS_S3_PATH_PREFIX     = blog/          ← optional subfolder inside bucket
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ┌─ DIGITALOCEAN SPACES ──────────────────────────────────────────────────────
 * │  BLOG_STORAGE_PROVIDER = digitalocean_spaces
 * │  AWS_ACCESS_KEY_ID     = your_spaces_access_key
 * │  AWS_SECRET_ACCESS_KEY = your_spaces_secret_key
 * │  AWS_REGION            = nyc3             ← your Spaces region
 * │  AWS_BUCKET_NAME       = my-space-name
 * │  AWS_ENDPOINT          = nyc3.digitaloceanspaces.com   ← required for DO
 * │  AWS_S3_ACL            = public-read      ← optional
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ┌─ LOCAL FILESYSTEM  (dev only — does NOT work on Vercel) ───────────────────
 * │  BLOG_STORAGE_PROVIDER = local_storage
 * │  Files are saved to:  public/uploads/blog/
 * └────────────────────────────────────────────────────────────────────────────
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ADMIN / SECURITY
 * ═════════════════════════════════════════════════════════════════════════════
 *
 *  BLOG_ADMIN_SECRET = your_super_secret_admin_key   ← used to protect admin routes (optional)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type DbProviderType =
  | "supabase"
  | "firebase"
  | "mongodb"
  | "postgres"
  | "mysql"
  | "digitalocean_db"
  | "aws_rds";

export type StorageProviderType =
  | "cloudinary"
  | "aws_s3"
  | "digitalocean_spaces"
  | "local_storage";

export interface DbConfig {
  provider: DbProviderType | "";

  // ── Supabase ──────────────────────────────────────────────────────────────
  url: string;               // BLOG_SUPABASE_URL
  anonKey: string;           // BLOG_SUPABASE_ANON_KEY
  serviceKey: string;        // BLOG_SUPABASE_SERVICE_KEY  (optional)

  // ── SQL-based: Postgres, MySQL, DigitalOcean DB, AWS RDS ─────────────────
  host: string;              // BLOG_DB_HOST
  port: string;              // BLOG_DB_PORT
  dbName: string;            // BLOG_DB_NAME
  user: string;              // BLOG_DB_USER
  password: string;          // BLOG_DB_PASSWORD
  ssl: boolean;              // BLOG_DB_SSL
  caCert: string;            // BLOG_DB_CA_CERT  (DigitalOcean / RDS mutual TLS)

  // ── MongoDB ───────────────────────────────────────────────────────────────
  connectionString: string;  // BLOG_DB_CONNECTION_STRING  (full SRV URI)
  mongoHost: string;         // BLOG_MONGODB_HOST          (alternative to full URI)
  mongoPort: string;         // BLOG_MONGODB_PORT
  mongoDbName: string;       // BLOG_MONGODB_DB_NAME
  mongoUser: string;         // BLOG_MONGODB_USER
  mongoPassword: string;     // BLOG_MONGODB_PASSWORD

  // ── Firebase Firestore ────────────────────────────────────────────────────
  firebaseApiKey: string;    // BLOG_FIREBASE_API_KEY
  projectId: string;         // BLOG_FIREBASE_PROJECT_ID
  authDomain: string;        // BLOG_FIREBASE_AUTH_DOMAIN  (optional)
  firebaseAppId: string;     // BLOG_FIREBASE_APP_ID       (optional)
}

export interface StorageConfig {
  provider: StorageProviderType | "";

  // ── Cloudinary ────────────────────────────────────────────────────────────
  cloudName: string;         // CLOUDINARY_CLOUD_NAME
  cloudApiKey: string;       // CLOUDINARY_API_KEY
  cloudApiSecret: string;    // CLOUDINARY_API_SECRET
  cloudFolder: string;       // CLOUDINARY_FOLDER          (optional, default: "blog")

  // ── AWS S3 / DigitalOcean Spaces ─────────────────────────────────────────
  accessKey: string;         // AWS_ACCESS_KEY_ID
  secretKey: string;         // AWS_SECRET_ACCESS_KEY
  region: string;            // AWS_REGION
  bucket: string;            // AWS_BUCKET_NAME
  endpoint: string;          // AWS_ENDPOINT               (DO Spaces only)
  acl: string;               // AWS_S3_ACL                 (optional, default: "public-read")
  pathPrefix: string;        // AWS_S3_PATH_PREFIX         (optional subfolder)
}

export interface ResolvedConfig {
  db: DbConfig;
  storage: StorageConfig;
  adminSecret: string;       // BLOG_ADMIN_SECRET
}

// ── Local file reader ─────────────────────────────────────────────────────────

/**
 * Reads data/blog_system_config.json written by the setup wizard.
 * Returns empty objects when the file is absent (normal on Vercel).
 */
async function readLocalConfigFile(): Promise<{ db?: any; storage?: any }> {
  try {
    const configPath = path.join(process.cwd(), "data", "blog_system_config.json");
    const raw = await readFile(configPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ── Main resolver ─────────────────────────────────────────────────────────────

/**
 * Returns the fully-merged configuration object.
 *
 * Call once per request; it is async only because it reads the local file
 * when running in development.
 *
 * @example
 *   const { db, storage } = await resolveConfig();
 */
export async function resolveConfig(): Promise<ResolvedConfig> {
  const file = await readLocalConfigFile();
  const fdb: any = file.db      ?? {};
  const fst: any = file.storage ?? {};

  /**
   * Priority: env var → local file value → fallback
   * `fallback` is optional and defaults to "".
   */
  const pick = (envKey: string, fileValue: any, fallback = "") =>
    process.env[envKey] || String(fileValue ?? "") || fallback;

  const pickBool = (envKey: string, fileValue: any, fallback = false): boolean => {
    const v = process.env[envKey] || String(fileValue ?? "");
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
    return fallback;
  };

  // ── Database ───────────────────────────────────────────────────────────────
  const db: DbConfig = {
    provider: pick("BLOG_DB_PROVIDER", fdb.provider) as DbProviderType | "",

    // Supabase
    url:        pick("BLOG_SUPABASE_URL",          fdb.url        ),
    anonKey:    pick("BLOG_SUPABASE_ANON_KEY",      fdb.anonKey    ),
    serviceKey: pick("BLOG_SUPABASE_SERVICE_KEY",   fdb.serviceKey ),

    // SQL-based
    host:     pick("BLOG_DB_HOST",     fdb.host     ),
    port:     pick("BLOG_DB_PORT",     fdb.port     ),
    dbName:   pick("BLOG_DB_NAME",     fdb.dbName   ),
    user:     pick("BLOG_DB_USER",     fdb.user     ),
    password: pick("BLOG_DB_PASSWORD", fdb.password ),
    ssl:      pickBool("BLOG_DB_SSL",  fdb.ssl,  false),
    caCert:   pick("BLOG_DB_CA_CERT",  fdb.caCert   ),

    // MongoDB — full URI or individual fields
    connectionString: pick("BLOG_DB_CONNECTION_STRING", fdb.connectionString),
    mongoHost:        pick("BLOG_MONGODB_HOST",          fdb.mongoHost       ),
    mongoPort:        pick("BLOG_MONGODB_PORT",          fdb.mongoPort       ),
    mongoDbName:      pick("BLOG_MONGODB_DB_NAME",       fdb.mongoDbName     ),
    mongoUser:        pick("BLOG_MONGODB_USER",          fdb.mongoUser       ),
    mongoPassword:    pick("BLOG_MONGODB_PASSWORD",      fdb.mongoPassword   ),

    // Firebase
    firebaseApiKey: pick("BLOG_FIREBASE_API_KEY",     fdb.firebaseApiKey ?? fdb.apiKey ),
    projectId:      pick("BLOG_FIREBASE_PROJECT_ID",  fdb.projectId               ),
    authDomain:     pick("BLOG_FIREBASE_AUTH_DOMAIN", fdb.authDomain              ),
    firebaseAppId:  pick("BLOG_FIREBASE_APP_ID",      fdb.firebaseAppId           ),
  };

  // ── Storage ────────────────────────────────────────────────────────────────
  const storage: StorageConfig = {
    provider: pick("BLOG_STORAGE_PROVIDER", fst.provider) as StorageProviderType | "",

    // Cloudinary
    cloudName:      pick("CLOUDINARY_CLOUD_NAME",  fst.cloudName  ),
    cloudApiKey:    pick("CLOUDINARY_API_KEY",      fst.apiKey     ),
    cloudApiSecret: pick("CLOUDINARY_API_SECRET",   fst.apiSecret  ),
    cloudFolder:    pick("CLOUDINARY_FOLDER",       fst.cloudFolder, "blog"),

    // S3 / DO Spaces
    accessKey:  pick("AWS_ACCESS_KEY_ID",      fst.accessKey ),
    secretKey:  pick("AWS_SECRET_ACCESS_KEY",  fst.secretKey ),
    region:     pick("AWS_REGION",             fst.region,    "us-east-1"),
    bucket:     pick("AWS_BUCKET_NAME",        fst.bucket    ),
    endpoint:   pick("AWS_ENDPOINT",           fst.endpoint  ),
    acl:        pick("AWS_S3_ACL",             fst.acl,       "public-read"),
    pathPrefix: pick("AWS_S3_PATH_PREFIX",     fst.pathPrefix, "blog/"),
  };

  return {
    db,
    storage,
    adminSecret: pick("BLOG_ADMIN_SECRET", ""),
  };
}

/** Convenience: resolve only the DB config. */
export async function resolveDbConfig(): Promise<DbConfig> {
  return (await resolveConfig()).db;
}

/** Convenience: resolve only the storage config. */
export async function resolveStorageConfig(): Promise<StorageConfig> {
  return (await resolveConfig()).storage;
}

// ── Validation helpers ────────────────────────────────────────────────────────

/**
 * Returns true when the DB config has enough values to attempt a connection.
 * Used by the admin UI to decide whether to show the setup wizard.
 */
export function isDbConfigured(db: DbConfig): boolean {
  if (!db.provider) return false;
  switch (db.provider) {
    case "supabase":
      return !!(db.url && db.anonKey);
    case "mongodb":
      // Accept either a full URI or individual host+db+user fields
      return !!(
        db.connectionString ||
        (db.mongoHost && db.mongoDbName && db.mongoUser)
      );
    case "firebase":
      return !!(db.firebaseApiKey && db.projectId);
    case "postgres":
    case "mysql":
    case "digitalocean_db":
    case "aws_rds":
      return !!(db.host && db.dbName && db.user);
    default:
      return false;
  }
}

/**
 * Returns true when the storage config has enough values to upload files.
 */
export function isStorageConfigured(storage: StorageConfig): boolean {
  if (!storage.provider) return false;
  switch (storage.provider) {
    case "cloudinary":
      return !!(storage.cloudName && storage.cloudApiKey && storage.cloudApiSecret);
    case "aws_s3":
      return !!(storage.accessKey && storage.secretKey && storage.bucket && storage.region);
    case "digitalocean_spaces":
      return !!(storage.accessKey && storage.secretKey && storage.bucket && storage.endpoint);
    case "local_storage":
      return true;
    default:
      return false;
  }
}

/**
 * Returns a human-readable summary of what is and isn't configured.
 * Useful for logging on startup or in a health-check endpoint.
 *
 * @example
 *   console.log(getConfigStatus(db, storage));
 */
export function getConfigStatus(db: DbConfig, storage: StorageConfig): string {
  const dbOk      = isDbConfigured(db);
  const storageOk = isStorageConfigured(storage);
  const lines = [
    `[BlogSystem] DB       : ${db.provider || "not set"} — ${dbOk ? "✓ configured" : "✗ missing required fields"}`,
    `[BlogSystem] Storage  : ${storage.provider || "not set"} — ${storageOk ? "✓ configured" : "✗ missing required fields"}`,
  ];
  if (!dbOk) {
    lines.push(`[BlogSystem] → Set BLOG_DB_PROVIDER and the matching credentials in your environment variables.`);
  }
  if (!storageOk) {
    lines.push(`[BlogSystem] → Set BLOG_STORAGE_PROVIDER and the matching credentials in your environment variables.`);
  }
  return lines.join("\n");
}