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

/**
 * Auto-creates the required dynamic catch-all API route file in the host project if it doesn't exist.
 */
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
    } catch (e) {}
  }

  if (!routeExists) {
    const srcAppPath = path.join(process.cwd(), "src", "app");
    let targetDir = "";
    
    try {
      const dirStat = await stat(srcAppPath);
      if (dirStat.isDirectory()) {
        targetDir = path.join(srcAppPath, "api", "admin", "[...blogSystem]");
      } else {
        targetDir = path.join(process.cwd(), "app", "api", "admin", "[...blogSystem]");
      }
    } catch (e) {
      targetDir = path.join(process.cwd(), "app", "api", "admin", "[...blogSystem]");
    }

    try {
      await mkdir(targetDir, { recursive: true });
      const routeContent = `import { createBlogSystemApiHandler } from "@maphorbs/blog-system/server";

export const GET = createBlogSystemApiHandler();
export const POST = createBlogSystemApiHandler();
export const PUT = createBlogSystemApiHandler();
export const PATCH = createBlogSystemApiHandler();
export const DELETE = createBlogSystemApiHandler();
`;
      await writeFile(path.join(targetDir, "route.ts"), routeContent, "utf-8");
      console.log(`[BlogSystem] Successfully bootstrapped dynamic API route at: ${targetDir}/route.ts`);
    } catch (err) {
      console.error("[BlogSystem] Failed to auto-create dynamic API route file:", err);
    }
  }
}

/**
 * Creates a Next.js App Router dynamic catch-all route handler for the Blog & Event CMS.
 * Mount this in your Next.js application at: `app/api/admin/[...blogSystem]/route.ts`
 */
