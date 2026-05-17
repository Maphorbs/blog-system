# @maphorbs/blog-system

An enterprise-grade, fully pluggable, database-agnostic Blog & Event CMS engine designed for modern web applications. 

## Features
- **Database Agnostic**: Support for PostgreSQL, Supabase, MongoDB, MySQL, Firebase Firestore, and SQLite.
- **Dynamic Connection Initializer**: Set up and encrypt connection details securely via an admin configuration page.
- **NPM Package-Ready**: Build-time safe, dynamic optional driver resolution.
- **Next.js 14/15 Integration**: Plug-and-play catch-all REST API router.
- **Zero-API Server Component Support**: Direct server-side data loading.
- **Framework Independent Frontend**: Works seamlessly in React SPA, Next.js (App & Pages Router), Vue, and Svelte.

---

## ⚙️ Installation

```bash
npm install @maphorbs/blog-system
```

Install the peer dependency for your chosen database (optional/only if using them):
- **PostgreSQL**: `npm install pg`
- **MongoDB**: `npm install mongodb`
- **MySQL**: `npm install mysql2`
- **SQLite**: `npm install sqlite3 sqlite`
- **Firebase**: `npm install firebase-admin`

---

## 🚀 1. Next.js App Router Integration

### Backend API Setup
Create a single dynamic catch-all route at `app/api/admin/[...blogSystem]/route.ts`:

```typescript
import { createBlogSystemApiHandler } from "@maphorbs/blog-system/server";

// Handles all REST API CRUD operations (GET/POST/PUT/PATCH/DELETE) and file uploads automatically!
const handler = createBlogSystemApiHandler();

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
```

> [!TIP]
> **Zero-Configuration Self-Healing Routing:**
> You don't even have to create this catch-all API file manually! When your admin dashboard is run for the first time, `@maphorbs/blog-system` will automatically bootstrap `app/api/admin/[...blogSystem]/route.ts` and create all necessary data and file upload directories in your project if they are missing.

### Centralized Media Uploads
Because the upload handler is built directly into the catch-all dynamic route, requests to `/api/admin/upload` are seamlessly routed and handled out of the box! You do **not** need to write or maintain a separate file upload endpoint.
* **Local Storage**: Automatically creates and writes files into `public/uploads/blog/`.
* **Cloud Storage**: Seamlessly integrates with AWS S3 and DigitalOcean Spaces when peer dependencies are configured.

### Frontend Panel Mount
Create `app/admin/page.tsx`:

```tsx
"use client";

import { BlogAdmin } from "@maphorbs/blog-system";
import "@maphorbs/blog-system/dist/index.css"; // Console styles

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <BlogAdmin />
    </main>
  );
}
```

### Server Component Query (Zero-API Pattern)
Directly retrieve server data without making HTTP API requests:

```tsx
import { getBlogs } from "@maphorbs/blog-system/server";

export default async function BlogFeed() {
  const blogs = await getBlogs();

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
      {blogs.map((post) => (
        <div key={post.id} className="border p-4 rounded-xl">
          <h2 className="text-xl font-bold">{post.title}</h2>
          <p className="text-gray-600 mt-2">{post.excerpt}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🚀 2. Next.js Pages Router Integration

### Backend API Setup
Create a catch-all API handler at `pages/api/admin/[...blogSystem].ts`:

```typescript
import { createBlogSystemApiHandler } from "@maphorbs/blog-system/server";
import { NextApiRequest, NextApiResponse } from "next";

const nextRequestApiHandler = createBlogSystemApiHandler();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Convert standard NextApiRequest to NextRequest format and return response
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const nextReq = new Request(url.toString(), {
    method: req.method,
    headers: req.headers as any,
    body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined
  });
  
  const nextRes = await nextRequestApiHandler(nextReq as any, { 
    params: { blogSystem: req.query.blogSystem as string[] } 
  });
  
  res.status(nextRes.status);
  nextRes.headers.forEach((val, key) => res.setHeader(key, val));
  res.send(await nextRes.text());
}
```

### Frontend Panel Mount
Create `pages/admin.tsx`:

```tsx
import { BlogAdmin } from "@maphorbs/blog-system";
import "@maphorbs/blog-system/dist/index.css";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <BlogAdmin />
    </div>
  );
}
```

---

## 🚀 3. React SPA + Express.js Backend Integration

Perfect for traditional single-page apps (built with Vite/Create React App) communicating with a separate Node.js API server.

### Express Backend Router Setup
Install the server-side module and mount routes onto your Express app:

```javascript
const express = require("express");
const db = require("@maphorbs/blog-system/server");
const router = express.Router();

router.get("/blogs", async (req, res) => {
  res.json({ blogs: await db.getBlogs() });
});

router.post("/blogs", async (req, res) => {
  res.json({ success: true, blog: await db.createBlog(req.body) });
});

router.patch("/blogs/:id", async (req, res) => {
  res.json({ success: true, blog: await db.updateBlog(req.params.id, req.body) });
});

router.delete("/blogs/:id", async (req, res) => {
  res.json({ success: await db.deleteBlog(req.params.id) });
});

// Repeat matching endpoints for events, categories, and config...

const app = express();
app.use(express.json());
app.use("/api/admin", router);
```

### React SPA Console Mount (Vite)
Mount the component and inject the `ApiDatabaseProvider` pointed directly to your Express port URL:

```tsx
import React from "react";
import { BlogAdmin, ApiDatabaseProvider } from "@maphorbs/blog-system";
import "@maphorbs/blog-system/dist/index.css";

export default function AdminConsole() {
  // Inject the custom adapter pointing to the Express server URL
  const apiAdapter = new ApiDatabaseProvider("http://localhost:5000/api/admin", "YOUR_SECURE_API_KEY");

  return (
    <div className="min-h-screen bg-slate-950">
      <BlogAdmin adapter={apiAdapter} />
    </div>
  );
}
```

---

## 🚀 4. Vue (Nuxt) or Svelte (SvelteKit) Integration

Because the data layer is decoupled, Vue/Svelte projects can import your backend database providers and use custom HTTP calls to deliver blogs and events.

### SvelteKit Server-Side Loading
In SvelteKit, you can run direct database queries inside the `+page.server.ts` loader:

```typescript
// src/routes/blog/+page.server.ts (SvelteKit)
import { getBlogs } from "@maphorbs/blog-system/server";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return {
    blogs: await getBlogs()
  };
};
```

Mounting Svelte markup is straightforward:
```svelte
<!-- src/routes/blog/+page.svelte -->
<script lang="ts">
  export let data;
</script>

<h1>Blog Feed</h1>
<ul>
  {#each data.blogs as blog}
    <li>{blog.title}</li>
  {/each}
</ul>
```

### Nuxt (Vue 3) Server Route Setup
Create Nuxt Server route `server/api/blogs.get.ts`:

```typescript
// server/api/blogs.get.ts (Nuxt 3)
import { getBlogs } from "@maphorbs/blog-system/server";

export default defineEventHandler(async (event) => {
  return await getBlogs();
});
```

Fetch dynamically inside Vue components:
```vue
<!-- pages/blog.vue (Nuxt 3) -->
<template>
  <div>
    <h1>Nuxt 3 Blog</h1>
    <div v-for="blog in blogs" :key="blog.id">
      <h3>{{ blog.title }}</h3>
    </div>
  </div>
</template>

<script setup>
const { data: blogs } = await useFetch('/api/blogs')
</script>
```

---

## 🛡️ License
MIT
