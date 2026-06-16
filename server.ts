import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir, stat } from "fs/promises";
import path from "path";
import {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getCategories,
  createCategory,
  deleteCategory,
  initializeDatabase,
} from "./db-providers";

import {
  resolveConfig,
  resolveStorageConfig,
  isDbConfigured,
  isStorageConfigured,
} from "./env-config";

// Re-export db helpers so consumers can import them from this file too
export {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getCategories,
  createCategory,
  deleteCategory,
  initializeDatabase,
};

// ── Bootstrap: auto-create the catch-all API route in the host app ────────────

async function bootstrapApiRoute() {
  const possiblePaths = [
    path.join(process.cwd(), "app", "api", "admin", "[...blogSystem]", "route.ts"),
    path.join(process.cwd(), "src", "app", "api", "admin", "[...blogSystem]", "route.ts"),
  ];

  let routeExists = false;
  for (const p of possiblePaths) {
    try {
      await stat(p);
      routeExists = true;
      break;
    } catch {}
  }

  if (routeExists) return;

  const srcAppPath = path.join(process.cwd(), "src", "app");
  let targetDir = "";
  try {
    const s = await stat(srcAppPath);
    targetDir = s.isDirectory()
      ? path.join(srcAppPath, "api", "admin", "[...blogSystem]")
      : path.join(process.cwd(), "app", "api", "admin", "[...blogSystem]");
  } catch {
    targetDir = path.join(process.cwd(), "app", "api", "admin", "[...blogSystem]");
  }

  try {
    await mkdir(targetDir, { recursive: true });
    const routeContent = `import { createBlogSystemApiHandler } from "@maphorbs/blog-system/server";

const handler = createBlogSystemApiHandler();
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
`;
    await writeFile(path.join(targetDir, "route.ts"), routeContent, "utf-8");
  } catch (err) {
    console.error("[BlogSystem] Failed to auto-create dynamic API route file:", err);
  }
}

// ── Handler factory ───────────────────────────────────────────────────────────