export function createBlogSystemApiHandler() {
  return async function handler(
    req: NextRequest,
    context: { params: any }
  ): Promise<Response> {
    try {
      // Trigger background route bootstrapping check (non-blocking)
      bootstrapApiRoute().catch(() => {});

      // Safely unwrap params to support both Next.js 14 and Next.js 15 (Promise params)
      const params = await Promise.resolve(context.params);
      const blogSystem: string[] = params?.blogSystem || [];
      const routePath = blogSystem.join("/");
      const method = req.method;

      // ─── CONFIGURATION ENDPOINT ─────────────────────────────────────────────
      if (routePath === "config") {
        const CONFIG_DIR = path.join(process.cwd(), "data");
        const CONFIG_FILE = path.join(CONFIG_DIR, "blog_system_config.json");

        if (method === "GET") {
          try {
            // Auto-create uploads directory on config check if it doesn't exist
            const uploadDir = path.join(process.cwd(), "public", "uploads", "blog");
            try {
              await mkdir(uploadDir, { recursive: true });
            } catch (e) {}

            const data = await readFile(CONFIG_FILE, "utf-8");
            return NextResponse.json(JSON.parse(data));
          } catch (error) {
            // Return empty config if file doesn't exist yet
            return NextResponse.json({});
          }
        }

        if (method === "POST") {
          try {
            const config = await req.json();

            // Ensure the data directory exists
            try {
              await mkdir(CONFIG_DIR, { recursive: true });
            } catch (e) {
              // Ignore if directory exists
            }

            // Write the config securely to the server's filesystem
            await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));

            // If it's a database configuration, we should initialize the provider immediately
            if (config.db) {
              try {
                const success = await initializeDatabase(config.db);
                return NextResponse.json({ success, message: "Configuration saved successfully" });
              } catch (dbError: any) {
                return NextResponse.json(
                  { error: `Configuration saved, but database connection failed: ${dbError.message}` },
                  { status: 400 }
                );
              }
            }

            return NextResponse.json({ success: true, message: "Configuration saved successfully" });
          } catch (error: any) {
            return NextResponse.json({ error: error.message || "Failed to save configuration" }, { status: 500 });
          }
        }

        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      // ─── UPLOAD ENDPOINT ──────────────────────────────────────────────────
      if (routePath === "upload") {
        if (method === "POST") {
          try {
            const formData = await req.formData();
            const file = formData.get("file") as File | null;
            const provider = formData.get("provider") as string;
            
            const configStr = formData.get("config") as string;
            const config = configStr ? JSON.parse(configStr) : {};

            if (!file) {
              return NextResponse.json({ error: "No file provided" }, { status: 400 });
            }

            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            
            const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

            if (provider === "local_storage" || !provider) {
              const uploadDir = path.join(process.cwd(), "public", "uploads", "blog");
              try {
                await mkdir(uploadDir, { recursive: true });
              } catch (err) {
                // Ignore if exists
              }

              const filePath = path.join(uploadDir, filename);
              await writeFile(filePath, buffer);

              const publicUrl = `/uploads/blog/${filename}`;
              return NextResponse.json({ url: publicUrl });
            } 
            
            if (provider === "aws_s3" || provider === "digitalocean_spaces") {
              const region = config.region || process.env.AWS_REGION || "us-east-1";
              const accessKeyId = config.accessKey || process.env.AWS_ACCESS_KEY_ID;
              const secretAccessKey = config.secretKey || process.env.AWS_SECRET_ACCESS_KEY;
              const bucket = config.bucket || process.env.AWS_BUCKET_NAME;
              const endpoint = config.endpoint || process.env.AWS_ENDPOINT;

              if (!accessKeyId || !secretAccessKey || !bucket) {
                return NextResponse.json({ error: "Missing S3 credentials" }, { status: 400 });
              }

              let S3Client, PutObjectCommand;
              try {
                const awsSdk = await import("@aws-sdk/client-s3");
                S3Client = awsSdk.S3Client;
                PutObjectCommand = awsSdk.PutObjectCommand;
              } catch (e: any) {
                return NextResponse.json({ 
                  error: "AWS S3 SDK is not installed. Please run `npm install @aws-sdk/client-s3` to use S3/Spaces storage." 
                }, { status: 500 });
              }

              const s3Config: any = {
                region,
                credentials: {
                  accessKeyId,
                  secretAccessKey,
                },
              };

              if (endpoint) {
                s3Config.endpoint = `https://${endpoint}`;
              }

              const client = new S3Client(s3Config);
              const command = new PutObjectCommand({
                Bucket: bucket,
                Key: `blog/${filename}`,
                Body: buffer,
                ContentType: file.type,
              });

              await client.send(command);

              const publicUrl = endpoint 
                ? `https://${bucket}.${endpoint}/blog/${filename}`
                : `https://${bucket}.s3.${region}.amazonaws.com/blog/${filename}`;

              return NextResponse.json({ url: publicUrl });
            }

            return NextResponse.json({ error: "Unsupported storage provider" }, { status: 400 });
          } catch (error: any) {
            console.error("Upload error:", error);
            return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
          }
        }
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      // ─── BLOGS ENDPOINTS ──────────────────────────────────────────────────
      if (routePath === "blogs") {
        if (method === "GET") {
          const blogs = await getBlogs();
          return NextResponse.json({ blogs });
        }
        if (method === "POST") {
          const body = await req.json();
          const newBlog = await createBlog(body);
          return NextResponse.json({ success: true, blog: newBlog });
        }
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      if (blogSystem[0] === "blogs" && blogSystem.length === 2) {
        const id = blogSystem[1];
        if (method === "GET") {
          const blog = await getBlogById(id);
          if (!blog) {
            return NextResponse.json({ error: "Blog not found" }, { status: 404 });
          }
          return NextResponse.json({ blog });
        }
        if (method === "PATCH" || method === "PUT") {
          const body = await req.json();
          const updated = await updateBlog(id, body);
          return NextResponse.json({ success: true, blog: updated });
        }
        if (method === "DELETE") {
          const success = await deleteBlog(id);
          return NextResponse.json({ success });
        }
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      // ─── EVENTS ENDPOINTS ─────────────────────────────────────────────────
      if (routePath === "events") {
        if (method === "GET") {
          const events = await getEvents();
          return NextResponse.json({ events });
        }
        if (method === "POST") {
          const body = await req.json();
          const newEvent = await createEvent(body);
          return NextResponse.json({ success: true, event: newEvent });
        }
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      if (blogSystem[0] === "events" && blogSystem.length === 2) {
        const id = blogSystem[1];
        if (method === "GET") {
          const event = await getEventById(id);
          if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
          }
          return NextResponse.json({ event });
        }
        if (method === "PATCH" || method === "PUT") {
          const body = await req.json();
          const updated = await updateEvent(id, body);
          return NextResponse.json({ success: true, event: updated });
        }
        if (method === "DELETE") {
          const success = await deleteEvent(id);
          return NextResponse.json({ success });
        }
        return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
      }

      // ─── CATEGORIES ENDPOINTS ──────────────────────────────────────────────
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

      // Route fallback
      return NextResponse.json({ error: "API route not found" }, { status: 404 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  };
}
