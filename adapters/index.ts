import { DatabaseProvider, StorageProvider } from "../types";
import { ApiDatabaseProvider } from "./api-provider";
import { SupabaseProvider } from "../db-providers";
import { LocalStorageProvider } from "./local-provider";

export type ProviderType = "api" | "supabase" | "firebase" | "mongodb" | "postgres" | "mysql" | "local";

export class ProviderFactory {
  static createDatabaseProvider(type: ProviderType, config: any): DatabaseProvider {
    switch (type) {
      case "supabase":
        return new SupabaseProvider({ url: config.url, anonKey: config.anonKey });
      case "api":
        return new ApiDatabaseProvider(config.baseUrl, config.apiKey);
      case "local":
        return new LocalStorageProvider();
      default:
        console.warn(`Provider ${type} not fully implemented, falling back to Local.`);
        return new LocalStorageProvider();
    }
  }

  static createStorageProvider(type: ProviderType, config: any): StorageProvider {
    return new LocalStorageProvider();
  }
}
