"use client";

import React, { useState, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import { BlogSystemAdapter } from "../types";

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill-new");
    const QuillWrapper = React.forwardRef<any, any>((props, ref) => (
      <RQ ref={ref} {...props} />
    ));
    QuillWrapper.displayName = "QuillWrapper";
    return QuillWrapper;
  },
  { ssr: false }
);

const formatForDateInput = (dStr: string) => {
  if (!dStr) return "";
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
  const [_, hours, mins, ampm] = match;
  let h = parseInt(hours, 10);
  if (ampm) {
    if (ampm.toUpperCase() === "PM" && h < 12) h += 12;
    if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
  }
  return `${String(h).padStart(2, "0")}:${mins}`;
};

const inputCls =
  "w-full bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm text-black placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

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

  React.useEffect(() => {
    if (!formData.category && categories.length > 0) {
      setFormData((prev) => ({ ...prev, category: categories[0].name }));
    }
  }, [categories]);

  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [preview, setPreview] = useState(false);
  const quillRef = useRef<any>(null);

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
      setFormData({ ...formData, image: imageUrl });
    } catch {
      alert("Failed to upload banner image.");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: { image: imageHandler },
      },
    }),
    []
  );

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <>
      {/* Sticky toolbar override styles */}
      <style>{`
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
      `}</style>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
        {/* Tab bar */}
        <div className="flex bg-slate-50/50 border-b border-slate-100 p-2">
          <button
            onClick={() => setPreview(false)}
            className={`flex-1 py-3 rounded-2xl font-black text-sm tracking-tight transition-all ${
              !preview
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setPreview(true)}
            className={`flex-1 py-3 rounded-2xl font-black text-sm tracking-tight transition-all ${
              preview
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Preview
          </button>
        </div>

        {preview ? (
          /* ── PREVIEW ────────────────────────────────────────── */
          <div className="p-10 prose prose-slate max-w-none">
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
                <img
                  src={formData.image}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="text-xl text-slate-500 font-medium italic mb-8 border-l-4 border-indigo-500 pl-6">
              {formData.excerpt}
            </div>
            <div
              className="text-slate-700 leading-relaxed ql-editor"
              dangerouslySetInnerHTML={{
                __html:
                  formData.content ||
                  "<p class='text-slate-300'>No content yet...</p>",
              }}
            />
          </div>
        ) : (
          /* ── EDITOR ─────────────────────────────────────────── */
          <div className="divide-y divide-slate-100">
            {/* Title */}
            <div className="px-10 py-8">
              <input
                type="text"
                placeholder="Enter a compelling title..."
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full text-3xl font-black border-none outline-none focus:ring-0 text-black placeholder:text-slate-200 tracking-tight bg-transparent"
              />
            </div>

            {/* Meta row */}
            <div className="px-10 py-6 flex flex-wrap items-center gap-6 bg-slate-50/40">
              {/* Category */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Category
                </span>
                {filteredCategories.length > 0 ? (
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-black outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="e.g. Politics"
                    className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-black placeholder:text-slate-400 outline-none focus:border-indigo-500 w-32"
                  />
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Status
                </span>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, isFeatured: e.target.checked })
                  }
                  className="w-4 h-4 text-amber-500 border-slate-300 rounded cursor-pointer"
                />
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                  Featured
                </span>
              </label>
            </div>

            {/* Fields grid */}
            <div className="px-10 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Banner image */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Banner Image
                </label>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  {formData.image && (
                    <img
                      src={formData.image}
                      alt="Banner"
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
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
                      <p className="text-xs text-indigo-600 font-bold mt-1">
                        Uploading…
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Blog: read time / Event: date + time + location */}
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
                        setFormData({
                          ...formData,
                          readTime: e.target.value
                            ? `${e.target.value} min read`
                            : "",
                        })
                      }
                      className={`${inputCls} pr-24`}
                    />
                    <span className="absolute right-4 text-sm font-bold text-slate-400 pointer-events-none">
                      min read
                    </span>
                  </div>
                </div>
              )}

              {type === "event" && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formatForDateInput(formData.date)}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setFormData({ ...formData, date: "" });
                        } else {
                          const [y, m, d] = val.split("-");
                          const local = new Date(+y, +m - 1, +d);
                          setFormData({
                            ...formData,
                            date: local.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }),
                          });
                        }
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={formatForTimeInput(formData.time)}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setFormData({ ...formData, time: "" });
                        } else {
                          const [hours, mins] = val.split(":");
                          let h = parseInt(hours, 10);
                          const ampm = h >= 12 ? "PM" : "AM";
                          h = h % 12 || 12;
                          setFormData({
                            ...formData,
                            time: `${h}:${mins} ${ampm}`,
                          });
                        }
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lagos, Nigeria"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className={inputCls}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Excerpt / description */}
            <div className="px-10 py-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {type === "blog" ? "Short Summary (Excerpt)" : "Event Description"}
              </label>
              <textarea
                placeholder="Write a brief intro…"
                value={formData.excerpt}
                onChange={(e) =>
                  setFormData({ ...formData, excerpt: e.target.value })
                }
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-black font-medium italic resize-none text-lg placeholder:text-slate-300"
                rows={2}
              />
            </div>

            {/* Rich-text editor — toolbar is sticky within this block */}
            <div>
              <div className="px-10 pt-6 pb-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {type === "blog"
                    ? "Article Content"
                    : "Event Details (optional)"}
                </label>
              </div>
              {/* This wrapper must NOT be overflow-hidden so the sticky toolbar works */}
              <div className="border-t border-slate-100">
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={formData.content}
                  onChange={(val: string) =>
                    setFormData({ ...formData, content: val })
                  }
                  modules={modules}
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
            onClick={() => onSave(formData)}
            className="px-10 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:scale-[1.02] active:scale-95"
          >
            {post ? "Save Changes" : type === "blog" ? "Publish Article" : "Publish Event"}
          </button>
        </div>
      </div>
    </>
  );
};