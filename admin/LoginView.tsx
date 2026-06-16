"use client";

import React, { useState } from "react";
import { Lock, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

interface LoginViewProps {
  onLogin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      if (password === "0909" || password === "admin") {
        localStorage.setItem("is_admin_logged_in", "true");
        toast.success("Welcome back!");
        onLogin();
      } else {
        toast.error("Invalid credentials.");
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2rem] p-10 shadow-2xl shadow-indigo-100 border border-slate-100">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 mb-6">
            <Lock size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Admin Portal</h1>
          <p className="text-slate-500 font-medium">Enter your credentials to access the system.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password / Master Key</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-black placeholder:text-slate-400"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
          >
            {isLoading ? "Authenticating..." : "Sign In"}
            {!isLoading && <ArrowRight size={20} strokeWidth={2.5} />}
          </button>
        </form>
      </div>
    </div>
  );
};