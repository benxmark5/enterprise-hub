// src/app/admin/football-signals/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, type ReactElement } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { LEAGUE_CLUBS } from '@/lib/football/clubs';
import {
  Loader2, RefreshCw, Plus, X, AlertCircle, CheckCircle,
  Eye, EyeOff, Trash2, Target, Pencil, Archive, Star,
  Search, Filter, Calendar, Save, Trophy, ChevronDown,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────
type MarketStatus = 'draft' | 'review' | 'published' | 'unpublished' | 'archived';
type ResultStatus = 'pending' | 'won' | 'lost' | 'void';

type Market = {
  id: string;
  league: string;
  country: string | null;
  home_team: string;
  away_team: string;
  match_date: string | null;
  kickoff_at: string;
  timezone: string | null;
  venue: string | null;
  home_logo: string | null;
  away_logo: string | null;
  market_type: string;
  market_line: string | null;
  pick: string;
  odds: number;
  confidence: number | null;
  analysis: string | null;
  price_usd: number;
  code: string;
  status: MarketStatus;
  is_featured: boolean;
  is_published: boolean;
  is_closed: boolean;
  result_status: ResultStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const LEAGUES = Object.keys(LEAGUE_CLUBS);

const COUNTRIES: Record<string, string> = {
  'Premier League': 'England',
  'La Liga': 'Spain',
  'Serie A': 'Italy',
  'Bundesliga': 'Germany',
  'Ligue 1': 'France',
  'UEFA Champions League': 'Europe',
  'UEFA Europa League': 'Europe',
  'MLS': 'USA',
  'Brasileirão': 'Brazil',
  'Liga Profesional': 'Argentina',
};

const MARKET_TYPES = [
  { value: '1x2', label: '1X2 (Home / Draw / Away)' },
  { value: 'double_chance', label: 'Double Chance (1X / X2 / 12)' },
  { value: 'over_under', label: 'Over / Under Goals' },
  { value: 'btts', label: 'Both Teams To Score' },
  { value: 'correct_score', label: 'Correct Score' },
  { value: 'multigoals', label: 'Multigoals' },
  { value: 'handicap', label: 'Handicap' },
  { value: 'corners', label: 'Corners' },
  { value: 'cards', label: 'Cards' },
];
const KICKOFF_TIMES = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '15:30', '16:00',
  '16:30', '17:00', '17:30', '18:00', '18:30', '19:00',
  '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
  '22:30', '23:00', '23:30',
];

const STATUS_BADGE: Record<MarketStatus, { label: string; cls: string }> = {
  draft:       { label: 'Draft',       cls: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' },
  review:      { label: 'Review',      cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  published:   { label: 'Published',   cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  unpublished: { label: 'Unpublished', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  archived:    { label: 'Archived',    cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
};

const RESULT_BADGE: Record<ResultStatus, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' },
  won:     { label: 'Won',     cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  lost:    { label: 'Lost',    cls: 'bg-red-500/20 text-red-300 border-red-500/30' },
  void:    { label: 'Void',    cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
};

// ─────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────
export default function FootballSignalsPage(): ReactElement {
  const { user } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MarketStatus>('all');
  const [leagueFilter, setLeagueFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'upcoming' | 'past'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('football_markets')
        .select('*')
        .order('kickoff_at', { ascending: false })
        .limit(200);
      if (err) throw err;
      setMarkets((data ?? []) as Market[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load markets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Audit log helper ──
  const logAction = async (
    marketId: string,
    action: string,
    oldData: unknown,
    newData: unknown,
  ) => {
    try {
      await supabase.from('football_markets_audit').insert({
        market_id: marketId,
        action,
        actor_id: user?.id ?? null,
        actor_email: user?.email ?? null,
        old_data: oldData,
        new_data: newData,
      });
    } catch { /* non-blocking */ }
  };

  // ── Status change ──
  const changeStatus = async (m: Market, newStatus: MarketStatus) => {
    setBusyId(m.id);
    setError('');
    setSuccess('');
    try {
      const patch: Record<string, unknown> = {
        status: newStatus,
        is_published: newStatus === 'published',
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'published' && !m.published_at) {
        patch.published_at = new Date().toISOString();
      }
      const { error: err } = await supabase
        .from('football_markets')
        .update(patch)
        .eq('id', m.id);
      if (err) throw err;
      await logAction(m.id, `status:${newStatus}`, { status: m.status }, { status: newStatus });
      setSuccess(`Market ${newStatus}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  // ── Toggle featured ──
  const toggleFeatured = async (m: Market) => {
    setBusyId(m.id);
    setError('');
    try {
      const { error: err } = await supabase
        .from('football_markets')
        .update({ is_featured: !m.is_featured, updated_at: new Date().toISOString() })
        .eq('id', m.id);
      if (err) throw err;
      await logAction(m.id, 'toggle_featured', { is_featured: m.is_featured }, { is_featured: !m.is_featured });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to toggle featured');
    } finally {
      setBusyId(null);
    }
  };

  // ── Result change ──
  const changeResult = async (m: Market, newResult: ResultStatus) => {
    setBusyId(m.id);
    setError('');
    try {
      const { error: err } = await supabase
        .from('football_markets')
        .update({
          result_status: newResult,
          result_updated_at: new Date().toISOString(),
          result_updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', m.id);
      if (err) throw err;
      await logAction(m.id, `result:${newResult}`, { result_status: m.result_status }, { result_status: newResult });
      setSuccess(`Result marked as ${newResult}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update result');
    } finally {
      setBusyId(null);
    }
  };

  // ── Delete ──
  const remove = async (m: Market) => {
    if (!confirm(`Delete "${m.home_team} vs ${m.away_team}"? This cannot be undone.`)) return;
    setBusyId(m.id);
    setError('');
    try {
      const { error: err } = await supabase.from('football_markets').delete().eq('id', m.id);
      if (err) throw err;
      setSuccess('Market deleted.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const tomorrowStart = todayEnd;
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 86400000);

    return markets.filter(m => {
      const s = search.toLowerCase().trim();
      if (s && !(
        m.home_team.toLowerCase().includes(s) ||
        m.away_team.toLowerCase().includes(s) ||
        m.league.toLowerCase().includes(s) ||
        m.pick.toLowerCase().includes(s)
      )) return false;

      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (leagueFilter !== 'all' && m.league !== leagueFilter) return false;

      if (dateFilter !== 'all') {
        const kickoff = new Date(m.kickoff_at).getTime();
        if (dateFilter === 'today' && (kickoff < todayStart.getTime() || kickoff >= todayEnd.getTime())) return false;
        if (dateFilter === 'tomorrow' && (kickoff < tomorrowStart.getTime() || kickoff >= tomorrowEnd.getTime())) return false;
        if (dateFilter === 'upcoming' && kickoff < now) return false;
        if (dateFilter === 'past' && kickoff >= now) return false;
      }

      return true;
    });
  }, [markets, search, statusFilter, leagueFilter, dateFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target size={22} className="text-emerald-400" /> Football Signals
          </h1>
          <p className="text-sm text-white/40">
            Manually create markets, publish them, and manage results.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(!showForm); setEditingMarket(null); setError(''); setSuccess(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-black transition"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Close' : 'New Market'}
          </button>
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300" type="button">×</button>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <CheckCircle size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-300 flex-1">{success}</p>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-300" type="button">×</button>
        </div>
      )}

      {/* Form */}
      {showForm && user && (
        <MarketForm
          userId={user.id}
          editingMarket={editingMarket}
          onSaved={() => {
            setShowForm(false);
            setEditingMarket(null);
            load();
            setSuccess(editingMarket ? 'Market updated.' : 'Market created.');
          }}
          onError={(msg) => setError(msg)}
          onCancel={() => { setShowForm(false); setEditingMarket(null); }}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search teams, league, or pick..."
            className="form-input pl-9"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="form-input w-auto min-w-[140px]">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
          <option value="archived">Archived</option>
        </select>
        <select value={leagueFilter} onChange={e => setLeagueFilter(e.target.value)} className="form-input w-auto min-w-[180px]">
          <option value="all">All leagues</option>
          {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value as typeof dateFilter)} className="form-input w-auto min-w-[140px]">
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>
      </div>

      {/* List */}
      {loading && markets.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="ml-3 text-white/40">Loading markets...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Target size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/50 font-semibold">
            {markets.length === 0 ? 'No markets yet' : 'No markets match your filters'}
          </p>
          <p className="text-white/30 text-sm mt-1">
            {markets.length === 0 ? 'Click "New Market" to create your first.' : 'Try adjusting the filters above.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <MarketRow
              key={m.id}
              market={m}
              busy={busyId === m.id}
              onEdit={() => { setEditingMarket(m); setShowForm(true); }}
              onStatus={changeStatus}
              onToggleFeatured={() => toggleFeatured(m)}
              onResult={changeResult}
              onDelete={() => remove(m)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Market Form
// ─────────────────────────────────────────────────────────
function MarketForm({
  userId, editingMarket, onSaved, onError, onCancel,
}: {
  userId: string;
  editingMarket: Market | null;
  onSaved: () => void;
  onError: (msg: string) => void;
  onCancel: () => void;
}) {
  const isEdit = !!editingMarket;

  const [league, setLeague] = useState(editingMarket?.league ?? LEAGUES[0]);
  const [homeTeam, setHomeTeam] = useState(editingMarket?.home_team ?? '');
  const [awayTeam, setAwayTeam] = useState(editingMarket?.away_team ?? '');
    const [kickoffDate, setKickoffDate] = useState(
    editingMarket?.kickoff_at ? new Date(editingMarket.kickoff_at).toISOString().slice(0, 10) : ''
  );
  const [kickoffTime, setKickoffTime] = useState(
    editingMarket?.kickoff_at
      ? new Date(editingMarket.kickoff_at).toTimeString().slice(0, 5)
      : ''
  );
  const [venue, setVenue] = useState(editingMarket?.venue ?? '');
  const [homeLogo, setHomeLogo] = useState(editingMarket?.home_logo ?? '');
  const [awayLogo, setAwayLogo] = useState(editingMarket?.away_logo ?? '');
  const [marketType, setMarketType] = useState(editingMarket?.market_type ?? '1x2');
  const [marketLine, setMarketLine] = useState(editingMarket?.market_line ?? '');
  const [pick, setPick] = useState(editingMarket?.pick ?? '');
  const [odds, setOdds] = useState(editingMarket?.odds?.toString() ?? '');
  const [confidence, setConfidence] = useState(editingMarket?.confidence?.toString() ?? '');
  const [analysis, setAnalysis] = useState(editingMarket?.analysis ?? '');
  const [priceUsd, setPriceUsd] = useState(editingMarket?.price_usd?.toString() ?? '2.50');
  const [isFeatured, setIsFeatured] = useState(editingMarket?.is_featured ?? false);
  const [saving, setSaving] = useState(false);

  const clubs = LEAGUE_CLUBS[league] ?? [];

 

  const submit = async (status: MarketStatus) => {
    onError('');

    if (!homeTeam.trim() || !awayTeam.trim()) {
      onError('Home and Away teams are required');
      return;
    }
    if (homeTeam === awayTeam) {
      onError('Home and Away teams must be different');
      return;
    }
    if (!kickoffDate) {
      onError('Please pick a kickoff date');
      return;
    }
    if (!kickoffTime) {
      onError('Please pick a kickoff time');
      return;
    }
    const oddsNum = Number(odds);
    if (!Number.isFinite(oddsNum) || oddsNum < 1.01) {
      onError('Odds must be >= 1.01');
      return;
    }
    const priceNum = Number(priceUsd);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      onError('Price must be > 0');
      return;
    }

    setSaving(true);
    try {
            // Combine date + time as UTC (admin should enter UTC times for now)
      const [year, month, day] = kickoffDate.split('-').map(Number);
      const [hour, minute] = kickoffTime.split(':').map(Number);
      const kickoffIso = new Date(Date.UTC(year, month - 1, day, hour, minute, 0)).toISOString();
      const country = COUNTRIES[league] ?? null;

      const payload: Record<string, unknown> = {
        league,
        country,
        home_team: homeTeam.trim(),
        away_team: awayTeam.trim(),
        match_date: kickoffIso.slice(0, 10),
        kickoff_at: kickoffIso,
        timezone: 'UTC',
        venue: venue.trim() || null,
        home_logo: homeLogo.trim() || null,
        away_logo: awayLogo.trim() || null,
        market_type: marketType,
        market_line: marketLine.trim() || null,
        pick: pick.trim(),
        odds: oddsNum,
        confidence: confidence ? Math.max(0, Math.min(100, Number(confidence))) : null,
        analysis: analysis.trim() || null,
        price_usd: priceNum,
        status,
        is_published: status === 'published',
        is_featured: isFeatured,
        updated_at: new Date().toISOString(),
      };

      if (!isEdit) {
        // Generate short code
        const home = homeTeam.trim().slice(0, 3).toUpperCase().replace(/\s/g, '');
        const away = awayTeam.trim().slice(0, 3).toUpperCase().replace(/\s/g, '');
        const suffix = Date.now().toString(36).slice(-4);
        payload.code = marketLine
          ? `GH-${home}-${away}-${marketLine}-${suffix}`
          : `GH-${home}-${away}-${suffix}`;
        payload.created_by = userId;
        if (status === 'published') payload.published_at = new Date().toISOString();
      } else if (status === 'published' && !editingMarket?.published_at) {
        payload.published_at = new Date().toISOString();
      }

      if (isEdit && editingMarket) {
        const { error: err } = await supabase
          .from('football_markets')
          .update(payload)
          .eq('id', editingMarket.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('football_markets').insert(payload);
        if (err) throw err;
      }

      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4 border border-emerald-500/20 bg-emerald-500/[0.02]">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold flex items-center gap-2">
          {isEdit ? <Pencil size={16} className="text-emerald-400" /> : <Plus size={16} className="text-emerald-400" />}
          {isEdit ? 'Edit Market' : 'New Market'}
        </h3>
        <button type="button" onClick={onCancel} className="text-white/40 hover:text-white text-xl leading-none">×</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* League */}
        <Field label="League">
          <select
            value={league}
            onChange={e => { setLeague(e.target.value); setHomeTeam(''); setAwayTeam(''); }}
            className="form-input"
          >
            {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>

               {/* Kickoff Date */}
        <Field label="Kickoff Date (UTC)">
          <input
            type="date"
            value={kickoffDate}
            onChange={e => setKickoffDate(e.target.value)}
            className="form-input"
            style={{ colorScheme: 'dark' }}
          />
        </Field>

        {/* Kickoff Time */}
        <Field label="Kickoff Time (UTC)">
          <select
            value={kickoffTime}
            onChange={e => setKickoffTime(e.target.value)}
            className="form-input"
          >
            <option value="">Pick a time...</option>
            {KICKOFF_TIMES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        {/* Home */}
        <Field label="Home Team">
          <select value={homeTeam} onChange={e => setHomeTeam(e.target.value)} className="form-input">
            <option value="">Select home team...</option>
            {clubs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        {/* Away */}
        <Field label="Away Team">
          <select value={awayTeam} onChange={e => setAwayTeam(e.target.value)} className="form-input">
            <option value="">Select away team...</option>
            {clubs.filter(c => c !== homeTeam).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        {/* Venue */}
        <Field label="Venue (optional)">
          <input type="text" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Etihad Stadium" className="form-input" />
        </Field>

        {/* Market type */}
        <Field label="Market Type">
          <select value={marketType} onChange={e => setMarketType(e.target.value)} className="form-input">
            {MARKET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>

        {/* Market line */}
        <Field label="Market Line (optional)">
          <input type="text" value={marketLine} onChange={e => setMarketLine(e.target.value)} placeholder="e.g. 2.5 for Over/Under, 1X for DC" className="form-input" />
        </Field>

        {/* Pick */}
        <Field label="Pick / Selection">
          <input type="text" value={pick} onChange={e => setPick(e.target.value)} placeholder='e.g. "Over 2.5 Goals" or "Man City Win"' className="form-input" />
        </Field>

        {/* Odds */}
        <Field label="Odds">
          <input type="number" step="0.01" min="1.01" value={odds} onChange={e => setOdds(e.target.value)} placeholder="e.g. 1.72" className="form-input" />
        </Field>

        {/* Confidence */}
        <Field label="Confidence % (optional)">
          <input type="number" min="0" max="100" value={confidence} onChange={e => setConfidence(e.target.value)} placeholder="e.g. 87" className="form-input" />
        </Field>

        {/* Price */}
        <Field label="Price (USD)">
          <input type="number" step="0.01" min="0.01" value={priceUsd} onChange={e => setPriceUsd(e.target.value)} placeholder="e.g. 2.50" className="form-input" />
        </Field>

        {/* Featured */}
        <Field label="Featured">
          <button
            type="button"
            onClick={() => setIsFeatured(v => !v)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-bold transition ${
              isFeatured
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-white/5 text-white/50 border-white/10'
            }`}
          >
            <Star size={14} fill={isFeatured ? 'currentColor' : 'none'} />
            {isFeatured ? 'Featured' : 'Not featured'}
          </button>
        </Field>
      </div>

      {/* Logo URLs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Home Team Logo URL (optional)">
          <input type="url" value={homeLogo} onChange={e => setHomeLogo(e.target.value)} placeholder="https://..." className="form-input" />
        </Field>
        <Field label="Away Team Logo URL (optional)">
          <input type="url" value={awayLogo} onChange={e => setAwayLogo(e.target.value)} placeholder="https://..." className="form-input" />
        </Field>
      </div>

      {/* Analysis */}
      <Field label="Analysis / Explanation (optional, hidden from non-buyers)">
        <textarea
          value={analysis}
          onChange={e => setAnalysis(e.target.value)}
          placeholder="Why this pick? Form, injuries, head-to-head, etc."
          rows={3}
          className="form-input"
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
      </Field>

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => submit('published')}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-black transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          {isEdit ? 'Save & Publish' : 'Publish Now'}
        </button>
        <button
          type="button"
          onClick={() => submit('draft')}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition disabled:opacity-50"
        >
          <Save size={14} /> Save as Draft
        </button>
        <button
          type="button"
          onClick={() => submit('review')}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 rounded-xl text-sm font-bold transition disabled:opacity-50"
        >
          <Eye size={14} /> Send to Review
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-white/60 font-bold uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Market row
// ─────────────────────────────────────────────────────────
function MarketRow({
  market, busy, onEdit, onStatus, onToggleFeatured, onResult, onDelete,
}: {
  market: Market;
  busy: boolean;
  onEdit: () => void;
  onStatus: (m: Market, s: MarketStatus) => void;
  onToggleFeatured: () => void;
  onResult: (m: Market, r: ResultStatus) => void;
  onDelete: () => void;
}) {
  const kickoff = new Date(market.kickoff_at);
  const isPast = kickoff.getTime() < Date.now();
  const statusBadge = STATUS_BADGE[market.status];
  const resultBadge = RESULT_BADGE[market.result_status];

  return (
    <div className={`glass-card p-4 border ${
      market.status === 'published' ? 'border-emerald-500/20 bg-emerald-500/[0.02]'
        : market.status === 'archived' ? 'border-red-500/15 opacity-70'
        : 'border-white/10'
    }`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider">{market.league}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
            {market.is_featured && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Star size={9} fill="currentColor" /> Featured
              </span>
            )}
            {isPast && market.result_status !== 'pending' && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${resultBadge.cls}`}>
                {resultBadge.label}
              </span>
            )}
          </div>

          <p className="text-lg font-bold text-white">
            {market.home_team} <span className="text-white/40">vs</span> {market.away_team}
          </p>

          <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {kickoff.toLocaleString()}
            </span>
            {market.venue && <span>· {market.venue}</span>}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="px-2 py-1 rounded-md bg-white/5 text-xs">
              <span className="text-white/40">Market:</span>{' '}
              <span className="text-white">{market.market_type.replace('_', ' ')}</span>
              {market.market_line && <span className="text-white/60"> ({market.market_line})</span>}
            </span>
            <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-xs text-emerald-300 font-bold">
              Pick: {market.pick}
            </span>
            <span className="px-2 py-1 rounded-md bg-white/5 text-xs">
              <span className="text-white/40">Odds:</span>{' '}
              <span className="text-white font-bold">{market.odds}</span>
            </span>
            {market.confidence !== null && (
              <span className="px-2 py-1 rounded-md bg-white/5 text-xs">
                <span className="text-white/40">Conf:</span>{' '}
                <span className="text-emerald-400 font-bold">{market.confidence}%</span>
              </span>
            )}
            <span className="px-2 py-1 rounded-md bg-white/5 text-xs">
              <span className="text-white/40">Price:</span>{' '}
              <span className="text-white font-bold">${market.price_usd.toFixed(2)}</span>
            </span>
          </div>

          <p className="text-[10px] text-white/30 font-mono mt-2">Code: {market.code}</p>
        </div>

        <div className="flex flex-col gap-2 min-w-[180px]">
          {/* Status controls */}
          <div className="flex flex-wrap gap-1">
            {market.status !== 'published' && (
              <button
                onClick={() => onStatus(market, 'published')}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition disabled:opacity-50"
                type="button"
              >
                <Eye size={10} /> Publish
              </button>
            )}
            {market.status === 'published' && (
              <button
                onClick={() => onStatus(market, 'unpublished')}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition disabled:opacity-50"
                type="button"
              >
                <EyeOff size={10} /> Unpublish
              </button>
            )}
            {market.status !== 'review' && market.status !== 'published' && (
              <button
                onClick={() => onStatus(market, 'review')}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition disabled:opacity-50"
                type="button"
              >
                <Eye size={10} /> Review
              </button>
            )}
            {market.status !== 'archived' && (
              <button
                onClick={() => onStatus(market, 'archived')}
                disabled={busy}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition disabled:opacity-50"
                type="button"
              >
                <Archive size={10} /> Archive
              </button>
            )}
          </div>

          {/* Result controls */}
          {isPast && (
            <div className="flex flex-wrap gap-1">
              {(['pending','won','lost','void'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => onResult(market, r)}
                  disabled={busy || market.result_status === r}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold border transition disabled:opacity-40 ${
                    market.result_status === r
                      ? RESULT_BADGE[r].cls
                      : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
                  }`}
                  type="button"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-1 flex-wrap justify-end">
            <button
              onClick={onEdit}
              disabled={busy}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
              type="button"
            >
              <Pencil size={10} /> Edit
            </button>
            <button
              onClick={onToggleFeatured}
              disabled={busy}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition disabled:opacity-50 ${
                market.is_featured
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
              }`}
              type="button"
            >
              <Star size={10} fill={market.is_featured ? 'currentColor' : 'none'} />
              {market.is_featured ? 'Unfeature' : 'Feature'}
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition disabled:opacity-50"
              type="button"
            >
              <Trash2 size={10} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}