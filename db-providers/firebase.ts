import { readFile } from 'fs/promises';
import path from 'path';
import { BackendDbProvider } from './types';
import { BlogPost, EventItem } from '../types';

const FIREBASE_ADMIN_MODULE = 'firebase-admin';

export class FirebaseProvider implements BackendDbProvider {
  private db: any = null;
  private config: any = null;
  private app: any = null;

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
        throw new Error("Firebase is not configured. Please complete the admin setup.");
      }
    }

    try {
      const admin = await import(FIREBASE_ADMIN_MODULE);
      
      if (admin.apps.length === 0) {
        let credential;
        
        if (this.config.serviceAccount) {
          const serviceAccountObj = typeof this.config.serviceAccount === 'string'
            ? JSON.parse(this.config.serviceAccount)
            : this.config.serviceAccount;
          credential = admin.credential.cert(serviceAccountObj);
        } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          const serviceAccountObj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          credential = admin.credential.cert(serviceAccountObj);
        } else {
          credential = admin.credential.applicationDefault();
        }

        this.app = admin.initializeApp({
          credential,
          projectId: this.config.dbName || this.config.projectId || process.env.FIREBASE_PROJECT_ID
        });
      } else {
        this.app = admin.app();
      }

      this.db = admin.firestore(this.app);
      return this.db;
    } catch (e: any) {
      throw new Error(`Failed to connect to Firebase Firestore: ${e.message}`);
    }
  }

  async initializeDatabase(config: any): Promise<boolean> {
    this.config = config;
    const db = await this.getDb();
    
    const categoriesRef = db.collection('categories');
    const snapshot = await categoriesRef.limit(1).get();

    if (snapshot.empty) {
      const defaultBlogs = ['Politics', 'Programs', 'News', 'Economy', 'Community'];
      const defaultEvents = ['Past', 'Upcoming', 'Going on'];
      
      const batch = db.batch();
      
      for (const cat of defaultBlogs) {
        const docRef = categoriesRef.doc();
        batch.set(docRef, { name: cat, type: 'blog', created_at: new Date().toISOString() });
      }
      for (const cat of defaultEvents) {
        const docRef = categoriesRef.doc();
        batch.set(docRef, { name: cat, type: 'event', created_at: new Date().toISOString() });
      }

      await batch.commit();
    }

    return true;
  }

  async getBlogs(): Promise<BlogPost[]> {
    const db = await this.getDb();
    const snapshot = await db.collection('blogs').orderBy('created_at', 'desc').get();
    
    const blogs: BlogPost[] = [];
    snapshot.forEach((doc: any) => {
      blogs.push({ id: doc.id, ...doc.data() } as BlogPost);
    });
    return blogs;
  }

  async getBlogById(id: string): Promise<BlogPost | null> {
    const db = await this.getDb();
    const doc = await db.collection('blogs').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as BlogPost;
  }

  async createBlog(blog: Partial<BlogPost>): Promise<BlogPost> {
    const db = await this.getDb();
    const blogsRef = db.collection('blogs');

    if (blog.isFeatured) {
      const featuredSnapshot = await blogsRef.where('isFeatured', '==', true).get();
      const batch = db.batch();
      featuredSnapshot.forEach((doc: any) => {
        batch.update(doc.ref, { isFeatured: false });
      });
      await batch.commit();
    }

    const docData = {
      ...blog,
      date: blog.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: blog.status || 'Live',
      isFeatured: blog.isFeatured || false,
      created_at: new Date().toISOString()
    };

    const docRef = await blogsRef.add(docData);
    return { id: docRef.id, ...docData } as BlogPost;
  }

  async updateBlog(id: string, blog: Partial<BlogPost>): Promise<BlogPost> {
    const db = await this.getDb();
    const blogsRef = db.collection('blogs');

    if (blog.isFeatured) {
      const featuredSnapshot = await blogsRef.where('isFeatured', '==', true).get();
      const batch = db.batch();
      featuredSnapshot.forEach((doc: any) => {
        if (doc.id !== id) {
          batch.update(doc.ref, { isFeatured: false });
        }
      });
      await batch.commit();
    }

    const { id: _, ...updateData } = blog as any;
    await blogsRef.doc(id).update(updateData);
    const updatedDoc = await blogsRef.doc(id).get();
    return { id: updatedDoc.id, ...updatedDoc.data() } as BlogPost;
  }

  async deleteBlog(id: string): Promise<boolean> {
    const db = await this.getDb();
    await db.collection('blogs').doc(id).delete();
    return true;
  }

  async getEvents(): Promise<EventItem[]> {
    const db = await this.getDb();
    const snapshot = await db.collection('events').orderBy('created_at', 'desc').get();
    
    const events: EventItem[] = [];
    snapshot.forEach((doc: any) => {
      events.push({ id: doc.id, ...doc.data() } as EventItem);
    });
    return events;
  }

  async getEventById(id: string): Promise<EventItem | null> {
    const db = await this.getDb();
    const doc = await db.collection('events').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as EventItem;
  }

  async createEvent(event: Partial<EventItem>): Promise<EventItem> {
    const db = await this.getDb();
    const eventsRef = db.collection('events');

    if (event.isFeatured) {
      const featuredSnapshot = await eventsRef.where('isFeatured', '==', true).get();
      const batch = db.batch();
      featuredSnapshot.forEach((doc: any) => {
        batch.update(doc.ref, { isFeatured: false });
      });
      await batch.commit();
    }

    const docData = {
      ...event,
      content: event.content || '',
      date: event.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: event.status || 'Live',
      attendees: event.attendees || '',
      href: event.href || '',
      isFeatured: event.isFeatured || false,
      created_at: new Date().toISOString()
    };

    const docRef = await eventsRef.add(docData);
    return { id: docRef.id, ...docData } as EventItem;
  }

  async updateEvent(id: string, event: Partial<EventItem>): Promise<EventItem> {
    const db = await this.getDb();
    const eventsRef = db.collection('events');

    if (event.isFeatured) {
      const featuredSnapshot = await eventsRef.where('isFeatured', '==', true).get();
      const batch = db.batch();
      featuredSnapshot.forEach((doc: any) => {
        if (doc.id !== id) {
          batch.update(doc.ref, { isFeatured: false });
        }
      });
      await batch.commit();
    }

    const { id: _, ...updateData } = event as any;
    await eventsRef.doc(id).update(updateData);
    const updatedDoc = await eventsRef.doc(id).get();
    return { id: updatedDoc.id, ...updatedDoc.data() } as EventItem;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const db = await this.getDb();
    await db.collection('events').doc(id).delete();
    return true;
  }

  async getCategories(): Promise<any[]> {
    try {
      const db = await this.getDb();
      const snapshot = await db.collection('categories').orderBy('type', 'asc').orderBy('created_at', 'asc').get();
      
      const categories: any[] = [];
      snapshot.forEach((doc: any) => {
        categories.push({ id: doc.id, ...doc.data() });
      });
      return categories;
    } catch (e) {
      return [];
    }
  }

  async createCategory(name: string, type: 'blog' | 'event'): Promise<any> {
    const db = await this.getDb();
    const docData = { name, type, created_at: new Date().toISOString() };
    const docRef = await db.collection('categories').add(docData);
    return { id: docRef.id, ...docData };
  }

  async deleteCategory(id: string): Promise<boolean> {
    const db = await this.getDb();
    await db.collection('categories').doc(id).delete();
    return true;
  }
}
