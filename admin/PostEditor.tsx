"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { BlogSystemAdapter } from "../types";

// ─── Quill format registration flag ──────────────────────────────────────────
let quillFormatsRegistered = false;

// ─── Dynamic Quill import ─────────────────────────────────────────────────────
const ReactQuill = dynamic(
  async () => {
    const { default: RQ, Quill } = await import("react-quill-new");

    // Register formats here after ESM import resolves (no require() needed)
    if (!quillFormatsRegistered) {
      quillFormatsRegistered = true;

      // Font families
      const Font = Quill.import("formats/font") as any;
      Font.whitelist = [
        "sans-serif",
        "serif",
        "monospace",
        "arial",
        "georgia",
        "times-new-roman",
        "courier-new",
        "trebuchet",
        "verdana",
      ];
      Quill.register(Font, true);

      // Font sizes (stored as inline style via the style attributor)
      const SizeStyle = Quill.import("attributors/style/size") as any;
      SizeStyle.whitelist = [
        "10px", "11px", "12px", "13px", "14px", "15px", "16px",
        "18px", "20px", "22px", "24px", "28px", "32px", "36px",
        "40px", "48px", "56px", "64px",
      ];
      Quill.register(SizeStyle, true);
    }

    const QuillWrapper = React.forwardRef<any, any>((props, ref) => (
      <RQ ref={ref} {...props} />
    ));
    QuillWrapper.displayName = "QuillWrapper";
    return QuillWrapper;
  },
  { ssr: false }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatForDateInput = (dStr: string) => {
  if (!dStr) return "";
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  // Fallback: try to parse legacy locale strings (e.g. "Jun 17, 2026")
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
};

const formatForTimeInput = (tStr: string) => {
  if (!tStr) return "";
  const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return "";
  const [, hours, mins, ampm] = match;
  let h = parseInt(hours, 10);
  if (ampm) {
    if (ampm.toUpperCase() === "PM" && h < 12) h += 12;
    if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
  }
  return `${String(h).padStart(2, "0")}:${mins}`;
};

const inputCls =
  "w-full bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm text-black placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

// ─── Quill CSS injected into the page (font classes + size classes) ───────────
const QUILL_EXTRA_CSS = `
  /* ── Font family classes ── */
  .ql-font-arial        { font-family: Arial, Helvetica, sans-serif !important; }
  .ql-font-georgia      { font-family: Georgia, 'Times New Roman', serif !important; }
  .ql-font-times-new-roman { font-family: 'Times New Roman', Times, serif !important; }
  .ql-font-courier-new  { font-family: 'Courier New', Courier, monospace !important; }
  .ql-font-trebuchet    { font-family: 'Trebuchet MS', Helvetica, sans-serif !important; }
  .ql-font-verdana      { font-family: Verdana, Geneva, sans-serif !important; }
  .ql-font-serif        { font-family: serif !important; }
  .ql-font-monospace    { font-family: monospace !important; }
  .ql-font-sans-serif   { font-family: sans-serif !important; }

  /* ── Toolbar font picker labels ── */
  .ql-font .ql-picker-label[data-value="arial"]::before,
  .ql-font .ql-picker-item[data-value="arial"]::before         { content: "Arial"; font-family: Arial, Helvetica, sans-serif; }
  .ql-font .ql-picker-label[data-value="georgia"]::before,
  .ql-font .ql-picker-item[data-value="georgia"]::before       { content: "Georgia"; font-family: Georgia, serif; }
  .ql-font .ql-picker-label[data-value="times-new-roman"]::before,
  .ql-font .ql-picker-item[data-value="times-new-roman"]::before { content: "Times New Roman"; font-family: 'Times New Roman', serif; }
  .ql-font .ql-picker-label[data-value="courier-new"]::before,
  .ql-font .ql-picker-item[data-value="courier-new"]::before   { content: "Courier New"; font-family: 'Courier New', monospace; }
  .ql-font .ql-picker-label[data-value="trebuchet"]::before,
  .ql-font .ql-picker-item[data-value="trebuchet"]::before     { content: "Trebuchet MS"; font-family: 'Trebuchet MS', sans-serif; }
  .ql-font .ql-picker-label[data-value="verdana"]::before,
  .ql-font .ql-picker-item[data-value="verdana"]::before       { content: "Verdana"; font-family: Verdana, sans-serif; }
  .ql-font .ql-picker-label[data-value="serif"]::before,
  .ql-font .ql-picker-item[data-value="serif"]::before         { content: "Serif"; font-family: serif; }
  .ql-font .ql-picker-label[data-value="monospace"]::before,
  .ql-font .ql-picker-item[data-value="monospace"]::before     { content: "Monospace"; font-family: monospace; }
  .ql-font .ql-picker-label[data-value="sans-serif"]::before,
  .ql-font .ql-picker-item[data-value="sans-serif"]::before    { content: "Sans-serif"; }

  /* ── Toolbar size picker labels ── */
  .ql-size .ql-picker-label::before,
  .ql-size .ql-picker-item::before { content: attr(data-value) !important; }
  .ql-size .ql-picker-label:not([data-value])::before,
  .ql-size .ql-picker-item:not([data-value])::before { content: "Default" !important; }

  /* ── Make font picker wider ── */
  .ql-font.ql-picker { width: 130px !important; }
  .ql-size.ql-picker  { width: 72px !important; }

  /* ── Sticky toolbar ── */
  .ql-toolbar.ql-snow {
    position: sticky !important;
    top: 0 !important;
    z-index: 30 !important;
    background: #ffffff !important;
    border-bottom: 1px solid #e2e8f0 !important;
    border-top: none !important;
    border-left: none !important;
    border-right: none !important;
    padding: 10px 12px !important;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .ql-container.ql-snow {
    border: none !important;
    font-size: 15px;
  }
  .ql-editor {
    min-height: 420px;
    padding: 20px 24px;
    color: #1e293b;
    line-height: 1.75;
  }
  .ql-editor.ql-blank::before {
    color: #94a3b8;
    font-style: normal;
  }

  /* ── Links in editor ── */
  .ql-editor a {
    color: #4f46e5;
    text-decoration: underline;
    cursor: pointer;
  }
  .ql-editor a:hover { color: #3730a3; }

  /* ── Tooltip override so it shows inside the editor card ── */
  .ql-tooltip { z-index: 50 !important; }
`;

// ─── URL Modal ────────────────────────────────────────────────────────────────
const UrlModal: React.FC<{
  onInsert: (url: string, text: string, newTab: boolean) => void;
  onClose: () => void;
  initialText?: string;
}> = ({ onInsert, onClose, initialText = "" }) => {
  const [url, setUrl] = useState("https://");
  const [text, setText] = useState(initialText);
  const [newTab, setNewTab] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || url === "https://") return;
    onInsert(url.trim(), text.trim() || url.trim(), newTab);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl border border-slate-100">
        <h3 className="text-lg font-black text-slate-900 mb-5">Insert Link</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoFocus
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Link text (optional — uses URL if blank)
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Click here"
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={newTab}
              onChange={(e) => setNewTab(e.target.checked)}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded cursor-pointer"
            />
            <span className="text-sm font-bold text-slate-600">
              Open in new tab
            </span>
          </label>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors"
            >
              Insert Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const PostEditor: React.FC<{
  adapter: BlogSystemAdapter;
  type: "blog" | "event";
  post?: any;
  categories?: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({ adapter, type, post, categories = [], onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: post?.title || "",
    excerpt: post?.excerpt || post?.description || "",
    content: post?.content || "",
    category: post?.category || "",
    image: post?.image || "",
    isFeatured: post?.isFeatured || false,
    readTime: post?.readTime || "",
    date: post?.date || "",
    time: post?.time || "",
    location: post?.location || "",
    status: post?.status || "Live",
  });

  useEffect(() => {
    if (!formData.category && categories.length > 0) {
      setFormData((prev) => ({ ...prev, category: categories[0].name }));
    }
  }, [categories]);

  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlModalInitialText, setUrlModalInitialText] = useState("");
  const quillRef = useRef<any>(null);

  // ── Image handler ──────────────────────────────────────────────────────────
  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      let provider = "local_storage";
      try {
        const saved = localStorage.getItem("blog_system_config");
        if (saved) {
          const cfg = JSON.parse(saved);
          if (cfg.storage?.provider) provider = cfg.storage.provider;
        }
      } catch {}
      try {
        const imageUrl = await adapter.uploadFile(file, provider, undefined);
        if (quillRef.current) {
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, "image", imageUrl);
          quill.setSelection(range.index + 1);
        }
      } catch {
        alert("Failed to upload image. Please check your storage settings.");
      }
    };
  };

  // ── Custom link handler — opens our modal instead of Quill's built-in ─────
  const linkHandler = () => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const range = quill.getSelection();
    const selectedText = range ? quill.getText(range.index, range.length) : "";
    setUrlModalInitialText(selectedText);
    setShowUrlModal(true);
  };

  // ── Insert link from modal ─────────────────────────────────────────────────
  const handleInsertLink = (url: string, text: string, newTab: boolean) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) { setShowUrlModal(false); return; }

    const range = quill.getSelection(true);

    if (range && range.length > 0) {
      // Format existing selected text as a link
      quill.format("link", url);
      if (newTab) {
        setTimeout(() => {
          const editorEl: HTMLElement | null = quill.root;
          editorEl?.querySelectorAll(`a[href="${url}"]`).forEach((el) => {
            (el as HTMLAnchorElement).target = "_blank";
            (el as HTMLAnchorElement).rel = "noopener noreferrer";
          });
        }, 50);
      }
    } else {
      // No selection — insert new text as a link
      quill.insertText(range.index, text, "link", url);
      if (newTab) {
        setTimeout(() => {
          const editorEl: HTMLElement | null = quill.root;
          editorEl?.querySelectorAll(`a[href="${url}"]`).forEach((el) => {
            (el as HTMLAnchorElement).target = "_blank";
            (el as HTMLAnchorElement).rel = "noopener noreferrer";
          });
        }, 50);
      }
      quill.setSelection(range.index + text.length);
    }

    // Sync content back to state
    setFormData((prev) => ({ ...prev, content: quill.root.innerHTML }));
    setShowUrlModal(false);
  };

  // ── Banner upload ──────────────────────────────────────────────────────────
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    let provider = "local_storage";
    try {
      const saved = localStorage.getItem("blog_system_config");
      if (saved) {
        const cfg = JSON.parse(saved);
        if (cfg.storage?.provider) provider = cfg.storage.provider;
      }
    } catch {}
    try {
      const imageUrl = await adapter.uploadFile(file, provider);
      setFormData((prev) => ({ ...prev, image: imageUrl }));
    } catch {
      alert("Failed to upload banner image.");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // ── Quill modules ──────────────────────────────────────────────────────────
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          // Row 1 — font & size
          [
            {
              font: [
                false, // default (no class)
                "arial",
                "georgia",
                "times-new-roman",
                "courier-new",
                "trebuchet",
                "verdana",
                "serif",
                "monospace",
              ],
            },
            {
              size: [
                false, // default
                "10px", "11px", "12px", "13px", "14px", "15px",
                "16px", "18px", "20px", "22px", "24px", "28px",
                "32px", "36px", "40px", "48px", "56px", "64px",
              ],
            },
          ],
          // Row 2 — headings
          [{ header: [1, 2, 3, 4, false] }],
          // Row 3 — inline formatting
          ["bold", "italic", "underline", "strike"],
          // Row 4 — color
          [{ color: [] }, { background: [] }],
          // Row 5 — alignment
          [{ align: [] }],
          // Row 6 — lists & indent
          [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
          // Row 7 — media & links
          ["link", "image", "video"],
          // Row 8 — blockquote, code, clean
          ["blockquote", "code-block", "clean"],
        ],
        handlers: {
          image: imageHandler,
          link: linkHandler,
        },
      },
      // Allow target/rel attributes on links so _blank is preserved
      clipboard: {
        matchVisual: false,
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Quill formats whitelist — must include everything we use
  // NOTE: "bullet" is NOT a valid Quill 2 format; bullet lists use { list: "bullet" }
  // which is covered by "list" below. Including "bullet" causes a console warning.
  const formats = [
    "font", "size",
    "header",
    "bold", "italic", "underline", "strike",
    "color", "background",
    "align",
    "list", "indent",
    "link", "image", "video",
    "blockquote", "code-block",
  ];

  const filteredCategories = categories.filter((c) => c.type === type);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Inject Quill font/size CSS globally once */}
      <style>{QUILL_EXTRA_CSS}</style>

      {showUrlModal && (
        <UrlModal
          initialText={urlModalInitialText}
          onInsert={handleInsertLink}
          onClose={() => setShowUrlModal(false)}
        />
      )}

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">

        {/* ── Tab bar ──────────────────────────────────────────────────────── */}
        <div className="flex bg-slate-50/50 border-b border-slate-100 p-2">
          {(["Editor", "Preview"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setPreview(tab === "Preview")}
              className={`flex-1 py-3 rounded-2xl font-black text-sm tracking-tight transition-all ${
                preview === (tab === "Preview")
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── PREVIEW ──────────────────────────────────────────────────────── */}
        {preview ? (
          <div className="p-10 max-w-none">
            {formData.isFeatured && (
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-600 mb-4 uppercase tracking-widest">
                ★ Featured
              </span>
            )}
            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-6">
              {formData.title || "Untitled"}
            </h1>
            {formData.image && (
              <div className="relative h-80 rounded-3xl overflow-hidden mb-8 shadow-xl">
                <img src={formData.image} alt="Banner" className="w-full h-full object-cover" />
              </div>
            )}
            {formData.excerpt && (
              <div className="text-xl text-slate-500 font-medium italic mb-8 border-l-4 border-indigo-500 pl-6">
                {formData.excerpt}
              </div>
            )}
            {/* Render with ql-editor so font/size classes resolve correctly */}
            <div
              className="ql-editor !min-h-0 !p-0"
              dangerouslySetInnerHTML={{
                __html: formData.content || "<p style='color:#cbd5e1'>No content yet…</p>",
              }}
            />
          </div>
        ) : (
          /* ── EDITOR ────────────────────────────────────────────────────── */
          <div className="divide-y divide-slate-100">

            {/* Title */}
            <div className="px-10 py-8">
              <input
                type="text"
                placeholder="Enter a compelling title…"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                className="w-full text-3xl font-black border-none outline-none focus:ring-0 text-black placeholder:text-slate-200 tracking-tight bg-transparent"
              />
            </div>

            {/* Meta row */}
            <div className="px-10 py-6 flex flex-wrap items-center gap-6 bg-slate-50/40">
              {/* Category */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</span>
                {filteredCategories.length > 0 ? (
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                    className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-black outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                    placeholder="e.g. Politics"
                    className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-black placeholder:text-slate-400 outline-none focus:border-indigo-500 w-32"
                  />
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                  className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-black outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Live">Live</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>

              {/* Featured */}
              <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData((p) => ({ ...p, isFeatured: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 border-slate-300 rounded cursor-pointer"
                />
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Featured</span>
              </label>
            </div>

            {/* Fields grid */}
            <div className="px-10 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Banner */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Banner Image
                </label>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  {formData.image && (
                    <img src={formData.image} alt="Banner" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      disabled={isUploadingBanner}
                      className="text-xs text-black w-full"
                    />
                    {isUploadingBanner && (
                      <p className="text-xs text-indigo-600 font-bold mt-1">Uploading…</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Blog — read time */}
              {type === "blog" && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Read Time
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="1"
                      placeholder="5"
                      value={String(formData.readTime).replace(/\D/g, "")}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          readTime: e.target.value ? `${e.target.value} min read` : "",
                        }))
                      }
                      className={`${inputCls} pr-24`}
                    />
                    <span className="absolute right-4 text-sm font-bold text-slate-400 pointer-events-none">
                      min read
                    </span>
                  </div>
                </div>
              )}

              {/* Event — date / time / location */}
              {type === "event" && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                    <input
                      type="date"
                      value={formatForDateInput(formData.date)}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Store as ISO date string (YYYY-MM-DD) — safe for DB and display
                        setFormData((p) => ({ ...p, date: val }));
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Time</label>
                    <input
                      type="time"
                      value={formatForTimeInput(formData.time)}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) { setFormData((p) => ({ ...p, time: "" })); return; }
                        const [hours, mins] = val.split(":");
                        let h = parseInt(hours, 10);
                        const ampm = h >= 12 ? "PM" : "AM";
                        h = h % 12 || 12;
                        setFormData((p) => ({ ...p, time: `${h}:${mins} ${ampm}` }));
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Lagos, Nigeria"
                      value={formData.location}
                      onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Excerpt */}
            <div className="px-10 py-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {type === "blog" ? "Short Summary (Excerpt)" : "Event Description"}
              </label>
              <textarea
                placeholder="Write a brief intro…"
                value={formData.excerpt}
                onChange={(e) => setFormData((p) => ({ ...p, excerpt: e.target.value }))}
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-black font-medium italic resize-none text-lg placeholder:text-slate-300"
                rows={2}
              />
            </div>

            {/* Rich-text editor */}
            <div>
              <div className="px-10 pt-6 pb-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {type === "blog" ? "Article Content" : "Event Details (optional)"}
                </label>
              </div>
              <div className="border-t border-slate-100">
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={formData.content}
                  onChange={(val: string) => setFormData((p) => ({ ...p, content: val }))}
                  modules={modules}
                  formats={formats}
                  placeholder="Start writing your story here…"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="bg-slate-50/50 px-10 py-6 flex justify-end items-center gap-6 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="text-slate-400 font-bold hover:text-slate-600 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={() => {
              // The events DB schema uses `description` (NOT NULL), not `excerpt`.
              // Blogs use `excerpt`. Remap here so the correct field reaches the DB.
              const payload =
                type === "event"
                  ? {
                      ...formData,
                      description: formData.excerpt || "",
                      // Ensure NOT NULL fields are never undefined
                      title:    formData.title    || "",
                      time:     formData.time     || "",
                      location: formData.location || "",
                      category: formData.category || "",
                      image:    formData.image    || "",
                    }
                  : formData;
              onSave(payload);
            }}
            className="px-10 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:scale-[1.02] active:scale-95"
          >
            {post ? "Save Changes" : type === "blog" ? "Publish Article" : "Publish Event"}
          </button>
        </div>
      </div>
    </>
  );
};