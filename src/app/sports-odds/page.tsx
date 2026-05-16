"use client";
import { useState, useEffect } from 'react';
import { ArrowLeft, Zap, RefreshCw } from 'lucide-react';
import Link from 'next/link';

type Match = {
  id: number;
  league?: { name: string };
  participants?: { name: string }[];
};

export default function SportsOddsV2() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fixtures');
      const data = await res.json();
      setMatches(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMatches(); }, []);

  const leagues = [...new Set(matches.map(m => 
    m.league?.name || 'Unknown League'
  ))];

  return (
    <div className="min-h-screen bg-[#050505] text-white 
      p-4 md:p-12 font-sans uppercase">
      <div className="max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-12">
          <div>
            <Link href="/" className="flex items-center text-zinc-500 
              hover:text-green-500 mb-4 transition-colors text-[10px] 
              font-bold tracking-widest">
              <ArrowLeft size={14} className="mr-2" /> Return to Hub
            </Link>
            <h1 className="text-5xl font-black italic tracking-tighter 
              text-green-500">
              SPORTS_ODDS_V2
            </h1>
            <p className="text-xs text-zinc-500 mt-2">
              {matches.length} live matches loaded
            </p>
          </div>
          <button
            onClick={fetchMatches}
            className="flex items-center gap-2 bg-green-500 
              hover:bg-green-400 text-black px-6 py-3 rounded-xl 
              font-bold"
          >
            <RefreshCw size={18} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-zinc-500">
            <p className="animate-pulse">Loading live matches...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {leagues.map(league => (
              <div key={league}>
                <div className="flex items-center gap-4 
                  border-b border-white/10 pb-4 mb-6">
                  <h2 className="text-xl font-black 
                    tracking-widest italic">
                    {league}
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {matches
                    .filter(m => 
                      (m.league?.name || 'Unknown League') === league
                    )
                    .map(match => (
                      <div key={match.id} 
                        className="bg-zinc-900/50 border 
                          border-white/5 p-6 rounded-2xl 
                          flex items-center justify-between
                          hover:border-green-500/30 transition-all">
                        <div>
                          <p className="text-xs text-zinc-500 mb-1">
                            {league}
                          </p>
                          <p className="text-lg font-bold">
                            {match.participants?.[0]?.name ?? 'Home'}{' '}
                            <span className="text-green-500">vs</span>{' '}
                            {match.participants?.[1]?.name ?? 'Away'}
                          </p>
                        </div>
                        <Link
                          href="/ticketing"
                          className="text-xs bg-green-500/10 
                            hover:bg-green-500 text-green-400 
                            hover:text-black px-4 py-2 rounded-lg 
                            font-bold transition-all"
                        >
                          Analyse →
                        </Link>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-20 text-center opacity-50">
          <p className="text-zinc-600 text-[10px] font-mono 
            tracking-[0.5em] flex items-center justify-center">
            <Zap size={12} className="mr-2 text-yellow-500" />
            Live Data // SportMonks API V3
          </p>
        </div>
      </div>
    </div>
  );
}