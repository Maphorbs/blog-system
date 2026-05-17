"use client";

import React, { useState, useRef, useMemo } from "react";
import { BlogPost } from "../types";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

// Import Quill dynamically and forward the ref to avoid SSR errors and TS issues
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill-new");
    const QuillWrapper = React.forwardRef<any, any>((props, ref) => <RQ ref={ref} {...props} />);
    QuillWrapper.displayName = "QuillWrapper";
    return QuillWrapper;
  },
  { ssr: false }
);

const formatForDateInput = (dStr: string) => {
  if (!dStr) return '';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

const formatForTimeInput = (tStr: string) => {
  if (!tStr) return '';
  const match = tStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return '';
  let [_, hours, mins, ampm] = match;
  let h = parseInt(hours, 10);
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  }
  return `${String(h).padStart(2, '0')}:${mins}`;
};

import { BlogSystemAdapter } from "../types";

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
  
  // Set default category if none selected and categories exist
  React.useEffect(() => {
    if (!formData.category && categories.length > 0) {
      setFormData(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories, formData.category]);

  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const [preview, setPreview] = useState(false);
  const quillRef = useRef<any>(null);

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      // Get storage config from localStorage to determine provider
      let provider = "local_storage";
      let storageConfig = undefined;
      try {
        const savedConfig = localStorage.getItem("blog_system_config");
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          if (config.storage?.provider) {
            provider = config.storage.provider;
          }
        }
      } catch (e) {}

      try {
        const imageUrl = await adapter.uploadFile(file, provider, storageConfig);

        // Insert the image into the editor
        if (quillRef.current) {
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, "image", imageUrl);
          quill.setSelection(range.index + 1);
        }
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("Failed to upload image. Please check your storage settings.");
      }
    };
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;

    setIsUploadingBanner(true);
    let provider = "local_storage";
    try {
      const savedConfig = localStorage.getItem("blog_system_config");
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.storage?.provider) provider = config.storage.provider;
      }
    } catch (err) {}

    try {
      const imageUrl = await adapter.uploadFile(file, provider);
      setFormData({ ...formData, image: imageUrl });
    } catch (error) {
      alert("Failed to upload banner image.");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
      <div className="flex bg-slate-50/50 border-b border-slate-100 p-2">
        <button 
          onClick={() => setPreview(false)}
          className={`flex-1 py-4 rounded-2xl font-black text-sm tracking-tight transition-all ${!preview ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
        >
          Editor Mode
        </button>
        <button 
          onClick={() => setPreview(true)}
          className={`flex-1 py-4 rounded-2xl font-black text-sm tracking-tight transition-all ${preview ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
        >
          Live Preview
        </button>
      </div>

      <div className="p-10">
        {preview ? (
          <div className="prose prose-slate max-w-none">
            {formData.isFeatured && (
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-600 mb-4 uppercase tracking-widest">
                ★ Featured Content
              </span>
            )}
            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-6">{formData.title || "Untitled Article"}</h1>
            {formData.image && (
              <div className="relative h-96 rounded-3xl overflow-hidden mb-8 shadow-xl">
                <img src={formData.image} alt="Header" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="text-xl text-slate-500 font-medium italic mb-8 border-l-4 border-indigo-500 pl-6">{formData.excerpt}</div>
            <div className="text-slate-700 leading-relaxed text-lg ql-editor" dangerouslySetInnerHTML={{ __html: formData.content || "<p className='text-slate-300'>No content yet...</p>" }} />
          </div>
        ) : (
          <div className="space-y-8">
            <input
              type="text"
              placeholder="Enter a compelling title..."
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full text-4xl font-black border-none outline-none focus:ring-0 placeholder-slate-200 tracking-tight"
            />
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category:</span>
                {categories.length > 0 ? (
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    placeholder="e.g. Politics"
                    className="px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 w-32"
                  />
                )}
              </div>



              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={formData.isFeatured}
                  onChange={e => setFormData({...formData, isFeatured: e.target.checked})}
                  className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Mark as Featured</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Banner Image</label>
                <div className="flex gap-4 items-center">
                  {formData.image && <img src={formData.image} alt="Banner" className="w-12 h-12 rounded object-cover" />}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleBannerUpload} 
                    className="text-xs"
                    disabled={isUploadingBanner}
                  />
                  {isUploadingBanner && <span className="text-xs text-indigo-600 font-bold">Uploading...</span>}
                </div>
              </div>

              {type === "blog" && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Read Time</label>
                  <div className="relative flex items-center">
                    <input 
                      type="number"
                      min="1"
                      placeholder="e.g. 5"
                      value={String(formData.readTime).replace(/\D/g, '')}
                      onChange={e => setFormData({...formData, readTime: e.target.value ? `${e.target.value} min read` : ''})}
                      className="w-full bg-white border border-slate-200 px-4 py-2 pr-24 rounded-lg text-sm outline-none focus:border-indigo-500"
                    />
                    <span className="absolute right-4 text-sm font-bold text-slate-400 pointer-events-none">min read</span>
                  </div>
                </div>
              )}

              {type === "event" && (
                <>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Date</label>
                    <input 
                      type="date"
                      value={formatForDateInput(formData.date)}
                      onChange={e => {
                        const val = e.target.value;
                        if (!val) {
                          setFormData({...formData, date: ''});
                        } else {
                          const parts = val.split('-');
                          const localD = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
                          setFormData({...formData, date: localD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })});
                        }
                      }}
                      className="w-full bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Time</label>
                    <input 
                      type="time"
                      value={formatForTimeInput(formData.time)}
                      onChange={e => {
                         const val = e.target.value;
                         if (!val) {
                           setFormData({...formData, time: ''});
                         } else {
                           let [hours, minutes] = val.split(':');
                           let h = parseInt(hours, 10);
                           const ampm = h >= 12 ? 'PM' : 'AM';
                           h = h % 12;
                           h = h ? h : 12;
                           setFormData({...formData, time: `${h}:${minutes} ${ampm}`});
                         }
                      }}
                      className="w-full bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Location</label>
                    <input 
                      type="text"
                      placeholder="e.g. Lagos, Nigeria"
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{type === "blog" ? "Short Summary (Excerpt)" : "Event Description"}</label>
              <textarea
                placeholder="Write a brief intro..."
                value={formData.excerpt}
                onChange={e => setFormData({...formData, excerpt: e.target.value})}
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-slate-600 font-medium italic resize-none text-lg"
                rows={2}
              />
            </div>

            <div className="border-t border-slate-100 pt-8">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{type === "blog" ? "Article Content (Rich Text)" : "Event Details (Optional Rich Text)"}</label>
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200">
                <ReactQuill 
                  ref={quillRef}
                  theme="snow" 
                  value={formData.content} 
                  onChange={(val: string) => setFormData({...formData, content: val})} 
                  modules={modules}
                  placeholder="Start writing your story here. Highlight text to format or insert images..."
                  className="h-[500px] border-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-50/50 px-10 py-8 flex justify-end items-center gap-6 border-t border-slate-100 mt-10">
        <button onClick={onCancel} className="text-slate-400 font-bold hover:text-slate-600 transition-colors">Discard Draft</button>
        <button 
          onClick={() => onSave(formData)}
          className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:scale-[1.02] active:scale-95"
        >
          {type === "blog" ? "Publish Article" : "Publish Event"}
        </button>
      </div>
    </div>
  );
};
