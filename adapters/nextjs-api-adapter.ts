import { BlogSystemAdapter } from '../types';

/**
 * An adapter that uses Next.js API routes (fetch) to interact with the backend.
 * This adapter expects the /api/admin/* endpoints to exist in the host application.
 */
export class NextJsApiAdapter implements BlogSystemAdapter {
  async getConfig(): Promise<any> {
    const res = await fetch("/api/admin/config");
    if (!res.ok) throw new Error("Failed to fetch config");
    return res.json();
  }

  async saveConfig(config: any): Promise<boolean> {
    const res = await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return res.ok;
  }

  async getBlogs(): Promise<any[]> {
    const res = await fetch("/api/admin/blogs");
    if (!res.ok) throw new Error("Failed to fetch blogs");
    const data = await res.json();
    return data.blogs || [];
  }

  async getBlogById(id: string): Promise<any> {
    const res = await fetch(`/api/admin/blogs/${id}`);
    if (!res.ok) throw new Error("Failed to fetch blog");
    const data = await res.json();
    return data.blog;
  }

  async createBlog(data: any): Promise<any> {
    const res = await fetch("/api/admin/blogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create blog");
    const json = await res.json();
    return json.blog;
  }

  async updateBlog(id: string, data: any): Promise<any> {
    const res = await fetch(`/api/admin/blogs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update blog");
    const json = await res.json();
    return json.blog;
  }

  async deleteBlog(id: string): Promise<boolean> {
    const res = await fetch(`/api/admin/blogs/${id}`, { method: "DELETE" });
    return res.ok;
  }

  async getEvents(): Promise<any[]> {
    const res = await fetch("/api/admin/events");
    if (!res.ok) throw new Error("Failed to fetch events");
    const data = await res.json();
    return data.events || [];
  }

  async getEventById(id: string): Promise<any> {
    const res = await fetch(`/api/admin/events/${id}`);
    if (!res.ok) throw new Error("Failed to fetch event");
    const data = await res.json();
    return data.event;
  }

  async createEvent(data: any): Promise<any> {
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create event");
    const json = await res.json();
    return json.event;
  }

  async updateEvent(id: string, data: any): Promise<any> {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update event");
    const json = await res.json();
    return json.event;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    return res.ok;
  }

  async getCategories(): Promise<any[]> {
    const res = await fetch("/api/admin/categories");
    if (!res.ok) throw new Error("Failed to fetch categories");
    const data = await res.json();
    return data.categories || [];
  }

  async createCategory(name: string, type: 'blog' | 'event'): Promise<any> {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    if (!res.ok) throw new Error("Failed to create category");
    const json = await res.json();
    return json.category;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    return res.ok;
  }

  async uploadFile(file: File, provider?: string, config?: any): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    if (provider) formData.append("provider", provider);
    if (config) formData.append("config", JSON.stringify(config));

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url;
  }
}
