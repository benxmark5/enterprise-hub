"use client";
import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  ShoppingBag, 
  Ticket, 
  BarChart3,
  Globe,
  Target,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useSystem } from './context/systemcontext';

export default function EnterpriseHub() {
  const { 
    systemTime, 
    marketVolatility,
    realInventory,
    totalExpectedReturn,
    totalStaked
  } = useSystem()!;

  const totalProfit = totalExpectedReturn - totalStaked;

  const nodes = [
    { 
      name: "ODDS_MASTER", 
      path: "/odds-master", 
      icon: Target, 
      status: "ACTIVE", 
      color: "text-yellow-500",
      desc: "Match Analysis & Draft"
    },
    { 
      name: "SPORTS_ODDS_V2", 
      path: "/sports-odds", 
      icon: BarChart3, 
      status: "ACTIVE", 
      color: "text-green-500",
      desc: "Live Match Browser"
    },
    { 
      name: "INVENTORY_CMD", 
      path: "/e-commerce", 
      icon: ShoppingBag, 
      status: "STABLE", 
      color: "text-blue-500",
      desc: "Dispatched Bets Tracker"
    },
    { 
      name: "TICKETING_GATE", 
      path: "/ticketing", 
      icon: Ticket, 
      status: "ONLINE", 
      color: "text-purple-500",
      desc: "Market Control Center"
    },
    { 
      name: "AVIATOR_CMD", 
      path: "/aviator", 
      icon: Zap, 
      status: "NEW", 
      color: "text-red-500",
      desc: "Aviator Signal Dispatch"
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 
      p-6 md:p-12 font-sans uppercase tracking-tighter">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex flex-col 
        md:flex-row justify-between items-start 
        md:items-center mb-16 gap-6">
        <div>
          <h1 className="text-5xl font-black italic text-white 
            flex items-center gap-3">
            <Globe className="text-blue-600" size={40} />
            GLOBAL_HUB
          </h1>
          <p className="text-[10px] font-mono tracking-[0.5em] 
            text-zinc-500 mt-2">
            ENTERPRISE_COMMAND_CENTER // V1.0.5
          </p>
        </div>

        {/* LIVE STATS */}
        <div className="flex gap-4 flex-wrap">

          {/* Expected Return */}
          <div className="bg-zinc-900/50 border border-white/5 
            p-4 rounded-sm min-w-45">
            <p className="text-[9px] font-bold text-zinc-500 
              mb-1 flex justify-between uppercase">
              EXPECTED_RETURN
              <span className="animate-pulse text-green-500">
                ● LIVE
              </span>
            </p>
            <p className="text-2xl font-black text-white font-mono">
              ${totalExpectedReturn.toFixed(2)}
            </p>
          </div>

          {/* Total Bets */}
          <div className="bg-zinc-900/50 border border-white/5 
            p-4 rounded-sm min-w-45">
            <p className="text-[9px] font-bold text-zinc-500 
              mb-1 uppercase">
              TOTAL_BETS
            </p>
            <p className="text-2xl font-black text-green-500 
              font-mono">
              {realInventory.length}
            </p>
          </div>

          {/* Total Profit */}
          <div className="bg-zinc-900/50 border border-white/5 
            p-4 rounded-sm min-w-45">
            <p className="text-[9px] font-bold text-zinc-500 
              mb-1 uppercase">
              TOTAL_PROFIT
            </p>
            <p className={`text-2xl font-black font-mono ${
              totalProfit >= 0 
                ? 'text-green-500' 
                : 'text-red-500'
            }`}>
              {totalProfit >= 0 ? '+' : ''}
              ${totalProfit.toFixed(2)}
            </p>
          </div>

          {/* Market Status */}
          <div className="bg-zinc-900/50 border border-white/5 
            p-4 rounded-sm min-w-45">
            <p className="text-[9px] font-bold text-zinc-500 
              mb-1 uppercase">
              MARKET_STATUS
            </p>
            <p className={`text-2xl font-black transition-colors 
              duration-500 ${
              marketVolatility === 'VOLATILE' 
                ? 'text-red-500' 
                : 'text-blue-500'
            }`}>
              {marketVolatility}
            </p>
          </div>

        </div>
      </div>

      {/* NODE GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 
        md:grid-cols-3 gap-6 mb-16">
        {nodes.map((node) => (
          <Link href={node.path} key={node.name} className="group">
            <div className="bg-zinc-900/30 border border-white/5 
              p-8 hover:border-blue-500/50 transition-all 
              duration-300 rounded-sm">
              <div className="flex justify-between 
                items-start mb-12">
                <node.icon
                  className="text-zinc-500 group-hover:text-white 
                    transition-colors"
                  size={28}
                />
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] font-black px-2 
                    py-1 bg-white/5 ${node.color}`}>
                    {node.status}
                  </span>
                  {node.status === 'NEW' && (
                    <span className="text-[8px] text-red-500 
                      animate-pulse font-bold">
                      ● JUST ADDED
                    </span>
                  )}
                </div>
              </div>
              <h3 className="text-xl font-black italic text-white 
                group-hover:translate-x-2 transition-transform">
                {node.name}
              </h3>
              <p className="text-[10px] text-zinc-600 mt-1 
                normal-case tracking-normal">
                {node.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* QUICK STATS BAR */}
      <div className="max-w-7xl mx-auto bg-zinc-900/30 
        border border-white/5 rounded-sm p-4 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-[9px] text-zinc-600 uppercase 
              tracking-widest mb-1">
              Total Staked
            </p>
            <p className="text-lg font-black font-mono 
              text-yellow-400">
              ${totalStaked.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-zinc-600 uppercase 
              tracking-widest mb-1">
              Expected Return
            </p>
            <p className="text-lg font-black font-mono 
              text-white">
              ${totalExpectedReturn.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-zinc-600 uppercase 
              tracking-widest mb-1">
              Active Bets
            </p>
            <p className="text-lg font-black font-mono 
              text-green-400">
              {realInventory.filter(
                i => i.status === 'active'
              ).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-zinc-600 uppercase 
              tracking-widest mb-1">
              ROI
            </p>
            <p className={`text-lg font-black font-mono ${
              totalStaked > 0 && 
              ((totalExpectedReturn - totalStaked) / totalStaked * 100) >= 0
                ? 'text-green-400'
                : 'text-red-400'
            }`}>
              {totalStaked > 0
                ? `${((totalExpectedReturn - totalStaked) / totalStaked * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER TERMINAL */}
      <div className="max-w-7xl mx-auto border-t 
        border-white/10 pt-8 mt-auto">
        <div className="flex flex-wrap justify-between 
          items-center gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity
                size={12}
                className="text-green-500 animate-pulse"
              />
              <span>NETWORK: STABLE</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-blue-500" />
              <span>SSL_ENCRYPTION: ACTIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-red-500" />
              <span>AVIATOR: ONLINE</span>
            </div>
          </div>
          <div className="text-zinc-500">
            TERMINAL_ACTIVE //
            <span className="text-white font-bold ml-1">
              {systemTime || "SYNCHRONIZING..."}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}