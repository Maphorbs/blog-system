import { Pool } from "pg";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { BackendDbProvider } from "./types";
import { BlogPost, EventItem } from "../types";

let cachedPool: Pool | null = null;
let cachedConnectionString: string = "";

function buildConnectionString(config: any): string {
  if (
    config.host &&
    (config.host.startsWith("postgres://") ||
      config.host.startsWith("postgresql://"))
  ) {
    return config.host;
  }
  if (
    config.url &&
    (config.url.startsWith("postgres://") ||
      config.url.startsWith("postgresql://"))
  ) {
    return config.url;
  }

  const host     = config.host     || "localhost";
  const port     = config.port     || 5432;
  const dbName   = config.dbName   || "blog_system";
  const user     = config.user     || "postgres";
  const password = config.password || "";

  // Do NOT append ?sslmode here — SSL is handled via Pool options below.
  // Combining both causes conflicts on some hosts (especially raw IPs).
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
}

export class PostgresProvider implements BackendDbProvider {
  private resolvedConfig: any | null = null;

  constructor(config?: any) {
    if (config) {
      this.resolvedConfig = config;
    }
  }

  private async loadFallbackConfig(): Promise<any> {
    try {
      const configPath = path.join(
        process.cwd(),
        "data",
        "blog_system_config.json"
      );
      const data = await readFile(configPath, "utf-8");
      const full = JSON.parse(data);
      return full.db ?? null;
    } catch {
      return null;
    }
  }

  private async getConfig(): Promise<any> {
    if (this.resolvedConfig) return this.resolvedConfig;

    const fileConfig = await this.loadFallbackConfig();
    if (fileConfig) {
      this.resolvedConfig = fileConfig;
      return fileConfig;
    }

    throw new Error(
      "PostgreSQL is not configured. " +
        "Set BLOG_DB_PROVIDER=postgres and BLOG_DB_HOST, BLOG_DB_NAME, BLOG_DB_USER, " +
        "BLOG_DB_PASSWORD as environment variables."
    );
  }

