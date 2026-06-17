# @maphorbs/blog-system# @your-org/blog-system

A plug-and-play blog and events CMS for Next.js apps. Drop in the admin panel, write rich content with full font/style/link control, and render it pixel-perfect on your public pages — no global CSS required.

---

## Table of Contents

- [Installation](#installation)
- [Requirements](#requirements)
- [Package Exports](#package-exports)
- [Quick Start](#quick-start)
- [Setup Guide](#setup-guide)
  - [1. Admin Panel](#1-admin-panel)
  - [2. API Routes](#2-api-routes)
  - [3. Public Blog Page (list)](#3-public-blog-page-list)
  - [4. Public Blog Detail Page](#4-public-blog-detail-page)
- [BlogRenderer — Critical for Correct Display](#blogrenderer--critical-for-correct-display)
  - [In a Server Component (Next.js App Router)](#in-a-server-component-nextjs-app-router)
  - [In a Client Component](#in-a-client-component)
- [The Adapter Interface](#the-adapter-interface)
- [Storage Providers](#storage-providers)
- [Rich Text Features](#rich-text-features)
- [Tailwind / Prose Warning](#tailwind--prose-warning)
- [TypeScript Types](#typescript-types)
- [FAQ](#faq)

---

## Installation

```bash
npm install @your-org/blog-system
# or
yarn add @your-org/blog-system
# or
pnpm add @your-org/blog-system
```

---

## Requirements

| Requirement | Version |
|---|---|
| Next.js | 13+ (App Router recommended) |
| React | 18+ |
| Tailwind CSS | 3+ |
| Node.js | 18+ |

The following peer dependencies are required:

```bash
npm install react-hot-toast
```

---

## Package Exports

```ts
// Admin panel — the full CMS UI
import { BlogAdmin } from "@your-org/blog-system";

// Rich-text renderer — use this on ALL public-facing pages
import { BlogRenderer, getBlogRendererStyles } from "@your-org/blog-system";

// Types
import type { BlogSystemAdapter, BlogPost, EventItem } from "@your-org/blog-system";
```

---

## Quick Start

### 1. Create your adapter (connects the package to your database)

```ts
// lib/blog-adapter.ts
import { BlogSystemAdapter } from "@your-org/blog-system";

export const blogAdapter: BlogSystemAdapter = {
  // Config
  getConfig: async () => { /* return your db config */ },
  saveConfig: async (config) => { /* save config */ },

  // Blogs
  getBlogs: async () => { /* fetch all blogs from your DB */ },
  getBlog: async (id) => { /* fetch single blog */ },
  createBlog: async (data) => { /* insert blog */ },
  updateBlog: async (id, data) => { /* update blog */ },
  deleteBlog: async (id) => { /* delete blog */ },

  // Events
  getEvents: async () => { /* fetch all events */ },
  getEvent: async (id) => { /* fetch single event */ },
  createEvent: async (data) => { /* insert event */ },
  updateEvent: async (id, data) => { /* update event */ },
  deleteEvent: async (id) => { /* delete event */ },

  // Categories
  getCategories: async () => { /* fetch categories */ },
  createCategory: async (name, type) => { /* insert category */ },
  deleteCategory: async (id) => { /* delete category */ },

  // File uploads
  uploadFile: async (file, provider, folder) => {
    // upload to your storage and return the public URL
    return "https://...";
  },
};
```

### 2. Add the admin panel

```tsx
// app/admin/page.tsx
"use client";
import { BlogAdmin } from "@your-org/blog-system";
import { blogAdapter } from "@/lib/blog-adapter";

export default function AdminPage() {
  return <BlogAdmin adapter={blogAdapter} />;
}
```

### 3. Render blog content on public pages

```tsx
// app/blog/[id]/page.tsx  (server component)
import { BlogRenderer, getBlogRendererStyles } from "@your-org/blog-system";

export default async function BlogPage({ params }) {
  const post = await getPost(params.id); // your data fetching

  return (
    <main>
      {/* ✅ Required — injects font/style CSS from the package */}
      <style dangerouslySetInnerHTML={{ __html: getBlogRendererStyles() }} />

      <h1>{post.title}</h1>

      {/* ✅ Required — renders content with correct fonts, sizes, links */}
      <BlogRenderer html={post.content} />
    </main>
  );
}
```

---

## Setup Guide

### 1. Admin Panel

Create a protected route for the admin panel. The panel handles its own login state via `localStorage`, but you should protect the route at the middleware level too.

```tsx
// app/admin/[[...slug]]/page.tsx
"use client";

import { BlogAdmin } from "@your-org/blog-system";
import { blogAdapter } from "@/lib/blog-adapter";

// ⚠️  Must be a Client Component — BlogAdmin uses browser APIs
export default function AdminPage() {
  return <BlogAdmin adapter={blogAdapter} />;
}
```

The admin panel includes:
- Welcome / onboarding wizard
- Database connection setup
- Login screen
- Dashboard with blog and event management
- Rich-text post editor (fonts, sizes, colors, links, images, video)
- Post preview
- Category management

---

### 2. API Routes

The package reads/writes data through your adapter, but the **public blog pages** fetch data via your own API routes. You need to create these:

```
app/
  api/
    admin/
      blogs/
        route.ts          → GET all blogs, POST create
        [id]/
          route.ts        → GET single blog, PUT update, DELETE
      events/
        route.ts          → GET all events, POST create
        [id]/
          route.ts        → GET single event, PUT update, DELETE
      categories/
        route.ts          → GET all, POST create
        [id]/
          route.ts        → DELETE
```

Example `app/api/admin/blogs/route.ts`:

```ts
import { NextResponse } from "next/server";
import { blogAdapter } from "@/lib/blog-adapter";

export async function GET() {
  const blogs = await blogAdapter.getBlogs();
  return NextResponse.json({ blogs });
}

export async function POST(req: Request) {
  const data = await req.json();
  const blog = await blogAdapter.createBlog(data);
  return NextResponse.json({ blog });
}
```

Example `app/api/admin/blogs/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { blogAdapter } from "@/lib/blog-adapter";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const blog = await blogAdapter.getBlog(params.id);
  if (!blog) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ blog });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const data = await req.json();
  const blog = await blogAdapter.updateBlog(params.id, data);
  return NextResponse.json({ blog });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await blogAdapter.deleteBlog(params.id);
  return NextResponse.json({ success: true });
}
```

---

### 3. Public Blog Page (list)

The blog list page fetches from your API routes and renders cards. Nothing special is needed here — `BlogRenderer` is only needed on the **detail page** where you render the full rich-text content.

```tsx
// app/blog-events/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function BlogListPage() {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    fetch("/api/admin/blogs")
      .then((r) => r.json())
      .then((d) => setBlogs(d.blogs ?? []));
  }, []);

  return (
    <div>
      {blogs.map((post) => (
        <a key={post.id} href={`/blog-events/${post.id}`}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </a>
      ))}
    </div>
  );
}
```

---

### 4. Public Blog Detail Page

This is the most important page. Two things **must** be added for content to render correctly:

```tsx
// app/blog-events/[id]/page.tsx
import { notFound } from "next/navigation";

// ✅ Step 1: Import these two from the package
import { BlogRenderer, getBlogRendererStyles } from "@your-org/blog-system";

export default async function BlogDetailPage({ params }) {
  const { id } = await params;

  // Fetch from your API route
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/blogs/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) notFound();
  const { blog } = await res.json();

  return (
    <main>
      {/*
        ✅ Step 2: Inject the renderer CSS.
        This is a server component so we use getBlogRendererStyles()
        instead of useEffect. It injects the font/size CSS the browser
        needs to display content correctly.
      */}
      <style dangerouslySetInnerHTML={{ __html: getBlogRendererStyles() }} />

      {/* Your hero, title, image etc */}
      <h1>{blog.title}</h1>
      <img src={blog.image} alt={blog.title} />

      {/*
        ✅ Step 3: Render content with BlogRenderer — NOT dangerouslySetInnerHTML.
        The style prop sets your site's default reading styles.
        Any formatting the author applied in the editor overrides these automatically.
      */}
      <BlogRenderer
        html={blog.content}
        style={{
          fontFamily: "Georgia, serif",   // your site's base reading font
          fontSize: "17px",
          color: "#333",
          lineHeight: "1.8",
        }}
      />
    </main>
  );
}
```

---

## BlogRenderer — Critical for Correct Display

The `BlogRenderer` component is **required** on any page that displays saved blog or event content. Without it, custom fonts, font sizes, text alignment, and indentation will not render — the browser won't know what CSS classes like `ql-font-georgia` or `ql-align-center` mean.

### In a Server Component (Next.js App Router)

```tsx
import { BlogRenderer, getBlogRendererStyles } from "@your-org/blog-system";

export default async function Page() {
  return (
    <>
      {/* Inject styles in the page — works with SSR and streaming */}
      <style dangerouslySetInnerHTML={{ __html: getBlogRendererStyles() }} />

      <BlogRenderer html={post.content} />
    </>
  );
}
```

### In a Client Component

If your page is a client component (`"use client"`), `BlogRenderer` injects the styles automatically on mount — you don't need `getBlogRendererStyles()`:

```tsx
"use client";
import { BlogRenderer } from "@your-org/blog-system";

export default function Page() {
  // No style tag needed — BlogRenderer handles it via useEffect
  return <BlogRenderer html={post.content} />;
}
```

### BlogRenderer Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `html` | `string` | ✅ | The raw HTML string from `post.content` |
| `className` | `string` | ❌ | Extra CSS class on the wrapper div |
| `style` | `React.CSSProperties` | ❌ | Base reading styles for your site. Author's inline styles override these. |

---

## The Adapter Interface

Your adapter is the bridge between this package and your database. Every method must be implemented.

```ts
interface BlogSystemAdapter {
  // ── Config ────────────────────────────────────────────
  getConfig(): Promise<any>;
  saveConfig(config: any): Promise<void>;

  // ── Blogs ─────────────────────────────────────────────
  getBlogs(): Promise<BlogPost[]>;
  getBlog(id: string): Promise<BlogPost | null>;
  createBlog(data: Partial<BlogPost>): Promise<BlogPost>;
  updateBlog(id: string, data: Partial<BlogPost>): Promise<BlogPost>;
  deleteBlog(id: string): Promise<void>;

  // ── Events ────────────────────────────────────────────
  getEvents(): Promise<EventItem[]>;
  getEvent(id: string): Promise<EventItem | null>;
  createEvent(data: Partial<EventItem>): Promise<EventItem>;
  updateEvent(id: string, data: Partial<EventItem>): Promise<EventItem>;
  deleteEvent(id: string): Promise<void>;

  // ── Categories ────────────────────────────────────────
  getCategories(): Promise<Category[]>;
  createCategory(name: string, type: "blog" | "event"): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // ── File Uploads ──────────────────────────────────────
  uploadFile(
    file: File,
    provider: string,
    folder?: string
  ): Promise<string>; // returns public URL
}
```

---

## Storage Providers

The `uploadFile` method in your adapter receives a `provider` string that comes from the admin panel's storage settings. You can support any provider. Common implementations:

```ts
uploadFile: async (file, provider, folder) => {
  if (provider === "cloudinary") {
    // upload to Cloudinary, return secure_url
  }
  if (provider === "supabase") {
    // upload to Supabase Storage, return public URL
  }
  if (provider === "s3") {
    // upload to S3, return object URL
  }
  if (provider === "local_storage") {
    // save to /public/uploads, return /uploads/filename
  }
  throw new Error(`Unknown storage provider: ${provider}`);
},
```

---

## Rich Text Features

The editor (`PostEditor`) supports the following formatting that is **saved to the database as HTML** and rendered faithfully by `BlogRenderer`:

| Feature | Saved as |
|---|---|
| **Font family** (Arial, Georgia, Times New Roman, Courier New, Trebuchet, Verdana) | CSS class e.g. `ql-font-georgia` |
| **Font size** (10px – 64px) | Inline style e.g. `style="font-size: 24px"` |
| **Headings** (H1–H4) | `<h1>` – `<h4>` tags |
| **Bold / Italic / Underline / Strikethrough** | `<strong>`, `<em>`, `<u>`, `<s>` |
| **Text color / Highlight** | Inline style e.g. `style="color: #e63946"` |
| **Text alignment** (left, center, right, justify) | CSS class e.g. `ql-align-center` |
| **Ordered / Unordered lists** | `<ol>`, `<ul>`, `<li>` |
| **Indent** | CSS class e.g. `ql-indent-2` |
| **Links** (with optional new tab) | `<a href="..." target="_blank">` |
| **Images** (uploaded via your adapter) | `<img src="...">` |
| **Video embeds** | `<iframe>` |
| **Blockquote** | `<blockquote>` |
| **Code block** | `<pre>` |

All of these render correctly when you use `BlogRenderer`. They will **not** render correctly with a raw `dangerouslySetInnerHTML` div or Tailwind's `prose` class.

---

## Tailwind / Prose Warning

> ⚠️ **Do not wrap `BlogRenderer` in a Tailwind `prose` class.**

Tailwind's `prose` class resets and overrides typography styles, which will break the custom fonts, sizes, and alignment the author set in the editor.

```tsx
// ❌ WRONG — prose overrides editor styles
<div className="prose prose-lg">
  <div dangerouslySetInnerHTML={{ __html: post.content }} />
</div>

// ❌ WRONG — same problem
<div className="prose">
  <BlogRenderer html={post.content} />
</div>

// ✅ CORRECT — BlogRenderer manages its own styles
<BlogRenderer
  html={post.content}
  style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#333" }}
/>
```

You can still use `prose` for other parts of your page (title, excerpt, metadata). Just keep `BlogRenderer` outside any `prose` wrapper.

---

## TypeScript Types

```ts
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;        // raw HTML from the editor — pass to BlogRenderer
  category: string;
  image: string;
  isFeatured: boolean;
  readTime: string;
  date: string;
  status: "Live" | "Draft";
  created_at?: string;
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  content: string;        // raw HTML from the editor — pass to BlogRenderer
  category: string;
  image: string;
  date: string;
  time: string;
  location: string;
  status: "Live" | "Draft" | "Upcoming" | "Past";
  attendees?: string;
  href?: string;
  created_at?: string;
}

interface Category {
  id: string;
  name: string;
  type: "blog" | "event";
}
```

---

## FAQ

**Q: Do I need to add anything to `globals.css`?**

No. The package is fully self-contained. `BlogRenderer` and `getBlogRendererStyles()` inject all required CSS automatically. Nothing needs to be added to your global stylesheet.

---

**Q: Why does my blog content look unstyled / fonts aren't changing?**

You're either missing `getBlogRendererStyles()` (server components) or wrapping `BlogRenderer` in a `prose` class. See the [Tailwind / Prose Warning](#tailwind--prose-warning) section.

---

**Q: Can I use this with the Next.js Pages Router instead of App Router?**

Yes. In `_app.tsx` or the page component, use the client component approach:

```tsx
"use client"; // or just use it as a regular client component
import { BlogRenderer } from "@your-org/blog-system";

// BlogRenderer injects its own CSS via useEffect — no extra setup needed
<BlogRenderer html={post.content} />
```

---

**Q: Can I customize the styles of rendered content?**

Yes — use the `style` prop on `BlogRenderer` to set your site's base reading defaults. The author's own formatting (fonts, sizes, colors) always takes priority over these defaults.

```tsx
<BlogRenderer
  html={post.content}
  style={{
    fontFamily: "Lora, serif",
    fontSize: "18px",
    color: "#2d2d2d",
    lineHeight: "1.9",
  }}
/>
```

---

**Q: How do links work? Can they open in a new tab?**

Yes. When the author inserts a link in the editor they can check "Open in new tab". This saves `target="_blank" rel="noopener noreferrer"` directly in the HTML. `BlogRenderer` renders the `<a>` tag as-is, so links work exactly as the author intended.

---

**Q: What database does this work with?**

Any database — the adapter pattern means you write the DB logic yourself. Common setups include Supabase (PostgreSQL), PlanetScale (MySQL), MongoDB, Neon, and Firebase. The package only calls the methods on your adapter; it never connects to a database directly.

---

**Q: What's the `content` field in the database?**

It's a raw HTML string. Store it as `TEXT` or `LONGTEXT` in SQL, or as a `string` field in NoSQL. There's no special format — it's the same HTML the browser renders.

```sql
-- PostgreSQL / Supabase
CREATE TABLE blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,          -- stores the rich-text HTML
  category TEXT,
  image TEXT,
  is_featured BOOLEAN DEFAULT false,
  read_time TEXT,
  date TEXT,
  status TEXT DEFAULT 'Live',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

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

## 🎨 Tailwind CSS Config (Crucial for Styling)

Because `@maphorbs/blog-system` renders a stunning glassmorphic UI using Tailwind CSS classes, you **must** configure Tailwind in your host project to scan the package's compiled build outputs. Otherwise, the styles will not load properly.

### For Tailwind CSS v4 (Standard `@source` directives)
Add the following `@source` rules directly inside your main CSS file (e.g., `app/globals.css` or `styles/globals.css`) right after importing Tailwind:

```css
@import "tailwindcss";

/* Scan the blog system package for Tailwind styles */
@source "../node_modules/@maphorbs/blog-system/dist/**/*.js";
@source "../node_modules/@maphorbs/blog-system/dist/**/*.mjs";
```

### For Tailwind CSS v3 (`tailwind.config.js` content array)
Add the package paths to the `content` array inside your `tailwind.config.js` file:

```javascript
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    // Add the package compiled source paths:
    "./node_modules/@maphorbs/blog-system/dist/**/*.{js,mjs}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

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
