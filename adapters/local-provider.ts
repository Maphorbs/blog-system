import { DatabaseProvider, StorageProvider, BlogPost, EventItem } from "../types";

/**
 * Persists data in the browser's localStorage.
 * Perfect for testing and offline-first scenarios.
 */
export class LocalStorageProvider implements DatabaseProvider, StorageProvider {
  private DB_KEY = "blog_system_local_db";
  private STORAGE_KEY = "blog_system_local_files";

  private getData() {
    const data = localStorage.getItem(this.DB_KEY);
    return data ? JSON.parse(data) : { blogs: [], events: [] };
  }

  private saveData(data: any) {
    localStorage.setItem(this.DB_KEY, JSON.stringify(data));
  }

  // ─── DATABASE METHODS ───────────────────────────────────────────────────────

  async getBlogs(): Promise<BlogPost[]> {
    return this.getData().blogs;
  }

  async getBlogById(id: string): Promise<BlogPost | null> {
    return this.getData().blogs.find((p: any) => p.id === id) || null;
  }

  async createBlog(blog: Omit<BlogPost, "id">): Promise<BlogPost> {
    const data = this.getData();
    const newBlog = { 
      id: Math.random().toString(36).substr(2, 9), 
      ...blog,
      date: new Date().toLocaleDateString()
    };
    data.blogs.push(newBlog);
    this.saveData(data);
    return newBlog as BlogPost;
  }

  async updateBlog(id: string, blog: Partial<BlogPost>): Promise<BlogPost> {
    const data = this.getData();
    const index = data.blogs.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      data.blogs[index] = { ...data.blogs[index], ...blog };
      this.saveData(data);
      return data.blogs[index];
    }
    throw new Error("Blog not found");
  }

  async deleteBlog(id: string): Promise<void> {
    const data = this.getData();
    data.blogs = data.blogs.filter((p: any) => p.id !== id);
    this.saveData(data);
  }

  async getEvents(): Promise<EventItem[]> {
    return this.getData().events;
  }

  async getEventById(id: string): Promise<EventItem | null> {
    return this.getData().events.find((e: any) => e.id === id) || null;
  }

  async createEvent(event: Omit<EventItem, "id">): Promise<EventItem> {
    const data = this.getData();
    const newEvent = { id: Math.random().toString(36).substr(2, 9), ...event };
    data.events.push(newEvent);
    this.saveData(data);
    return newEvent as EventItem;
  }

  async updateEvent(id: string, event: Partial<EventItem>): Promise<EventItem> {
    const data = this.getData();
    const index = data.events.findIndex((e: any) => e.id === id);
    if (index !== -1) {
      data.events[index] = { ...data.events[index], ...event };
      this.saveData(data);
      return data.events[index];
    }
    throw new Error("Event not found");
  }

  async deleteEvent(id: string): Promise<void> {
    const data = this.getData();
    data.events = data.events.filter((e: any) => e.id !== id);
    this.saveData(data);
  }

  // ─── STORAGE METHODS ────────────────────────────────────────────────────────

  async uploadFile(file: File, path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // In a real local storage we might store it in another key
        // but for testing we just return the data URL
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async deleteFile(path: string): Promise<void> {
    console.log("Local Storage Delete:", path);
  }
}
