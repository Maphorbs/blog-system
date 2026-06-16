import React, { useState } from "react";
import { Security } from "./Security";

export const SetupForm: React.FC<{ onComplete: (config: any) => void }> = ({ onComplete }) => {
  const [mode, setMode] = useState<"api" | "local">("api");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [isEncrypting, setIsEncrypting] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEncrypting(true);

    try {
      let config;

      if (mode === "local") {
        config = {
          dbType: "local",
          isSetup: true,
          useLocal: true
        };
      } else {
        const encryptedKey = await Security.encrypt(apiKey, masterPassword);
        const encryptedUrl = await Security.encrypt(baseUrl, masterPassword);

        config = {
          dbType: "api",
          encryptedKey,
          encryptedUrl,
          isSetup: true,
          useLocal: false
        };
      }

      localStorage.setItem("blog_system_config", JSON.stringify(config));
      onComplete(config);
    } catch (err) {
      alert("Error securing your connection. Please try again.");
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
      <h2 className="text-2xl font-bold mb-2 text-gray-800">Connect Blog System</h2>
      <p className="text-gray-500 text-sm mb-6">Choose how you want to connect your database.</p>

      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setMode("api")}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === "api" ? "bg-white shadow-sm text-green-600" : "text-gray-500"}`}
        >
          API (Production)
        </button>
        <button
          onClick={() => setMode("local")}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === "local" ? "bg-white shadow-sm text-green-600" : "text-gray-500"}`}
        >
          Local (Testing)
        </button>
      </div>

      <form onSubmit={handleConnect} className="space-y-4">
        {mode === "api" ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none text-black placeholder:text-gray-400"
                placeholder="https://api.yourwebsite.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Secret Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none text-black placeholder:text-gray-400"
                placeholder="Enter your API secret"
                required
              />
            </div>
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-bold text-green-700 mb-1">Master Password</label>
              <p className="text-xs text-gray-500 mb-2">This password will encrypt your API details in this browser.</p>
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2 border-green-200 focus:border-green-500 outline-none text-black placeholder:text-gray-400"
                placeholder="Create a master password"
                required
              />
            </div>
          </>
        ) : (
          <div className="py-4 text-center text-gray-600">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <p className="text-sm">Local mode stores everything in your browser's LocalStorage. No server needed!</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isEncrypting}
          className={`w-full text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 ${mode === "local" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}`}
        >
          {isEncrypting ? "Connecting..." : mode === "local" ? "Start Testing" : "Connect & Secure"}
        </button>
      </form>
    </div>
  );
};