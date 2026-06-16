"use client";

import React, { useState } from "react";
import { BlogSystemAdapter } from "../types";
import { ConfigPanel } from "./ConfigPanel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardViewProps {
  adapter: BlogSystemAdapter;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewPost: (type: "blog" | "event") => void;
  onEditPost?: (type: "blog" | "event", item: any) => void;
  onViewPost?: (type: "blog" | "event", item: any) => void;
  onDeletePost?: (type: "blog" | "event", id: string) => void;
  onToggleStatus?: (type: "blog" | "event", item: any) => void;
  onLogout: () => void;
  stats: { blogs: number; events: number; views: number };
  recentLogs?: { title: string; type: string; status: string; time: string; dateObj: Date }[];
  blogs?: any[];
  events?: any[];
  categories?: any[];
  onCreateCategory?: (name: string, type: "blog" | "event") => void;
  onDeleteCategory?: (id: string) => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export const DashboardView: React.FC<DashboardViewProps> = ({
  adapter,
  activeTab, onTabChange, onNewPost, onEditPost, onViewPost, onDeletePost,
  onToggleStatus, onLogout,
  stats, recentLogs = [], blogs = [], events = [], categories = [],
  onCreateCategory, onDeleteCategory,
}) => {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-[#1e293b]">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200/60 flex-col p-8 hidden lg:flex sticky top-0 h-screen">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <span className="font-black text-2xl tracking-tighter block leading-none">CORE</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin System</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          <SidebarItem icon={<HomeIcon />}     label="Dashboard"     active={activeTab === "dashboard"}  onClick={() => onTabChange("dashboard")} />
          <SidebarItem icon={<PostIcon />}     label="Blog Posts"    active={activeTab === "blogs"}      onClick={() => onTabChange("blogs")} />
          <SidebarItem icon={<EventIcon />}    label="Events"        active={activeTab === "events"}     onClick={() => onTabChange("events")} />
          <SidebarItem icon={<AnalyticIcon />} label="Analytics"     active={activeTab === "analytics"}  onClick={() => onTabChange("analytics")} />
          <div className="pt-8 pb-4 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Settings</div>
          <SidebarItem icon={<CategoryIcon />} label="Categories"    active={activeTab === "categories"} onClick={() => onTabChange("categories")} />
          <SidebarItem icon={<SettingsIcon />} label="Configuration" active={activeTab === "config"}     onClick={() => onTabChange("config")} />
        </nav>

        <button
          onClick={onLogout}
          className="mt-auto group flex items-center gap-3 px-6 py-4 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all font-bold"
        >
          <svg className="group-hover:translate-x-1 transition-transform" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sign Out
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-10 py-6 flex justify-between items-center sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {activeTab === "dashboard"  && "Console Overview"}
              {activeTab === "blogs"      && "Blog Management"}
              {activeTab === "events"     && "Event Management"}
              {activeTab === "analytics"  && "System Analytics"}
              {activeTab === "categories" && "Category Management"}
              {activeTab === "config"     && "System Configuration"}
            </h1>
            <p className="text-sm text-slate-400 font-medium">Welcome back, Administrator</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs font-bold text-slate-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              System Online
            </div>
            <button className="relative w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-colors">
              <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto">
          {activeTab === "dashboard"  && <OverviewPanel stats={stats} onNewPost={onNewPost} recentLogs={recentLogs} />}
          {activeTab === "blogs"      && <BlogsListPanel  blogs={blogs}   onNew={() => onNewPost("blog")}  onView={(b: any) => onViewPost?.("blog",  b)} onEdit={(b: any) => onEditPost?.("blog",  b)} onDelete={(id: string) => onDeletePost?.("blog",  id)} onToggleStatus={(b: any) => onToggleStatus?.("blog",  b)} />}
          {activeTab === "events"     && <EventsListPanel events={events} onNew={() => onNewPost("event")} onView={(e: any) => onViewPost?.("event", e)} onEdit={(e: any) => onEditPost?.("event", e)} onDelete={(id: string) => onDeletePost?.("event", id)} onToggleStatus={(e: any) => onToggleStatus?.("event", e)} />}
          {activeTab === "analytics"  && <AnalyticsPanel stats={stats} />}
          {activeTab === "categories" && <CategoriesPanel categories={categories} onCreate={onCreateCategory} onDelete={onDeleteCategory} />}
          {activeTab === "config"     && <ConfigPanel adapter={adapter} />}
        </div>
      </main>
    </div>
  );
};

// ── Other panels ──────────────────────────────────────────────────────────────

