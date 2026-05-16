"use client";
import React, { useState, useEffect } from 'react';
import { 
  Ticket, ArrowLeft, RefreshCw, 
  CheckCircle, XCircle, Clock,
  TrendingUp, DollarSign, Activity,
  Eye, Send
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';
import { useSystem } from '../context/systemcontext';

type Market = {
  id: string;
  name: string;
  odds: number;
  price: number;
  league_name: string;
  home_team: string;
  away_team: string;
  status: string;
  is_live: boolean;
  created_at: string;
};

export default function TicketingGate() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const { addRevenue } = useSystem()!;

  // Stats
  const totalMarkets = markets.length;
  const liveMarkets = markets.filter(m => m.is_live).length;
  const draftMarkets = markets.filter(
    m => m.status === 'draft'
  ).length;
  const totalValue = markets.reduce(
    (sum, m) => sum + (m.price || 0), 0
  );

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMarkets(data || []);
    } catch (e) {
      console.error('Error fetching markets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMarkets(); }, []);

  // Go Live — single market
  const handleGoLive = async (market: Market) => {
    try {
      const { error } = await supabase
        .from('markets')
        .update({ status: 'live', is_live: true })
        .eq('id', market.id);

      if (error) throw error;
      await fetchMarkets();
      alert(`✅ ${market.home_team} vs ${market.away_team} is now LIVE!`);
    } catch (e) {
      alert('Error: ' + String(e));
    }
  };

  // Mark as Sold — records revenue
  const handleMarkSold = async (market: Market) => {
    if (!confirm(
      `Mark "${market.home_team} vs ${market.away_team}" as SOLD?\n` +
      `This will record $${market.price} revenue.`
    )) return;

    try {
      const { error } = await supabase
        .from('markets')
        .update({ status: 'closed', is_live: false })
        .eq('id', market.id);

      if (error) throw error;

      // Add to global revenue
      addRevenue(
        market.price * market.odds,
        `${market.home_team} vs ${market.away_team}`
      );

      await fetchMarkets();
      alert(
        `💰 Sold!\n` +
        `Revenue: $${(market.price * market.odds).toFixed(2)} recorded`
      );
    } catch (e) {
      alert('Error: ' + String(e));
    }
  };

  // Close/Cancel market
  const handleClose = async (id: string) => {
    if (!confirm('Close this market?')) return;
    try {
      const { error } = await supabase
        .from('markets')
        .update({ status: 'closed', is_live: false })
        .eq('id', id);

      if (error) throw error;
      await fetchMarkets();
    } catch (e) {
      alert('Error: ' + String(e));
    }
  };

  // Dispatch ALL drafts to live
  const handleDispatchAllDrafts = async () => {
    const drafts = markets.filter(m => m.status === 'draft');
    if (drafts.length === 0) {
      alert('No drafts to dispatch!');
      return;
    }
    if (!confirm(
      `Send ALL ${drafts.length} drafts LIVE to public?`
    )) return;

    try {
      const { error } = await supabase
        .from('markets')
        .update({ status: 'live', is_live: true })
        .eq('status', 'draft');

      if (error) throw error;
      await fetchMarkets();
      alert(`🚀 ${drafts.length} markets are now LIVE!`);
    } catch (e) {
      alert('Error: ' + String(e));
    }
  };

  const filtered = filter === 'ALL'
    ? markets
    : markets.filter(m =>
        filter === 'LIVE'
          ? m.is_live
          : m.status === filter.toLowerCase()
      );

  const getStatusStyle = (status: string, isLive: boolean) => {
    if (isLive) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (status === 'draft') 
      return 'bg-zinc-700/50 text-zinc-400 border-zinc-600';
    if (status === 'pending') 
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (status === 'closed') 
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <div className="max-w-7xl mx-auto p-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between 
          items-start md:items-center mb-8 gap-4">
          <div>
            <Link href="/"
              className="flex items-center text-zinc-500 
                hover:text-purple-400 mb-3 text-[10px] 
                font-bold tracking-widest uppercase 
                transition-colors">
              <ArrowLeft size={14} className="mr-2" />
              Return to Hub
            </Link>
            <div className="flex items-center gap-3">
              <Ticket className="text-purple-400" size={28} />
              <h1 className="text-4xl font-black italic 
                tracking-tighter text-purple-400 uppercase">
                TICKETING_GATE
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1 
              uppercase tracking-widest">
              Market Control // {totalMarkets} total markets
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchMarkets}
              className="p-3 rounded-lg bg-zinc-900 
                border border-zinc-800 text-zinc-400 
                hover:text-white transition-colors"
            >
              <RefreshCw size={18} />
            </button>
            {draftMarkets > 0 && (
              <button
                onClick={handleDispatchAllDrafts}
                className="flex items-center gap-2 
                  bg-purple-600 hover:bg-purple-500 
                  text-white px-6 py-3 rounded-xl 
                  font-bold text-sm transition-all"
              >
                <Send size={18} />
                Dispatch All Drafts ({draftMarkets})
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total Markets',
              value: totalMarkets,
              icon: Eye,
              color: 'text-white'
            },
            {
              label: 'Live Now',
              value: liveMarkets,
              icon: Activity,
              color: 'text-red-400'
            },
            {
              label: 'Drafts',
              value: draftMarkets,
              icon: Clock,
              color: 'text-yellow-400'
            },
            {
              label: 'Total Value',
              value: `$${totalValue.toFixed(2)}`,
              icon: DollarSign,
              color: 'text-green-400'
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label}
              className="bg-zinc-900/50 border border-zinc-800 
                rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500 uppercase 
                  tracking-widest">{label}</p>
                <Icon size={14} className={color} />
              </div>
              <p className={`text-2xl font-black font-mono ${color}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['ALL', 'LIVE', 'DRAFT', 'PENDING', 'CLOSED'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-[10px] font-bold 
                rounded-lg uppercase tracking-widest 
                transition-all ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-900 text-zinc-500 hover:text-white'
              }`}
            >
              {f}
              {f === 'LIVE' && liveMarkets > 0 && (
                <span className="ml-1 bg-red-500 text-white 
                  rounded-full px-1.5 py-0.5 text-[9px]">
                  {liveMarkets}
                </span>
              )}
              {f === 'DRAFT' && draftMarkets > 0 && (
                <span className="ml-1 bg-yellow-500 text-black 
                  rounded-full px-1.5 py-0.5 text-[9px]">
                  {draftMarkets}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Markets List */}
        <div className="bg-zinc-900/50 border border-zinc-800 
          rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-xs font-bold uppercase 
              tracking-widest text-zinc-400 flex items-center gap-2">
              <TrendingUp size={14} className="text-purple-400" />
              Markets — {filtered.length} showing
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500 
              animate-pulse">
              Loading markets...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Ticket size={40} 
                className="mx-auto mb-3 text-zinc-700" />
              <p className="text-zinc-500 text-sm">
                No markets found
              </p>
              <p className="text-zinc-600 text-xs mt-1">
                Go to ODDS_MASTER to analyse and draft markets
              </p>
              <Link href="/odds-master"
                className="inline-block mt-4 bg-purple-600 
                  hover:bg-purple-500 text-white px-6 py-2 
                  rounded-lg text-sm font-bold transition-all">
                Go to ODDS_MASTER →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {filtered.map(market => (
                <div key={market.id}
                  className="p-5 hover:bg-zinc-800/30 
                    transition-all group">
                  <div className="flex flex-col md:flex-row 
                    md:items-center justify-between gap-4">

                    {/* Match Info */}
                    <div className="flex-1">
                      <div className="flex items-center 
                        gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] 
                          text-purple-400 font-bold uppercase">
                          {market.league_name}
                        </span>
                        <span className={`text-[10px] font-bold 
                          px-2 py-0.5 rounded border uppercase ${
                          getStatusStyle(market.status, market.is_live)
                        }`}>
                          {market.is_live ? '🔴 LIVE' : market.status}
                        </span>
                        {market.is_live && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full 
                              bg-red-500 animate-pulse" />
                            <span className="text-[10px] text-red-400">
                              PUBLIC
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-white font-bold uppercase">
                        {market.home_team} 
                        <span className="text-purple-400 mx-2">vs</span>
                        {market.away_team}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {market.name} · Created:{' '}
                        {new Date(market.created_at)
                          .toLocaleDateString()}
                      </p>
                    </div>

                    {/* Odds + Price */}
                    <div className="flex gap-6 font-mono text-sm">
                      <div>
                        <p className="text-zinc-500 text-xs">Odds</p>
                        <p className="text-white font-bold">
                          {market.odds?.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">Price</p>
                        <p className="text-yellow-400 font-bold">
                          ${market.price?.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs">
                          Potential
                        </p>
                        <p className="text-green-400 font-bold">
                          ${(market.odds * market.price)?.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {market.status === 'draft' && (
                        <button
                          onClick={() => handleGoLive(market)}
                          className="flex items-center gap-1 
                            bg-green-600 hover:bg-green-500 
                            text-white px-4 py-2 rounded-lg 
                            text-xs font-bold transition-all"
                        >
                          <Send size={12} /> Go Live
                        </button>
                      )}
                      {market.is_live && (
                        <button
                          onClick={() => handleMarkSold(market)}
                          className="flex items-center gap-1 
                            bg-blue-600 hover:bg-blue-500 
                            text-white px-4 py-2 rounded-lg 
                            text-xs font-bold transition-all"
                        >
                          <CheckCircle size={12} /> Mark Sold
                        </button>
                      )}
                      {market.status !== 'closed' && (
                        <button
                          onClick={() => handleClose(market.id)}
                          className="flex items-center gap-1 
                            bg-zinc-800 hover:bg-red-900 
                            text-zinc-400 hover:text-red-400 
                            px-4 py-2 rounded-lg text-xs 
                            font-bold transition-all"
                        >
                          <XCircle size={12} /> Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}