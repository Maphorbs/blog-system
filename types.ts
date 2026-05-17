export interface BlogSystemAdapter {
  // Config
  getConfig(): Promise<any>;
  saveConfig(config: any): Promise<boolean>;

  // Blogs
  getBlogs(): Promise<any[]>;
  getBlogById(id: string): Promise<any>;
  createBlog(data: any): Promise<any>;
  updateBlog(id: string, data: any): Promise<any>;
  deleteBlog(id: string): Promise<boolean>;

  // Events
  getEvents(): Promise<any[]>;
  getEventById(id: string): Promise<any>;
  createEvent(data: any): Promise<any>;
  updateEvent(id: string, data: any): Promise<any>;
  deleteEvent(id: string): Promise<boolean>;

  // Categories
  getCategories(): Promise<any[]>;
  createCategory(name: string, type: 'blog' | 'event'): Promise<any>;
  deleteCategory(id: string): Promise<boolean>;

  // Media
  uploadFile(file: File, provider?: string, config?: any): Promise<string>;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  image: string;
  readTime?: string;
  author?: string;
  status: string;
  isFeatured?: boolean;
  created_at?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  content?: string;
  date: string;
  time: string;
  location: string;
  category: string;
  status: string;
  image: string;
  attendees?: string;
  href?: string;
  isFeatured?: boolean;
  created_at?: string;
}

export interface DatabaseProvider {
  getBlogs(): Promise<BlogPost[]>;
  getBlogById(id: string): Promise<BlogPost | null>;
  createBlog?(blog: Partial<BlogPost>): Promise<BlogPost>;
  updateBlog?(id: string, blog: Partial<BlogPost>): Promise<BlogPost>;
  deleteBlog?(id: string): Promise<boolean | void>;

  getEvents(): Promise<EventItem[]>;
  getEventById(id: string): Promise<EventItem | null>;
  createEvent?(event: Partial<EventItem>): Promise<EventItem>;
  updateEvent?(id: string, event: Partial<EventItem>): Promise<EventItem>;
  deleteEvent?(id: string): Promise<boolean | void>;
}

export interface StorageProvider {
  uploadFile(file: File, path: string): Promise<string>;
  deleteFile(path: string): Promise<any>;
}

export interface BlogSystemConfig {
  db: any;
  storage: any;
}
