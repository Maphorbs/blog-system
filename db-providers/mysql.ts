import { readFile } from 'fs/promises';
import path from 'path';
import { BackendDbProvider } from './types';
import { BlogPost, EventItem } from '../types';

const MYSQL_MODULE = 'mysql2/promise';
const UUID_MODULE = 'uuid';

export class MySqlProvider implements BackendDbProvider {
  private pool: any = null;
  private config: any = null;

  constructor(config?: any) {
    if (config) {
      this.config = config;
    }
  }

  private async getPool() {
    if (this.pool) return this.pool;

    if (!this.config) {
      try {
        const configPath = path.join(process.cwd(), "data", "blog_system_config.json");
        const data = await readFile(configPath, "utf-8");
        const fullConfig = JSON.parse(data);
        this.config = fullConfig.db;
      } catch (e) {
        throw new Error("MySQL is not configured. Please complete the admin setup.");
      }
    }

    try {
      const mysql = await import(MYSQL_MODULE);
      this.pool = mysql.createPool({
        host: this.config.host || 'localhost',
        port: parseInt(this.config.port || '3306'),
        user: this.config.user || 'root',
        password: this.config.password || '',
        database: this.config.dbName || 'blog_system',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      return this.pool;
    } catch (e: any) {
      throw new Error(`Failed to connect to MySQL: ${e.message}`);
    }
  }

  async initializeDatabase(config: any): Promise<boolean> {
    this.config = config;
    const pool = await this.getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id VARCHAR(36) PRIMARY KEY,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content LONGTEXT NOT NULL,
        category VARCHAR(255) NOT NULL,
        date VARCHAR(255) NOT NULL,
        image TEXT NOT NULL,
        readTime VARCHAR(255),
        author VARCHAR(255),
        status VARCHAR(255) NOT NULL,
        isFeatured BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(36) PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        content LONGTEXT,
        date VARCHAR(255) NOT NULL,
        time VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        status VARCHAR(255) NOT NULL,
        image TEXT NOT NULL,
        attendees TEXT,
        href TEXT,
        isFeatured BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [catRows]: any = await pool.query('SELECT COUNT(*) as count FROM categories');
    if (catRows[0].count === 0) {
      const defaultBlogs = ['Politics', 'Programs', 'News', 'Economy', 'Community'];
      const defaultEvents = ['Past', 'Upcoming', 'Going on'];
      const { v4: uuidv4 } = await import(UUID_MODULE);

      for (const cat of defaultBlogs) {
        await pool.query('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [uuidv4(), cat, 'blog']);
      }
      for (const cat of defaultEvents) {
        await pool.query('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [uuidv4(), cat, 'event']);
      }
    }

    return true;
  }

  async getBlogs(): Promise<BlogPost[]> {
    const pool = await this.getPool();
    const [rows]: any = await pool.query('SELECT * FROM blogs ORDER BY created_at DESC');
    return rows.map((r: any) => ({ ...r, isFeatured: !!r.isFeatured }));
  }

  async getBlogById(id: string): Promise<BlogPost | null> {
    const pool = await this.getPool();
    const [rows]: any = await pool.query('SELECT * FROM blogs WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return { ...rows[0], isFeatured: !!rows[0].isFeatured };
  }

  async createBlog(blog: Partial<BlogPost>): Promise<BlogPost> {
    const pool = await this.getPool();
    const { v4: uuidv4 } = await import(UUID_MODULE);
    const id = uuidv4();

    if (blog.isFeatured) {
      await pool.query('UPDATE blogs SET isFeatured = false');
    }

    const dateStr = blog.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const status = blog.status || 'Live';
    const isFeatured = blog.isFeatured ? 1 : 0;

    await pool.query(
      `INSERT INTO blogs (id, title, excerpt, content, category, date, image, status, isFeatured) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, blog.title, blog.excerpt, blog.content, blog.category, dateStr, blog.image, status, isFeatured]
    );

    const created = await this.getBlogById(id);
    return created!;
  }

  async updateBlog(id: string, blog: Partial<BlogPost>): Promise<BlogPost> {
    const pool = await this.getPool();

    if (blog.isFeatured) {
      await pool.query('UPDATE blogs SET isFeatured = false WHERE id != ?', [id]);
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
      await pool.query(
        `UPDATE blogs SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
        values
      );
    }

    const updated = await this.getBlogById(id);
    return updated!;
  }

  async deleteBlog(id: string): Promise<boolean> {
    const pool = await this.getPool();
    const [res]: any = await pool.query('DELETE FROM blogs WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }

  async getEvents(): Promise<EventItem[]> {
    const pool = await this.getPool();
    const [rows]: any = await pool.query('SELECT * FROM events ORDER BY created_at DESC');
    return rows.map((r: any) => ({ ...r, isFeatured: !!r.isFeatured }));
  }

  async getEventById(id: string): Promise<EventItem | null> {
    const pool = await this.getPool();
    const [rows]: any = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return { ...rows[0], isFeatured: !!rows[0].isFeatured };
  }

  async createEvent(event: Partial<EventItem>): Promise<EventItem> {
    const pool = await this.getPool();
    const { v4: uuidv4 } = await import(UUID_MODULE);
    const id = uuidv4();

    if (event.isFeatured) {
      await pool.query('UPDATE events SET isFeatured = false');
    }

    const dateStr = event.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const status = event.status || 'Live';
    const isFeatured = event.isFeatured ? 1 : 0;

    await pool.query(
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
    const pool = await this.getPool();

    if (event.isFeatured) {
      await pool.query('UPDATE events SET isFeatured = false WHERE id != ?', [id]);
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
      await pool.query(
        `UPDATE events SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
        values
      );
    }

    const updated = await this.getEventById(id);
    return updated!;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const pool = await this.getPool();
    const [res]: any = await pool.query('DELETE FROM events WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }

  async getCategories(): Promise<any[]> {
    try {
      const pool = await this.getPool();
      const [rows]: any = await pool.query('SELECT * FROM categories ORDER BY type ASC, created_at ASC');
      return rows;
    } catch (e) {
      return [];
    }
  }

  async createCategory(name: string, type: 'blog' | 'event'): Promise<any> {
    const pool = await this.getPool();
    const { v4: uuidv4 } = await import(UUID_MODULE);
    const id = uuidv4();
    await pool.query('INSERT INTO categories (id, name, type) VALUES (?, ?, ?)', [id, name, type]);
    return { id, name, type };
  }

  async deleteCategory(id: string): Promise<boolean> {
    const pool = await this.getPool();
    const [res]: any = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    return res.affectedRows > 0;
  }
}
