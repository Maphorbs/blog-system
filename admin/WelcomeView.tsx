"use client";

import React from "react";

interface WelcomeViewProps {
  onGetStarted: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-3xl w-full">
        {/* Animated Icon/Logo Placeholder */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-green-600 to-emerald-400 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-green-200 animate-bounce-slow">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.5 1.5" />
              <path d="M7 11l5-5" />
            </svg>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight">
          Welcome to your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">
            Smart Blog System
          </span>
        </h1>
        
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
          The most flexible, secure, and easy-to-use blog and event management system. 
          Connect your favorite database and storage in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={onGetStarted}
            className="px-10 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 shadow-xl"
          >
            Get Started
          </button>
          <a 
            href="#" 
            className="px-10 py-4 text-gray-600 font-bold hover:text-gray-900 transition-colors"
          >
            Learn More
          </a>
        </div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 transition-all duration-500">
          <div className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <span className="font-bold text-sm text-gray-800">Supabase</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <span className="font-bold text-sm text-gray-800">Firebase</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <span className="font-bold text-sm text-gray-800">MongoDB</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <span className="font-bold text-sm text-gray-800">Postgres</span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
          50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
      `}} />
    </div>
  );
};
