import { BlogPost, EventItem } from "../types";

export interface BackendDbProvider {
  initializeDatabase(config: any): Promise<boolean>;

  getBlogs(): Promise<BlogPost[]>;
  getBlogById(id: string): Promise<BlogPost | null>;
  createBlog(blog: Partial<BlogPost>): Promise<BlogPost>;
  updateBlog(id: string, blog: Partial<BlogPost>): Promise<BlogPost>;
  deleteBlog(id: string): Promise<boolean>;

  getEvents(): Promise<EventItem[]>;
  getEventById(id: string): Promise<EventItem | null>;
  createEvent(event: Partial<EventItem>): Promise<EventItem>;
  updateEvent(id: string, event: Partial<EventItem>): Promise<EventItem>;
  deleteEvent(id: string): Promise<boolean>;

  getCategories(): Promise<any[]>;
  createCategory(name: string, type: 'blog' | 'event'): Promise<any>;
  deleteCategory(id: string): Promise<boolean>;
}
