import { readFile } from 'fs/promises';
import path from 'path';
import { BackendDbProvider } from './types';
import { BlogPost, EventItem } from '../types';

const SQLITE3_MODULE = 'sqlite3';
const SQLITE_MODULE = 'sqlite';
const UUID_MODULE = 'uuid';

export class SqliteProvider implements BackendDbProvider {
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
        this.config = { host: "data/local.db" };
      }
    }

    try {
      const sqlite3 = await import(SQLITE3_MODULE);
      const { open } = await import(SQLITE_MODULE);

      const dbPath = path.isAbsolute(this.config.host || 'data/local.db')
        ? (this.config.host || 'data/local.db')
        : path.join(process.cwd(), this.config.host || 'data/local.db');

      this.db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      return this.db;
    } catch (e: any) {
      throw new Error(`Failed to connect to SQLite: ${e.message}`);
    }
  }

  async initializeDatabase(config: any): Promise<boolean> {
    this.config = config;
    const db = await this.getDb();

    await db.exec(`
      CREATE TABLE IF NOT EXISTS blogs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        image TEXT NOT NULL,
        readTime TEXT,
        author TEXT,
        status TEXT NOT NULL,
        isFeatured INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        content TEXT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        location TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        image TEXT NOT NULL,
        attendees TEXT,
        href TEXT,
        isFeatured INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const catRows = await db.get('SELECT COUNT(*) as count FROM categories');
    if (catRows.count === 0) {
      const defaultBlogs = ['Politics', 'Programs', 'News', 'Economy', 'Community'];
      const defaultEvents = ['Past', 'Upcoming', 'Going on'];
      const { v4: uuidv4 } = await import(UUID_MODULE);

      for (const cat of defaultBlogs) {
        await db.run('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [uuidv4(), cat, 'blog']);
      }
      for (const cat of defaultEvents) {
        await db.run('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [uuidv4(), cat, 'event']);
      }
    }

    return true;
  }

  async getBlogs(): Promise<BlogPost[]> {
    const db = await this.getDb();
    const rows = await db.all('SELECT * FROM blogs ORDER BY created_at DESC');
    return rows.map((r: any) => ({ ...r, isFeatured: !!r.isFeatured }));
  }

  async getBlogById(id: string): Promise<BlogPost | null> {
    const db = await this.getDb();
    const row = await db.get('SELECT * FROM blogs WHERE id = ?', [id]);
    if (!row) return null;
    return { ...row, isFeatured: !!row.isFeatured };
  }

  async createBlog(blog: Partial<BlogPost>): Promise<BlogPost> {
    const db = await this.getDb();
    const { v4: uuidv4 } = await import(UUID_MODULE);
    const id = uuidv4();

    if (blog.isFeatured) {
      await db.run('UPDATE blogs SET isFeatured = 0');
    }

    const dateStr = blog.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const status = blog.status || 'Live';
    const isFeatured = blog.isFeatured ? 1 : 0;

    await db.run(
      `INSERT INTO blogs (id, title, excerpt, content, category, date, image, status, isFeatured) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, blog.title, blog.excerpt, blog.content, blog.category, dateStr, blog.image, status, isFeatured]
    );

    const created = await this.getBlogById(id);
    return created!;
  }

  async updateBlog(id: string, blog: Partial<BlogPost>): Promise<BlogPost> {
    const db = await this.getDb();

    if (blog.isFeatured) {
      await db.run('UPDATE blogs SET isFeatured = 0 WHERE id != ?', [id]);
    }

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    const allowedFields = ['title', 'excerpt', 'content', 'category', 'date', 'image', 'status', 'isFeatured'];
    
    for (const [key, val] of Object.entries(blog)) {
      if (allowedFields.includes(key) && key !== 'id') {
        fieldsToUpdate.push(`${key} = ?`);
        values.push(key === 'isFeatured' ? (val ? 1 : 0) : val);
      }
    }

    if (fieldsToUpdate.length > 0) {
      values.push(id);
      await db.run(
        `UPDATE blogs SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
        values
      );
    }

    const updated = await this.getBlogById(id);
    return updated!;
  }

  async deleteBlog(id: string): Promise<boolean> {
    const db = await this.getDb();
    const res = await db.run('DELETE FROM blogs WHERE id = ?', [id]);
    return (res.changes || 0) > 0;
  }

  async getEvents(): Promise<EventItem[]> {
    const db = await this.getDb();
    const rows = await db.all('SELECT * FROM events ORDER BY created_at DESC');
    return rows.map((r: any) => ({ ...r, isFeatured: !!r.isFeatured }));
  }

  async getEventById(id: string): Promise<EventItem | null> {
    const db = await this.getDb();
    const row = await db.get('SELECT * FROM events WHERE id = ?', [id]);
    if (!row) return null;
    return { ...row, isFeatured: !!row.isFeatured };
  }

  async createEvent(event: Partial<EventItem>): Promise<EventItem> {
    const db = await this.getDb();
    const { v4: uuidv4 } = await import(UUID_MODULE);
    const id = uuidv4();

    if (event.isFeatured) {
      await db.run('UPDATE events SET isFeatured = 0');
    }

    const dateStr = event.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const status = event.status || 'Live';
    const isFeatured = event.isFeatured ? 1 : 0;

    await db.run(
      `INSERT INTO events (id, title, description, content, date, time, location, category, status, image, attendees, href, isFeatured) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, event.title, event.description, event.content || '', dateStr, event.time, 
        event.location, event.category, status, event.image, event.attendees || '', 
        event.href || '', isFeatured
      ]
    );

    const created = await this.getEventById(id);
    return created!;
  }

  async updateEvent(id: string, event: Partial<EventItem>): Promise<EventItem> {
    const db = await this.getDb();

    if (event.isFeatured) {
      await db.run('UPDATE events SET isFeatured = 0 WHERE id != ?', [id]);
    }

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    const allowedFields = ['title', 'description', 'content', 'date', 'time', 'location', 'category', 'status', 'image', 'attendees', 'href', 'isFeatured'];
    
    for (const [key, val] of Object.entries(event)) {
      if (allowedFields.includes(key) && key !== 'id') {
        fieldsToUpdate.push(`${key} = ?`);
        values.push(key === 'isFeatured' ? (val ? 1 : 0) : val);
      }
    }

    if (fieldsToUpdate.length > 0) {
      values.push(id);
      await db.run(
        `UPDATE events SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
        values
      );
    }

    const updated = await this.getEventById(id);
    return updated!;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const db = await this.getDb();
    const res = await db.run('DELETE FROM events WHERE id = ?', [id]);
    return (res.changes || 0) > 0;
  }

  async getCategories(): Promise<any[]> {
    try {
      const db = await this.getDb();
      const rows = await db.all('SELECT * FROM categories ORDER BY type ASC, created_at ASC');
      return rows;
    } catch (e) {
      return [];
    }
  }

  async createCategory(name: string, type: 'blog' | 'event'): Promise<any> {
    const db = await this.getDb();
    const { v4: uuidv4 } = await import(UUID_MODULE);
    const id = uuidv4();
    await db.run('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [id, name, type]);
    return { id, name, type };
  }

  async deleteCategory(id: string): Promise<boolean> {
    const db = await this.getDb();
    const res = await db.run('DELETE FROM categories WHERE id = ?', [id]);
    return (res.changes || 0) > 0;
  }
}
