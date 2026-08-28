"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/supabase';
import {
  ArrowLeft, Plus, Ticket, Save,
  Trash2, CheckCircle
} from 'lucide-react';

type Tier = {
  name: string; description: string; color: string;
  badge: string; section: string; price_usd: string;
  total_quantity: string; max_per_order: string;
  perks: string; is_seated: boolean; sort_order: number;
};

const DEFAULT_TIERS: Tier[] = [
  { name: 'VIP Box', description: 'Premium experience with exclusive lounge access', color: '#fbbf24', badge: '👑', section: 'VIP Box', price_usd: '250', total_quantity: '50', max_per_order: '4', perks: 'Private lounge, Premium catering, Match program, VIP parking', is_seated: true, sort_order: 0 },
  { name: 'Premium', description: 'Covered seating with excellent pitch views', color: '#a78bfa', badge: '💜', section: 'Premium Stand', price_usd: '85', total_quantity: '200', max_per_order: '6', perks: 'Covered seating, Priority entry, Match program', is_seated: true, sort_order: 1 },
  { name: 'Standard', description: 'Great views in the main stand', color: '#22c55e', badge: '🎫', section: 'Main Stand', price_usd: '35', total_quantity: '500', max_per_order: '8', perks: 'Reserved seating, Standard entry', is_seated: true, sort_order: 2 },
  { name: 'Economy', description: 'General admission in the supporter section', color: '#6b7280', badge: '🏟️', section: 'General Admission', price_usd: '15', total_quantity: '1000', max_per_order: '10', perks: 'General entry', is_seated: false, sort_order: 3 },
];

const COLORS = ['#fbbf24','#a78bfa','#22c55e','#60a5fa','#f87171','#34d399','#fb923c','#e879f9'];
const FLAGS = ['🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇰🇪','🇳🇬','🇬🇭','🇿🇦','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇧🇷','🇦🇷','🇪🇸','🇮🇹','🇵🇹','🇸🇳','🇺🇬','🇹🇿','🇷🇼','🇪🇬','🇲🇦','🇦🇺','🇯🇵','🇨🇳','🏳️'];
const SPORTS = [
  { id: 'football', label: 'Football', emoji: '⚽' },
  { id: 'basketball', label: 'Basketball', emoji: '🏀' },
  { id: 'tennis', label: 'Tennis', emoji: '🎾' },
  { id: 'rugby', label: 'Rugby', emoji: '🏉' },
  { id: 'cricket', label: 'Cricket', emoji: '🏏' },
  { id: 'athletics', label: 'Athletics', emoji: '🏃' },
  { id: 'motorsport', label: 'Motorsport', emoji: '🏎️' },
  { id: 'boxing', label: 'Boxing', emoji: '🥊' },
];

