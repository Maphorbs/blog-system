import { DatabaseProvider, StorageProvider, BlogPost, EventItem } from "../types";

/**
 * A provider that uses an in-memory or passed-in data set.
 * Good for testing or static sites.
 */
export class MemoryDatabaseProvider implements DatabaseProvider {
  private blogs: BlogPost[];
  private events: EventItem[];

  constructor(initialData: { blogs?: BlogPost[]; events?: EventItem[] } = {}) {
    this.blogs = initialData.blogs || [];
    this.events = initialData.events || [];
  }

  async getBlogs(): Promise<BlogPost[]> {
    return this.blogs;
  }

  async getBlogById(id: string): Promise<BlogPost | null> {
    return this.blogs.find(p => p.id === id) || null;
  }

  async createBlog(blog: Omit<BlogPost, "id">): Promise<BlogPost> {
    const newBlog = { id: Math.random().toString(), ...blog };
    this.blogs.push(newBlog as BlogPost);
    return newBlog as BlogPost;
  }

  async updateBlog(id: string, blog: Partial<BlogPost>): Promise<BlogPost> {
    const index = this.blogs.findIndex(p => p.id === id);
    if (index !== -1) {
      this.blogs[index] = { ...this.blogs[index], ...blog };
      return this.blogs[index];
    }
    throw new Error("Blog not found");
  }

  async deleteBlog(id: string): Promise<void> {
    this.blogs = this.blogs.filter(p => p.id !== id);
  }

  async getEvents(): Promise<EventItem[]> {
    return this.events;
  }

  async getEventById(id: string): Promise<EventItem | null> {
    return this.events.find(e => e.id === id) || null;
  }

  async createEvent(event: Omit<EventItem, "id">): Promise<EventItem> {
    const newEvent = { id: Math.random().toString(), ...event };
    this.events.push(newEvent as EventItem);
    return newEvent as EventItem;
  }

  async updateEvent(id: string, event: Partial<EventItem>): Promise<EventItem> {
    const index = this.events.findIndex(e => e.id === id);
    if (index !== -1) {
      this.events[index] = { ...this.events[index], ...event };
      return this.events[index];
    }
    throw new Error("Event not found");
  }

  async deleteEvent(id: string): Promise<void> {
    this.events = this.events.filter(e => e.id !== id);
  }
}

export class MockStorageProvider implements StorageProvider {
  async uploadFile(file: File, path: string): Promise<string> {
    return `mock-url-for-${file.name}`;
  }

  async deleteFile(path: string): Promise<void> {
    console.log("Mock Delete:", path);
  }
}
