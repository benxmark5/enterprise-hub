"use client";
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, RefreshCw, Target, Send,
  ChevronRight, Activity,
  CheckCircle, Clock, Save
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';

type Fixture = {
  id: number;
  starting_at: string;
  participants?: { 
    id: number; 
    name: string; 
    meta?: { location: string } 
  }[];
  scores?: { 
    description: string; 
    score?: { goals: number } 
  }[];
};

type ApiMatch = {
  id: number;
  league?: { id: number; name: string };
  participants?: {
    id: number;
    name: string;
    meta?: { location: string };
  }[];
};

type DraftItem = {
  matchId: number;
  matchName: string;
  leagueName: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  homeProb: number;
  drawProb: number;
  awayProb: number;
  selectedOutcome: string;
  stake: number;
  valueRating: number;
  expectedReturn: number;
  notes: string;
  tier: string;
};

export default function OddsMaster() {
  const[tier, setTier] = useState('normal');
  const[price, setPrice]=useState(2.50);
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<ApiMatch | null>(null);
  const [homeForm, setHomeForm] = useState<Fixture[]>([]);
  const [awayForm, setAwayForm] = useState<Fixture[]>([]);
  const [loadingForm, setLoadingForm] = useState(false);
  const [homeOdds, setHomeOdds] = useState(2.00);
  const [drawOdds, setDrawOdds] = useState(3.00);
  const [awayOdds, setAwayOdds] = useState(4.00);
  const [homeProb, setHomeProb] = useState(50);
  const [drawProb, setDrawProb] = useState(25);
  const [awayProb, setAwayProb] = useState(25);
  const [selectedOutcome, setSelectedOutcome] = 
    useState<'home' | 'draw' | 'away'>('home');
  const [stake, setStake] = useState(10);
  const [notes, setNotes] = useState('');
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // New states for the Tier Selector
  const [tier, setTier] = useState<string>('normal');
  const [price, setPrice] = useState<number>(2.50);

  const activeOdds = selectedOutcome === 'home' 
    ? homeOdds : selectedOutcome === 'draw' 
    ? drawOdds : awayOdds;
  const activeProb = selectedOutcome === 'home' 
    ? homeProb : selectedOutcome === 'draw' 
    ? drawProb : awayProb;
  const valueRating = (activeProb / 100) * activeOdds - 1;
  const expectedReturn = stake * activeOdds;
  const hasValue = valueRating > 0;
  const totalProb = homeProb + drawProb + awayProb;
  const probValid = totalProb === 100;

  const fetchMatches = async () => {
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
  };

  useEffect(() => { fetchMatches(); }, []);

  const fetchTeamForm = async (homeId: number, awayId: number) => {
    setLoadingForm(true);
    setHomeForm([]);
    setAwayForm([]);
    try {
      const [homeRes, awayRes] = await Promise.all([
        fetch(`/api/team-form/${homeId}`),
        fetch(`/api/team-form/${awayId}`),
      ]);
      const homeText = await homeRes.text();
      const awayText = await awayRes.text();
      const homeData = homeText ? JSON.parse(homeText) : {};
      const awayData = awayText ? JSON.parse(awayText) : {};
      setHomeForm(homeData.data || []);
      setAwayForm(awayData.data || []);
    } catch (e) {
      console.error('Form error:', e);
      setHomeForm([]);
      setAwayForm([]);
    } finally {
      setLoadingForm(false);
    }
  };

  const getResult = (fixture: Fixture, teamId: number) => {
    const isHome = fixture.participants?.find(
      p => p.id === teamId && p.meta?.location === 'home'
    );
    const homeScore = fixture.scores?.[0]?.score?.goals ?? 0;
    const awayScore = fixture.scores?.[1]?.score?.goals ?? 0;
    if (isHome) {
      if (homeScore > awayScore) 
        return { label: 'W', color: 'text-green-400' };
      if (homeScore < awayScore) 
        return { label: 'L', color: 'text-red-400' };
      return { label: 'D', color: 'text-yellow-400' };
    } else {
      if (awayScore > homeScore) 
        return { label: 'W', color: 'text-green-400' };
      if (awayScore < homeScore) 
        return { label: 'L', color: 'text-red-400' };
      return { label: 'D', color: 'text-yellow-400' };
    }
  };

  const getFormStats = (form: Fixture[], teamId: number) => {
    const wins = form.filter(
      f => getResult(f, teamId).label === 'W'
    ).length;
    const losses = form.filter(
      f => getResult(f, teamId).label === 'L'
    ).length;
    const draws = form.length - wins - losses;
    return { wins, losses, draws };
  };

  const handleSelectMatch = (match: ApiMatch) => {
    setSelectedMatch(match);
    setNotes('');
    setHomeOdds(2.00);
    setDrawOdds(3.00);
    setAwayOdds(4.00);
    setHomeProb(50);
    setDrawProb(25);
    setAwayProb(25);
    setSelectedOutcome('home');
    setTier('normal');
    setPrice(2.50);
    const homeId = match.participants?.[0]?.id;
    const awayId = match.participants?.[1]?.id;
    if (homeId && awayId) {
      fetchTeamForm(homeId, awayId);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedMatch) return;
    if (!probValid) {
      alert(`Probabilities must = 100%. Currently: ${totalProb}%`);
      return;
    }
    setSavingDraft(true);
    try {
      const homeTeam = 
        selectedMatch.participants?.[0]?.name ?? 'Home';
      const awayTeam = 
        selectedMatch.participants?.[1]?.name ?? 'Away';
      const matchName = `${homeTeam} vs ${awayTeam}`;
      const leagueName = 
        selectedMatch.league?.name ?? 'Unknown';

      const insertData = {
        name: `${matchName} - ${selectedOutcome.toUpperCase()}`,
        odds: activeOdds,
        price: stake,
        league_name: leagueName,
        home_team: homeTeam,
        away_team: awayTeam,
        status: 'draft',
        is_live: false,
        metadata: { tier, base_price: price },
        tier: tier,
        daily_price: price,
        
      };

      console.log('Inserting:', insertData);

      const { data, error } = await supabase
        .from('markets')
        .insert([insertData])
        .select();

      console.log('Result:', data, error);

      if (error) {
        alert(
          `Supabase Error: ${error.message} | Code: ${error.code}`
        );
        return;
      }

      const draft: DraftItem = {
        matchId: selectedMatch.id,
        matchName,
        leagueName,
        homeOdds, drawOdds, awayOdds,
        homeProb, drawProb, awayProb,
        selectedOutcome,
        stake,
        valueRating,
        expectedReturn,
        notes,
        tier
      };
      setDrafts(prev => [...prev, draft]);
      alert(`✅ "${matchName}" saved to drafts!`);
    } catch (e) {
      alert('Caught error: ' + String(e));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDispatchAll = async () => {
    if (drafts.length === 0) {
      alert('No drafts to dispatch!');
      return;
    }
    if (!confirm(
      `Dispatch ${drafts.length} bets to public as LIVE?`
    )) return;

    setDispatching(true);
    try {
      const { error: marketError } = await supabase
        .from('markets')
        .update({ status: 'live', is_live: true })
        .eq('status', 'draft');

      if (marketError) throw marketError;

      const inventoryRows = drafts.map(d => ({
        match_name: d.matchName,
        league_name: d.leagueName,
        odds: d.selectedOutcome === 'home'
          ? d.homeOdds
          : d.selectedOutcome === 'draw'
          ? d.drawOdds : d.awayOdds,
        stake: d.stake,
        expected_return: d.expectedReturn,
        value_rating: d.valueRating,
        home_odds: d.homeOdds,
        draw_odds: d.drawOdds,
        away_odds: d.awayOdds,
        home_probability: d.homeProb,
        draw_probability: d.drawProb,
        away_probability: d.awayProb,
        analysis_notes: d.notes,
        status: 'active',
        tier: d.tier
      }));

      const { error: invError } = await supabase
        .from('inventory')
        .insert(inventoryRows);

      if (invError) throw invError;

      alert(
        `🚀 ${drafts.length} bets dispatched!\n` +
        `Total Expected: $${drafts.reduce(
          (s, d) => s + d.expectedReturn, 0
        ).toFixed(2)}`
      );
      setDrafts([]);
    } catch (e) {
      alert('Dispatch error: ' + String(e));
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      <div className="max-w-7xl mx-auto p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/"
              className="flex items-center text-zinc-500 
                hover:text-yellow-500 mb-3 text-[10px] 
                font-bold tracking-widest uppercase 
                transition-colors">
              <ArrowLeft size={14} className="mr-2" />
              Return to Hub
            </Link>
            <div className="flex items-center gap-3">
              <Target className="text-yellow-500" size={28} />
              <h1 className="text-4xl font-black italic 
                tracking-tighter text-yellow-500 uppercase">
                ODDS_MASTER
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1 
              uppercase tracking-widest">
              Analysis & Draft Center // {matches.length} matches
            </p>
          </div>

          <button
            onClick={handleDispatchAll}
            disabled={dispatching || drafts.length === 0}
            className={`flex items-center gap-3 px-8 py-4 
              rounded-xl font-black text-sm uppercase 
              tracking-wider transition-all
              ${drafts.length > 0
                ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
          >
            <Send size={20} />
            {dispatching
              ? 'Dispatching...'
              : `Dispatch All (${drafts.length})`
            }
          </button>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Match List */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900/50 border border-zinc-800 
              rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 
                flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase 
                  tracking-widest text-zinc-400">
                  Today's Matches
                </h3>
                <button onClick={fetchMatches}
                  className="text-zinc-500 hover:text-white">
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="divide-y divide-zinc-800/50 
                max-h-[70vh] overflow-y-auto">
                {loadingMatches ? (
                  <div className="p-8 text-center text-zinc-500 
                    text-xs animate-pulse">
                    Loading matches...
                  </div>
                ) : matches.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 
                    text-xs">
                    No matches today
                  </div>
                ) : matches.map(match => {
                  const isSelected = selectedMatch?.id === match.id;
                  const isDrafted = drafts.some(
                    d => d.matchId === match.id
                  );
                  return (
                    <button
                      key={match.id}
                      onClick={() => handleSelectMatch(match)}
                      className={`w-full text-left p-4 
                        transition-all hover:bg-zinc-800/50 
                        ${isSelected
                          ? 'bg-yellow-500/10 border-l-2 border-yellow-500'
                          : ''
                        }`}
                    >
                      <div className="flex justify-between 
                        items-start">
                        <div className="flex-1">
                          <p className="text-[10px] text-zinc-500 
                            uppercase mb-1">
                            {match.league?.name ?? 'Unknown'}
                          </p>
                          <p className="text-sm font-bold text-white">
                            {match.participants?.[0]?.name ?? 'Home'}
                          </p>
                          <p className="text-xs text-zinc-500">vs</p>
                          <p className="text-sm font-bold text-white">
                            {match.participants?.[1]?.name ?? 'Away'}
                          </p>
                        </div>
                        <div className="flex flex-col 
                          items-end gap-1">
                          {isDrafted && (
                            <span className="text-[10px] 
                              bg-green-500/20 text-green-400 
                              px-2 py-0.5 rounded font-bold">
                              DRAFT ✓
                            </span>
                          )}
                          <ChevronRight size={16}
                            className={isSelected
                              ? 'text-yellow-500'
                              : 'text-zinc-600'
                            }
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Analysis Panel */}
          <div className="lg:col-span-2">
            {!selectedMatch ? (
              <div className="h-full flex items-center 
                justify-center bg-zinc-900/30 border 
                border-zinc-800 rounded-2xl min-h-96">
                <div className="text-center text-zinc-600 p-12">
                  <Target size={48}
                    className="mx-auto mb-4 opacity-30" />
                  <p className="font-bold uppercase 
                    tracking-widest text-sm">
                    Select a match to analyse
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Match Header */}
                <div className="bg-zinc-900/50 border 
                  border-zinc-800 rounded-2xl p-6">
                  <p className="text-xs text-yellow-500 
                    uppercase tracking-widest mb-3">
                    {selectedMatch.league?.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-xl font-black uppercase">
                        {selectedMatch.participants?.[0]?.name}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        HOME
                      </p>
                    </div>
                    <div className="text-yellow-500 font-black 
                      text-2xl px-6">
                      VS
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-xl font-black uppercase">
                        {selectedMatch.participants?.[1]?.name}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        AWAY
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      team: selectedMatch.participants?.[0],
                      form: homeForm,
                      label: 'HOME FORM'
                    },
                    {
                      team: selectedMatch.participants?.[1],
                      form: awayForm,
                      label: 'AWAY FORM'
                    },
                  ].map(({ team, form, label }) => {
                    const stats = getFormStats(
                      form, team?.id ?? 0
                    );
                    return (
                      <div key={label}
                        className="bg-zinc-900/50 border 
                          border-zinc-800 rounded-xl p-4">
                        <div className="flex items-center 
                          gap-2 mb-2">
                          <Activity size={12}
                            className="text-zinc-500" />
                          <p className="text-[10px] font-bold 
                            uppercase tracking-widest 
                            text-zinc-500">
                            {label}
                          </p>
                        </div>
                        <p className="text-sm font-bold mb-3 
                          uppercase truncate">
                          {team?.name}
                        </p>

                        {loadingForm ? (
                          <p className="text-xs text-zinc-600 
                            animate-pulse">
                            Loading...
                          </p>
                        ) : form.length === 0 ? (
                          <p className="text-xs text-zinc-600">
                            No recent data
                          </p>
                        ) : (
                          <>
                            <div className="flex gap-1 mb-3">
                              {form.map((f) => {
                                const r = getResult(
                                  f, team?.id ?? 0
                                );
                                return (
                                  <span key={f.id}
                                    className={`w-7 h-7 rounded-full
                                      flex items-center justify-center
                                      text-xs font-black border
                                      ${r.label === 'W'
                                        ? 'bg-green-500/20 border-green-500 text-green-400'
                                        : r.label === 'L'
                                        ? 'bg-red-500/20 border-red-500 text-red-400'
                                        : 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                                      }`}
                                  >
                                    {r.label}
                                  </span>
                                );
                              })}
                            </div>
                            <div className="grid grid-cols-3 
                              gap-2 text-center mb-2">
                              <div>
                                <p className="text-lg font-black 
                                  text-green-400">
                                  {stats.wins}
                                </p>
                                <p className="text-[10px] 
                                  text-zinc-500">W</p>
                              </div>
                              <div>
                                <p className="text-lg font-black 
                                  text-yellow-400">
                                  {stats.draws}
                                </p>
                                <p className="text-[10px] 
                                  text-zinc-500">D</p>
                              </div>
                              <div>
                                <p className="text-lg font-black 
                                  text-red-400">
                                  {stats.losses}
                                </p>
                                <p className="text-[10px] 
                                  text-zinc-500">L</p>
                              </div>
                            </div>
                            <div className="flex gap-0.5 
                              h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-green-500"
                                style={{
                                  width: `${(stats.wins / Math.max(form.length, 1)) * 100}%`
                                }}
                              />
                              <div
                                className="bg-yellow-500"
                                style={{
                                  width: `${(stats.draws / Math.max(form.length, 1)) * 100}%`
                                }}
                              />
                              <div
                                className="bg-red-500"
                                style={{
                                  width: `${(stats.losses / Math.max(form.length, 1)) * 100}%`
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Odds */}
                <div className="bg-zinc-900/50 border 
                  border-zinc-800 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase 
                    tracking-widest text-zinc-500 mb-3">
                    Set Odds
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Home Win', value: homeOdds,
                        set: setHomeOdds },
                      { label: 'Draw', value: drawOdds,
                        set: setDrawOdds },
                      { label: 'Away Win', value: awayOdds,
                        set: setAwayOdds },
                    ].map(({ label, value, set }) => (
                      <div key={label}>
                        <p className="text-xs text-zinc-500 mb-1">
                          {label}
                        </p>
                        <input
                          type="number"
                          step="0.01"
                          value={value}
                          onChange={e =>
                            set(parseFloat(e.target.value) || 0)
                          }
                          className="bg-zinc-950 border 
                            border-zinc-700 text-white font-mono 
                            p-2 rounded-lg w-full text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Probability */}
                <div className="bg-zinc-900/50 border 
                  border-zinc-800 rounded-xl p-4">
                  <div className="flex justify-between 
                    items-center mb-3">
                    <p className="text-[10px] font-bold uppercase 
                      tracking-widest text-zinc-500">
                      Probability
                    </p>
                    <span className={`text-xs font-bold ${
                      probValid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {totalProb}% {probValid ? '✅' : '≠ 100%'}
                    </span>
                  </div>
                  {[
                    {
                      label: `Home — ${selectedMatch.participants?.[0]?.name}`,
                      value: homeProb,
                      set: setHomeProb,
                      color: 'accent-green-500'
                    },
                    {
                      label: 'Draw',
                      value: drawProb,
                      set: setDrawProb,
                      color: 'accent-yellow-500'
                    },
                    {
                      label: `Away — ${selectedMatch.participants?.[1]?.name}`,
                      value: awayProb,
                      set: setAwayProb,
                      color: 'accent-blue-500'
                    },
                  ].map(({ label, value, set, color }) => (
                    <div key={label} className="mb-3">
                      <div className="flex justify-between 
                        text-xs text-zinc-400 mb-1">
                        <span className="truncate">{label}</span>
                        <span className="font-bold text-white ml-2">
                          {value}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="98"
                        value={value}
                        onChange={e =>
                          set(parseInt(e.target.value))
                        }
                        className={`w-full ${color}`}
                        aria-label={label}
                      />
                    </div>
                  ))}
                </div>

                {/* Outcome */}
                <div className="grid grid-cols-3 gap-3">
                  {(['home', 'draw', 'away'] as const).map(
                    outcome => {
                    const oOdds = outcome === 'home'
                      ? homeOdds : outcome === 'draw'
                      ? drawOdds : awayOdds;
                    const oProb = outcome === 'home'
                      ? homeProb : outcome === 'draw'
                      ? drawProb : awayProb;
                    const oVal = (oProb / 100) * oOdds - 1;
                    return (
                      <button
                        key={outcome}
                        onClick={() => setSelectedOutcome(outcome)}
                        className={`p-3 rounded-xl border 
                          text-center transition-all ${
                          selectedOutcome === outcome
                            ? 'border-yellow-500 bg-yellow-500/20'
                            : 'border-zinc-700 bg-zinc-950'
                        }`}
                      >
                        <p className="text-xs uppercase font-bold 
                          text-zinc-400">
                          {outcome}
                        </p>
                        <p className="font-mono text-white mt-1">
                          {oOdds.toFixed(2)}
                        </p>
                        <p className={`text-xs mt-1 font-bold ${
                          oVal > 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }`}>
                          {oVal > 0 ? '+' : ''}
                          {(oVal * 100).toFixed(0)}%
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Tier Selector inserted directly before Price setting input container */}
                {/* Tier Selector */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    color: '#6b7280', fontSize: '12px',
                    fontWeight: 700, textTransform: 'uppercase',
                    display: 'block', marginBottom: '8px'
                  }}>
                    Game Tier
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { tier: 'normal', label: 'Normal', price: 2.50,
                        color: '#6b7280' },
                      { tier: 'big', label: 'Big Game', price: 4.30,
                        color: '#fbbf24' },
                      { tier: 'super', label: 'Super', price: 6.00,
                        color: '#a78bfa' },
                    ].map(t => (
                      <button
                        key={t.tier}
                        type="button"
                        onClick={() => {
                          setTier(t.tier);
                          setPrice(t.price);
                        }}
                        style={{
                          flex: 1, padding: '10px 8px',
                          borderRadius: '10px',
                          border: tier === t.tier
                            ? `2px solid ${t.color}`
                            : '1px solid #1a2740',
                          background: tier === t.tier
                            ? `${t.color}20` : '#0a0f1a',
                          color: tier === t.tier ? t.color : '#374151',
                          fontWeight: 900, fontSize: '12px',
                          cursor: 'pointer', textAlign: 'center'
                        }}
                      >
                        <div>{t.label}</div>
                        <div style={{ fontSize: '14px', marginTop: '2px' }}>
                          ${t.price}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stake Container */}
                <div className="bg-zinc-900/50 border 
                  border-zinc-800 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase 
                    tracking-widest text-zinc-500 mb-2">
                    Stake ($)
                  </p>
                  <input
                    type="number"
                    step="0.10"
                    value={stake}
                    onChange={e =>
                      setStake(parseFloat(e.target.value) || 0)
                    }
                    className="bg-zinc-950 border border-zinc-700 
                      text-white text-2xl font-mono p-3 
                      rounded-lg w-full"
                  />
                </div>

                {/* Value */}
                <div className={`rounded-xl p-4 border ${
                  hasValue
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-red-500/50 bg-red-500/10'
                }`}>
                  <div className="grid grid-cols-3 gap-4 font-mono">
                    <div>
                      <p className="text-xs text-zinc-500">
                        Outcome
                      </p>
                      <p className="font-bold uppercase text-white">
                        {selectedOutcome}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Value</p>
                      <p className={`font-bold ${
                        hasValue ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {hasValue ? '+' : ''}
                        {(valueRating * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">
                        Returns
                      </p>
                      <p className="text-white font-bold">
                        ${expectedReturn.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className={`text-xs mt-3 font-bold ${
                    hasValue ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {hasValue
                      ? '✅ VALUE BET — Worth Adding to Draft'
                      : '❌ NO VALUE — Review Before Drafting'
                    }
                  </p>
                </div>

                {/* Notes */}
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Analysis notes: form, injuries, head-to-head..."
                  className="w-full bg-zinc-900/50 border 
                    border-zinc-800 text-white p-4 rounded-xl 
                    text-sm resize-none placeholder:text-zinc-600"
                  rows={3}
                />

                {/* Save Button */}
                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft || !probValid}
                  className={`w-full py-4 rounded-xl font-black 
                    uppercase tracking-wider flex items-center 
                    justify-center gap-3 transition-all text-sm
                    ${hasValue
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                    } disabled:opacity-50`}
                >
                  {savingDraft ? (
                    <span className="animate-pulse">Saving...</span>
                  ) : (
                    <>
                      {hasValue
                        ? <CheckCircle size={20} />
                        : <Clock size={20} />
                      }
                      <Save size={20} />
                      Save to Draft
                    </>
                  )}
                </button>

              </div>
            )}
          </div>
        </div>

        {/* Drafts Bar */}
        {drafts.length > 0 && (
          <div className="mt-6 bg-zinc-900/50 border 
            border-yellow-500/30 rounded-2xl p-4">
            <div className="flex items-center 
              justify-between mb-3">
              <p className="text-xs font-bold uppercase 
                tracking-widest text-yellow-500">
                {drafts.length} Bets Queued
              </p>
              <p className="text-xs text-zinc-500">
                Total Expected: $
                {drafts.reduce((s, d) => s + d.expectedReturn, 0).toFixed(2)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {drafts.map((d, idx) => (
                <div key={idx} className="bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                  <span className="font-bold text-yellow-500">[{d.tier.toUpperCase()}]</span>
                  <span className="text-white font-bold">{d.matchName}</span>
                  <span className="text-zinc-500 font-mono">({d.selectedOutcome.toUpperCase()} @ {d.odds.toFixed(2)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}