  async getDbPool(forceConfig?: any): Promise<Pool> {
    const config = forceConfig ?? (await this.getConfig());
    const connStr = buildConnectionString(config);

    if (cachedPool && cachedConnectionString === connStr) {
      return cachedPool;
    }

    if (cachedPool && cachedConnectionString !== connStr) {
      try {
        await cachedPool.end();
      } catch {}
      cachedPool = null;
    }

    // SSL: rejectUnauthorized:false when no CA cert is provided.
    // Raw IP hosts (self-managed droplets, VPS) don't have trusted cert chains.
    // Pass false entirely when ssl is disabled so pg doesn't attempt TLS at all.
    const sslConfig: any = config.ssl
      ? config.caCert
        ? { rejectUnauthorized: true, ca: config.caCert }
        : { rejectUnauthorized: false }
      : false;

    const pool = new Pool({
      connectionString: connStr,
      ssl: sslConfig,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    try {
      await pool.query("SELECT 1");
    } catch (e: any) {
      try {
        await pool.end();
      } catch {}
      throw new Error(`PostgreSQL connection failed: ${e.message}`);
    }

    cachedPool = pool;
    cachedConnectionString = connStr;

    if (!this.resolvedConfig) {
      this.resolvedConfig = config;
    }

    return pool;
  }

  async initializeDatabase(config: any): Promise<boolean> {
    this.resolvedConfig = config;
    const p = await this.getDbPool(config);

    await p.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title        TEXT NOT NULL,
        excerpt      TEXT NOT NULL,
        content      TEXT NOT NULL,
        category     TEXT NOT NULL,
        date         TEXT NOT NULL,
        image        TEXT NOT NULL,
        "readTime"   TEXT,
        author       TEXT,
        status       TEXT NOT NULL,
        "isFeatured" BOOLEAN DEFAULT false,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS events (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title        TEXT NOT NULL,
        description  TEXT NOT NULL,
        content      TEXT,
        date         TEXT NOT NULL,
        time         TEXT NOT NULL,
        location     TEXT NOT NULL,
        category     TEXT NOT NULL,
        status       TEXT NOT NULL,
        image        TEXT NOT NULL,
        attendees    TEXT,
        href         TEXT,
        "isFeatured" BOOLEAN DEFAULT false,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       TEXT NOT NULL,
        type       TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const catCount = await p.query("SELECT COUNT(*) FROM categories");
    if (parseInt(catCount.rows[0].count) === 0) {
      const defaultBlogs  = ["Politics", "Programs", "News", "Economy", "Community"];
      const defaultEvents = ["Past", "Upcoming", "Going on"];
      for (const cat of defaultBlogs) {
        await p.query("INSERT INTO categories (name, type) VALUES ($1, $2)", [cat, "blog"]);
      }
      for (const cat of defaultEvents) {
        await p.query("INSERT INTO categories (name, type) VALUES ($1, $2)", [cat, "event"]);
      }
    }

    return true;
  }

  // ── Blogs ─────────────────────────────────────────────────────────────────

  async getBlogs(): Promise<BlogPost[]> {
    try {
      const p = await this.getDbPool();
      const res = await p.query("SELECT * FROM blogs ORDER BY created_at DESC");
      return res.rows;
    } catch (e: any) {
      console.error("[BlogSystem] getBlogs failed:", e.message);
      return [];
    }
  }

  async getBlogById(id: string): Promise<BlogPost | null> {
    try {
      const p = await this.getDbPool();
      const res = await p.query("SELECT * FROM blogs WHERE id = $1", [id]);
      return res.rows[0] || null;
    } catch (e: any) {
      console.error("[BlogSystem] getBlogById failed:", e.message);
      return null;
    }
  }

  async createBlog(blog: any): Promise<BlogPost> {
    const p = await this.getDbPool();
    if (blog.isFeatured) {
      await p.query('UPDATE blogs SET "isFeatured" = false');
    }
    const dateStr =
      blog.date ||
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    const res = await p.query(
      `INSERT INTO blogs (title, excerpt, content, category, date, image, status, "isFeatured")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        blog.title,
        blog.excerpt,
        blog.content,
        blog.category,
        dateStr,
        blog.image,
        blog.status || "Live",
        blog.isFeatured || false,
      ]
    );
    return res.rows[0];
  }

  async updateBlog(id: string, blog: any): Promise<BlogPost> {
    const p = await this.getDbPool();
    if (blog.isFeatured) {
      await p.query('UPDATE blogs SET "isFeatured" = false WHERE id != $1', [id]);
    }
    const dateStr =
      blog.date ||
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    const res = await p.query(
      `UPDATE blogs
       SET title=$1, excerpt=$2, content=$3, category=$4, date=$5,
           image=$6, status=$7, "isFeatured"=$8
       WHERE id=$9 RETURNING *`,
      [
        blog.title,
        blog.excerpt,
        blog.content,
        blog.category,
        dateStr,
        blog.image,
        blog.status,
        blog.isFeatured,
        id,
      ]
    );
    return res.rows[0];
  }

  async deleteBlog(id: string): Promise<boolean> {
    const p = await this.getDbPool();
    const res = await p.query("DELETE FROM blogs WHERE id = $1 RETURNING *", [id]);
    if (res.rows.length > 0) {
      const blog = res.rows[0];
      await this.deletePostImages(blog.content, blog.image);
      return true;
    }
    return false;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  async getEvents(): Promise<EventItem[]> {
    try {
      const p = await this.getDbPool();
      const res = await p.query("SELECT * FROM events ORDER BY created_at DESC");
      return res.rows;
    } catch (e: any) {
      console.error("[BlogSystem] getEvents failed:", e.message);
      return [];
    }
  }

  async getEventById(id: string): Promise<EventItem | null> {
    try {
      const p = await this.getDbPool();
      const res = await p.query("SELECT * FROM events WHERE id = $1", [id]);
      return res.rows[0] || null;
    } catch (e: any) {
      console.error("[BlogSystem] getEventById failed:", e.message);
      return null;
    }
  }

  async createEvent(event: any): Promise<EventItem> {
    const p = await this.getDbPool();
    if (event.isFeatured) {
      await p.query('UPDATE events SET "isFeatured" = false');
    }
    const dateStr =
      event.date ||
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    const res = await p.query(
      `INSERT INTO events
         (title, description, content, date, time, location, category, status, image, attendees, href, "isFeatured")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        event.title,
        event.description,
        event.content || "",
        dateStr,
        event.time,
        event.location,
        event.category,
        event.status || "Live",
        event.image,
        event.attendees || "",
        event.href || "",
        event.isFeatured || false,
      ]
    );
    return res.rows[0];
  }

  async updateEvent(id: string, event: any): Promise<EventItem> {
    const p = await this.getDbPool();
    if (event.isFeatured) {
      await p.query('UPDATE events SET "isFeatured" = false WHERE id != $1', [id]);
    }
    const dateStr =
      event.date ||
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    const res = await p.query(
      `UPDATE events
       SET title=$1, description=$2, content=$3, date=$4, time=$5, location=$6,
           category=$7, status=$8, image=$9, "isFeatured"=$10
       WHERE id=$11 RETURNING *`,
      [
        event.title,
        event.description,
        event.content || "",
        dateStr,
        event.time,
        event.location,
        event.category,
        event.status,
        event.image,
        event.isFeatured,
        id,
      ]
    );
    return res.rows[0];
  }

  async deleteEvent(id: string): Promise<boolean> {
    const p = await this.getDbPool();
    const res = await p.query("DELETE FROM events WHERE id = $1 RETURNING *", [id]);
    if (res.rows.length > 0) {
      const event = res.rows[0];
      await this.deletePostImages(event.content, event.image);
      return true;
    }
    return false;
  }

  // ── Categories ────────────────────────────────────────────────────────────

  async getCategories(): Promise<any[]> {
    try {
      const p = await this.getDbPool();
      const res = await p.query(
        "SELECT * FROM categories ORDER BY type ASC, created_at ASC"
      );
      return res.rows;
    } catch (e: any) {
      if ((e as any).code === "42P01") {
        try {
          const config = await this.getConfig();
          await this.initializeDatabase(config);
          const p = await this.getDbPool();
          const res = await p.query(
            "SELECT * FROM categories ORDER BY type ASC, created_at ASC"
          );
          return res.rows;
        } catch (initErr: any) {
          console.error("[BlogSystem] getCategories auto-init failed:", initErr.message);
        }
      }
      console.error("[BlogSystem] getCategories failed:", e.message);
      return [];
    }
  }

  async createCategory(name: string, type: "blog" | "event"): Promise<any> {
    const p = await this.getDbPool();
    const res = await p.query(
      "INSERT INTO categories (name, type) VALUES ($1, $2) RETURNING *",
      [name, type]
    );
    return res.rows[0];
  }

  async deleteCategory(id: string): Promise<boolean> {
    const p = await this.getDbPool();
    await p.query("DELETE FROM categories WHERE id = $1", [id]);
    return true;
  }

  // ── Image cleanup ─────────────────────────────────────────────────────────

  private async deletePostImages(content: string, image: string) {
    const urls: string[] = [];
    if (image) urls.push(image);

    if (content) {
      const imgRegex = /<img[^>]+src="([^">]+)"/g;
      let match;
      while ((match = imgRegex.exec(content))) {
        urls.push(match[1]);
      }
    }

    let storageConfig: any = {};
    try {
      const configPath = path.join(
        process.cwd(),
        "data",
        "blog_system_config.json"
      );
      const data = await readFile(configPath, "utf-8");
      const fullConfig = JSON.parse(data);
      storageConfig = fullConfig.storage || {};
    } catch {
      // No local file on Vercel — env vars handle storage config
    }

    for (const url of urls) {
      if (url.startsWith("/uploads/blog/")) {
        try {
          const filename = path.basename(url);
          const filePath = path.join(
            process.cwd(),
            "public",
            "uploads",
            "blog",
            filename
          );
          await unlink(filePath);
        } catch (e) {
          console.error("[BlogSystem] Failed to delete local image:", url, e);
        }
      } else if (
        url.includes(".amazonaws.com") ||
        url.includes(".digitaloceanspaces.com")
      ) {
        try {
          const region =
            storageConfig.region || process.env.AWS_REGION || "us-east-1";
          const accessKeyId =
            storageConfig.accessKey || process.env.AWS_ACCESS_KEY_ID;
          const secretAccessKey =
            storageConfig.secretKey || process.env.AWS_SECRET_ACCESS_KEY;
          const bucket =
            storageConfig.bucket || process.env.AWS_BUCKET_NAME;
          const endpoint =
            storageConfig.endpoint || process.env.AWS_ENDPOINT;

          if (accessKeyId && secretAccessKey && bucket) {
            const { S3Client, DeleteObjectCommand } =
              await import("@aws-sdk/client-s3");
            const s3Config: any = {
              region,
              credentials: { accessKeyId, secretAccessKey },
            };
            if (endpoint) s3Config.endpoint = `https://${endpoint}`;
            const client = new S3Client(s3Config);
            const keyMatch = url.match(/\/blog\/([^?]+)/);
            if (keyMatch) {
              await client.send(
                new DeleteObjectCommand({
                  Bucket: bucket,
                  Key: `blog/${keyMatch[1]}`,
                })
              );
            }
          }
        } catch (e) {
          console.error("[BlogSystem] Failed to delete remote image:", url, e);
        }
      }
    }
  }
}