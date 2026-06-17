"use client";

/**
 * BlogRenderer
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in component for consumers of the blog-system package to render
 * rich-text content saved by the PostEditor.
 *
 * It self-injects all required Quill font/size CSS so consumers do NOT need
 * to add anything to their globals.css or import any stylesheet.
 *
 * Usage (Next.js app router example):
 *
 *   import { BlogRenderer } from "your-blog-system-package";
 *
 *   <BlogRenderer html={post.content} />
 *
 * That's it — fonts, sizes, colors, links, images all render exactly as typed.
 */

import React, { useEffect, useId } from "react";

// ─── CSS that must travel with every rendered post ────────────────────────────
// Covers every font registered in PostEditor + the ql-editor base reset so
// the consumer's own prose/typography styles don't bleed in.
const RENDER_CSS = `
/* ── Quill font family classes ───────────────────────────────────────────── */
.ql-renderer .ql-font-arial         { font-family: Arial, Helvetica, sans-serif !important; }
.ql-renderer .ql-font-georgia       { font-family: Georgia, 'Times New Roman', serif !important; }
.ql-renderer .ql-font-times-new-roman { font-family: 'Times New Roman', Times, serif !important; }
.ql-renderer .ql-font-courier-new   { font-family: 'Courier New', Courier, monospace !important; }
.ql-renderer .ql-font-trebuchet     { font-family: 'Trebuchet MS', Helvetica, sans-serif !important; }
.ql-renderer .ql-font-verdana       { font-family: Verdana, Geneva, sans-serif !important; }
.ql-renderer .ql-font-serif         { font-family: serif !important; }
.ql-renderer .ql-font-monospace     { font-family: monospace !important; }
.ql-renderer .ql-font-sans-serif    { font-family: sans-serif !important; }

/* ── Quill alignment classes ─────────────────────────────────────────────── */
.ql-renderer .ql-align-center  { text-align: center; }
.ql-renderer .ql-align-right   { text-align: right; }
.ql-renderer .ql-align-justify { text-align: justify; }

/* ── Quill indent classes ────────────────────────────────────────────────── */
.ql-renderer .ql-indent-1  { padding-left: 3em; }
.ql-renderer .ql-indent-2  { padding-left: 6em; }
.ql-renderer .ql-indent-3  { padding-left: 9em; }
.ql-renderer .ql-indent-4  { padding-left: 12em; }
.ql-renderer .ql-indent-5  { padding-left: 15em; }
.ql-renderer .ql-indent-6  { padding-left: 18em; }
.ql-renderer .ql-indent-7  { padding-left: 21em; }
.ql-renderer .ql-indent-8  { padding-left: 24em; }

/* ── Base editor reset (prevents consumer typography from overriding) ─────── */
.ql-renderer {
  line-height: 1.75;
  word-break: break-word;
  overflow-wrap: break-word;
}
.ql-renderer p          { margin: 0 0 0.75em; }
.ql-renderer h1         { font-size: 2em;    font-weight: 700; margin: 0.75em 0 0.5em; }
.ql-renderer h2         { font-size: 1.5em;  font-weight: 700; margin: 0.75em 0 0.5em; }
.ql-renderer h3         { font-size: 1.25em; font-weight: 700; margin: 0.75em 0 0.5em; }
.ql-renderer h4         { font-size: 1.1em;  font-weight: 700; margin: 0.75em 0 0.5em; }
.ql-renderer ul, .ql-renderer ol { margin: 0.5em 0 0.75em 1.5em; padding: 0; }
.ql-renderer li         { margin-bottom: 0.25em; }
.ql-renderer blockquote {
  border-left: 4px solid #e2e8f0;
  margin: 1em 0;
  padding: 0.5em 1em;
  color: #64748b;
  font-style: italic;
}
.ql-renderer pre        {
  background: #f1f5f9;
  border-radius: 6px;
  padding: 1em;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  margin: 0.75em 0;
}
.ql-renderer code       {
  background: #f1f5f9;
  border-radius: 3px;
  padding: 0.15em 0.4em;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}
.ql-renderer img        { max-width: 100%; height: auto; border-radius: 8px; margin: 0.5em 0; }
.ql-renderer a          { color: #4f46e5; text-decoration: underline; }
.ql-renderer a:hover    { color: #3730a3; }
.ql-renderer iframe,
.ql-renderer video      { max-width: 100%; border-radius: 8px; margin: 0.5em 0; }
`;

// Singleton: inject the CSS only once per page, regardless of how many
// BlogRenderer instances are mounted.
let cssInjected = false;
function injectCssOnce() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-blog-renderer", "1");
  style.textContent = RENDER_CSS;
  document.head.appendChild(style);
}

// ─── Component ────────────────────────────────────────────────────────────────
interface BlogRendererProps {
  /** Raw HTML string saved by PostEditor (post.content) */
  html: string;
  /** Optional extra className on the wrapper div */
  className?: string;
  /** Optional inline style on the wrapper div */
  style?: React.CSSProperties;
}

export const BlogRenderer: React.FC<BlogRendererProps> = ({
  html,
  className = "",
  style,
}) => {
  useEffect(() => {
    injectCssOnce();
  }, []);

  if (!html) return null;

  return (
    <div
      className={`ql-renderer ${className}`.trim()}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// ─── SSR-safe helper ──────────────────────────────────────────────────────────
/**
 * Returns a <style> tag string for server-rendering contexts (e.g. Next.js
 * server components or generateMetadata). Embed it in your <head> or inline.
 *
 * Example in a Next.js server component:
 *
 *   import { getBlogRendererStyles } from "your-blog-system-package";
 *
 *   export default async function BlogPage() {
 *     return (
 *       <>
 *         <style dangerouslySetInnerHTML={{ __html: getBlogRendererStyles() }} />
 *         <div className="ql-renderer" dangerouslySetInnerHTML={{ __html: post.content }} />
 *       </>
 *     );
 *   }
 */
export function getBlogRendererStyles(): string {
  return RENDER_CSS;
}