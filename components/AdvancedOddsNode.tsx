"use client";
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Send, Calculator, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase/client/client';

type ApiMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  league: string;
  sport?: string;
  odds?: { home: number; draw: number; away: number };
  source?: string;
};

const AdvancedOddsNode = () => {
  const [price, setPrice] = useState<number>(10.00);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [leagueName, setLeagueName] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [matchStatus, setMatchStatus] = useState('draft');
  const [notes, setNotes] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState<'home' | 'draw' | 'away'>('home');

  // 3 outcome odds
  const [homeOdds, setHomeOdds] = useState<number>(2.00);
  const [drawOdds, setDrawOdds] = useState<number>(3.00);
  const [awayOdds, setAwayOdds] = useState<number>(4.00);

  // 3 outcome probabilities
  const [homeProb, setHomeProb] = useState<number>(50);
  const [drawProb, setDrawProb] = useState<number>(25);
  const [awayProb, setAwayProb] = useState<number>(25);

  // Get active odds/prob based on selected outcome
  const activeOdds = selectedOutcome === 'home' ? homeOdds : selectedOutcome === 'draw' ? drawOdds : awayOdds;
  const activeProb = selectedOutcome === 'home' ? homeProb : selectedOutcome === 'draw' ? drawProb : awayProb;

  // Value calculations
  const valueRating = (activeProb / 100) * activeOdds - 1;
  const expectedReturn = price * activeOdds;
  const hasValue = valueRating > 0;

  // Total probability check
  const totalProb = homeProb + drawProb + awayProb;
  const probValid = totalProb === 100;

  const fetchTodaysMatches = async () => {
    try {
      const response = await fetch('/api/fixtures');
      if (!response.ok) return;
      const data = await response.json();
      setMatches(data.data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  useEffect(() => {
    fetchTodaysMatches();
  }, []);

  const handleDispatch = async () => {
    if (!homeTeam || !awayTeam) {
      alert('Please select a match first');
      return;
    }
    if (!probValid) {
      alert(`⚠️ Probabilities must add up to 100%. Currently: ${totalProb}%`);
      return;
    }

    setLoading(true);
    try {
      const matchName = `${homeTeam} vs ${awayTeam}`;

      // Save to markets
      const { error: marketError } = await supabase
        .from('markets')
        .insert([{
          name: `${matchName} - ${selectedOutcome.toUpperCase()}`,
          odds: activeOdds,
          price: parseFloat(price.toString()),
          league_name: leagueName,
          home_team: homeTeam,
          away_team: awayTeam,
          status: matchStatus,
          is_live: false,
        }]);

      if (marketError) throw marketError;

      // Save to inventory
      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert([{
          match_name: matchName,
          league_name: leagueName,
          odds: activeOdds,
          stake: parseFloat(price.toString()),
          expected_return: parseFloat(expectedReturn.toFixed(2)),
          value_rating: parseFloat(valueRating.toFixed(4)),
          home_odds: homeOdds,
          draw_odds: drawOdds,
          away_odds: awayOdds,
          home_probability: homeProb,
          draw_probability: drawProb,
          away_probability: awayProb,
          analysis_notes: notes,
          status: 'active',
        }]);

      if (inventoryError) throw inventoryError;

      alert(
        `✅ Dispatched!\n` +
        `📋 ${matchName}\n` +
        `🎯 Outcome: ${selectedOutcome.toUpperCase()}\n` +
        `💰 Stake: $${price} @ ${activeOdds}\n` +
        `📈 Expected Return: $${expectedReturn.toFixed(2)}\n` +
        `📊 Value: ${(valueRating * 100).toFixed(1)}%`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Check console';
      alert('❌ Error: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-2xl">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg uppercase tracking-wider">
            Analysis Center
          </h2>
          <span className="text-xs text-slate-500">
            {matches.length > 0 ? `${matches.length} matches` : 'Loading...'}
          </span>
        </div>

        {/* Match Selector */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">
            Select Match
          </label>
          <select
            className="bg-slate-950 border border-slate-800 text-white p-3 rounded-lg w-full"
            onChange={(e) => {
              const selected = matches.find(
                (m) => m.id === e.target.value
              );
              if (selected) {
                setLeagueName(selected.league || 'Unknown League');
                setHomeTeam(selected.homeTeam || 'Home Team');
                setAwayTeam(selected.awayTeam || 'Away Team');
                setNotes('');
              }
            }}
          >
            <option value="">Select a Match...</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.league || 'Match'}: {m.homeTeam || 'Home'} vs {m.awayTeam || 'Away'}
              </option>
            ))}
          </select>
        </div>

        {/* Match Display */}
        {homeTeam && (
          <div className="bg-slate-950 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-blue-400 uppercase text-center mb-2">
              {leagueName}
            </p>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-white font-bold text-sm">{homeTeam}</p>
                <p className="text-xs text-slate-500">HOME</p>
              </div>
              <div className="text-blue-400 font-bold text-lg px-3">VS</div>
              <div className="text-center flex-1">
                <p className="text-white font-bold text-sm">{awayTeam}</p>
                <p className="text-xs text-slate-500">AWAY</p>
              </div>
            </div>
          </div>
        )}

        {/* 3 Outcome Odds */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">
            Sportmonks Odds (All Outcomes)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-slate-500 text-center mb-1">Home Win</p>
              <input
                type="number"
                step="0.01"
                value={homeOdds}
                onChange={(e) => setHomeOdds(parseFloat(e.target.value) || 0)}
                className="bg-slate-950 border border-slate-800 text-white font-mono p-2 rounded-lg w-full text-center"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 text-center mb-1">Draw</p>
              <input
                type="number"
                step="0.01"
                value={drawOdds}
                onChange={(e) => setDrawOdds(parseFloat(e.target.value) || 0)}
                className="bg-slate-950 border border-slate-800 text-white font-mono p-2 rounded-lg w-full text-center"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 text-center mb-1">Away Win</p>
              <input
                type="number"
                step="0.01"
                value={awayOdds}
                onChange={(e) => setAwayOdds(parseFloat(e.target.value) || 0)}
                className="bg-slate-950 border border-slate-800 text-white font-mono p-2 rounded-lg w-full text-center"
              />
            </div>
          </div>
        </div>

        {/* Probability Sliders */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Your Probability Estimates
            </label>
            <span className={`text-xs font-bold ${probValid ? 'text-green-400' : 'text-red-400'}`}>
              Total: {totalProb}% {probValid ? '✅' : '(must = 100%)'}
            </span>
          </div>

          {/* Home Prob */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Home Win ({homeTeam || 'Home'})</span>
              <span className="font-bold text-white">{homeProb}%</span>
            </div>
            <input
              type="range" min="1" max="98"
              value={homeProb}
              onChange={(e) => setHomeProb(parseInt(e.target.value))}
              className="w-full accent-green-500"
              aria-label="Home win probability"
            />
          </div>

          {/* Draw Prob */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Draw</span>
              <span className="font-bold text-white">{drawProb}%</span>
            </div>
            <input
              type="range" min="1" max="98"
              value={drawProb}
              onChange={(e) => setDrawProb(parseInt(e.target.value))}
              className="w-full accent-yellow-500"
              aria-label="Draw probability"
            />
          </div>

          {/* Away Prob */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Away Win ({awayTeam || 'Away'})</span>
              <span className="font-bold text-white">{awayProb}%</span>
            </div>
            <input
              type="range" min="1" max="98"
              value={awayProb}
              onChange={(e) => setAwayProb(parseInt(e.target.value))}
              className="w-full accent-blue-500"
              aria-label="Away win probability"
            />
          </div>
        </div>

        {/* Outcome Selector */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">
            Select Outcome To Dispatch
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['home', 'draw', 'away'] as const).map((outcome) => {
              const outcomeOdds = outcome === 'home' ? homeOdds : outcome === 'draw' ? drawOdds : awayOdds;
              const outcomeProb = outcome === 'home' ? homeProb : outcome === 'draw' ? drawProb : awayProb;
              const outVal = (outcomeProb / 100) * outcomeOdds - 1;
              return (
                <button
                  key={outcome}
                  onClick={() => setSelectedOutcome(outcome)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    selectedOutcome === outcome
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-slate-700 bg-slate-950 text-slate-400'
                  }`}
                >
                  <p className="text-xs uppercase font-bold">{outcome}</p>
                  <p className="font-mono text-sm mt-1">{outcomeOdds}</p>
                  <p className={`text-xs mt-1 ${outVal > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {outVal > 0 ? '+' : ''}{(outVal * 100).toFixed(0)}%
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stake */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">
            Stake ($)
          </label>
          <input
            type="number"
            step="0.10"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            className="bg-slate-950 border border-slate-800 text-white text-2xl font-mono p-3 rounded-lg w-full"
          />
        </div>

        {/* Value Analysis */}
        <div className={`rounded-lg p-4 border ${hasValue ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Calculator size={16} className={hasValue ? 'text-green-400' : 'text-red-400'} />
            <span className="text-xs font-bold uppercase text-slate-400">Value Analysis</span>
          </div>
          <div className="grid grid-cols-3 gap-3 font-mono text-sm">
            <div>
              <p className="text-slate-500 text-xs">Outcome</p>
              <p className="text-white font-bold uppercase">{selectedOutcome}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Value</p>
              <p className={`font-bold ${hasValue ? 'text-green-400' : 'text-red-400'}`}>
                {hasValue ? '+' : ''}{(valueRating * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Returns</p>
              <p className="text-white font-bold">${expectedReturn.toFixed(2)}</p>
            </div>
          </div>
          <p className={`text-xs mt-2 font-bold ${hasValue ? 'text-green-400' : 'text-red-400'}`}>
            {hasValue ? '✅ VALUE BET — Worth Dispatching' : '❌ NO VALUE — Consider Skipping'}
          </p>
        </div>

        {/* Analysis Notes */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-slate-500" />
            <label className="text-xs font-bold text-slate-500 uppercase">
              Analysis Notes / Reasoning
            </label>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Home team on 5 game winning streak, away team missing key players..."
            className="bg-slate-950 border border-slate-800 text-white p-3 rounded-lg w-full text-sm resize-none"
            rows={3}
          />
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Status</label>
          <select
            value={matchStatus}
            onChange={(e) => setMatchStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white p-3 rounded-lg w-full"
          >
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="live">Live</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Dispatch Button */}
        <button
          onClick={handleDispatch}
          disabled={loading || !probValid}
          className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all
            ${hasValue ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'}
            disabled:bg-slate-800 text-white`}
        >
          {loading
            ? 'Dispatching...'
            : <><Send size={20} />{hasValue ? 'Dispatch Value Bet' : 'Dispatch Anyway'}</>
          }
        </button>

      </div>
    </div>
  );
};

export default AdvancedOddsNode;
