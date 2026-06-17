"use client";

import React from "react";
import Image from "next/image";
import { BlogRenderer } from "./BlogRenderer";

interface PostPreviewProps {
  type: "blog" | "event";
  post: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

export const PostPreview: React.FC<PostPreviewProps> = ({
  type,
  post,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  if (!post) return null;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
      {/* Admin Action Bar */}
      <div className="bg-slate-50 border-b border-slate-200/60 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {type === "blog" ? "Blog Preview" : "Event Preview"}
          </span>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                post.status?.toLowerCase() === "draft"
                  ? "bg-slate-200 text-slate-600"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {post.status?.toLowerCase() === "draft" ? "Draft" : "Live"}
            </span>
            {post.isFeatured && (
              <span className="px-3 py-1 bg-amber-100 text-amber-600 text-[10px] rounded-full uppercase tracking-wider font-black">
                Featured
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleStatus}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
          >
            {post.status?.toLowerCase() === "draft" ? "Publish Post" : "Unpublish Post"}
          </button>
          <button
            onClick={onEdit}
            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-5 py-2.5 bg-rose-50 border border-rose-100 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Content Preview */}
      <div className="p-8 md:p-12 max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="text-indigo-600 font-bold text-sm uppercase tracking-widest mb-4">
            {post.category}
            {post.date ? ` • ${post.date}` : ""}
            {type === "event" && post.time ? ` • ${post.time}` : ""}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-6">
            {post.title}
          </h1>
          {(post.excerpt || post.description) && (
            <p className="text-xl text-slate-500 font-medium leading-relaxed mb-8">
              {post.excerpt || post.description}
            </p>
          )}
        </div>

        {post.image && (
          <div className="w-full h-[400px] relative rounded-3xl overflow-hidden mb-12 shadow-lg">
            <Image src={post.image} alt={post.title} fill className="object-cover" />
          </div>
        )}

        {/* ── Rich-text content rendered via BlogRenderer ── */}
        {post.content ? (
          <BlogRenderer
            html={post.content}
            style={{ fontSize: "17px", color: "#334155", lineHeight: "1.85" }}
          />
        ) : post.description ? (
          <p className="text-lg leading-relaxed text-slate-700">{post.description}</p>
        ) : null}

        {/* Event details block */}
        {type === "event" && (
          <div className="mt-12 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-xl mb-4">Event Information</h3>
            <ul className="space-y-3 text-slate-600">
              {post.date && (
                <li>
                  <strong className="text-slate-800">Date:</strong> {post.date}
                </li>
              )}
              {post.time && (
                <li>
                  <strong className="text-slate-800">Time:</strong> {post.time}
                </li>
              )}
              {post.location && (
                <li>
                  <strong className="text-slate-800">Location:</strong> {post.location}
                </li>
              )}
              {post.attendees && (
                <li>
                  <strong className="text-slate-800">Attendees expected:</strong> {post.attendees}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};