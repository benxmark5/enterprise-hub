"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/app/supabase';

type Transaction = {
  id: string;
  item: string;
  amount: number;
  time: string;
};

type EcomItem = {
  id: number;
  name: string;
  price: number;
  stock: number;
};

type TicketPrices = {
  NORMAL: number;
  VIP: number;
  VVIP: number;
};

type TicketInventory = Record<string, boolean>;

// Real inventory item from Supabase
type InventoryItem = {
  id: string;
  match_name: string;
  league_name: string;
  odds: number;
  stake: number;
  expected_return: number;
  value_rating: number;
  status: string;
  analysis_notes: string;
  created_at: string;
};

type SystemContextType = {
  globalBalance: number;
  systemTime: string;
  transactions: Transaction[];
  ecomInventory: EcomItem[];
  ticketPrices: TicketPrices;
  ticketInventory: TicketInventory;
  updateGlobalPrice: (cat: string, price: number) => void;
  addRevenue: (amount: number, itemId: string) => void;
  markAsSold: (seat: string) => void;
  totalInventoryValue: number;
  updateEcomItem: (id: number, price: number, stock: number) => void;
  addItemToInventory: (name: string, price: number, stock: number) => void;
  removeItem: (id: number) => void;
  resetSystem: () => void;
  marketVolatility: string;
  // Real Supabase data
  realInventory: InventoryItem[];
  totalExpectedReturn: number;
  totalStaked: number;
  refreshInventory: () => void;
};

const SystemContext = createContext<SystemContextType | null>(null);

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [globalBalance, setGlobalBalance] = useState(0);
  const [systemTime, setSystemTime] = useState("");
  const [marketVolatility, setMarketVolatility] = useState('STABLE');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [realInventory, setRealInventory] = useState<InventoryItem[]>([]);
  const [totalExpectedReturn, setTotalExpectedReturn] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);

  const [ecomInventory, setEcomInventory] = useState<EcomItem[]>([]);
  const [ticketPrices, setTicketPrices] = useState({
    NORMAL: 50, VIP: 150, VVIP: 300
  });
  const [ticketInventory, setTicketInventory] = useState({
    'N-1': true, 'N-2': true, 'N-3': true,
    'VIP-1': true, 'VIP-2': true, 'VVIP-1': true
  });

  // Fetch real inventory from Supabase
  const fetchRealInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setRealInventory(data);

        // Calculate totals
        const totalReturn = data.reduce(
          (sum, item) => sum + (item.expected_return || 0), 0
        );
        const totalStake = data.reduce(
          (sum, item) => sum + (item.stake || 0), 0
        );

        setTotalExpectedReturn(totalReturn);
        setTotalStaked(totalStake);
        setGlobalBalance(totalReturn);

        // Set volatility based on average value rating
        const avgValue = data.reduce(
          (sum, item) => sum + (item.value_rating || 0), 0
        ) / (data.length || 1);
        setMarketVolatility(avgValue > 0.1 ? 'VOLATILE' : 'STABLE');

        // Convert to ecomInventory format for backward compatibility
        const converted = data.map((item, index) => ({
          id: index + 1,
          name: item.match_name || 'Unknown Match',
          price: item.stake || 0,
          stock: 1,
        }));
        setEcomInventory(converted);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setRealInventory([]);
      setTotalExpectedReturn(0);
      setTotalStaked(0);
      setGlobalBalance(0);
    }
  };

  useEffect(() => {
    fetchRealInventory();
  }, []);

  // Local state actions (kept for compatibility)
  const updateEcomItem = (id: number, newPrice: number, newStock: number) => {
    setEcomInventory(prev => prev.map(item =>
      item.id === id ? { ...item, price: newPrice, stock: newStock } : item
    ));
  };

  const addItemToInventory = (name: string, price: number, stock: number) => {
    const newItem = { id: Date.now(), name: name.toUpperCase(), price, stock };
    setEcomInventory(prev => [...prev, newItem]);
  };

  const removeItem = (id: number) => {
    setEcomInventory(prev => prev.filter(item => item.id !== id));
  };

  const updateGlobalPrice = (category: string, newPrice: number) => {
    setTicketPrices(prev => ({ ...prev, [category]: newPrice }));
  };

  const addRevenue = (amount: number, itemId: string) => {
    setGlobalBalance(prev => prev + amount);
    const newTxn = {
      id: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      item: itemId,
      amount,
      time: new Date().toLocaleTimeString()
    };
    setTransactions(prev => [newTxn, ...prev]);
  };

  const markAsSold = (id: string) => {
    setTicketInventory(prev => ({ ...prev, [id]: false }));
  };

  const resetSystem = () => {
    if (confirm("CRITICAL: WIPE ALL DATA?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const totalInventoryValue = totalExpectedReturn;

  useEffect(() => {
    const timer = setInterval(() =>
      setSystemTime(new Date().toLocaleTimeString()), 1000
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <SystemContext.Provider value={{
      globalBalance,
      systemTime,
      ecomInventory,
      updateEcomItem,
      addItemToInventory,
      removeItem,
      totalInventoryValue,
      ticketPrices,
      updateGlobalPrice,
      ticketInventory,
      markAsSold,
      addRevenue,
      transactions,
      resetSystem,
      marketVolatility,
      realInventory,
      totalExpectedReturn,
      totalStaked,
      refreshInventory: fetchRealInventory,
    }}>
      {children}
    </SystemContext.Provider>
  );
}

export const useSystem = () => useContext(SystemContext);