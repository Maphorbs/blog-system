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

function createProvider(providerType: string, config?: any): BackendDbProvider {
  switch (providerType) {
    case "postgres":
    case "aws_rds":
    case "digitalocean_db":
      return new PostgresProvider();
    case "supabase":
      return config ? new SupabaseProvider(config) : new SupabaseProvider();
    case "mongodb":
      return config ? new MongoDbProvider(config) : new MongoDbProvider();
    case "mysql":
      return config ? new MySqlProvider(config) : new MySqlProvider();
    case "sqlite":
      return config ? new SqliteProvider(config) : new SqliteProvider();
    case "firebase":
      return config ? new FirebaseProvider(config) : new FirebaseProvider();
    default:
      throw new Error(`Unsupported database provider: ${providerType}`);
  }
}

export async function getActiveProvider(): Promise<BackendDbProvider> {
  if (activeProvider) return activeProvider;

  // Always resolve via env-config — works both locally (JSON file) and on Vercel (env vars)
  const dbConfig = await resolveDbConfig();

  if (!dbConfig.provider) {
    throw new Error("Database is not configured. Please set BLOG_DB_PROVIDER and matching credentials.");
  }

  activeProvider = createProvider(dbConfig.provider);
  return activeProvider;
}

/** Reset the cached provider (used after re-configuration) */
export function resetActiveProvider() {
  activeProvider = null;
}

// ── Wrapper functions ─────────────────────────────────────────────────────────

export async function initializeDatabase(config: any): Promise<boolean> {
  const providerType = config?.provider;
  if (!providerType) throw new Error("No provider specified in config.");

  const provider = createProvider(providerType, config);
  const success = await provider.initializeDatabase(config);
  if (success) {
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