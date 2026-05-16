"use client";
import React, { useState } from 'react';
import { useSystem } from '../context/systemcontext';
import { 
  Download, Trash2, Sun, Moon, 
  Activity, ShieldCheck, RefreshCw,
  TrendingUp, TrendingDown, FileText
} from 'lucide-react';
import { supabase } from '@/app/supabase';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function InventoryCMD() {
  const { 
    realInventory, 
    totalExpectedReturn, 
    totalStaked,
    refreshInventory 
  } = useSystem()!;

  const [theme, setTheme] = useState('DARK');
  const [filter, setFilter] = useState('ALL');

  const totalProfit = totalExpectedReturn - totalStaked;
  const roi = totalStaked > 0 
    ? ((totalProfit / totalStaked) * 100).toFixed(1) 
    : '0.0';

  const filtered = filter === 'ALL' 
    ? realInventory 
    : realInventory.filter(i => i.status === filter.toLowerCase());

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this entry?')) return;
    await supabase.from('inventory').delete().eq('id', id);
    refreshInventory();
  };

  const exportCSV = () => {
    const headers = [
      'Match', 'League', 'Odds', 
      'Stake', 'Expected Return', 'Value Rating', 
      'Status', 'Notes', 'Date'
    ];
    const rows = realInventory.map(i => [
      i.match_name, i.league_name, i.odds,
      i.stake, i.expected_return, 
      (i.value_rating * 100).toFixed(1) + '%',
      i.status, i.analysis_notes,
      new Date(i.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
  };

  return (
    <div className={`min-h-screen font-sans transition-all ${
      theme === 'DARK' 
        ? 'bg-[#0a0a0b] text-zinc-100' 
        : 'bg-[#f8f9fa] text-zinc-900'
    }`}>
      <div className="max-w-7xl mx-auto p-6 lg:p-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between 
          items-start md:items-center mb-12 gap-6">
          <div>
            <Link href="/" className="flex items-center text-zinc-500 
              hover:text-blue-500 mb-4 transition-colors text-[10px] 
              font-bold tracking-widest uppercase">
              <ArrowLeft size={14} className="mr-2" /> Return to Hub
            </Link>
            <div className="flex items-center gap-2 mb-2 text-blue-500 
              font-bold tracking-tighter uppercase text-xs">
              <ShieldCheck size={14} /> 
              Inventory CMD // {new Date().toLocaleDateString()}
            </div>
            <h1 className="text-4xl font-black tracking-tight uppercase">
              INVENTORY_CMD
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={refreshInventory}
              className="p-3 rounded-lg border bg-zinc-900 
                border-zinc-800 text-blue-400 hover:text-blue-300"
            >
              <RefreshCw size={20} />
            </button>
            <button 
              onClick={() => setTheme(t => t === 'DARK' ? 'LIGHT' : 'DARK')} 
              className="p-3 rounded-lg border bg-zinc-900 
                border-zinc-800 text-yellow-500"
            >
              {theme === 'DARK' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 bg-blue-600 
                hover:bg-blue-500 text-white px-6 py-3 rounded-lg 
                text-sm font-bold"
            >
              <Download size={18} /> Export CSV
            </button>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { 
              label: 'Total Bets', 
              value: realInventory.length.toString(), 
              color: 'text-white' 
            },
            { 
              label: 'Total Staked', 
              value: `$${totalStaked.toFixed(2)}`, 
              color: 'text-yellow-400' 
            },
            { 
              label: 'Expected Return', 
              value: `$${totalExpectedReturn.toFixed(2)}`, 
              color: 'text-green-400' 
            },
            { 
              label: 'ROI', 
              value: `${roi}%`, 
              color: parseFloat(roi) > 0 ? 'text-green-400' : 'text-red-400' 
            },
          ].map(stat => (
            <div key={stat.label} 
              className="bg-zinc-900/50 border border-zinc-800 
                rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase 
                tracking-widest mb-1">{stat.label}</p>
              <p className={`text-2xl font-black font-mono ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {['ALL', 'ACTIVE', 'DRAFT', 'PENDING', 'LIVE', 'CLOSED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-[10px] font-bold rounded-lg 
                uppercase tracking-widest transition-all ${
                filter === f 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-zinc-900 text-zinc-500 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Inventory Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 
          rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex 
            items-center gap-2">
            <Activity size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold uppercase tracking-widest">
              Dispatched Bets — {filtered.length} entries
            </h3>
          </div>

          <div className="divide-y divide-zinc-800/50">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <p className="text-sm">No entries found.</p>
                <p className="text-xs mt-1">
                  Dispatch bets from the Ticketing Gate to see them here.
                </p>
              </div>
            ) : (
              filtered.map((item) => (
                <div key={item.id} 
                  className="p-6 hover:bg-zinc-800/30 
                    transition-all group">
                  <div className="flex flex-col md:flex-row 
                    md:items-center justify-between gap-4">

                    {/* Match Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-blue-400 
                          font-bold uppercase">
                          {item.league_name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 
                          py-0.5 rounded uppercase ${
                          item.status === 'active' 
                            ? 'bg-green-500/20 text-green-400'
                            : item.status === 'live' 
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-zinc-700 text-zinc-400'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-white font-bold text-lg uppercase">
                        {item.match_name}
                      </p>
                      {item.analysis_notes && (
                        <div className="flex items-start gap-1 mt-1">
                          <FileText size={10} 
                            className="text-zinc-500 mt-0.5" />
                          <p className="text-xs text-zinc-500 italic">
                            {item.analysis_notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 font-mono text-sm">
                      <div>
                        <p className="text-zinc-500 text-xs">Odds</p>
                        <p className="text-white font-bold">
                          {item.odds?.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">Stake</p>
                        <p className="text-yellow-400 font-bold">
                          ${item.stake?.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">Returns</p>
                        <p className="text-green-400 font-bold">
                          ${item.expected_return?.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">Value</p>
                        <div className="flex items-center gap-1">
                          {(item.value_rating || 0) > 0 
                            ? <TrendingUp size={14} 
                                className="text-green-400" /> 
                            : <TrendingDown size={14} 
                                className="text-red-400" />
                          }
                          <p className={`font-bold ${
                            (item.value_rating || 0) > 0 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            {((item.value_rating || 0) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">Date</p>
                        <p className="text-zinc-300 text-xs">
                          {new Date(item.created_at)
                            .toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="opacity-0 group-hover:opacity-100 
                        p-2 text-zinc-600 hover:text-red-500 transition-all"
                      aria-label="Delete entry"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}