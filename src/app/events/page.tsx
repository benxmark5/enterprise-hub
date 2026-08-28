"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/supabase';
import {
  Plus, Calendar, MapPin, Ticket,
  ArrowLeft, Edit, Eye, EyeOff,
  RefreshCw, Star, Users, DollarSign
} from 'lucide-react';

type Event = {
  id: string; title: string; competition: string;
  home_team: string; away_team: string;
  home_team_flag: string; away_team_flag: string;
  venue_name: string; venue_city: string;
  venue_flag: string; event_date: string;
  event_time: string; status: string;
  is_published: boolean; is_featured: boolean;
  emoji: string;
};

type TierSummary = {
  event_id: string;
  total: number; sold: number; revenue: number;
};

export default function EventsManagePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [tiers, setTiers] = useState<TierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stadium_events')
      .select('*')
      .order('event_date', { ascending: true });

    const { data: tierData } = await supabase
      .from('ticket_tiers')
      .select('event_id, total_quantity, sold_quantity, price_usd');

    const summary: TierSummary[] = [];
    const grouped: Record<string, typeof tierData> = {};
    (tierData || []).forEach(t => {
      if (!grouped[t.event_id]) grouped[t.event_id] = [];
      grouped[t.event_id].push(t);
    });
    Object.entries(grouped).forEach(([eid, tlist]) => {
      summary.push({
        event_id: eid,
        total: tlist.reduce((s, t) => s + (t.total_quantity || 0), 0),
        sold: tlist.reduce((s, t) => s + (t.sold_quantity || 0), 0),
        revenue: tlist.reduce((s, t) => s + (t.sold_quantity || 0) * (t.price_usd || 0), 0),
      });
    });

    setEvents(data || []);
    setTiers(summary);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from('stadium_events').update({
      is_published: !current,
      status: !current ? 'published' : 'draft',
    }).eq('id', id);
    load();
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    await supabase.from('stadium_events').update({ is_featured: !current }).eq('id', id);
    load();
  };

  const filtered = events.filter(e =>
    filter === 'all' ? true :
    filter === 'published' ? e.is_published :
    !e.is_published
  );

  const getTier = (id: string) => tiers.find(t => t.event_id === id);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/" className="flex items-center text-zinc-500 hover:text-white mb-2 text-xs font-bold uppercase tracking-widest">
              <ArrowLeft size={14} className="mr-2" /> Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <Ticket className="text-orange-400" size={26} />
              <h1 className="text-2xl font-black italic text-orange-400 uppercase tracking-tight">
                EVENTS & TICKETS
              </h1>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 text-zinc-500 hover:text-white border border-zinc-800 px-4 py-2 rounded-xl text-xs font-bold">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link href="/events/new"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black px-5 py-2 rounded-xl font-black text-sm uppercase tracking-wider transition-all">
              <Plus size={18} /> Create Event
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { l: 'Total Events', v: events.length, c: '#fb923c' },
            { l: 'Published', v: events.filter(e => e.is_published).length, c: '#22c55e' },
            { l: 'Tickets Sold', v: tiers.reduce((s, t) => s + t.sold, 0), c: '#60a5fa' },
            { l: 'Revenue USD', v: `$${tiers.reduce((s, t) => s + t.revenue, 0).toFixed(0)}`, c: '#fbbf24' },
          ].map(s => (
            <div key={s.l} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
              <p className="font-black text-2xl font-mono" style={{ color: s.c }}>{loading ? '...' : s.v}</p>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mt-1">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 mb-5 w-fit">
          {(['all', 'published', 'draft'] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Events grid */}
        {loading ? (
          <div className="text-center p-12 text-zinc-500 animate-pulse">Loading events...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <Ticket size={48} className="mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-500 mb-4">No events yet</p>
            <Link href="/events/new" className="inline-flex items-center gap-2 bg-orange-500 text-black px-6 py-3 rounded-xl font-black text-sm">
              <Plus size={16} /> Create First Event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(event => {
              const tier = getTier(event.id);
              const soldPct = tier && tier.total > 0
                ? Math.round((tier.sold / tier.total) * 100) : 0;
              const daysLeft = Math.floor(
                (new Date(event.event_date).getTime() - Date.now()) / 86400000
              );
              return (
                <div key={event.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-orange-500/30 transition-all">

                  {/* Event header */}
                  <div style={{
                    background: `linear-gradient(135deg, ${event.home_team_color || '#1a3a5c'} 0%, #0a1628 50%, ${event.away_team_color || '#3a1a1a'} 100%)`,
                    padding: '16px',
                  }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                        {event.competition}
                      </span>
                      <div className="flex items-center gap-2">
                        {event.is_featured && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">⭐ FEATURED</span>}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${event.is_published ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                          {event.is_published ? '● LIVE' : '○ DRAFT'}
                        </span>
                      </div>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <p className="text-3xl mb-1">{event.home_team_flag}</p>
                        <p className="font-black text-sm text-white">{event.home_team || 'Home'}</p>
                      </div>
                      <div className="text-center px-4">
                        <p className="text-2xl font-black text-white/30">VS</p>
                        <p className="text-xs text-white/40 mt-1">{event.emoji}</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-3xl mb-1">{event.away_team_flag}</p>
                        <p className="font-black text-sm text-white">{event.away_team || 'Away'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(event.event_date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {event.venue_flag} {event.venue_city}
                      </span>
                      {daysLeft >= 0 && (
                        <span className={`font-bold ${daysLeft <= 3 ? 'text-red-400' : 'text-zinc-500'}`}>
                          {daysLeft === 0 ? 'TODAY' : `${daysLeft}d`}
                        </span>
                      )}
                    </div>

                    {/* Ticket sales bar */}
                    {tier && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-zinc-500">Tickets sold</span>
                          <span className="text-white font-bold">{tier.sold}/{tier.total} ({soldPct}%)</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div style={{ width: `${soldPct}%` }}
                            className={`h-full rounded-full ${soldPct >= 90 ? 'bg-red-500' : soldPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          Revenue: <span className="text-green-400 font-bold">${tier.revenue.toFixed(2)}</span>
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/events/${event.id}`}
                        className="flex-1 flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all">
                        <Edit size={13} /> Manage
                      </Link>
                      <button type="button"
                        onClick={() => toggleFeatured(event.id, event.is_featured)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${event.is_featured ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-zinc-700 text-zinc-500'}`}>
                        <Star size={13} />
                      </button>
                      <button type="button"
                        onClick={() => togglePublish(event.id, event.is_published)}
                        className={`flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-black transition-all ${event.is_published ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-green-500 text-black'}`}>
                        {event.is_published ? <><EyeOff size={13} /> Unpublish</> : <><Eye size={13} /> Publish</>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}