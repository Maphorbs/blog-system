"use client";

import React, { useState, useEffect } from "react";
import { BlogSystemAdapter } from "../types";

type Status = "idle" | "testing" | "ok" | "error";

interface ProviderStatus {
  db: Status;
  storage: Status;
  dbMessage: string;
  storageMessage: string;
  dbProvider: string;
  storageProvider: string;
}

// ── Shared input style ────────────────────────────────────────────────────────

const inp =
  "w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm text-black placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-colors";

// ── Icons ─────────────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const CrossIcon = () => (
  <svg className="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </svg>
);

const SpinIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <div className={`${className} border-2 border-indigo-500 border-t-transparent rounded-full animate-spin`} />
);

const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg
    className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M23 4v6h-6M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const UnplugIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

const WarnIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ── Status helpers ────────────────────────────────────────────────────────────

const badgeClass = (s: Status) => {
  if (s === "ok")      return "bg-emerald-50 text-emerald-600 border border-emerald-200";
  if (s === "error")   return "bg-rose-50 text-rose-600 border border-rose-200";
  if (s === "testing") return "bg-indigo-50 text-indigo-500 border border-indigo-200";
  return "bg-slate-100 text-slate-500 border border-slate-200";
};

const badgeLabel = (s: Status, okLabel: string) => {
  if (s === "ok")      return okLabel;
  if (s === "error")   return "Failed";
  if (s === "testing") return "Testing…";
  return "Idle";
};

const StatusIcon = ({ s }: { s: Status }) => {
  if (s === "testing") return <SpinIcon />;
  if (s === "ok")      return <CheckIcon />;
  if (s === "error")   return <CrossIcon />;
  return <div className="w-5 h-5 rounded-full bg-slate-200" />;
};

// ── DB providers ──────────────────────────────────────────────────────────────

const DB_PROVIDERS = [
  { id: "postgres",        label: "PostgreSQL" },
  { id: "supabase",        label: "Supabase" },
  { id: "mongodb",         label: "MongoDB" },
  { id: "mysql",           label: "MySQL" },
  { id: "firebase",        label: "Firebase" },
  { id: "digitalocean_db", label: "DigitalOcean DB" },
  { id: "aws_rds",         label: "AWS RDS" },
];

// ── Storage providers ─────────────────────────────────────────────────────────

const STORAGE_PROVIDERS = [
  { id: "cloudinary",          label: "Cloudinary" },
  { id: "aws_s3",              label: "AWS S3" },
  { id: "digitalocean_spaces", label: "DigitalOcean Spaces" },
  { id: "local_storage",       label: "Local Filesystem (dev only)" },
];

// ── DB Reconnect form ─────────────────────────────────────────────────────────

