import { readFile } from 'fs/promises';
import path from 'path';
import { BackendDbProvider } from './types';
import { BlogPost, EventItem } from '../types';

const MONGO_MODULE = 'mongodb';

export class MongoDbProvider implements BackendDbProvider {
  private client: any = null;
  private db: any = null;
  private config: any = null;

  constructor(config?: any) {
    if (config) {
      this.config = config;
    }
  }

  private async getDb() {
    if (this.db) return this.db;

    if (!this.config) {
      try {
        const configPath = path.join(process.cwd(), "data", "blog_system_config.json");
        const data = await readFile(configPath, "utf-8");
        const fullConfig = JSON.parse(data);
        this.config = fullConfig.db;
      } catch (e) {
        throw new Error("MongoDB is not configured. Please complete the admin setup.");
      }
    }

    try {
      const { MongoClient } = await import(MONGO_MODULE);
      
      let uri = "";
      if (this.config.host && (this.config.host.startsWith("mongodb://") || this.config.host.startsWith("mongodb+srv://"))) {
        uri = this.config.host;
      } else {
        const portStr = this.config.port ? `:${this.config.port}` : '';
        const authStr = this.config.user ? `${encodeURIComponent(this.config.user)}:${encodeURIComponent(this.config.password || '')}@` : '';
        uri = `mongodb://${authStr}${this.config.host || 'localhost'}${portStr}/${this.config.dbName || 'blog_system'}`;
      }

      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db(this.config.dbName || 'blog_system');
      return this.db;
    } catch (e: any) {
      throw new Error(`Failed to connect to MongoDB: ${e.message}`);
    }
  }

  async initializeDatabase(config: any): Promise<boolean> {
    this.config = config;
    const db = await this.getDb();
    
    const collections = await db.listCollections().toArray();
    const names = collections.map((c: any) => c.name);

    if (!names.includes('blogs')) {
      await db.createCollection('blogs');
    }
    if (!names.includes('events')) {
      await db.createCollection('events');
    }
    if (!names.includes('categories')) {
      await db.createCollection('categories');
      
      const categoriesCol = db.collection('categories');
      const defaultBlogs = ['Politics', 'Programs', 'News', 'Economy', 'Community'];
      const defaultEvents = ['Past', 'Upcoming', 'Going on'];
      
      const seedData = [
        ...defaultBlogs.map(name => ({ name, type: 'blog', created_at: new Date().toISOString() })),
        ...defaultEvents.map(name => ({ name, type: 'event', created_at: new Date().toISOString() }))
      ];
      await categoriesCol.insertMany(seedData);
    }
    return true;
  }

  async getBlogs(): Promise<BlogPost[]> {
    const db = await this.getDb();
    const blogs = await db.collection('blogs').find().sort({ created_at: -1 }).toArray();
    return blogs.map((b: any) => ({ ...b, id: b._id.toString() }));
  }

  async getBlogById(id: string): Promise<BlogPost | null> {
    const db = await this.getDb();
    const { ObjectId } = await import(MONGO_MODULE);
    try {
      const blog = await db.collection('blogs').findOne({ _id: new ObjectId(id) });
      if (!blog) return null;
      return { ...blog, id: blog._id.toString() };
    } catch (e) {
      return null;
    }
  }

  async createBlog(blog: Partial<BlogPost>): Promise<BlogPost> {
    const db = await this.getDb();
    const blogsCol = db.collection('blogs');

    if (blog.isFeatured) {
      await blogsCol.updateMany({}, { $set: { isFeatured: false } });
    }

    const doc = {
      ...blog,
      date: blog.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: blog.status || 'Live',
      isFeatured: blog.isFeatured || false,
      created_at: new Date().toISOString()
    };

    const res = await blogsCol.insertOne(doc);
    return { ...doc, id: res.insertedId.toString() } as BlogPost;
  }

  async updateBlog(id: string, blog: Partial<BlogPost>): Promise<BlogPost> {
    const db = await this.getDb();
    const { ObjectId } = await import(MONGO_MODULE);
    const blogsCol = db.collection('blogs');

    if (blog.isFeatured) {
      await blogsCol.updateMany({ _id: { $ne: new ObjectId(id) } }, { $set: { isFeatured: false } });
    }

    const { id: _, ...updateData } = blog as any;
    await blogsCol.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    const updated = await blogsCol.findOne({ _id: new ObjectId(id) });
    return { ...updated, id: updated._id.toString() } as BlogPost;
  }

  async deleteBlog(id: string): Promise<boolean> {
    const db = await this.getDb();
    const { ObjectId } = await import(MONGO_MODULE);
    const res = await db.collection('blogs').deleteOne({ _id: new ObjectId(id) });
    return res.deletedCount > 0;
  }

  async getEvents(): Promise<EventItem[]> {
    const db = await this.getDb();
    const events = await db.collection('events').find().sort({ created_at: -1 }).toArray();
    return events.map((e: any) => ({ ...e, id: e._id.toString() }));
  }

  async getEventById(id: string): Promise<EventItem | null> {
    const db = await this.getDb();
    const { ObjectId } = await import(MONGO_MODULE);
    try {
      const event = await db.collection('events').findOne({ _id: new ObjectId(id) });
      if (!event) return null;
      return { ...event, id: event._id.toString() };
    } catch (e) {
      return null;
    }
  }

  async createEvent(event: Partial<EventItem>): Promise<EventItem> {
    const db = await this.getDb();
    const eventsCol = db.collection('events');

    if (event.isFeatured) {
      await eventsCol.updateMany({}, { $set: { isFeatured: false } });
    }

    const doc = {
      ...event,
      content: event.content || '',
      date: event.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: event.status || 'Live',
      attendees: event.attendees || '',
      href: event.href || '',
      isFeatured: event.isFeatured || false,
      created_at: new Date().toISOString()
    };

    const res = await eventsCol.insertOne(doc);
    return { ...doc, id: res.insertedId.toString() } as EventItem;
  }

  async updateEvent(id: string, event: Partial<EventItem>): Promise<EventItem> {
    const db = await this.getDb();
    const { ObjectId } = await import(MONGO_MODULE);
    const eventsCol = db.collection('events');

    if (event.isFeatured) {
      await eventsCol.updateMany({ _id: { $ne: new ObjectId(id) } }, { $set: { isFeatured: false } });
    }

    const { id: _, ...updateData } = event as any;
    await eventsCol.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    const updated = await eventsCol.findOne({ _id: new ObjectId(id) });
    return { ...updated, id: updated._id.toString() } as EventItem;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const db = await this.getDb();
    const { ObjectId } = await import(MONGO_MODULE);
    const res = await db.collection('events').deleteOne({ _id: new ObjectId(id) });
    return res.deletedCount > 0;
  }

  async getCategories(): Promise<any[]> {
    try {
      const db = await this.getDb();
      const categories = await db.collection('categories').find().sort({ type: 1, created_at: 1 }).toArray();
      return categories.map((c: any) => ({ ...c, id: c._id.toString() }));
    } catch (e) {
      return [];
    }
  }

  async createCategory(name: string, type: 'blog' | 'event'): Promise<any> {
    const db = await this.getDb();
    const doc = { name, type, created_at: new Date().toISOString() };
    const res = await db.collection('categories').insertOne(doc);
    return { ...doc, id: res.insertedId.toString() };
  }

  async deleteCategory(id: string): Promise<boolean> {
    const db = await this.getDb();
    const { ObjectId } = await import(MONGO_MODULE);
    const res = await db.collection('categories').deleteOne({ _id: new ObjectId(id) });
    return res.deletedCount > 0;
  }
}
