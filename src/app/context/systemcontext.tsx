"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from '@/app/supabase';

// 1. Define the shape of your context data
interface SystemContextType {
  status: string;
  setStatus: (status: string) => void;
  realInventory: any[];
  setRealInventory: (items: any[]) => void;
  totalExpectedReturn: number;
  totalStaked: number;
  refreshInventory: () => Promise<void>;
}

// 2. Create the context
const SystemContext = createContext<SystemContextType | undefined>(undefined);

// 3. Create the Provider component
export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState("idle");
  const [realInventory, setRealInventory] = useState<any[]>([]);
  const [totalExpectedReturn, setTotalExpectedReturn] = useState<number>(0);
  const [totalStaked, setTotalStaked] = useState<number>(0);

  const refreshInventory = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('inventory').select('*');
      if (error) {
        console.error('refreshInventory error', error.message);
        return;
      }
      const items = Array.isArray(data) ? data : [];
      setRealInventory(items);
      const totalReturn = items.reduce((sum: number, it: any) => sum + (Number(it.expected_return) || 0), 0);
      const totalStake = items.reduce((sum: number, it: any) => sum + (Number(it.stake) || 0), 0);
      setTotalExpectedReturn(totalReturn);
      setTotalStaked(totalStake);
    } catch (e) {
      console.error('refreshInventory caught', e);
    }
  }, []);

  return (
    <SystemContext.Provider value={{
      status,
      setStatus,
      realInventory,
      setRealInventory,
      totalExpectedReturn,
      totalStaked,
      refreshInventory,
    }}>
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