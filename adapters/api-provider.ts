import { DatabaseProvider, StorageProvider, BlogPost, EventItem } from "../types";

/**
 * A provider that connects to an external REST API.
 * This is how the system "plugs in" to your backend.
 */
export class ApiDatabaseProvider implements DatabaseProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async fetchApi(path: string, options: RequestInit = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    return res.json();
  }

  async getBlogs(): Promise<BlogPost[]> {
    return this.fetchApi("/blogs");
  }

  async getBlogById(id: string): Promise<BlogPost | null> {
    return this.fetchApi(`/blogs/${id}`);
  }

  async createBlog(blog: Omit<BlogPost, "id">): Promise<BlogPost> {
    return this.fetchApi("/blogs", {
      method: "POST",
      body: JSON.stringify(blog),
    });
  }

  async updateBlog(id: string, blog: Partial<BlogPost>): Promise<BlogPost> {
    return this.fetchApi(`/blogs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(blog),
    });
  }

  async deleteBlog(id: string): Promise<void> {
    await this.fetchApi(`/blogs/${id}`, { method: "DELETE" });
  }

  async getEvents(): Promise<EventItem[]> {
    return this.fetchApi("/events");
  }

  async getEventById(id: string): Promise<EventItem | null> {
    return this.fetchApi(`/events/${id}`);
  }

  async createEvent(event: Omit<EventItem, "id">): Promise<EventItem> {
    return this.fetchApi("/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
  }

  async updateEvent(id: string, event: Partial<EventItem>): Promise<EventItem> {
    return this.fetchApi(`/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(event),
    });
  }

  async deleteEvent(id: string): Promise<void> {
    await this.fetchApi(`/events/${id}`, { method: "DELETE" });
  }
}