export default function CreateEventPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [activeStep, setActiveStep] = useState(1);
  const [form, setForm] = useState({
    title: '', subtitle: '', competition: '',
    sport: 'football', emoji: '⚽',
    home_team: '', away_team: '',
    home_team_flag: '🏳️', away_team_flag: '🏳️',
    home_team_color: '#22c55e', away_team_color: '#ef4444',
    venue_name: '', venue_city: '', venue_country: '',
    venue_flag: '🌍', venue_capacity: '',
    event_date: '', event_time: '18:00', gates_open: '16:00',
    cover_color_1: '#0a1628', cover_color_2: '#1a3a5c',
    is_featured: false, is_published: false,
  });

  const setF = (k: string, v: string | boolean) =>
    setForm(p => ({ ...p, [k]: v }));

  const setTier = (i: number, k: keyof Tier, v: string | boolean) =>
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [k]: v } : t));

  const addTier = () => setTiers(prev => [...prev, {
    name: 'New Tier', description: '', color: '#60a5fa', badge: '🎫',
    section: '', price_usd: '20', total_quantity: '100',
    max_per_order: '6', perks: '', is_seated: false,
    sort_order: prev.length
  }]);

  const removeTier = (i: number) =>
    setTiers(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async (publish = false) => {
    if (!form.title || !form.competition || !form.venue_name || !form.event_date) {
      alert('Please fill in all required fields'); return;
    }
    setSaving(true);
    try {
      const { data: event, error } = await supabase
        .from('stadium_events')
        .insert({
          ...form,
          venue_capacity: parseInt(form.venue_capacity) || 0,
          is_published: publish,
          status: publish ? 'published' : 'draft',
        })
        .select().single();

      if (error) throw error;

      // Insert tiers
      if (tiers.length > 0) {
        const tierRows = tiers.map(t => ({
          event_id: event.id,
          name: t.name,
          description: t.description,
          color: t.color,
          badge: t.badge,
          section: t.section,
          price_usd: parseFloat(t.price_usd) || 0,
          total_quantity: parseInt(t.total_quantity) || 0,
          max_per_order: parseInt(t.max_per_order) || 6,
          perks: t.perks.split(',').map(p => p.trim()).filter(Boolean),
          is_seated: t.is_seated,
          sort_order: t.sort_order,
          is_active: true,
        }));
        await supabase.from('ticket_tiers').insert(tierRows);
      }

      setSuccess(true);
      setTimeout(() => router.push('/events'), 2000);
    } catch (e) {
      alert('Error: ' + String(e));
    } finally {
      setSaving(false);
    }
  };

  const inputSt = "w-full bg-zinc-950 border border-zinc-700 text-white p-3 rounded-xl text-sm outline-none focus:border-orange-500/50 transition-colors";
  const labelSt = "block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2";

  if (success) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-sans">
      <div className="text-center text-white">
        <CheckCircle size={56} className="mx-auto mb-4 text-green-400" />
        <h2 className="text-2xl font-black mb-2">Event Created!</h2>
        <p className="text-zinc-500">Redirecting to events...</p>
      </div>
    </div>
  );

  const steps = [
    { n: 1, label: 'Event Details' },
    { n: 2, label: 'Teams & Venue' },
    { n: 3, label: 'Ticket Tiers' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/events" className="text-zinc-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-orange-400 uppercase italic">Create New Event</h1>
            <p className="text-zinc-500 text-xs">Fill in all details then publish when ready</p>
          </div>
        </div>

        {/* Step tabs */}
        <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 mb-6">
          {steps.map(s => (
            <button key={s.n} type="button" onClick={() => setActiveStep(s.n)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeStep === s.n ? 'bg-orange-500 text-black' : 'text-zinc-500 hover:text-white'}`}>
              {s.n}. {s.label}
            </button>
          ))}
        </div>

        {/* ── STEP 1: Event Details ── */}
        {activeStep === 1 && (
          <div className="space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-5">
                Basic Information
              </h3>

              <div className="mb-4">
                <label className={labelSt}>Sport *</label>
                <div className="grid grid-cols-4 gap-2">
                  {SPORTS.map(s => (
                    <button key={s.id} type="button"
                      onClick={() => { setF('sport', s.id); setF('emoji', s.emoji); }}
                      className={`p-3 rounded-xl border text-center transition-all ${form.sport === s.id ? 'border-orange-500 bg-orange-500/20' : 'border-zinc-700 bg-zinc-950'}`}>
                      <p className="text-2xl mb-1">{s.emoji}</p>
                      <p className={`text-[10px] font-bold uppercase ${form.sport === s.id ? 'text-orange-400' : 'text-zinc-500'}`}>{s.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelSt}>Event Title *</label>
                  <input type="text" value={form.title} onChange={e => setF('title', e.target.value)}
                    placeholder="e.g. Arsenal vs Chelsea" className={inputSt} />
                </div>
                <div>
                  <label className={labelSt}>Subtitle</label>
                  <input type="text" value={form.subtitle} onChange={e => setF('subtitle', e.target.value)}
                    placeholder="e.g. Premier League Matchday 12" className={inputSt} />
                </div>
              </div>

              <div className="mb-4">
                <label className={labelSt}>Competition Name *</label>
                <input type="text" value={form.competition} onChange={e => setF('competition', e.target.value)}
                  placeholder="e.g. UEFA Champions League" className={inputSt} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelSt}>Event Date *</label>
                  <input type="date" value={form.event_date} onChange={e => setF('event_date', e.target.value)}
                    className={inputSt} />
                </div>
                <div>
                  <label className={labelSt}>Kick-off Time</label>
                  <input type="time" value={form.event_time} onChange={e => setF('event_time', e.target.value)}
                    className={inputSt} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelSt}>Gates Open</label>
                  <input type="time" value={form.gates_open} onChange={e => setF('gates_open', e.target.value)}
                    className={inputSt} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <div onClick={() => setF('is_featured', !form.is_featured)}
                    className={`w-12 h-6 rounded-full cursor-pointer transition-all ${form.is_featured ? 'bg-yellow-500' : 'bg-zinc-700'}`}
                    style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '2px', left: form.is_featured ? '26px' : '2px', width: '20px', height: '20px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                  </div>
                  <span className="text-sm text-zinc-400 font-medium">⭐ Feature this event</span>
                </div>
              </div>
            </div>

            {/* Ticket design colors */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">
                Ticket Design Colors
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelSt}>Primary Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setF('cover_color_1', c)}
                        style={{ background: c, width: '32px', height: '32px', borderRadius: '8px', border: form.cover_color_1 === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer', touchAction: 'manipulation' }} />
                    ))}
                    <input type="color" value={form.cover_color_1} onChange={e => setF('cover_color_1', e.target.value)}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', cursor: 'pointer', padding: 0 }} />
                  </div>
                </div>
                <div>
                  <label className={labelSt}>Secondary Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setF('cover_color_2', c)}
                        style={{ background: c, width: '32px', height: '32px', borderRadius: '8px', border: form.cover_color_2 === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer', touchAction: 'manipulation' }} />
                    ))}
                    <input type="color" value={form.cover_color_2} onChange={e => setF('cover_color_2', e.target.value)}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', cursor: 'pointer', padding: 0 }} />
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div style={{ background: `linear-gradient(135deg, ${form.cover_color_1}, ${form.cover_color_2})`, borderRadius: '12px', padding: '16px', marginTop: '16px', textAlign: 'center' }}>
                <p className="text-xs text-white/60 mb-1">Ticket color preview</p>
                <p className="font-black text-white text-lg">{form.title || 'Event Title'}</p>
              </div>
            </div>

            <button type="button" onClick={() => setActiveStep(2)}
              className="w-full bg-orange-500 hover:bg-orange-400 text-black py-4 rounded-xl font-black text-base uppercase tracking-wider transition-all">
              Next: Teams & Venue →
            </button>
          </div>
        )}

        {/* ── STEP 2: Teams & Venue ── */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-5">
                Teams (leave blank for non-match events)
              </h3>
              <div className="grid grid-cols-2 gap-6">
                {/* Home team */}
                <div>
                  <label className={labelSt}>Home Team</label>
                  <input type="text" value={form.home_team} onChange={e => setF('home_team', e.target.value)}
                    placeholder="e.g. Arsenal" className={`${inputSt} mb-3`} />
                  <label className={labelSt}>Home Flag</label>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {FLAGS.map(f => (
                      <button key={f} type="button" onClick={() => setF('home_team_flag', f)}
                        style={{ fontSize: '20px', padding: '4px', borderRadius: '6px', border: form.home_team_flag === f ? '2px solid #fb923c' : '2px solid transparent', cursor: 'pointer', touchAction: 'manipulation', background: 'none' }}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <label className={labelSt}>Home Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setF('home_team_color', c)}
                        style={{ background: c, width: '28px', height: '28px', borderRadius: '6px', border: form.home_team_color === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer', touchAction: 'manipulation' }} />
                    ))}
                  </div>
                </div>
                {/* Away team */}
                <div>
                  <label className={labelSt}>Away Team</label>
                  <input type="text" value={form.away_team} onChange={e => setF('away_team', e.target.value)}
                    placeholder="e.g. Chelsea" className={`${inputSt} mb-3`} />
                  <label className={labelSt}>Away Flag</label>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {FLAGS.map(f => (
                      <button key={f} type="button" onClick={() => setF('away_team_flag', f)}
                        style={{ fontSize: '20px', padding: '4px', borderRadius: '6px', border: form.away_team_flag === f ? '2px solid #fb923c' : '2px solid transparent', cursor: 'pointer', touchAction: 'manipulation', background: 'none' }}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <label className={labelSt}>Away Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setF('away_team_color', c)}
                        style={{ background: c, width: '28px', height: '28px', borderRadius: '6px', border: form.away_team_color === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer', touchAction: 'manipulation' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-5">Venue</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className={labelSt}>Stadium / Venue Name *</label>
                  <input type="text" value={form.venue_name} onChange={e => setF('venue_name', e.target.value)}
                    placeholder="e.g. Wembley Stadium" className={inputSt} />
                </div>
                <div>
                  <label className={labelSt}>City *</label>
                  <input type="text" value={form.venue_city} onChange={e => setF('venue_city', e.target.value)}
                    placeholder="e.g. London" className={inputSt} />
                </div>
                <div>
                  <label className={labelSt}>Country *</label>
                  <input type="text" value={form.venue_country} onChange={e => setF('venue_country', e.target.value)}
                    placeholder="e.g. United Kingdom" className={inputSt} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelSt}>Country Flag</label>
                  <div className="flex flex-wrap gap-1">
                    {FLAGS.map(f => (
                      <button key={f} type="button" onClick={() => setF('venue_flag', f)}
                        style={{ fontSize: '20px', padding: '4px', borderRadius: '6px', border: form.venue_flag === f ? '2px solid #fb923c' : '2px solid transparent', cursor: 'pointer', touchAction: 'manipulation', background: 'none' }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelSt}>Capacity</label>
                  <input type="number" value={form.venue_capacity} onChange={e => setF('venue_capacity', e.target.value)}
                    placeholder="90,000" className={inputSt} />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setActiveStep(1)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all">
                ← Back
              </button>
              <button type="button" onClick={() => setActiveStep(3)}
                className="flex-2 bg-orange-500 hover:bg-orange-400 text-black py-4 px-8 rounded-xl font-black text-sm uppercase tracking-wider transition-all">
                Next: Ticket Tiers →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Ticket Tiers ── */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-zinc-400 text-sm">Define pricing tiers for this event</p>
              <button type="button" onClick={addTier}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all">
                <Plus size={14} /> Add Tier
              </button>
            </div>

            {tiers.map((tier, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div style={{ background: `${tier.color}20`, border: `1.5px solid ${tier.color}50`, borderRadius: '10px', padding: '8px 12px', fontWeight: 900, color: tier.color, fontSize: '14px' }}>
                      {tier.badge} {tier.name}
                    </div>
                    <span style={{ color: tier.color, fontWeight: 900, fontSize: '18px' }}>${tier.price_usd}</span>
                  </div>
                  {tiers.length > 1 && (
                    <button type="button" onClick={() => removeTier(i)}
                      className="text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelSt}>Tier Name</label>
                    <input type="text" value={tier.name} onChange={e => setTier(i, 'name', e.target.value)}
                      className={inputSt} />
                  </div>
                  <div>
                    <label className={labelSt}>Badge Emoji</label>
                    <input type="text" value={tier.badge} onChange={e => setTier(i, 'badge', e.target.value)}
                      className={inputSt} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className={labelSt}>Description</label>
                  <input type="text" value={tier.description} onChange={e => setTier(i, 'description', e.target.value)}
                    placeholder="What's included in this tier?" className={inputSt} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className={labelSt}>Price (USD) *</label>
                    <input type="number" value={tier.price_usd} onChange={e => setTier(i, 'price_usd', e.target.value)}
                      className={inputSt} />
                  </div>
                  <div>
                    <label className={labelSt}>Total Tickets *</label>
                    <input type="number" value={tier.total_quantity} onChange={e => setTier(i, 'total_quantity', e.target.value)}
                      className={inputSt} />
                  </div>
                  <div>
                    <label className={labelSt}>Max Per Order</label>
                    <input type="number" value={tier.max_per_order} onChange={e => setTier(i, 'max_per_order', e.target.value)}
                      className={inputSt} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelSt}>Section / Stand</label>
                    <input type="text" value={tier.section} onChange={e => setTier(i, 'section', e.target.value)}
                      placeholder="e.g. North Stand" className={inputSt} />
                  </div>
                  <div>
                    <label className={labelSt}>Tier Color</label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setTier(i, 'color', c)}
                          style={{ background: c, width: '28px', height: '28px', borderRadius: '6px', border: tier.color === c ? '3px solid white' : '3px solid transparent', cursor: 'pointer', touchAction: 'manipulation' }} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <label className={labelSt}>Perks (comma separated)</label>
                  <input type="text" value={tier.perks} onChange={e => setTier(i, 'perks', e.target.value)}
                    placeholder="Free parking, Lounge access, Match program" className={inputSt} />
                </div>

                <div className="flex items-center gap-3">
                  <div onClick={() => setTier(i, 'is_seated', !tier.is_seated)}
                    className={`w-10 h-5 rounded-full cursor-pointer transition-all ${tier.is_seated ? 'bg-orange-500' : 'bg-zinc-700'}`}
                    style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '2px', left: tier.is_seated ? '22px' : '2px', width: '16px', height: '16px', background: 'white', borderRadius: '50%', transition: 'left 0.2s' }} />
                  </div>
                  <span className="text-sm text-zinc-400">Reserved seating</span>
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <button type="button" onClick={() => setActiveStep(2)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider">
                ← Back
              </button>
              <button type="button" onClick={() => handleSave(false)} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider disabled:opacity-50">
                <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button type="button" onClick={() => handleSave(true)} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-black py-4 rounded-xl font-black text-sm uppercase tracking-wider disabled:opacity-50">
                {saving ? '...' : '🚀 Save & Publish'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}