const DbReconnectForm: React.FC<{
  adapter: BlogSystemAdapter;
  onSuccess: () => void;
}> = ({ adapter, onSuccess }) => {
  const [provider, setProvider] = useState("postgres");
  const [fields, setFields]     = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const ok = await adapter.saveConfig?.({ db: { provider, ...fields } });
      if (ok) { onSuccess(); }
      else    { setError("Could not connect. Check your credentials and try again."); }
    } catch (e: any) {
      setError(e?.message || "Connection failed.");
    } finally {
      setSaving(false);
    }
  };

  const isSqlProvider = ["postgres", "mysql", "digitalocean_db", "aws_rds"].includes(provider);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg leading-none">Reconnect Database</h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Enter your database credentials</p>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          Provider
        </label>
        <select
          value={provider}
          onChange={e => { setProvider(e.target.value); setFields({}); }}
          className={inp}
        >
          {DB_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {isSqlProvider && (
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Host</label>
            <input className={inp} placeholder="db.example.com" onChange={e => set("host", e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Port</label>
            <input className={inp} placeholder={provider === "mysql" ? "3306" : "5432"} onChange={e => set("port", e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Database Name</label>
            <input className={inp} onChange={e => set("dbName", e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">User</label>
            <input className={inp} onChange={e => set("user", e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
            <input type="password" className={inp} onChange={e => set("password", e.target.value)} />
          </div>
          {(provider === "digitalocean_db" || provider === "aws_rds") && (
            <div className="col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="ssl-toggle"
                className="w-4 h-4 accent-indigo-600"
                onChange={e => set("ssl", e.target.checked ? "true" : "false")}
              />
              <label htmlFor="ssl-toggle" className="text-sm font-bold text-slate-600">Enable SSL (recommended)</label>
            </div>
          )}
        </div>
      )}

      {provider === "supabase" && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Supabase URL</label>
            <input className={inp} placeholder="https://xyz.supabase.co" onChange={e => set("url", e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Anon Key</label>
            <input type="password" className={inp} onChange={e => set("anonKey", e.target.value)} />
          </div>
        </div>
      )}

      {provider === "mongodb" && (
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Connection String
          </label>
          <input
            type="password"
            className={inp}
            placeholder="mongodb+srv://user:pass@cluster.mongodb.net/db"
            onChange={e => set("connectionString", e.target.value)}
          />
        </div>
      )}

      {provider === "firebase" && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">API Key</label>
            <input type="password" className={inp} onChange={e => set("firebaseApiKey", e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Project ID</label>
            <input className={inp} onChange={e => set("projectId", e.target.value)} />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-600 font-bold bg-rose-50 border border-rose-200 px-4 py-3 rounded-xl">
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <SpinIcon className="w-4 h-4" />}
        {saving ? "Connecting…" : "Test & Save Connection"}
      </button>
    </div>
  );
};

// ── Storage Reconnect form ────────────────────────────────────────────────────

const StorageReconnectForm: React.FC<{
  adapter: BlogSystemAdapter;
  onSuccess: () => void;
}> = ({ adapter, onSuccess }) => {
  const [provider, setProvider] = useState("cloudinary");
  const [fields, setFields]     = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const ok = await adapter.saveConfig?.({ storage: { provider, ...fields } });
      if (ok) { onSuccess(); }
      else    { setError("Could not save storage config. Check your credentials and try again."); }
    } catch (e: any) {
      setError(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const isS3Like = provider === "aws_s3" || provider === "digitalocean_spaces";

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-50 rounded-2xl flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg leading-none">Reconnect Storage</h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Enter your file storage credentials</p>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          Storage Provider
        </label>
        <select
          value={provider}
          onChange={e => { setProvider(e.target.value); setFields({}); }}
          className={inp}
        >
          {STORAGE_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {provider === "cloudinary" && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cloud Name</label>
            <input className={inp} placeholder="my_cloud_name" onChange={e => set("cloudName", e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">API Key</label>
            <input className={inp} placeholder="123456789012345" onChange={e => set("cloudApiKey", e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">API Secret</label>
            <input type="password" className={inp} onChange={e => set("cloudApiSecret", e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Folder <span className="normal-case font-medium text-slate-400">(optional, default: blog)</span>
            </label>
            <input className={inp} placeholder="blog" onChange={e => set("cloudFolder", e.target.value)} />
          </div>
        </div>
      )}

      {isS3Like && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Access Key ID</label>
              <input className={inp} placeholder="AKIAIOSFODNN7EXAMPLE" onChange={e => set("accessKey", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Secret Access Key</label>
              <input type="password" className={inp} onChange={e => set("secretKey", e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Region</label>
              <input
                className={inp}
                placeholder={provider === "digitalocean_spaces" ? "nyc3" : "us-east-1"}
                onChange={e => set("region", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Bucket Name</label>
              <input className={inp} onChange={e => set("bucket", e.target.value)} />
            </div>
          </div>
          {provider === "digitalocean_spaces" && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Endpoint</label>
              <input className={inp} placeholder="nyc3.digitaloceanspaces.com" onChange={e => set("endpoint", e.target.value)} />
            </div>
          )}
        </div>
      )}

      {provider === "local_storage" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm text-amber-700 font-bold">
            ⚠️ Local storage saves files to <code className="font-mono bg-amber-100 px-1 rounded">public/uploads/blog/</code>.
            This works in local development but <strong>will not persist on Vercel</strong>. Use Cloudinary or S3 for production.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-600 font-bold bg-rose-50 border border-rose-200 px-4 py-3 rounded-xl">
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || provider === "local_storage"}
        className="w-full py-3 bg-violet-600 text-white font-black rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <SpinIcon className="w-4 h-4" />}
        {saving
          ? "Saving…"
          : provider === "local_storage"
          ? "Local Storage — no credentials needed"
          : "Test & Save Storage Config"}
      </button>

      {provider === "local_storage" && (
        <button
          onClick={() => { setFields({ provider: "local_storage" }); onSuccess(); }}
          className="w-full py-3 bg-slate-100 text-slate-700 font-black rounded-xl hover:bg-slate-200 transition-colors"
        >
          Use Local Storage Anyway
        </button>
      )}
    </div>
  );
};

// ── Disconnect confirmation ───────────────────────────────────────────────────

const DisconnectDialog: React.FC<{
  target: "db" | "storage";
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ target, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full space-y-5">
      <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
        <UnplugIcon />
      </div>
      <div className="text-center">
        <h3 className="font-black text-slate-900 text-lg mb-2">
          Disconnect {target === "db" ? "Database" : "Storage"}?
        </h3>
        <p className="text-sm text-slate-500 font-medium">
          This will clear the {target === "db" ? "database" : "storage"} configuration.
          {target === "db" && " Blog posts and events will be unavailable until reconnected."}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-slate-100 text-slate-700 font-black rounded-xl hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  </div>
);

// ── Main ConfigPanel ──────────────────────────────────────────────────────────

export const ConfigPanel: React.FC<{ adapter: BlogSystemAdapter }> = ({ adapter }) => {
  const [status, setStatus] = useState<ProviderStatus>({
    db: "idle", storage: "idle",
    dbMessage: "", storageMessage: "",
    dbProvider: "", storageProvider: "",
  });

  // Which reconnect form is open: null | "db" | "storage"
  const [reconnectTarget, setReconnectTarget] = useState<null | "db" | "storage">(null);

  // Disconnect dialog: null | "db" | "storage"
  const [disconnectTarget, setDisconnectTarget] = useState<null | "db" | "storage">(null);

  useEffect(() => { checkConnections(); }, []);

  const checkConnections = async () => {
    setStatus(s => ({
      ...s,
      db: "testing", storage: "testing",
      dbMessage: "Checking…", storageMessage: "Checking…",
    }));

    try {
      const cfg = (await adapter.getConfig?.()) || {} as any;

      // ── DB test ────────────────────────────────────────────────────────────
      try {
        await adapter.getBlogs();
        setStatus(s => ({
          ...s,
          db: "ok",
          dbMessage: "Connected and responding",
          dbProvider: cfg.db?.provider || "configured",
        }));
      } catch (e: any) {
        setStatus(s => ({
          ...s,
          db: "error",
          dbMessage: e?.message || "Connection failed",
          dbProvider: cfg.db?.provider || "unknown",
        }));
      }

      // ── Storage test ───────────────────────────────────────────────────────
      const sp = cfg.storage?.provider;
      if (sp) {
        setStatus(s => ({
          ...s,
          storage: "ok",
          storageMessage: "Provider configured",
          storageProvider: sp,
        }));
      } else {
        setStatus(s => ({
          ...s,
          storage: "error",
          storageMessage: "No storage provider found",
          storageProvider: "none",
        }));
      }
    } catch (e: any) {
      setStatus(s => ({
        ...s,
        db: "error",
        dbMessage: e?.message || "Could not reach config endpoint",
        storage: "error",
        storageMessage: "Config unavailable",
      }));
    }
  };

  const handleDisconnect = async (target: "db" | "storage") => {
    setDisconnectTarget(null);
    try {
      if (target === "db") {
        await adapter.saveConfig?.({ db: { provider: "" } });
        setStatus(s => ({ ...s, db: "idle", dbMessage: "Disconnected", dbProvider: "" }));
      } else {
        await adapter.saveConfig?.({ storage: { provider: "" } });
        setStatus(s => ({ ...s, storage: "idle", storageMessage: "Disconnected", storageProvider: "" }));
      }
    } catch (e: any) {
      // best-effort; re-check will pick up actual state
    }
    checkConnections();
  };

  const isTesting = status.db === "testing" || status.storage === "testing";
  const hasDbError = status.db === "error";
  const hasStorageError = status.storage === "error";
  const allOk = status.db === "ok" && status.storage === "ok";

  return (
    <>
      {/* Disconnect confirmation dialog */}
      {disconnectTarget && (
        <DisconnectDialog
          target={disconnectTarget}
          onConfirm={() => handleDisconnect(disconnectTarget)}
          onCancel={() => setDisconnectTarget(null)}
        />
      )}

      <div className="space-y-6 max-w-2xl">
        {/* ── Status card ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight">Connection Status</h2>
              <p className="text-sm text-slate-400 font-medium mt-0.5">
                Live status of your database and storage providers
              </p>
            </div>
            <button
              onClick={checkConnections}
              disabled={isTesting}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              <RefreshIcon spinning={isTesting} />
              Test Connections
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {/* ── DB row ────────────────────────────────────────────────────── */}
            <div className="px-8 py-6 flex items-center gap-5">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-black text-slate-900">Database</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeClass(status.db)}`}>
                    {badgeLabel(status.db, "Connected")}
                  </span>
                </div>
                <p className="text-sm text-slate-500 truncate">
                  {status.dbProvider ? `Provider: ${status.dbProvider}` : "No provider detected"}
                  {status.dbMessage ? ` — ${status.dbMessage}` : ""}
                </p>
              </div>

              {/* DB action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {status.db === "ok" && (
                  <button
                    onClick={() => setDisconnectTarget("db")}
                    title="Disconnect database"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 hover:border-rose-200"
                  >
                    <UnplugIcon />
                    Disconnect
                  </button>
                )}
                {status.db === "error" && (
                  <button
                    onClick={() => setReconnectTarget(reconnectTarget === "db" ? null : "db")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
                  >
                    {reconnectTarget === "db" ? "Hide" : "Reconnect"}
                  </button>
                )}
                <StatusIcon s={status.db} />
              </div>
            </div>

            {/* ── Storage row ───────────────────────────────────────────────── */}
            <div className="px-8 py-6 flex items-center gap-5">
              <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-black text-slate-900">File Storage</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeClass(status.storage)}`}>
                    {badgeLabel(status.storage, "Configured")}
                  </span>
                </div>
                <p className="text-sm text-slate-500 truncate">
                  {status.storageProvider && status.storageProvider !== "none"
                    ? `Provider: ${status.storageProvider}`
                    : "No provider detected"}
                  {status.storageMessage ? ` — ${status.storageMessage}` : ""}
                </p>
              </div>

              {/* Storage action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {status.storage === "ok" && (
                  <button
                    onClick={() => setDisconnectTarget("storage")}
                    title="Disconnect storage"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200 hover:border-rose-200"
                  >
                    <UnplugIcon />
                    Disconnect
                  </button>
                )}
                {status.storage === "error" && (
                  <button
                    onClick={() => setReconnectTarget(reconnectTarget === "storage" ? null : "storage")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-violet-200"
                  >
                    {reconnectTarget === "storage" ? "Hide" : "Reconnect"}
                  </button>
                )}
                <StatusIcon s={status.storage} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Error hint box — only shows relevant section ───────────────────── */}
        {(hasDbError || hasStorageError) && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 space-y-3">
            <h3 className="font-black text-rose-700 flex items-center gap-2">
              <WarnIcon />
              {hasDbError && hasStorageError
                ? "Database and storage issues detected"
                : hasDbError
                ? "Database connection issue"
                : "Storage configuration issue"}
            </h3>
            <ul className="text-sm text-rose-600 space-y-1 list-disc list-inside font-medium">
              {hasDbError && (
                <>
                  <li>
                    Ensure <code className="font-mono bg-rose-100 px-1 rounded">BLOG_DB_PROVIDER</code> and{" "}
                    <code className="font-mono bg-rose-100 px-1 rounded">BLOG_DB_HOST</code> are set in Vercel env vars.
                  </li>
                  <li>Redeploy on Vercel after adding or changing env vars — they don't hot-reload.</li>
                  <li>Check your database allows connections from Vercel's IP ranges.</li>
                </>
              )}
              {hasStorageError && (
                <>
                  <li>
                    Set <code className="font-mono bg-rose-100 px-1 rounded">BLOG_STORAGE_PROVIDER</code> to{" "}
                    <code className="font-mono bg-rose-100 px-1 rounded">cloudinary</code>,{" "}
                    <code className="font-mono bg-rose-100 px-1 rounded">aws_s3</code>, or{" "}
                    <code className="font-mono bg-rose-100 px-1 rounded">local_storage</code>.
                  </li>
                  {hasStorageError && !hasDbError && (
                    <li>Add the matching credentials for your chosen storage provider.</li>
                  )}
                </>
              )}
            </ul>

            {/* Quick reconnect buttons for whichever services are broken */}
            <div className="flex gap-3 pt-1">
              {hasDbError && (
                <button
                  onClick={() => setReconnectTarget(reconnectTarget === "db" ? null : "db")}
                  className="text-sm font-black text-rose-700 underline hover:no-underline"
                >
                  {reconnectTarget === "db" ? "Hide DB form" : "Fix database →"}
                </button>
              )}
              {hasStorageError && (
                <button
                  onClick={() => setReconnectTarget(reconnectTarget === "storage" ? null : "storage")}
                  className="text-sm font-black text-rose-700 underline hover:no-underline"
                >
                  {reconnectTarget === "storage" ? "Hide storage form" : "Fix storage →"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Reconnect forms — scoped to the failing service ──────────────── */}
        {reconnectTarget === "db" && (
          <DbReconnectForm
            adapter={adapter}
            onSuccess={() => { setReconnectTarget(null); checkConnections(); }}
          />
        )}

        {reconnectTarget === "storage" && (
          <StorageReconnectForm
            adapter={adapter}
            onSuccess={() => { setReconnectTarget(null); checkConnections(); }}
          />
        )}

        {/* ── All good ───────────────────────────────────────────────────────── */}
        {allOk && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div>
              <p className="font-black text-emerald-800">All systems operational</p>
              <p className="text-sm text-emerald-600 font-medium">
                Your database and storage are connected and responding normally.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};