const OverviewPanel = ({ stats, onNewPost, recentLogs }: any) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
      <StatCard label="Total Blogs"    value={stats.blogs.toString()}       trend="+12% this month"  icon={<PostIcon     className="text-blue-600" />}    bg="bg-blue-600/5" />
      <StatCard label="Active Events"  value={stats.events.toString()}      trend="+2 new this week" icon={<EventIcon    className="text-violet-600" />}  bg="bg-violet-600/5" />
      <StatCard label="Total Traffic"  value={stats.views.toLocaleString()} trend="+8.4k today"      icon={<AnalyticIcon className="text-emerald-600" />} bg="bg-emerald-600/5" />
    </div>

    <section className="mb-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight mb-1">Create Content</h2>
          <p className="text-slate-400 font-medium">Select a module to start publishing</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <CreateCard title="Blog Article"   desc="Deep dive stories, industry news, and long-form updates for your readers." icon="✍️" color="from-blue-600 to-indigo-600"   onClick={() => onNewPost("blog")} />
        <CreateCard title="Event Schedule" desc="Promote upcoming meetups, webinars, and community gatherings."            icon="🗓️" color="from-violet-600 to-purple-600" onClick={() => onNewPost("event")} />
      </div>
    </section>

    <section>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black tracking-tight">Recent Activity</h2>
      </div>
      <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Entry Name</th>
              <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Category</th>
              <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recentLogs.length > 0 ? (
              recentLogs.map((log: any, i: number) => (
                <ActivityRow key={i} title={log.title} type={log.type} status={log.status} time={log.time} />
              ))
            ) : (
              <tr><td colSpan={4} className="px-8 py-6 text-center text-slate-400 font-bold text-sm">No recent activity</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  </>
);

