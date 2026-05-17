import React, { createContext, useContext, useMemo } from "react";
import { BlogSystem } from "../index";
import { BlogSystemConfig } from "../types";

const BlogSystemContext = createContext<BlogSystem | null>(null);

export interface BlogSystemProviderProps {
  config: BlogSystemConfig;
  children: React.ReactNode;
}

export const BlogSystemProvider: React.FC<BlogSystemProviderProps> = ({ config, children }) => {
  const system = useMemo(() => new BlogSystem(config), [config]);

  return (
    <BlogSystemContext.Provider value={system}>
      {children}
    </BlogSystemContext.Provider>
  );
};

export const useBlogSystem = () => {
  const context = useContext(BlogSystemContext);
  if (!context) {
    throw new Error("useBlogSystem must be used within a BlogSystemProvider");
  }
  return context;
};
