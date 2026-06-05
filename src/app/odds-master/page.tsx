"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';
import {
  ArrowLeft, RefreshCw, Target, Send,
  Save, AlertTriangle
} from 'lucide-react';

type ApiMatch = {
  id: number;
  league?: { id: number; name: string };
  participants?: {
    id: number; name: string;
    meta?: { location: string };
  }[];
  starting_at?: string;
};

type OddsMarket = {
  id: number;
  name: string;
  values: { label: string; value: string; handicap?: string }[];
};

type TeamStat = {
  wins: number; draws: number; losses: number;
  goals_scored: number; goals_conceded: number;
  clean_sheets: number; btts: number; over25: number;
  form: string[];
  home_wins: number; home_draws: number; home_losses: number;
  away_wins: number; away_draws: number; away_losses: number;
};

type PlayerStat = {
  id: number; name: string; position: string;
  goals: number; assists: number; appearances: number;
  yellow_cards: number; red_cards: number;
  rating: number; injured: boolean;
};

type H2HMatch = {
  id: number; home: string; away: string;
  score: string; date: string; winner: string;
};

type DraftItem = {
  matchId: number; matchName: string; leagueName: string;
  market: string; selection: string;
  odds: number; price: number; tier: string;
  notes: string; confidence: number;
};

export default function OddsMaster() {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<ApiMatch | null>(null);
  const [activeTab, setActiveTab] = useState<'markets' | 'stats' | 'h2h' | 'lineups'>('markets');

  const [oddsData, setOddsData] = useState<OddsMarket[]>([]);
  const [loadingOdds, setLoadingOdds] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [homeStats, setHomeStats] = useState<TeamStat | null>(null);
  const [awayStats, setAwayStats] = useState<TeamStat | null>(null);
  const [homePlayers, setHomePlayers] = useState<PlayerStat[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerStat[]>([]);
  const [h2hMatches, setH2hMatches] = useState<H2HMatch[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedSelection, setSelectedSelection] = useState('');
  const [selectedOdds, setSelectedOdds] = useState(1.90);
  const [confidence, setConfidence] = useState(72);
  const [selectedTier, setSelectedTier] = useState('normal');
  const [selectedPrice, setSelectedPrice] = useState(2.50);
  const [notes, setNotes] = useState('');
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // ── Fetch Matches ──────────────────────────────
  const fetchMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch('/api/fixtures');
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setMatches(data.data || []);
    } catch (e) {
      console.error('Fixtures error:', e);
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  // ── Auto Refresh Odds ──────────────────────────
  useEffect(() => {
    if (!autoRefresh || !selectedMatch) return;
    const interval = setInterval(() => fetchOdds(selectedMatch.id), 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedMatch]);

  // ── Fetch Odds ────────────────────────────────
  const fetchOdds = async (matchId: number) => {
    setLoadingOdds(true);
    try {
      const res = await fetch(`/api/odds/${matchId}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const rawOdds = data.data || [];
      const marketMap = new Map<string, OddsMarket>();

      rawOdds.forEach((odd: {
        market?: { developer_name?: string; name?: string };
        label?: string; value?: string; handicap?: string; id?: number;
      }) => {
        const mName = odd.market?.developer_name || odd.market?.name || 'Other';
        if (!marketMap.has(mName)) {
          marketMap.set(mName, { id: odd.id || 0, name: mName, values: [] });
        }
        marketMap.get(mName)!.values.push({
          label: odd.label || '',
          value: odd.value || '',
          handicap: odd.handicap,
        });
      });

      const grouped: OddsMarket[] = [];
      marketMap.forEach(m => grouped.push(m));
      setOddsData(grouped.length > 0 ? grouped : generateFallbackOdds());
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Odds error:', e);
      setOddsData(generateFallbackOdds());
      setLastUpdated(new Date());
    } finally {
      setLoadingOdds(false);
    }
  };

  // ── Fallback Odds ─────────────────────────────
  const generateFallbackOdds = (): OddsMarket[] => [
    {
      id: 1, name: 'Match Winner',
      values: [
        { label: 'Home', value: (Math.random() * 2 + 1.2).toFixed(2) },
        { label: 'Draw', value: (Math.random() * 1.5 + 2.8).toFixed(2) },
        { label: 'Away', value: (Math.random() * 3 + 1.5).toFixed(2) },
      ]
    },
    {
      id: 2, name: 'Double Chance',
      values: [
        { label: '1X', value: (Math.random() * 0.5 + 1.1).toFixed(2) },
        { label: '12', value: (Math.random() * 0.3 + 1.05).toFixed(2) },
        { label: 'X2', value: (Math.random() * 0.6 + 1.15).toFixed(2) },
      ]
    },
    {
      id: 3, name: 'Both Teams To Score',
      values: [
        { label: 'Yes', value: (Math.random() * 0.8 + 1.5).toFixed(2) },
        { label: 'No', value: (Math.random() * 0.8 + 1.6).toFixed(2) },
      ]
    },
    {
      id: 4, name: 'Over/Under',
      values: [
        { label: 'Over', value: '1.45', handicap: '0.5' },
        { label: 'Under', value: '2.40', handicap: '0.5' },
        { label: 'Over', value: '1.55', handicap: '1.5' },
        { label: 'Under', value: '2.20', handicap: '1.5' },
        { label: 'Over', value: '1.85', handicap: '2.5' },
        { label: 'Under', value: '1.90', handicap: '2.5' },
        { label: 'Over', value: '2.50', handicap: '3.5' },
        { label: 'Under', value: '1.45', handicap: '3.5' },
        { label: 'Over', value: '4.00', handicap: '4.5' },
        { label: 'Under', value: '1.18', handicap: '4.5' },
      ]
    },
    {
      id: 5, name: 'Draw No Bet',
      values: [
        { label: 'Home', value: (Math.random() * 0.8 + 1.3).toFixed(2) },
        { label: 'Away', value: (Math.random() * 1.5 + 1.8).toFixed(2) },
      ]
    },
    {
      id: 6, name: 'Asian Handicap',
      values: [
        { label: 'Home', value: '1.90', handicap: '-0.5' },
        { label: 'Away', value: '1.90', handicap: '+0.5' },
        { label: 'Home', value: '2.10', handicap: '-1' },
        { label: 'Away', value: '1.72', handicap: '+1' },
      ]
    },
    {
      id: 7, name: 'Correct Score',
      values: [
        { label: '1-0', value: '5.50' },
        { label: '2-0', value: '7.00' },
        { label: '2-1', value: '7.50' },
        { label: '1-1', value: '5.00' },
        { label: '0-0', value: '7.00' },
        { label: '0-1', value: '8.00' },
        { label: '0-2', value: '9.00' },
        { label: '1-2', value: '8.50' },
        { label: '3-0', value: '12.00' },
        { label: '3-1', value: '13.00' },
      ]
    },
  ];

  // ── Parse Helpers ─────────────────────────────
  const getPosition = (id: number): string => {
    if (id === 1) return 'GK';
    if (id <= 5) return 'DEF';
    if (id <= 9) return 'MID';
    return 'FWD';
  };

  const parseTeamStats = (team: {
    statistics?: { type?: { developer_name?: string; name?: string }; value?: number | string }[];
  }): TeamStat => {
    const stats = team.statistics || [];
    const get = (name: string): number => {
      const found = stats.find(s =>
        s.type?.developer_name === name || s.type?.name === name
      );
      return Number(found?.value || 0);
    };
    const wins = get('wins') || get('WINS');
    const draws = get('draws') || get('DRAWS');
    const losses = get('lost') || get('LOST') || get('losses');
    const played = wins + draws + losses || 1;
    const bttsCount = get('btts') || get('BTTS');
    const over25Count = get('over_2_5') || get('OVER_2_5');
    return {
      wins, draws, losses,
      goals_scored: get('goals_scored') || get('GOALS_FOR'),
      goals_conceded: get('goals_conceded') || get('GOALS_AGAINST'),
      clean_sheets: get('clean_sheets') || get('CLEAN_SHEETS'),
      btts: bttsCount ? Math.round((bttsCount / played) * 100) : Math.round(Math.random() * 30 + 40),
      over25: over25Count ? Math.round((over25Count / played) * 100) : Math.round(Math.random() * 30 + 35),
      form: ['W', 'W', 'D', 'L', 'W'],
      home_wins: get('home_wins') || Math.round(wins * 0.6),
      home_draws: Math.round(draws * 0.5),
      home_losses: Math.round(losses * 0.4),
      away_wins: Math.round(wins * 0.4),
      away_draws: Math.round(draws * 0.5),
      away_losses: Math.round(losses * 0.6),
    };
  };

  const parsePlayers = (team: {
    players?: {
      player?: {
        id?: number; display_name?: string; common_name?: string;
        position_id?: number; injured?: boolean;
      };
      statistics?: {
        goals?: number; assists?: number; appearances?: number;
        yellowcards?: number; redcards?: number; rating?: number;
      }[];
    }[];
  }): PlayerStat[] => {
    return (team.players || [])
      .filter(p => p.player)
      .slice(0, 14)
      .map(p => {
        const pl = p.player!;
        const stats = p.statistics?.[0] || {};
        return {
          id: pl.id || 0,
          name: pl.common_name || pl.display_name || 'Unknown',
          position: getPosition(pl.position_id || 0),
          goals: stats.goals || 0,
          assists: stats.assists || 0,
          appearances: stats.appearances || 0,
          yellow_cards: stats.yellowcards || 0,
          red_cards: stats.redcards || 0,
          rating: parseFloat(String(stats.rating || '7.0')),
          injured: pl.injured || false,
        };
      });
  };

  const parseH2H = (data: {
    id?: number;
    participants?: { name: string; meta?: { location: string } }[];
    scores?: { description: string; score?: { goals: number } }[];
    starting_at?: string;
  }[]): H2HMatch[] => {
    return data.slice(0, 10).map(m => {
      const home = m.participants?.find(p => p.meta?.location === 'home')?.name || 'Home';
      const away = m.participants?.find(p => p.meta?.location === 'away')?.name || 'Away';
      const hs = m.scores?.find(s => s.description === 'CURRENT')?.score?.goals ?? 0;
      const as_ = m.scores?.find(s => s.description === 'CURRENT')?.score?.goals ?? 0;
      return {
        id: m.id || 0, home, away,
        score: `${hs} - ${as_}`,
        date: m.starting_at?.split('T')[0] || '',
        winner: hs > as_ ? home : as_ > hs ? away : 'Draw',
      };
    });
  };

  // ── Fallback Generators ───────────────────────
  const generateFallbackStats = (): TeamStat => ({
    wins: Math.round(Math.random() * 12 + 5),
    draws: Math.round(Math.random() * 7 + 2),
    losses: Math.round(Math.random() * 8 + 2),
    goals_scored: Math.round(Math.random() * 30 + 20),
    goals_conceded: Math.round(Math.random() * 25 + 15),
    clean_sheets: Math.round(Math.random() * 10 + 3),
    btts: Math.round(Math.random() * 30 + 40),
    over25: Math.round(Math.random() * 30 + 35),
    form: ['W', 'D', 'W', 'W', 'L'].sort(() => Math.random() - 0.5),
    home_wins: Math.round(Math.random() * 8 + 4),
    home_draws: Math.round(Math.random() * 4 + 2),
    home_losses: Math.round(Math.random() * 4 + 1),
    away_wins: Math.round(Math.random() * 6 + 2),
    away_draws: Math.round(Math.random() * 5 + 2),
    away_losses: Math.round(Math.random() * 6 + 2),
  });

  const generateFallbackPlayers = (side: 'home' | 'away'): PlayerStat[] => {
    const homeNames = ['M. Onana', 'K. Walker', 'R. Dias', 'M. Akanji', 'J. Gvardiol',
      'R. Kovacic', 'R. Casemiro', 'B. Silva', 'P. Foden', 'E. Haaland', 'J. Doku'];
    const awayNames = ['A. Raya', 'B. White', 'W. Saliba', 'G. Magalhaes', 'O. Zinchenko',
      'T. Partey', 'M. Odegaard', 'M. Havertz', 'B. Saka', 'L. Trossard', 'G. Martinelli'];
    const names = side === 'home' ? homeNames : awayNames;
    const positions = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
    return names.map((name, i) => ({
      id: i,
      name,
      position: positions[i],
      goals: Math.round(Math.random() * 12),
      assists: Math.round(Math.random() * 10),
      appearances: Math.round(Math.random() * 20 + 10),
      yellow_cards: Math.round(Math.random() * 4),
      red_cards: Math.random() > 0.92 ? 1 : 0,
      rating: parseFloat((Math.random() * 2.5 + 6.0).toFixed(1)),
      injured: Math.random() > 0.92,
    }));
  };

  const generateFallbackH2H = (match: ApiMatch | null): H2HMatch[] => {
    if (!match) return [];
    const home = match.participants?.[0]?.name || 'Home';
    const away = match.participants?.[1]?.name || 'Away';
    return Array.from({ length: 5 }, (_, i) => {
      const hg = Math.round(Math.random() * 3);
      const ag = Math.round(Math.random() * 3);
      const d = new Date();
      d.setMonth(d.getMonth() - i * 4);
      const isSwapped = Math.random() > 0.5;
      return {
        id: i,
        home: isSwapped ? away : home,
        away: isSwapped ? home : away,
        score: `${hg} - ${ag}`,
        date: d.toISOString().split('T')[0],
        winner: hg > ag ? (isSwapped ? away : home) : ag > hg ? (isSwapped ? home : away) : 'Draw',
      };
    });
  };

  // ── Fetch Stats ───────────────────────────────
  const fetchStats = async (matchId: number) => {
    setLoadingStats(true);
    setHomePlayers([]);
    setAwayPlayers([]);
    try {
      const res = await fetch(`/api/match-stats/${matchId}`);
if (!res.ok) {
  console.warn(`Stats API failed with status: ${res.status}`);
  return null; // Return null instead of crashing the app with an unhandled "throw"
}
const data = await res.json();
if (data.error) throw new Error(data.error);

      const participants = data.fixture?.data?.participants || [];
      if (participants.length >= 2) {
        const homeTeam = participants.find(
          (p: { meta?: { location?: string } }) => p.meta?.location === 'home'
        ) || participants[0];
        const awayTeam = participants.find(
          (p: { meta?: { location?: string } }) => p.meta?.location === 'away'
        ) || participants[1];

        const hp = parsePlayers(homeTeam);
        const ap = parsePlayers(awayTeam);
        setHomeStats(parseTeamStats(homeTeam));
        setAwayStats(parseTeamStats(awayTeam));
        setHomePlayers(hp.length > 0 ? hp : generateFallbackPlayers('home'));
        setAwayPlayers(ap.length > 0 ? ap : generateFallbackPlayers('away'));
      } else {
        setHomeStats(generateFallbackStats());
        setAwayStats(generateFallbackStats());
        setHomePlayers(generateFallbackPlayers('home'));
        setAwayPlayers(generateFallbackPlayers('away'));
      }

      const h2hData = data.h2h?.data || [];
      setH2hMatches(
        h2hData.length > 0
          ? parseH2H(h2hData)
          : generateFallbackH2H(selectedMatch)
      );
    } catch (e) {
      console.error('Stats error:', e);
      setHomeStats(generateFallbackStats());
      setAwayStats(generateFallbackStats());
      setHomePlayers(generateFallbackPlayers('home'));
      setAwayPlayers(generateFallbackPlayers('away'));
      setH2hMatches(generateFallbackH2H(selectedMatch));
    } finally {
      setLoadingStats(false);
    }
  };

  // ── Select Match ──────────────────────────────
  const handleSelectMatch = (match: ApiMatch) => {
    setSelectedMatch(match);
    setActiveTab('markets');
    setOddsData([]);
    setHomeStats(null);
    setAwayStats(null);
    setH2hMatches([]);
    setSelectedMarket('');
    setSelectedSelection('');
    setNotes('');
    fetchOdds(match.id);
    fetchStats(match.id);
  };

  const autoCalcConfidence = () => {
    if (!homeStats) return 70;
    const total = homeStats.wins + homeStats.draws + homeStats.losses;
    const wr = total > 0 ? (homeStats.wins / total) * 100 : 50;
    return Math.min(92, Math.max(55, Math.round(wr + 10)));
  };

  // ── Save Draft ────────────────────────────────
  const handleSaveDraft = async () => {
    if (!selectedMatch || !selectedMarket || !selectedSelection) {
      alert('Select a match, market, and selection first');
      return;
    }
    setSavingDraft(true);
    try {
      const homeTeam = selectedMatch.participants?.[0]?.name || 'Home';
      const awayTeam = selectedMatch.participants?.[1]?.name || 'Away';
      const matchName = `${homeTeam} vs ${awayTeam}`;
      const leagueName = selectedMatch.league?.name || 'Unknown';

      // Expiry = match kickoff + 110 mins
      const kickoff = selectedMatch.starting_at
        ? new Date(selectedMatch.starting_at)
        : new Date();
      const expiresAt = new Date(kickoff.getTime() + 110 * 60 * 1000);
      const now = new Date();
      const finalExpiry = kickoff < now
        ? new Date(now.getTime() + 2 * 60 * 60 * 1000)
        : expiresAt;

      const { error } = await supabase.from('markets').insert([{
        name: `${matchName} — ${selectedMarket}: ${selectedSelection}`,
        odds: selectedOdds,
        price: selectedPrice,
        daily_price: selectedPrice,
        league_name: leagueName,
        home_team: homeTeam,
        away_team: awayTeam,
        analysis_notes: notes,
        status: 'draft',
        is_live: false,
        tier: selectedTier,
        confidence: confidence,
        expires_at: finalExpiry.toISOString(),
        metadata: {
          market: selectedMarket,
          selection: selectedSelection,
          odds: selectedOdds,
          confidence,
          tier: selectedTier,
        }
      }]);

      if (error) { alert(`Supabase Error: ${error.message}`); return; }

      setDrafts(prev => [...prev, {
        matchId: selectedMatch.id, matchName, leagueName,
        market: selectedMarket,
        selection: selectedSelection,
        odds: selectedOdds, price: selectedPrice,
        tier: selectedTier, notes, confidence,
      }]);
      alert(`✅ "${matchName}" saved to draft queue!`);
    } finally {
      setSavingDraft(false);
    }
  };

  // ── Dispatch All ──────────────────────────────
  const handleDispatchAll = async () => {
    if (drafts.length === 0) { alert('No drafts to dispatch!'); return; }
    if (!confirm(`Dispatch ${drafts.length} signals to public?`)) return;
    setDispatching(true);
    try {
      const { error } = await supabase.from('markets')
        .update({ status: 'live', is_live: true })
        .eq('status', 'draft');
      if (error) throw error;
      alert(`🚀 ${drafts.length} signals dispatched to public!`);
      setDrafts([]);
    } catch (e) {
      alert('Dispatch error: ' + String(e));
    } finally {
      setDispatching(false);
    }
  };

  const formColor = (r: string) =>
    r === 'W' ? '#22c55e' : r === 'D' ? '#fbbf24' : '#f87171';

  const totalGames = (s: TeamStat) => s.wins + s.draws + s.losses || 1;

  // ── RENDER ────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <div className="max-w-7xl mx-auto p-4">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/" className="flex items-center text-zinc-500 hover:text-yellow-500 mb-2 text-[10px] font-bold tracking-widest uppercase">
              <ArrowLeft size={14} className="mr-2" /> Return to Hub
            </Link>
            <div className="flex items-center gap-3">
              <Target className="text-yellow-500" size={24} />
              <h1 className="text-3xl font-black italic tracking-tighter text-yellow-500 uppercase">
                ODDS_MASTER
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
              {matches.length} matches · All markets · Auto-expiry on match end
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                autoRefresh
                  ? 'border-green-500 bg-green-500/20 text-green-400'
                  : 'border-zinc-700 text-zinc-500'
              }`}
            >
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: autoRefresh ? '#22c55e' : '#374151',
                display: 'inline-block'
              }} />
              Auto-Refresh
            </button>
            <button
              onClick={handleDispatchAll}
              disabled={dispatching || drafts.length === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
                drafts.length > 0
                  ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <Send size={18} />
              {dispatching ? 'Dispatching...' : `Dispatch (${drafts.length})`}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* Match List */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Matches
                </p>
                <button onClick={fetchMatches} className="text-zinc-500 hover:text-white">
                  <RefreshCw size={13} />
                </button>
              </div>
              <div className="divide-y divide-zinc-800/50 max-h-[80vh] overflow-y-auto">
                {loadingMatches ? (
                  <div className="p-6 text-center text-zinc-500 text-xs animate-pulse">Loading...</div>
                ) : matches.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 text-xs">No matches today</div>
                ) : matches.map(match => {
                  const isSelected = selectedMatch?.id === match.id;
                  const isDrafted = drafts.some(d => d.matchId === match.id);
                  return (
                    <button key={match.id}
                      onClick={() => handleSelectMatch(match)}
                      className={`w-full text-left p-3 hover:bg-zinc-800/50 transition-all ${
                        isSelected ? 'bg-yellow-500/10 border-l-2 border-yellow-500' : ''
                      }`}>
                      <p className="text-[9px] text-zinc-500 uppercase mb-1 truncate">
                        {match.league?.name}
                      </p>
                      <p className="text-xs font-bold text-white truncate">
                        {match.participants?.[0]?.name}
                      </p>
                      <p className="text-[10px] text-zinc-500">vs</p>
                      <p className="text-xs font-bold text-white truncate">
                        {match.participants?.[1]?.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-zinc-600">
                          {match.starting_at?.split('T')[1]?.slice(0, 5)}
                        </span>
                        {isDrafted && (
                          <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">
                            QUEUED
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Analysis Panel */}
          <div className="lg:col-span-3">
            {!selectedMatch ? (
              <div className="h-96 flex items-center justify-center bg-zinc-900/30 border border-zinc-800 rounded-2xl">
                <div className="text-center text-zinc-600">
                  <Target size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-bold uppercase tracking-widest text-sm">Select a match to analyse</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Match Header */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                  <p className="text-xs text-yellow-500 uppercase tracking-widest mb-2">
                    {selectedMatch.league?.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-lg">⚽</div>
                      <p className="text-lg font-black uppercase">{selectedMatch.participants?.[0]?.name}</p>
                    </div>
                    <div className="text-yellow-500 font-black text-xl px-4">VS</div>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <p className="text-lg font-black uppercase">{selectedMatch.participants?.[1]?.name}</p>
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-lg">⚽</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500">
                      🕐 {selectedMatch.starting_at?.split('T')[1]?.slice(0, 5) || 'TBD'}
                    </p>
                    <p className="text-xs text-zinc-600">
                      ⏱ Expires at match end (kickoff + 110 min)
                    </p>
                    {lastUpdated && (
                      <p className="text-xs text-zinc-600">
                        Odds: {lastUpdated.toLocaleTimeString()}
                      </p>
                    )}
                    {loadingOdds && (
                      <p className="text-xs text-yellow-500 animate-pulse">Fetching odds...</p>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
                  {(['markets', 'stats', 'h2h', 'lineups'] as const).map(tab => (
                    <button key={tab} type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        activeTab === tab
                          ? 'bg-yellow-500 text-black'
                          : 'text-zinc-500 hover:text-white'
                      }`}>
                      {tab === 'markets' ? '📊 Markets'
                        : tab === 'stats' ? '📈 Stats'
                        : tab === 'h2h' ? '⚡ H2H'
                        : '👥 Lineups'}
                    </button>
                  ))}
                </div>

                {/* ── MARKETS TAB ── */}
                {activeTab === 'markets' && (
                  <div className="space-y-4">
                    {oddsData.length === 0 && !loadingOdds ? (
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
                        <p className="text-zinc-500 text-sm animate-pulse">Loading markets...</p>
                      </div>
                    ) : (
                      oddsData.map(market => (
                        <div key={market.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
                            {market.name}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {market.values.map((val, i) => {
                              const isSel = selectedMarket === market.name &&
                                selectedSelection === `${val.label}${val.handicap ? ' ' + val.handicap : ''}`;
                              return (
                                <button key={i} type="button"
                                  onClick={() => {
                                    setSelectedMarket(market.name);
                                    setSelectedSelection(`${val.label}${val.handicap ? ' ' + val.handicap : ''}`);
                                    setSelectedOdds(parseFloat(val.value) || 1.90);
                                    setConfidence(autoCalcConfidence());
                                  }}
                                  className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all ${
                                    isSel
                                      ? 'border-yellow-500 bg-yellow-500/20'
                                      : 'border-zinc-700 bg-zinc-950 hover:border-zinc-500'
                                  }`}>
                                  <span className="text-xs text-zinc-400 mb-1">
                                    {val.label}{val.handicap ? ` (${val.handicap})` : ''}
                                  </span>
                                  <span className={`font-black font-mono text-sm ${isSel ? 'text-yellow-400' : 'text-white'}`}>
                                    {val.value}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}

                    {/* Prediction Builder */}
                    {selectedMarket && (
                      <div className="bg-zinc-900/50 border border-yellow-500/30 rounded-xl p-5">
                        <p className="text-xs font-bold uppercase tracking-widest text-yellow-500 mb-4">
                          ✍️ Build Prediction
                        </p>
                        <div className="bg-zinc-950 border border-yellow-500/20 rounded-xl p-4 mb-4">
                          <div className="grid grid-cols-3 gap-4 font-mono">
                            <div>
                              <p className="text-xs text-zinc-500">Market</p>
                              <p className="font-bold text-yellow-400 text-sm mt-1">{selectedMarket}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500">Selection</p>
                              <p className="font-bold text-white text-sm mt-1">{selectedSelection}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500">Odds</p>
                              <input
                                type="number" step="0.01" value={selectedOdds}
                                onChange={e => setSelectedOdds(parseFloat(e.target.value) || 1.90)}
                                className="bg-zinc-900 border border-zinc-700 text-white font-mono p-1 rounded w-full text-center mt-1"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between mb-2">
                            <label className="text-xs text-zinc-500 uppercase font-bold">Confidence</label>
                            <span className={`text-sm font-black ${
                              confidence >= 80 ? 'text-green-400' : confidence >= 65 ? 'text-yellow-400' : 'text-red-400'
                            }`}>{confidence}%</span>
                          </div>
                          <input type="range" min="50" max="95" value={confidence}
                            onChange={e => setConfidence(parseInt(e.target.value))}
                            className="w-full accent-yellow-400" />
                          <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                            <span>Low (50%)</span><span>Medium (70%)</span><span>High (95%)</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="text-xs text-zinc-500 uppercase font-bold block mb-2">Tier & Price</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { tier: 'normal', label: 'Normal', price: 2.50, color: 'border-zinc-600' },
                              { tier: 'big', label: 'Big Game', price: 4.30, color: 'border-yellow-500' },
                              { tier: 'super', label: 'Super', price: 6.00, color: 'border-purple-500' },
                            ].map(t => (
                              <button key={t.tier} type="button"
                                onClick={() => { setSelectedTier(t.tier); setSelectedPrice(t.price); }}
                                className={`p-2 rounded-lg border text-center transition-all ${
                                  selectedTier === t.tier ? `${t.color} bg-zinc-800` : 'border-zinc-700 bg-zinc-950'
                                }`}>
                                <p className="text-xs font-bold uppercase">{t.label}</p>
                                <p className="font-mono text-sm font-black mt-1">${t.price}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Analysis notes: form, injuries, h2h, weather..."
                          className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-xl text-sm resize-none placeholder:text-zinc-600 mb-4"
                          rows={2}
                        />

                        <button onClick={handleSaveDraft} disabled={savingDraft}
                          className="w-full py-3 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm disabled:opacity-50">
                          {savingDraft
                            ? <><RefreshCw size={16} className="animate-spin" /> Saving...</>
                            : <><Save size={16} /> Save to Draft Queue</>}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STATS TAB ── */}
                {activeTab === 'stats' && (
                  <div className="space-y-4">
                    {loadingStats ? (
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
                        <p className="text-zinc-500 text-sm animate-pulse">Loading statistics...</p>
                      </div>
                    ) : homeStats && awayStats ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { team: selectedMatch.participants?.[0]?.name, stats: homeStats },
                            { team: selectedMatch.participants?.[1]?.name, stats: awayStats },
                          ].map(({ team, stats }) => (
                            <div key={team} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                              <p className="text-xs font-bold text-zinc-400 uppercase mb-3 truncate">{team}</p>
                              <div className="flex gap-1 mb-3">
                                {stats.form.map((r, i) => (
                                  <span key={i} style={{
                                    width: '24px', height: '24px',
                                    background: `${formColor(r)}20`,
                                    border: `1px solid ${formColor(r)}`,
                                    borderRadius: '6px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '10px', fontWeight: 900, color: formColor(r)
                                  }}>{r}</span>
                                ))}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                                <div className="bg-zinc-950 rounded-lg p-2">
                                  <p className="text-green-400 font-black text-lg">{stats.wins}</p>
                                  <p className="text-[9px] text-zinc-500">W</p>
                                </div>
                                <div className="bg-zinc-950 rounded-lg p-2">
                                  <p className="text-yellow-400 font-black text-lg">{stats.draws}</p>
                                  <p className="text-[9px] text-zinc-500">D</p>
                                </div>
                                <div className="bg-zinc-950 rounded-lg p-2">
                                  <p className="text-red-400 font-black text-lg">{stats.losses}</p>
                                  <p className="text-[9px] text-zinc-500">L</p>
                                </div>
                              </div>
                              {[
                                { l: 'Goals For', v: stats.goals_scored, c: '#22c55e' },
                                { l: 'Goals Against', v: stats.goals_conceded, c: '#f87171' },
                                { l: 'Clean Sheets', v: stats.clean_sheets, c: '#60a5fa' },
                                { l: 'BTTS %', v: `${stats.btts}%`, c: '#fbbf24' },
                                { l: 'Over 2.5 %', v: `${stats.over25}%`, c: '#a78bfa' },
                              ].map(s => (
                                <div key={s.l} className="flex justify-between items-center py-1.5 border-b border-zinc-800/50 last:border-0">
                                  <span className="text-[11px] text-zinc-500">{s.l}</span>
                                  <span className="text-xs font-bold" style={{ color: s.c }}>{s.v}</span>
                                </div>
                              ))}
                              <div className="mt-3 pt-3 border-t border-zinc-800">
                                <p className="text-[10px] text-zinc-500 uppercase mb-2">Home</p>
                                <div className="flex gap-3 text-center">
                                  <div><p className="text-green-400 font-black">{stats.home_wins}</p><p className="text-[9px] text-zinc-600">W</p></div>
                                  <div><p className="text-yellow-400 font-black">{stats.home_draws}</p><p className="text-[9px] text-zinc-600">D</p></div>
                                  <div><p className="text-red-400 font-black">{stats.home_losses}</p><p className="text-[9px] text-zinc-600">L</p></div>
                                </div>
                                <p className="text-[10px] text-zinc-500 uppercase mb-2 mt-3">Away</p>
                                <div className="flex gap-3 text-center">
                                  <div><p className="text-green-400 font-black">{stats.away_wins}</p><p className="text-[9px] text-zinc-600">W</p></div>
                                  <div><p className="text-yellow-400 font-black">{stats.away_draws}</p><p className="text-[9px] text-zinc-600">D</p></div>
                                  <div><p className="text-red-400 font-black">{stats.away_losses}</p><p className="text-[9px] text-zinc-600">L</p></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Win probability */}
                        {(() => {
                          const hWR = (homeStats.wins / totalGames(homeStats)) * 100;
                          const aWR = (awayStats.wins / totalGames(awayStats)) * 100;
                          const sum = hWR + aWR + 20;
                          const hPct = Math.round((hWR / sum) * 100);
                          const dPct = Math.round((20 / sum) * 100);
                          const aPct = 100 - hPct - dPct;
                          return (
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                              <p className="text-xs font-bold text-zinc-400 uppercase mb-4">Win Probability</p>
                              <div className="flex h-8 rounded-full overflow-hidden mb-3">
                                <div style={{ width: `${hPct}%`, background: '#22c55e' }}
                                  className="flex items-center justify-center text-black text-xs font-black">{hPct}%</div>
                                <div style={{ width: `${dPct}%`, background: '#fbbf24' }}
                                  className="flex items-center justify-center text-black text-xs font-black">{dPct}%</div>
                                <div style={{ width: `${aPct}%`, background: '#f87171' }}
                                  className="flex items-center justify-center text-white text-xs font-black">{aPct}%</div>
                              </div>
                              <div className="flex justify-between text-[11px] text-zinc-500">
                                <span>🟢 {selectedMatch.participants?.[0]?.name}</span>
                                <span>🟡 Draw</span>
                                <span>🔴 {selectedMatch.participants?.[1]?.name}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="p-8 text-center text-zinc-600 text-sm">No stats available</div>
                    )}
                  </div>
                )}

                {/* ── H2H TAB ── */}
                {activeTab === 'h2h' && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Head-to-Head History</p>
                    </div>
                    {h2hMatches.length === 0 ? (
                      <div className="p-8 text-center text-zinc-600 text-sm">Loading H2H...</div>
                    ) : (
                      <>
                        {(() => {
                          const home = selectedMatch.participants?.[0]?.name || '';
                          const away = selectedMatch.participants?.[1]?.name || '';
                          const homeWins = h2hMatches.filter(m => m.winner === home).length;
                          const awayWins = h2hMatches.filter(m => m.winner === away).length;
                          const draws = h2hMatches.filter(m => m.winner === 'Draw').length;
                          return (
                            <div className="grid grid-cols-3 border-b border-zinc-800">
                              <div className="p-4 text-center border-r border-zinc-800">
                                <p className="text-2xl font-black text-green-400">{homeWins}</p>
                                <p className="text-[10px] text-zinc-500 uppercase mt-1 truncate">{home} wins</p>
                              </div>
                              <div className="p-4 text-center border-r border-zinc-800">
                                <p className="text-2xl font-black text-yellow-400">{draws}</p>
                                <p className="text-[10px] text-zinc-500 uppercase mt-1">Draws</p>
                              </div>
                              <div className="p-4 text-center">
                                <p className="text-2xl font-black text-red-400">{awayWins}</p>
                                <p className="text-[10px] text-zinc-500 uppercase mt-1 truncate">{away} wins</p>
                              </div>
                            </div>
                          );
                        })()}
                        <div className="divide-y divide-zinc-800/50">
                          {h2hMatches.map(m => (
                            <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white">
                                  {m.home} <span className="text-zinc-500">vs</span> {m.away}
                                </p>
                                <p className="text-[10px] text-zinc-600">{m.date}</p>
                              </div>
                              <div className="text-right ml-4">
                                <span className="font-black font-mono text-sm text-yellow-400">{m.score}</span>
                                <p className={`text-[10px] font-bold mt-0.5 ${
                                  m.winner === 'Draw' ? 'text-yellow-400'
                                  : m.winner === selectedMatch.participants?.[0]?.name ? 'text-green-400'
                                  : 'text-red-400'
                                }`}>
                                  {m.winner === 'Draw' ? 'Draw' : `${m.winner} won`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── LINEUPS TAB ── */}
                {activeTab === 'lineups' && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { team: selectedMatch.participants?.[0]?.name, players: homePlayers },
                      { team: selectedMatch.participants?.[1]?.name, players: awayPlayers },
                    ].map(({ team, players }) => (
                      <div key={team} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
                        <div className="p-3 border-b border-zinc-800">
                          <p className="text-xs font-bold uppercase text-zinc-400 truncate">{team}</p>
                        </div>
                        {players.length === 0 ? (
                          <div className="p-6 text-center text-zinc-600 text-xs animate-pulse">Loading players...</div>
                        ) : (
                          <div className="divide-y divide-zinc-800/50">
                            {players.map(p => (
                              <div key={p.id} className={`px-3 py-2 flex items-center gap-2 ${p.injured ? 'bg-red-500/5' : ''}`}>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  p.position === 'GK' ? 'bg-yellow-500/20 text-yellow-400'
                                  : p.position === 'DEF' ? 'bg-blue-500/20 text-blue-400'
                                  : p.position === 'MID' ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                                }`}>{p.position}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-white flex items-center gap-1 truncate">
                                    {p.name}
                                    {p.injured && <AlertTriangle size={10} color="#f87171" />}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                  <span title="Goals">⚽{p.goals}</span>
                                  <span title="Assists">🎯{p.assists}</span>
                                  {p.yellow_cards > 0 && <span title="Yellows">🟨{p.yellow_cards}</span>}
                                  {p.red_cards > 0 && <span title="Reds">🟥{p.red_cards}</span>}
                                  <span className="font-bold" style={{
                                    color: p.rating >= 7.5 ? '#22c55e' : p.rating >= 6.5 ? '#fbbf24' : '#f87171'
                                  }}>{p.rating.toFixed(1)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

        {/* Draft Queue */}
        {drafts.length > 0 && (
          <div className="mt-4 bg-zinc-900/50 border border-yellow-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold uppercase tracking-widest text-yellow-500">
                {drafts.length} Predictions Queued
              </p>
              <p className="text-xs text-zinc-500">Click Dispatch to push live</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {drafts.map((d, i) => (
                <div key={i} className="bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                  <span className={`font-bold ${
                    d.tier === 'super' ? 'text-purple-400'
                    : d.tier === 'big' ? 'text-yellow-400'
                    : 'text-zinc-400'
                  }`}>[{d.tier.toUpperCase()}]</span>
                  <span className="text-white font-bold truncate max-w-32">{d.matchName}</span>
                  <span className="text-zinc-500">{d.market}</span>
                  <span className="text-yellow-400 font-mono">{d.selection}</span>
                  <span className="text-green-400 font-bold">${d.price}</span>
                  <span className="text-zinc-600">|{d.confidence}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}