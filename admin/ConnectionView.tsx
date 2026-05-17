"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { Database, Server, Key, Shield, HardDrive, CheckCircle2 } from "lucide-react";
import { Security } from "./Security";

type DBProviderType = "supabase" | "firebase" | "mongodb" | "postgres" | "mysql" | "digitalocean_db" | "aws_rds";
type StorageProviderType = "aws_s3" | "digitalocean_spaces" | "cloudinary" | "firebase_storage" | "supabase_storage" | "local_storage";

import { BlogSystemAdapter } from "../types";

interface ConnectionViewProps {
  adapter: BlogSystemAdapter;
  onComplete: (config: any) => void;
  onBack: () => void;
}

export const ConnectionView: React.FC<ConnectionViewProps> = ({ adapter, onComplete, onBack }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  
  // DB State
  const [dbProvider, setDbProvider] = useState<DBProviderType>("supabase");
  const [dbFormData, setDbFormData] = useState<any>({});
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbError, setDbError] = useState("");

  // Storage State
  const [storageProvider, setStorageProvider] = useState<StorageProviderType>("aws_s3");
  const [storageFormData, setStorageFormData] = useState<any>({});
  const [isTestingStorage, setIsTestingStorage] = useState(false);
  const [storageError, setStorageError] = useState("");

  // Security State
  const [masterPassword, setMasterPassword] = useState("");
  const [isFinalizing, setIsFinalizing] = useState(false);

  const dbProviders = [
    { id: "supabase", name: "Supabase", icon: "⚡", color: "bg-emerald-500" },
    { id: "firebase", name: "Firebase DB", icon: "🔥", color: "bg-orange-500" },
    { id: "mongodb", name: "MongoDB", icon: "🍃", color: "bg-green-600" },
    { id: "postgres", name: "PostgreSQL", icon: "🐘", color: "bg-blue-600" },
    { id: "mysql", name: "MySQL", icon: "🐬", color: "bg-blue-500" },
    { id: "digitalocean_db", name: "DigitalOcean DB", icon: "💧", color: "bg-blue-400" },
    { id: "aws_rds", name: "AWS RDS", icon: "☁️", color: "bg-amber-600" },
  ];

  const storageProviders = [
    { id: "local_storage", name: "Local Files", icon: "📁", color: "bg-gray-600" },
    { id: "aws_s3", name: "AWS S3", icon: "📦", color: "bg-amber-500" },
    { id: "digitalocean_spaces", name: "DO Spaces", icon: "💧", color: "bg-blue-400" },
    { id: "cloudinary", name: "Cloudinary", icon: "☁️", color: "bg-indigo-500" },
    { id: "firebase_storage", name: "Firebase Storage", icon: "🔥", color: "bg-orange-500" },
    { id: "supabase_storage", name: "Supabase Storage", icon: "⚡", color: "bg-emerald-500" },
  ];

  const mockTestConnection = async (type: "db" | "storage", config: any) => {
    try {
      if (type === "storage" && storageProvider === "local_storage") {
        return true;
      }

      // Check for empty fields
      const values = Object.values(config);
      if (values.length === 0 || values.some(v => v === "")) {
        throw new Error("Please fill out all required connection fields.");
      }

      // If testing DB, hit our actual config endpoint
      if (type === "db") {
        const payload = {
          db: {
            provider: dbProvider,
            ...config
          }
        };

        const success = await adapter.saveConfig(payload);
        if (!success) {
          throw new Error("Database connection failed");
        }
        
        toast.success("Database connected and initialized!");
      }

      return true;
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  const handleTestDb = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingDb(true);
    setDbError("");
    try {
      await mockTestConnection("db", dbFormData);
      setStep(3); // Move to storage selection
    } catch (err: any) {
      setDbError(err.message);
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleTestStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingStorage(true);
    setStorageError("");
    try {
      await mockTestConnection("storage", storageFormData);
      setStep(5); // Move to final security step
    } catch (err: any) {
      setStorageError(err.message);
    } finally {
      setIsTestingStorage(false);
    }
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFinalizing(true);

    try {
      // Encrypt DB
      const encryptedDbData: any = {};
      for (const key in dbFormData) {
        if (dbFormData[key]) {
          encryptedDbData[key] = await Security.encrypt(dbFormData[key], masterPassword);
        }
      }

      // Encrypt Storage
      const encryptedStorageData: any = {};
      for (const key in storageFormData) {
        if (storageFormData[key]) {
          encryptedStorageData[key] = await Security.encrypt(storageFormData[key], masterPassword);
        }
      }

      const config = {
        db: { provider: dbProvider, encryptedData: encryptedDbData },
        storage: { provider: storageProvider, encryptedData: encryptedStorageData },
        isSetup: true,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem("blog_system_config", JSON.stringify(config));
      onComplete(config);
    } catch (err) {
      alert("Encryption failed. Please try a different master password.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const renderDbFields = () => {
    switch (dbProvider) {
      case "supabase":
        return (
          <>
            <Field label="Supabase URL" placeholder="https://xyz.supabase.co" onChange={(v) => setDbFormData({...dbFormData, url: v})} />
            <Field label="Anon Key" placeholder="eyJhbG..." type="password" onChange={(v) => setDbFormData({...dbFormData, anonKey: v})} />
            <Field label="Service Role Key (Optional)" placeholder="eyJhbG..." type="password" onChange={(v) => setDbFormData({...dbFormData, serviceKey: v})} />
          </>
        );
      case "firebase":
        return (
          <>
            <Field label="API Key" type="password" onChange={(v) => setDbFormData({...dbFormData, apiKey: v})} />
            <Field label="Project ID" onChange={(v) => setDbFormData({...dbFormData, projectId: v})} />
          </>
        );
      case "mongodb":
        return (
          <Field label="Connection String" placeholder="mongodb+srv://..." type="password" onChange={(v) => setDbFormData({...dbFormData, connectionString: v})} />
        );
      case "postgres":
      case "mysql":
      case "digitalocean_db":
      case "aws_rds":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Host" placeholder="database.server.com" onChange={(v) => setDbFormData({...dbFormData, host: v})} /></div>
            <Field label="Port" placeholder="5432 / 3306" onChange={(v) => setDbFormData({...dbFormData, port: v})} />
            <Field label="Database Name" onChange={(v) => setDbFormData({...dbFormData, dbName: v})} />
            <Field label="User" onChange={(v) => setDbFormData({...dbFormData, user: v})} />
            <Field label="Password" type="password" onChange={(v) => setDbFormData({...dbFormData, password: v})} />
          </div>
        );
    }
  };

  const renderStorageFields = () => {
    switch (storageProvider) {
      case "local_storage":
        return (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-sm font-medium text-gray-700 mb-2">
              <strong>Local File System Storage Selected.</strong>
            </p>
            <p className="text-xs text-gray-500">
              Files will be uploaded directly to the <code>public/uploads/blog</code> directory in your Next.js project. 
              No external credentials are required for this option.
            </p>
          </div>
        );
      case "aws_s3":
      case "digitalocean_spaces":
        return (
          <>
            <Field label="Access Key ID" onChange={(v) => setStorageFormData({...storageFormData, accessKey: v})} />
            <Field label="Secret Access Key" type="password" onChange={(v) => setStorageFormData({...storageFormData, secretKey: v})} />
            <Field label="Region" placeholder="us-east-1 or nyc3" onChange={(v) => setStorageFormData({...storageFormData, region: v})} />
            <Field label="Bucket / Space Name" onChange={(v) => setStorageFormData({...storageFormData, bucket: v})} />
            {storageProvider === "digitalocean_spaces" && (
              <Field label="Endpoint (Optional)" placeholder="nyc3.digitaloceanspaces.com" onChange={(v) => setStorageFormData({...storageFormData, endpoint: v})} />
            )}
          </>
        );
      case "cloudinary":
        return (
          <>
            <Field label="Cloud Name" onChange={(v) => setStorageFormData({...storageFormData, cloudName: v})} />
            <Field label="API Key" type="password" onChange={(v) => setStorageFormData({...storageFormData, apiKey: v})} />
            <Field label="API Secret" type="password" onChange={(v) => setStorageFormData({...storageFormData, apiSecret: v})} />
          </>
        );
      case "firebase_storage":
        return (
          <Field label="Storage Bucket" placeholder="project.appspot.com" onChange={(v) => setStorageFormData({...storageFormData, storageBucket: v})} />
        );
      case "supabase_storage":
        return (
          <Field label="Bucket Name" placeholder="blog-assets" onChange={(v) => setStorageFormData({...storageFormData, bucket: v})} />
        );
    }
  };

  // UI Renderers
  const renderProviderSelection = (
    title: string,
    description: string,
    providers: any[],
    selectedId: string,
    onSelect: (id: string) => void,
    onNext: () => void,
    onBackBtn?: () => void
  ) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {onBackBtn && (
          <button onClick={onBackBtn} className="mb-8 text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium">
            ← Back
          </button>
        )}
        <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
          <h2 className="text-3xl font-black text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-500 mb-10">{description}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${
                  selectedId === p.id ? "border-green-500 bg-green-50" : "border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className={`w-12 h-12 ${p.color} rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform text-white`}>
                  {p.icon}
                </div>
                <span className="font-bold text-gray-700 text-sm text-center">{p.name}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={onNext}
              className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all"
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfiguration = (
    title: string,
    providerObj: any,
    fields: React.ReactNode,
    onSubmit: (e: React.FormEvent) => void,
    isTesting: boolean,
    error: string,
    onBackBtn: () => void
  ) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <button onClick={onBackBtn} className="mb-8 text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium">
          ← Back to Selection
        </button>

        <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-12 h-12 ${providerObj?.color} rounded-xl flex items-center justify-center text-2xl text-white`}>
              {providerObj?.icon}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Configure {providerObj?.name}</h2>
              <p className="text-gray-500 text-sm">Enter your connection details below.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-4">
              {fields}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isTesting}
              className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isTesting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Testing Connection...
                </>
              ) : "Test Connection & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // Router
  switch (step) {
    case 1:
      return renderProviderSelection(
        "Step 1: Database Setup",
        "Choose where your blog and event data will be stored.",
        dbProviders,
        dbProvider,
        (id) => setDbProvider(id as DBProviderType),
        () => setStep(2),
        onBack
      );

    case 2:
      return renderConfiguration(
        "Configure Database",
        dbProviders.find(p => p.id === dbProvider),
        renderDbFields(),
        handleTestDb,
        isTestingDb,
        dbError,
        () => setStep(1)
      );

    case 3:
      return renderProviderSelection(
        "Step 2: Storage Setup",
        "Choose where your media files (images, videos) will be stored.",
        storageProviders,
        storageProvider,
        (id) => setStorageProvider(id as StorageProviderType),
        () => setStep(4),
        () => setStep(2)
      );

    case 4:
      return renderConfiguration(
        "Configure Storage",
        storageProviders.find(p => p.id === storageProvider),
        renderStorageFields(),
        handleTestStorage,
        isTestingStorage,
        storageError,
        () => setStep(3)
      );

    case 5:
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-xl w-full">
            <button onClick={() => setStep(4)} className="mb-8 text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium">
              ← Back to Storage Config
            </button>
            <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                🔒
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-2">Secure & Finalize</h2>
              <p className="text-gray-500 mb-8">
                Your database and storage connections are verified. Create a master password to encrypt these credentials locally.
              </p>
              
              <form onSubmit={handleFinalize}>
                <div className="text-left mb-8">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Master Password</label>
                  <input
                    type="password"
                    required
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-green-500 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-2">This is never sent to any server. It ensures your API keys remain encrypted on your device.</p>
                </div>

                <button
                  type="submit"
                  disabled={isFinalizing}
                  className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  {isFinalizing ? "Encrypting & Saving..." : "Finalize Setup"}
                </button>
              </form>
            </div>
          </div>
        </div>
      );
  }
};

const Field: React.FC<{ label: string; placeholder?: string; type?: string; onChange: (val: string) => void }> = ({ label, placeholder, type = "text", onChange }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 mb-1.5">{label}</label>
    <input
      type={type}
      required
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-gray-300"
    />
  </div>
);