const BlogsListPanel = ({ blogs, onNew, onView, onEdit, onDelete, onToggleStatus }: any) => (
  <div className="bg-white rounded-[2rem] p-8 border border-slate-200/60 shadow-xl shadow-slate-200/20">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h2 className="text-2xl font-black tracking-tight">All Blog Posts</h2>
        <p className="text-sm text-slate-400 font-medium">Manage your published articles and drafts.</p>
      </div>
      <button onClick={onNew} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">+ New Post</button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/50">
            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Title</th>
            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Category</th>
            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Date</th>
            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {blogs.map((b: any) => (
            <tr key={b.id} className="hover:bg-slate-50/50">
              <td className="px-6 py-4">
                <button onClick={() => onView?.(b)} className="font-bold text-slate-900 hover:text-indigo-600 text-left transition-colors">{b.title}</button>
                {b.isFeatured && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] rounded-full uppercase tracking-wider">Featured</span>}
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">{b.category}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{b.date}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${b.status?.toLowerCase() === "draft" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-600"}`}>
                  {b.status?.toLowerCase() === "draft" ? "Draft" : "Live"}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-3">
                <button onClick={() => onToggleStatus?.(b)} className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">{b.status?.toLowerCase() === "draft" ? "Publish" : "Unpublish"}</button>
                <button onClick={() => onEdit?.(b)}         className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">Edit</button>
                <button onClick={() => onDelete?.(b.id)}   className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {blogs.length === 0 && <p className="text-center text-slate-400 font-bold py-10">No blogs found.</p>}
    </div>
  </div>
);

const EventsListPanel = ({ events, onNew, onView, onEdit, onDelete, onToggleStatus }: any) => (
  <div className="bg-white rounded-[2rem] p-8 border border-slate-200/60 shadow-xl shadow-slate-200/20">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h2 className="text-2xl font-black tracking-tight">All Events</h2>
        <p className="text-sm text-slate-400 font-medium">Manage your upcoming and past events.</p>
      </div>
      <button onClick={onNew} className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors">+ New Event</button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/50">
            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Title</th>
            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Date</th>
            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Location</th>
            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
            <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {events.map((e: any) => (
            <tr key={e.id} className="hover:bg-slate-50/50">
              <td className="px-6 py-4">
                <button onClick={() => onView?.(e)} className="font-bold text-slate-900 hover:text-indigo-600 text-left transition-colors">{e.title}</button>
                {e.isFeatured && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] rounded-full uppercase tracking-wider">Featured</span>}
              </td>
              <td className="px-6 py-4 text-sm text-slate-600">{e.date} {e.time}</td>
              <td className="px-6 py-4 text-sm text-slate-600">{e.location}</td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${e.status?.toLowerCase() === "draft" ? "bg-slate-100 text-slate-600" : "bg-violet-50 text-violet-600"}`}>
                  {e.status?.toLowerCase() === "draft" ? "Draft" : "Live"}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-3">
                <button onClick={() => onToggleStatus?.(e)} className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">{e.status?.toLowerCase() === "draft" ? "Publish" : "Unpublish"}</button>
                <button onClick={() => onEdit?.(e)}         className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">Edit</button>
                <button onClick={() => onDelete?.(e.id)}   className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {events.length === 0 && <p className="text-center text-slate-400 font-bold py-10">No events found.</p>}
    </div>
  </div>
);

const AnalyticsPanel = ({ stats }: any) => (
  <div className="bg-white rounded-[2rem] p-10 border border-slate-200/60 shadow-xl shadow-slate-200/20 text-center">
    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
      <AnalyticIcon className="w-10 h-10" />
    </div>
    <h2 className="text-3xl font-black tracking-tight mb-4">Analytics Coming Soon</h2>
    <p className="text-slate-500 font-medium max-w-md mx-auto mb-8">
      We are currently recording your traffic. Detailed charts and visitor geography will be available in the next system update.
    </p>
    <div className="grid grid-cols-2 max-w-sm mx-auto gap-4">
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <div className="text-3xl font-black mb-1">{stats.views}</div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Views</div>
      </div>
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <div className="text-3xl font-black mb-1">{stats.blogs + stats.events}</div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Posts</div>
      </div>
    </div>
  </div>
);

const CategoriesPanel = ({ categories = [], onCreate, onDelete }: any) => {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"blog" | "event">("blog");
  return (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-200/60 shadow-xl shadow-slate-200/20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Category Management</h2>
          <p className="text-sm text-slate-400 font-medium">Add or remove categories for blogs and events.</p>
        </div>
      </div>
      <div className="flex gap-4 mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <input
          type="text"
          placeholder="New Category Name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm text-black outline-none focus:border-indigo-500"
        />
        <select
          value={type}
          onChange={e => setType(e.target.value as any)}
          className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm text-black outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="blog">Blog Category</option>
          <option value="event">Event Category</option>
        </select>
        <button
          onClick={() => { if (name && onCreate) { onCreate(name, type); setName(""); } }}
          className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Add
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Blog Categories</h3>
          <div className="space-y-2">
            {categories.filter((c: any) => c.type === "blog").map((c: any) => (
              <div key={c.id} className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                <span className="font-bold text-slate-700">{c.name}</span>
                <button onClick={() => onDelete?.(c.id)} className="text-xs text-rose-500 hover:text-rose-700 font-bold">Remove</button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Event Categories</h3>
          <div className="space-y-2">
            {categories.filter((c: any) => c.type === "event").map((c: any) => (
              <div key={c.id} className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                <span className="font-bold text-slate-700">{c.name}</span>
                <button onClick={() => onDelete?.(c.id)} className="text-xs text-rose-500 hover:text-rose-700 font-bold">Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Shared sub-components ─────────────────────────────────────────────────────

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all ${active ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"}`}>
    <span className={active ? "text-white" : "text-slate-400"}>{icon}</span>
    {label}
  </button>
);

const StatCard: React.FC<{ label: string; value: string; trend: string; icon: React.ReactNode; bg: string }> = ({ label, value, trend, icon, bg }) => (
  <div className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-lg shadow-slate-200/10 group hover:translate-y-[-4px] transition-all duration-300">
    <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform`}>{icon}</div>
    <div className="text-4xl font-black tracking-tight mb-2">{value}</div>
    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{label}</div>
    <div className="pt-4 border-t border-slate-50 flex items-center gap-2 text-[11px] font-bold text-emerald-500">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>
      {trend}
    </div>
  </div>
);

const CreateCard: React.FC<{ title: string; desc: string; icon: string; color: string; onClick: () => void }> = ({ title, desc, icon, color, onClick }) => (
  <button onClick={onClick} className="group relative bg-white p-10 rounded-[2.5rem] border border-slate-200/60 text-left overflow-hidden shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all">
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-[0.03] rounded-bl-[5rem] group-hover:scale-150 transition-transform duration-700`}></div>
    <div className="relative z-10 flex gap-8 items-start">
      <div className={`w-20 h-20 bg-gradient-to-br ${color} rounded-3xl flex items-center justify-center text-5xl shadow-2xl shadow-slate-200 group-hover:scale-110 transition-transform duration-500`}>{icon}</div>
      <div>
        <h3 className="text-2xl font-black mb-3 group-hover:text-indigo-600 transition-colors">{title}</h3>
        <p className="text-slate-400 font-medium leading-relaxed max-w-xs">{desc}</p>
        <div className="mt-6 flex items-center gap-2 text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all">
          Create Now <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  </button>
);

const ActivityRow: React.FC<{ title: string; type: string; status: string; time: string }> = ({ title, type, status, time }) => (
  <tr className="hover:bg-slate-50/50 transition-colors group">
    <td className="px-8 py-6"><div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{title}</div></td>
    <td className="px-8 py-6">
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${type === "Blog" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>{type}</span>
    </td>
    <td className="px-8 py-6">
      <div className="flex items-center gap-2 text-sm font-bold">
        <span className={`w-1.5 h-1.5 rounded-full ${status === "Published" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : status === "Scheduled" ? "bg-amber-500" : "bg-slate-300"}`}></span>
        {status}
      </div>
    </td>
    <td className="px-8 py-6 text-slate-400 text-xs font-bold">{time}</td>
  </tr>
);

// ── Icons ─────────────────────────────────────────────────────────────────────
const HomeIcon     = ({ className = "w-5 h-5" }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const PostIcon     = ({ className = "w-5 h-5" }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const EventIcon    = ({ className = "w-5 h-5" }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const AnalyticIcon = ({ className = "w-5 h-5" }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>;
const CategoryIcon = ({ className = "w-5 h-5" }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const SettingsIcon = ({ className = "w-5 h-5" }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;