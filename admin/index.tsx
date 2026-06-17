"use client";

import React, { useState, useEffect } from "react";
import { WelcomeView } from "./WelcomeView";
import { ConnectionView } from "./ConnectionView";
import { DashboardView } from "./DashboardView";
import { LoginView } from "./LoginView";
import { PostEditor } from "./PostEditor";
import { PostPreview } from "./PostPreview";
import toast from "react-hot-toast";

import { BlogSystemAdapter } from "../types";

type AdminState =
  | "loading"
  | "welcome"
  | "setup"
  | "login"
  | "dashboard"
  | "editing_blog"
  | "editing_event"
  | "viewing_blog"
  | "viewing_event";

export const BlogAdmin: React.FC<{ adapter: BlogSystemAdapter }> = ({ adapter }) => {
  const [view, setView] = useState<AdminState>("loading");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [config, setConfig] = useState<any>(null);
  const [blogs, setBlogs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "blog" | "event" | "category";
    id: string;
  } | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const [blogData, eventData, catData] = await Promise.all([
        adapter.getBlogs(),
        adapter.getEvents(),
        adapter.getCategories(),
      ]);
      setBlogs(blogData);
      setEvents(eventData);
      setCategories(catData);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const data = await adapter.getConfig();
        if (data && data.db) {
          setConfig(data);
          const isLoggedIn = localStorage.getItem("is_admin_logged_in");
          if (isLoggedIn) {
            setView("dashboard");
            fetchStats();
          } else {
            setView("login");
          }
        } else {
          setView("welcome");
        }
      } catch {
        setView("welcome");
      }
    };
    checkConfig();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSetupComplete = (newConfig: any) => {
    setConfig(newConfig);
    localStorage.setItem("is_admin_logged_in", "true");
    setView("dashboard");
    fetchStats();
  };

  const handleLogout = () => {
    localStorage.removeItem("is_admin_logged_in");
    setView("login");
  };

  const handleCreateCategory = async (name: string, type: "blog" | "event") => {
    const toastId = toast.loading("Adding category...");
    try {
      await adapter.createCategory(name, type);
      toast.success("Category added", { id: toastId });
      fetchStats();
    } catch {
      toast.error("Failed to add category", { id: toastId });
    }
  };

  const handleDeleteCategory = (id: string) => {
    setDeleteConfirm({ type: "category", id });
  };

  const handleEditPost = (type: "blog" | "event", item: any) => {
    setEditingItem(item);
    setView(type === "blog" ? "editing_blog" : "editing_event");
  };

  const handleViewPost = (type: "blog" | "event", item: any) => {
    setViewingItem(item);
    setView(type === "blog" ? "viewing_blog" : "viewing_event");
  };

  const handleDeletePost = (type: "blog" | "event", id: string) => {
    setDeleteConfirm({ type, id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    setDeleteConfirm(null);

    const isCat = type === "category";
    const toastId = toast.loading(`Deleting ${type}...`);

    try {
      if (type === "blog") await adapter.deleteBlog(id);
      else if (type === "event") await adapter.deleteEvent(id);
      else await adapter.deleteCategory(id);

      toast.success(`${isCat ? "Category" : "Post"} deleted`, { id: toastId });
      fetchStats();
      if (view === "viewing_blog" || view === "viewing_event") {
        setView("dashboard");
      }
    } catch {
      toast.error(`Failed to delete ${type}`, { id: toastId });
    }
  };

  const handleToggleStatus = async (type: "blog" | "event", item: any) => {
    const toastId = toast.loading("Updating status...");
    try {
      const newStatus = item.status?.toLowerCase() === "draft" ? "Live" : "Draft";
      if (type === "blog") {
        await adapter.updateBlog(item.id, { ...item, status: newStatus });
      } else {
        await adapter.updateEvent(item.id, { ...item, status: newStatus });
      }
      toast.success(`Status updated to ${newStatus}`, { id: toastId });
      fetchStats();
    } catch {
      toast.error("Failed to update status", { id: toastId });
    }
  };

  // ── Combined activity log ──────────────────────────────────────────────────
  const combinedLogs = [
    ...blogs.map((b) => ({
      title: b.title,
      type: "Blog",
      status: b.status || "Published",
      time: b.date || "Recently",
      dateObj: new Date(b.created_at || new Date()),
    })),
    ...events.map((e) => ({
      title: e.title,
      type: "Event",
      status: e.status || "Scheduled",
      time: e.date || "Recently",
      dateObj: new Date(e.created_at || new Date()),
    })),
  ]
    .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
    .slice(0, 5);

  // ── View renderer ──────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (view) {
      // ── Loading ────────────────────────────────────────────────────────────
      case "loading":
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse flex items-center gap-2">
              <div className="w-4 h-4 bg-indigo-500 rounded-full" />
              <div className="text-xl font-bold text-slate-400">Loading System...</div>
            </div>
          </div>
        );

      // ── Welcome / onboarding ───────────────────────────────────────────────
      case "welcome":
        return <WelcomeView onGetStarted={() => setView("setup")} />;

      // ── Login ──────────────────────────────────────────────────────────────
      case "login":
        return (
          <LoginView
            onLogin={() => {
              setView("dashboard");
              fetchStats();
            }}
          />
        );

      // ── Setup / connection ─────────────────────────────────────────────────
      case "setup":
        return (
          <ConnectionView
            adapter={adapter}
            onComplete={handleSetupComplete}
            onBack={() => setView("welcome")}
          />
        );

      // ── Dashboard ──────────────────────────────────────────────────────────
      case "dashboard":
        return (
          <DashboardView
            adapter={adapter}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={handleLogout}
            onNewPost={(type) => {
              setEditingItem(null);
              setView(type === "blog" ? "editing_blog" : "editing_event");
            }}
            onEditPost={handleEditPost}
            onViewPost={handleViewPost}
            onDeletePost={handleDeletePost}
            onToggleStatus={handleToggleStatus}
            stats={{
              blogs: blogs.length,
              events: events.length,
              views: 1240,
            }}
            recentLogs={combinedLogs}
            blogs={blogs}
            events={events}
            categories={categories}
            onCreateCategory={handleCreateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );

      // ── Create / edit blog or event ────────────────────────────────────────
      case "editing_blog":
      case "editing_event": {
        const editType = view === "editing_blog" ? "blog" : "event";
        return (
          <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
              <button
                onClick={() => setView("dashboard")}
                className="mb-6 text-gray-500 hover:text-gray-900 flex items-center gap-2 font-bold"
              >
                ← Back to Dashboard
              </button>
              <PostEditor
                adapter={adapter}
                type={editType}
                post={editingItem}
                categories={categories.filter((c) => c.type === editType)}
                onSave={async (data) => {
                  const toastId = toast.loading(
                    `Saving ${editType === "blog" ? "blog" : "event"}...`
                  );
                  try {
                    const isUpdate = !!editingItem?.id;
                    if (editType === "blog") {
                      if (isUpdate) await adapter.updateBlog(editingItem.id, data);
                      else await adapter.createBlog(data);
                    } else {
                      if (isUpdate) await adapter.updateEvent(editingItem.id, data);
                      else await adapter.createEvent(data);
                    }
                    toast.success(
                      `${editType === "blog" ? "Blog" : "Event"} published successfully!`,
                      { id: toastId }
                    );
                    fetchStats();
                    setView("dashboard");
                  } catch (e: any) {
                    toast.error(`Error: ${e.message}`, { id: toastId });
                  }
                }}
                onCancel={() => setView("dashboard")}
              />
            </div>
          </div>
        );
      }

      // ── View / preview blog or event ───────────────────────────────────────
      // PostPreview internally uses BlogRenderer so fonts/styles render correctly.
      case "viewing_blog":
      case "viewing_event": {
        const viewType = view === "viewing_blog" ? "blog" : "event";
        return (
          <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
              <button
                onClick={() => setView("dashboard")}
                className="mb-6 text-gray-500 hover:text-gray-900 flex items-center gap-2 font-bold"
              >
                ← Back to Dashboard
              </button>
              <PostPreview
                type={viewType}
                post={viewingItem}
                onEdit={() => handleEditPost(viewType, viewingItem)}
                onDelete={() => {
                  handleDeletePost(viewType, viewingItem.id);
                  // Dashboard will show after confirmDelete resolves
                }}
                onToggleStatus={async () => {
                  await handleToggleStatus(viewType, viewingItem);
                  // Optimistically flip the status in the local viewing state
                  setViewingItem((prev: any) => ({
                    ...prev,
                    status: prev.status?.toLowerCase() === "draft" ? "Live" : "Draft",
                  }));
                }}
              />
            </div>
          </div>
        );
      }

      default:
        return <WelcomeView onGetStarted={() => setView("setup")} />;
    }
  };

  // ── Root render ────────────────────────────────────────────────────────────
  return (
    <>
      {renderContent()}

      {deleteConfirm && (
        <DeleteConfirmModal
          itemType={
            deleteConfirm.type === "blog"
              ? "Blog"
              : deleteConfirm.type === "event"
              ? "Event"
              : "Category"
          }
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
};

// ─── Delete confirmation modal ─────────────────────────────────────────────────
const DeleteConfirmModal = ({
  itemType,
  onConfirm,
  onCancel,
}: {
  itemType: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl shadow-slate-900/20 border border-slate-100">
      <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 mx-auto">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
        </svg>
      </div>
      <h3 className="text-2xl font-black text-slate-900 text-center mb-2">
        Delete {itemType}?
      </h3>
      <p className="text-slate-500 text-center font-medium mb-8">
        This action cannot be undone. It will permanently remove this{" "}
        {itemType.toLowerCase()} from the system.
      </p>
      <div className="flex gap-4">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-200 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);