export function createBlogSystemApiHandler() {
  return async function handler(
    req: NextRequest,
    context: { params: any }
  ): Promise<Response> {
    try {
      bootstrapApiRoute().catch(() => {});

      const params    = await Promise.resolve(context.params);
      const blogSystem: string[] = params?.blogSystem || [];
      const routePath = blogSystem.join("/");
      const method    = req.method;

      // ════════════════════════════════════════════════════════════════════════
      // CONFIG  /api/admin/config
      // ════════════════════════════════════════════════════════════════════════
      if (routePath === "config") {

        // ── GET ─────────────────────────────────────────────────────────────
        // Resolves config from env vars + local file so the admin UI always
        // sees the correct state, even when no JSON file exists (Vercel).
        if (method === "GET") {
          // Ensure local upload dir exists (no-op on Vercel)
          const uploadDir = path.join(process.cwd(), "public", "uploads", "blog");
          try { await mkdir(uploadDir, { recursive: true }); } catch {}

          const { db, storage } = await resolveConfig();

          // Neither env vars nor wizard file provided anything → show wizard
          if (!db.provider && !storage.provider) {
            return NextResponse.json({});
          }

          // Return a minimal shape the admin UI understands
          return NextResponse.json({
            db:      { provider: db.provider },
            storage: { provider: storage.provider },
            isSetup: isDbConfigured(db),
          });
        }

        // ── POST ────────────────────────────────────────────────────────────
        // Called by the setup wizard after the user fills in credentials.
        // Writes to the local JSON file (works in dev) and initialises the DB.
        // On Vercel the file write is silently ignored; env vars are used instead.
        if (method === "POST") {
          const body = await req.json();

          // Save to local file (dev only; ignored on Vercel read-only FS)
          const CONFIG_DIR  = path.join(process.cwd(), "data");
          const CONFIG_FILE = path.join(CONFIG_DIR, "blog_system_config.json");
          try {
            await mkdir(CONFIG_DIR, { recursive: true });
            await writeFile(CONFIG_FILE, JSON.stringify(body, null, 2));
          } catch {
            // Expected on Vercel — env vars take over
          }

          // Merge wizard values with env vars; env vars always win
          const resolved = await resolveConfig();
          const dbConfig  = {
            ...body.db,      // wizard input
            ...resolved.db,  // env vars override
          };

          if (dbConfig.provider) {
            try {
              const success = await initializeDatabase(dbConfig);
              return NextResponse.json({ success, message: "Configuration saved and database initialised." });
            } catch (dbError: any) {
              return NextResponse.json(
                { error: `Config saved, but DB connection failed: ${dbError.message}` },
                { status: 400 }
              );
            }
          }

          return NextResponse.json({ success: true, message: "Configuration saved." });
        }

        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      // ════════════════════════════════════════════════════════════════════════
      // UPLOAD  /api/admin/upload
      // ════════════════════════════════════════════════════════════════════════
      if (routePath === "upload") {
        if (method !== "POST") {
          return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
        }

        const formData = await req.formData();
        const file     = formData.get("file") as File | null;

        if (!file) {
          return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Resolve storage config — env vars always win
        const storageCfg   = await resolveStorageConfig();

        // Client can suggest a provider only as a last-resort fallback
        const formProvider = formData.get("provider") as string | null;
        const provider     = storageCfg.provider || formProvider || "local_storage";

        // Per-request config overrides are applied UNDER env vars
        const configStr  = formData.get("config") as string | null;
        const requestCfg = configStr ? JSON.parse(configStr) : {};

        // Final merged config: requestCfg is the lowest priority
        const cfg = { ...requestCfg, ...storageCfg };

        const bytes    = await file.arrayBuffer();
        const buffer   = Buffer.from(bytes);
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

        // ── Local filesystem ───────────────────────────────────────────────
        if (provider === "local_storage") {
          const uploadDir = path.join(process.cwd(), "public", "uploads", "blog");
          try { await mkdir(uploadDir, { recursive: true }); } catch {}
          await writeFile(path.join(uploadDir, filename), buffer);
          return NextResponse.json({ url: `/uploads/blog/${filename}` });
        }

        // ── Cloudinary ─────────────────────────────────────────────────────
        if (provider === "cloudinary") {
          const { cloudName, cloudApiKey, cloudApiSecret } = cfg;

          if (!cloudName || !cloudApiKey || !cloudApiSecret) {
            return NextResponse.json(
              {
                error:
                  "Cloudinary credentials missing. " +
                  "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET " +
                  "as environment variables in your Vercel dashboard (or run the setup wizard locally).",
              },
              { status: 400 }
            );
          }

          const timestamp = Math.round(Date.now() / 1000).toString();
          const folder    = "blog";
          const { createHash } = await import("crypto");
          const signature = createHash("sha1")
            .update(`folder=${folder}&timestamp=${timestamp}${cloudApiSecret}`)
            .digest("hex");

          const cloudForm = new FormData();
          cloudForm.append("file",      new Blob([buffer], { type: file.type }), filename);
          cloudForm.append("api_key",   cloudApiKey);
          cloudForm.append("timestamp", timestamp);
          cloudForm.append("signature", signature);
          cloudForm.append("folder",    folder);

          const cloudRes = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: "POST", body: cloudForm }
          );

          if (!cloudRes.ok) {
            const errText = await cloudRes.text();
            console.error("[BlogSystem] Cloudinary error:", errText);
            return NextResponse.json(
              { error: `Cloudinary upload failed: ${errText}` },
              { status: 500 }
            );
          }

          const cloudData = await cloudRes.json();
          return NextResponse.json({ url: cloudData.secure_url });
        }

        // ── AWS S3 / DigitalOcean Spaces ───────────────────────────────────
        if (provider === "aws_s3" || provider === "digitalocean_spaces") {
          const { accessKey, secretKey, region, bucket, endpoint } = cfg;

          if (!accessKey || !secretKey || !bucket) {
            return NextResponse.json(
              {
                error:
                  "S3 / Spaces credentials missing. " +
                  "Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_BUCKET_NAME " +
                  "as environment variables in your Vercel dashboard (or run the setup wizard locally).",
              },
              { status: 400 }
            );
          }

          let S3Client: any, PutObjectCommand: any;
          try {
            const awsSdk     = await import("@aws-sdk/client-s3");
            S3Client         = awsSdk.S3Client;
            PutObjectCommand = awsSdk.PutObjectCommand;
          } catch {
            return NextResponse.json(
              { error: "AWS S3 SDK not installed. Run: npm install @aws-sdk/client-s3" },
              { status: 500 }
            );
          }

          const s3Config: any = {
            region,
            credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
          };
          if (endpoint) s3Config.endpoint = `https://${endpoint}`;

          const client = new S3Client(s3Config);
          await client.send(
            new PutObjectCommand({
              Bucket:      bucket,
              Key:         `blog/${filename}`,
              Body:        buffer,
              ContentType: file.type,
            })
          );

          const publicUrl = endpoint
            ? `https://${bucket}.${endpoint}/blog/${filename}`
            : `https://${bucket}.s3.${region}.amazonaws.com/blog/${filename}`;

          return NextResponse.json({ url: publicUrl });
        }

        return NextResponse.json(
          { error: `Unsupported storage provider: "${provider}"` },
          { status: 400 }
        );
      }

      // ════════════════════════════════════════════════════════════════════════
      // BLOGS  /api/admin/blogs  &  /api/admin/blogs/:id
      // ════════════════════════════════════════════════════════════════════════
      if (routePath === "blogs") {
        if (method === "GET") {
          const blogs = await getBlogs();
          return NextResponse.json({ blogs });
        }
        if (method === "POST") {
          const body    = await req.json();
          const newBlog = await createBlog(body);
          return NextResponse.json({ success: true, blog: newBlog });
        }
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      if (blogSystem[0] === "blogs" && blogSystem.length === 2) {
        const id = blogSystem[1];
        if (method === "GET") {
          const blog = await getBlogById(id);
          if (!blog) return NextResponse.json({ error: "Blog not found" }, { status: 404 });
          return NextResponse.json({ blog });
        }
        if (method === "PATCH" || method === "PUT") {
          const body    = await req.json();
          const updated = await updateBlog(id, body);
          return NextResponse.json({ success: true, blog: updated });
        }
        if (method === "DELETE") {
          const success = await deleteBlog(id);
          return NextResponse.json({ success });
        }
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      // ════════════════════════════════════════════════════════════════════════
      // EVENTS  /api/admin/events  &  /api/admin/events/:id
      // ════════════════════════════════════════════════════════════════════════
      if (routePath === "events") {
        if (method === "GET") {
          const events = await getEvents();
          return NextResponse.json({ events });
        }
        if (method === "POST") {
          const body     = await req.json();
          const newEvent = await createEvent(body);
          return NextResponse.json({ success: true, event: newEvent });
        }
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      if (blogSystem[0] === "events" && blogSystem.length === 2) {
        const id = blogSystem[1];
        if (method === "GET") {
          const event = await getEventById(id);
          if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
          return NextResponse.json({ event });
        }
        if (method === "PATCH" || method === "PUT") {
          const body    = await req.json();
          const updated = await updateEvent(id, body);
          return NextResponse.json({ success: true, event: updated });
        }
        if (method === "DELETE") {
          const success = await deleteEvent(id);
          return NextResponse.json({ success });
        }
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      // ════════════════════════════════════════════════════════════════════════
      // CATEGORIES  /api/admin/categories  &  /api/admin/categories/:id
      // ════════════════════════════════════════════════════════════════════════
      if (routePath === "categories") {
        if (method === "GET") {
          const categories = await getCategories();
          return NextResponse.json({ categories });
        }
        if (method === "POST") {
          const { name, type } = await req.json();
          if (!name || !type) {
            return NextResponse.json({ error: "Missing name or type" }, { status: 400 });
          }
          const category = await createCategory(name, type);
          return NextResponse.json({ success: true, category });
        }
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      if (blogSystem[0] === "categories" && blogSystem.length === 2) {
        const id = blogSystem[1];
        if (method === "DELETE") {
          const success = await deleteCategory(id);
          return NextResponse.json({ success });
        }
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      return NextResponse.json({ error: "API route not found" }, { status: 404 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  };
}