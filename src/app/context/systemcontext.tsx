"use client";

import React, { createContext, useContext, useState } from "react";

// 1. Define the shape of your context data
interface SystemContextType {
  status: string;
  setStatus: (status: string) => void;
}

// 2. Create the context
const SystemContext = createContext<SystemContextType | undefined>(undefined);

// 3. Create the Provider component
export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState("idle");

  return (
    <SystemContext.Provider value={{ status, setStatus }}>
      {children}
    </SystemContext.Provider>
  );
}

// 4. Create the custom hook for your other pages to consume
export function useSystem() {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error("useSystem must be used within a SystemProvider");
  }
  return context;
}