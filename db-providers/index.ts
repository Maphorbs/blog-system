import { BackendDbProvider } from "./types";
import { PostgresProvider } from "./postgres";
import { SupabaseProvider } from "./supabase";
import { MongoDbProvider } from "./mongodb";
import { MySqlProvider } from "./mysql";
import { SqliteProvider } from "./sqlite";
import { FirebaseProvider } from "./firebase";
import { readFile } from "fs/promises";
import path from "path";

export * from "./types";
export { PostgresProvider } from "./postgres";
export { SupabaseProvider } from "./supabase";
export { MongoDbProvider } from "./mongodb";
export { MySqlProvider } from "./mysql";
export { SqliteProvider } from "./sqlite";
export { FirebaseProvider } from "./firebase";

let activeProvider: BackendDbProvider | null = null;

async function getDbConfig() {
  try {
    const configPath = path.join(process.cwd(), "data", "blog_system_config.json");
    const data = await readFile(configPath, "utf-8");
    const config = JSON.parse(data);
    return config.db;
  } catch (e) {
    return null;
  }
}

export async function getActiveProvider(): Promise<BackendDbProvider> {
  if (activeProvider) return activeProvider;

  const dbConfig = await getDbConfig();
  if (!dbConfig) {
    throw new Error("Database is not configured. Please complete the admin setup.");
  }

  const providerType = dbConfig.provider;

  switch (providerType) {
    case "postgres":
    case "aws_rds":
    case "digitalocean_db":
      activeProvider = new PostgresProvider();
      break;
    case "supabase":
      activeProvider = new SupabaseProvider();
      break;
    case "mongodb":
      activeProvider = new MongoDbProvider();
      break;
    case "mysql":
      activeProvider = new MySqlProvider();
      break;
    case "sqlite":
      activeProvider = new SqliteProvider();
      break;
    case "firebase":
      activeProvider = new FirebaseProvider();
      break;
    default:
      throw new Error(`Unsupported database provider: ${providerType}`);
  }

  return activeProvider;
}

// Wrapper functions for backward compatibility and clean API routes
export async function initializeDatabase(config: any): Promise<boolean> {
  const providerType = config?.provider || "postgres";
  let provider: BackendDbProvider;

  switch (providerType) {
    case "postgres":
    case "aws_rds":
    case "digitalocean_db":
      provider = new PostgresProvider();
      break;
    case "supabase":
      provider = new SupabaseProvider();
      break;
    case "mongodb":
      provider = new MongoDbProvider();
      break;
    case "mysql":
      provider = new MySqlProvider();
      break;
    case "sqlite":
      provider = new SqliteProvider();
      break;
    case "firebase":
      provider = new FirebaseProvider();
      break;
    default:
      throw new Error(`Unsupported database provider: ${providerType}`);
  }

  const success = await provider.initializeDatabase(config);
  if (success) {
    activeProvider = provider; // Set as active
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
