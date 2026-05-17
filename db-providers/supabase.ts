import { readFile } from 'fs/promises';
import path from 'path';
import { BackendDbProvider } from './types';
import { BlogPost, EventItem } from '../types';

export class SupabaseProvider implements BackendDbProvider {
  private url: string = "";
  private key: string = "";
  private isInitialized = false;

  constructor(config?: any) {
    if (config) {
      this.url = config.url || config.host || "";
      this.key = config.anonKey || config.password || "";
      this.isInitialized = true;
    }
  }

  private async getClient() {
    if (this.isInitialized) return;

    try {
      const configPath = path.join(process.cwd(), "data", "blog_system_config.json");
      const data = await readFile(configPath, "utf-8");
      const config = JSON.parse(data);
      this.url = config.db.host || config.db.url || "";
      this.key = config.db.password || config.db.anonKey || "";
      this.isInitialized = true;
    } catch (e) {
      throw new Error("Supabase is not configured. Please complete the admin setup.");
    }
  }

  private async supabaseFetch(table: string, method: string = "GET", body?: any) {
    await this.getClient();
    
    const headers: any = {
      "apikey": this.key,
      "Authorization": `Bearer ${this.key}`,
      "Content-Type": "application/json",
    };

    if (method !== "GET" && method !== "DELETE") {
      headers["Prefer"] = "return=representation";
    }

    const res = await fetch(`${this.url}/rest/v1/${table}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase error: ${errText}`);
    }

    if (method === "DELETE") return true;
    return res.json();
  }

  async initializeDatabase(config: any): Promise<boolean> {
    this.url = config.host || config.url || "";
    this.key = config.password || config.anonKey || "";
    this.isInitialized = true;

    // Test connection
    try {
      await this.supabaseFetch("blogs?limit=1");
      return true;
    } catch (e) {
      console.warn("Could not verify Supabase schema. Make sure 'blogs', 'events', and 'categories' tables are set up in Supabase.");
      return true; // We return true so setup completes, but warning is logged
    }
  }

  async getBlogs(): Promise<BlogPost[]> {
    return this.supabaseFetch("blogs");
  }

  async getBlogById(id: string): Promise<BlogPost | null> {
    const data = await this.supabaseFetch(`blogs?id=eq.${id}`);
    return data[0] || null;
  }

  async createBlog(blog: Partial<BlogPost>): Promise<BlogPost> {
    const data = await this.supabaseFetch("blogs", "POST", blog);
    return data[0];
  }

  async updateBlog(id: string, blog: Partial<BlogPost>): Promise<BlogPost> {
    const data = await this.supabaseFetch(`blogs?id=eq.${id}`, "PATCH", blog);
    return data[0];
  }

  async deleteBlog(id: string): Promise<boolean> {
    await this.supabaseFetch(`blogs?id=eq.${id}`, "DELETE");
    return true;
  }

  async getEvents(): Promise<EventItem[]> {
    return this.supabaseFetch("events");
  }

  async getEventById(id: string): Promise<EventItem | null> {
    const data = await this.supabaseFetch(`events?id=eq.${id}`);
    return data[0] || null;
  }

  async createEvent(event: Partial<EventItem>): Promise<EventItem> {
    const data = await this.supabaseFetch("events", "POST", event);
    return data[0];
  }

  async updateEvent(id: string, event: Partial<EventItem>): Promise<EventItem> {
    const data = await this.supabaseFetch(`events?id=eq.${id}`, "PATCH", event);
    return data[0];
  }

  async deleteEvent(id: string): Promise<boolean> {
    await this.supabaseFetch(`events?id=eq.${id}`, "DELETE");
    return true;
  }

  async getCategories(): Promise<any[]> {
    try {
      return await this.supabaseFetch("categories");
    } catch (e) {
      return [];
    }
  }

  async createCategory(name: string, type: 'blog' | 'event'): Promise<any> {
    const data = await this.supabaseFetch("categories", "POST", { name, type });
    return data[0];
  }

  async deleteCategory(id: string): Promise<boolean> {
    await this.supabaseFetch(`categories?id=eq.${id}`, "DELETE");
    return true;
  }
}
