import { BackendDbProvider } from "./types";
import { PostgresProvider } from "./postgres";
import { SupabaseProvider } from "./supabase";
import { MongoDbProvider } from "./mongodb";
import { MySqlProvider } from "./mysql";
import { SqliteProvider } from "./sqlite";
import { FirebaseProvider } from "./firebase";
import { resolveDbConfig } from "../env-config";

export * from "./types";
export { PostgresProvider } from "./postgres";
export { SupabaseProvider } from "./supabase";
export { MongoDbProvider } from "./mongodb";
export { MySqlProvider } from "./mysql";
export { SqliteProvider } from "./sqlite";
export { FirebaseProvider } from "./firebase";

let activeProvider: BackendDbProvider | null = null;

// ── Provider factory ──────────────────────────────────────────────────────────
// Always pass config so providers never fall back to reading the local JSON
// file (which doesn't exist on Vercel). Every provider constructor accepts an
// optional config argument and uses it in preference to the file.

function createProvider(providerType: string, config: any): BackendDbProvider {
  switch (providerType) {
    case "postgres":
    case "aws_rds":
    case "digitalocean_db":
      return new PostgresProvider(config);
    case "supabase":
      return new SupabaseProvider(config);
    case "mongodb":
      return new MongoDbProvider(config);
    case "mysql":
      return new MySqlProvider(config);
    case "sqlite":
      return new SqliteProvider(config);
    case "firebase":
      return new FirebaseProvider(config);
    default:
      throw new Error(`Unsupported database provider: ${providerType}`);
  }
}

// ── Active provider cache ─────────────────────────────────────────────────────
// getActiveProvider() is called by all wrapper functions (getBlogs, etc.).
// On Vercel it resolves config from env vars via resolveDbConfig() and creates
// a provider with the full config object — no file reading involved.

export async function getActiveProvider(): Promise<BackendDbProvider> {
  if (activeProvider) return activeProvider;

  const dbConfig = await resolveDbConfig();

  if (!dbConfig.provider) {
    throw new Error(
      "Database is not configured. " +
      "Set BLOG_DB_PROVIDER and the matching credentials as environment variables."
    );
  }

  // KEY FIX: pass dbConfig (not just the type string) so the provider
  // constructor receives the full credentials and never tries to read the
  // local JSON file.
  activeProvider = createProvider(dbConfig.provider, dbConfig);
  return activeProvider;
}

/** Reset the cached provider — called after re-configuration or credential change */
export function resetActiveProvider() {
  activeProvider = null;
}

// ── Wrapper functions ─────────────────────────────────────────────────────────

export async function initializeDatabase(config: any): Promise<boolean> {
  const providerType = config?.provider;
  if (!providerType) throw new Error("No provider specified in config.");

  // Always pass the full config to the provider constructor
  const provider = createProvider(providerType, config);
  const success  = await provider.initializeDatabase(config);

  if (success) {
    // Replace the cached active provider so subsequent reads use the new one
    activeProvider = provider;
  }
  return success;
}

export async function getBlogs() {
  const provider = await getActiveProvider();
  return provider.getBlogs();
}

export async function getBlogById(id: string) {
  const provider = await getActiveProvider();
  return provider.getBlogById(id);
}

export async function createBlog(blog: any) {
  const provider = await getActiveProvider();
  return provider.createBlog(blog);
}

export async function updateBlog(id: string, blog: any) {
  const provider = await getActiveProvider();
  return provider.updateBlog(id, blog);
}

export async function deleteBlog(id: string) {
  const provider = await getActiveProvider();
  return provider.deleteBlog(id);
}

export async function getEvents() {
  const provider = await getActiveProvider();
  return provider.getEvents();
}

export async function getEventById(id: string) {
  const provider = await getActiveProvider();
  return provider.getEventById(id);
}

export async function createEvent(event: any) {
  const provider = await getActiveProvider();
  return provider.createEvent(event);
}

export async function updateEvent(id: string, event: any) {
  const provider = await getActiveProvider();
  return provider.updateEvent(id, event);
}

export async function deleteEvent(id: string) {
  const provider = await getActiveProvider();
  return provider.deleteEvent(id);
}

export async function getCategories() {
  const provider = await getActiveProvider();
  return provider.getCategories();
}

export async function createCategory(name: string, type: 'blog' | 'event') {
  const provider = await getActiveProvider();
  return provider.createCategory(name, type);
}

export async function deleteCategory(id: string) {
  const provider = await getActiveProvider();
  return provider.deleteCategory(id);
}