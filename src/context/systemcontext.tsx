'use client';
import { createContext, useContext, ReactNode } from 'react';

const SystemContext = createContext({});

export function SystemProvider({ children }: { children: ReactNode }) {
  return <SystemContext.Provider value={{}}>{children}</SystemContext.Provider>;
}

export const useSystem = () => useContext(SystemContext);
