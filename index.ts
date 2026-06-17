import { BlogSystemConfig, BlogPost, EventItem } from "./types";

export class BlogSystem {
  private db;
  private storage;

  constructor(config: BlogSystemConfig) {
    this.db = config.db;
    this.storage = config.storage;
  }

  async getAllBlogs() {
    return this.db.getBlogs();
  }

  async getBlog(id: string) {
    return this.db.getBlogById(id);
  }

  async publishBlog(blogData: Omit<BlogPost, "id" | "image">, imageFile?: File) {
    let imageUrl = "";
    if (imageFile) {
      imageUrl = await this.storage.uploadFile(imageFile, `blogs/${Date.now()}_${imageFile.name}`);
    }

    return this.db.createBlog({
      ...blogData,
      image: imageUrl,
    });
  }

  async removeBlog(id: string) {
    return this.db.deleteBlog(id);
  }

  async getAllEvents() {
    return this.db.getEvents();
  }

  async getEvent(id: string) {
    return this.db.getEventById(id);
  }

  async scheduleEvent(eventData: Omit<EventItem, "id" | "image">, imageFile?: File) {
    let imageUrl = "";
    if (imageFile) {
      imageUrl = await this.storage.uploadFile(imageFile, `events/${Date.now()}_${imageFile.name}`);
    }

    return this.db.createEvent({
      ...eventData,
      image: imageUrl,
    });
  }
}

// Client UI & Adapter Exports
export { BlogAdmin } from "./admin";
export { NextJsApiAdapter } from "./adapters/nextjs-api-adapter";

// BlogRenderer Exports (for consumers rendering saved post content)
export { BlogRenderer, getBlogRendererStyles } from "./admin/BlogRenderer";

// Types Export
export * from "./types";