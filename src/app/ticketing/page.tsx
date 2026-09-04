'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  Ticket, Plus, RefreshCw, Loader2, ArrowLeft,
  Search, X, CheckCircle, AlertCircle,
  Eye, Trash2, Download, Users, DollarSign,
  Calendar
} from 'lucide-react';

type TicketTier = {
  id: string;
  event_id: string;
  tier_name: string;
  section_name: string;
  price: number;
  total_tickets: number;
  is_vip: boolean;
  includes_benefits: string[];
  max_purchase_per_user: number;
  early_bird_price: number | null;
  early_bird_end_date: string | null;
};

type Ticket = {
  id: string;
  event_id: string;
  tier_id: string;
  seat_number: string;
  row_number: number;
  section_name: string;
  ticket_holder_name: string;
  ticket_holder_email: string;
  entry_status: string;
  qr_code: string;
  created_at: string;
  tier_name: string;
  price: number;
};

type Event = {
  id: string;
  title: string;
  event_date: string;
};

export default function TicketingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modal states
  const [showAddTier, setShowAddTier] = useState(false);
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New Tier Form
  const [newTier, setNewTier] = useState({
    tier_name: '',
    section_name: '',
    price: 0,
    total_tickets: 0,
    is_vip: false,
    max_purchase_per_user: 10,
    includes_benefits: [] as string[],
    early_bird_price: null as number | null,
    early_bird_end_date: null as string | null,
  });

  // New Ticket Form
  const [newTicket, setNewTicket] = useState({
    tier_id: '',
    seat_number: '',
    row_number: '',
    section_name: '',
    ticket_holder_name: '',
    ticket_holder_email: '',
  });

  const [benefitInput, setBenefitInput] = useState('');

  // Load data from database - NO HARDCODED DATA
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Load events from Supabase
      const { data: eventsData, error: eventsError } = await supabase
        .from('stadium_events')
        .select('id, title, event_date')
        .eq('is_deleted', false)
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // 2. Load tiers from Supabase
      const { data: tiersData, error: tiersError } = await supabase
        .from('tickets_tiers')
        .select('*')
        .order('price', { ascending: true });

      if (tiersError) throw tiersError;
      setTiers(tiersData || []);

      // 3. Load tickets with tier info
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*, tickets_tiers(tier_name, price)')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      if (ticketsData) {
        const formatted = ticketsData.map((t: any) => ({
          ...t,
          tier_name: t.tickets_tiers?.tier_name || 'N/A',
          price: t.tickets_tiers?.price || 0,
        }));
        setTickets(formatted);
      }

    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Create Tier with Tickets - ALL DATA FROM FORM, NOT HARDCODED
  const createTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) {
      setError('Please select an event');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Insert the tier using form data
      const { data: tierData, error: tierError } = await supabase
        .from('tickets_tiers')
        .insert([{
          event_id: selectedEvent,
          tier_name: newTier.tier_name || 'Standard',
          section_name: newTier.section_name || 'General',
          price: newTier.price || 0,
          total_tickets: newTier.total_tickets || 0,
          is_vip: newTier.is_vip || false,
          max_purchase_per_user: newTier.max_purchase_per_user || 10,
          includes_benefits: newTier.includes_benefits || [],
          early_bird_price: newTier.early_bird_price || null,
          early_bird_end_date: newTier.early_bird_end_date || null,
        }])
        .select();

      if (tierError) throw tierError;

      // Generate individual tickets
      if (tierData && newTier.total_tickets > 0) {
        const ticketsToInsert = [];
        for (let i = 1; i <= newTier.total_tickets; i++) {
          ticketsToInsert.push({
            tier_id: tierData[0].id,
            event_id: selectedEvent,
            seat_number: `${newTier.section_name || 'GEN'}-${i}`,
            row_number: Math.ceil(i / 10),
            section_name: newTier.section_name || 'General',
            qr_code: `QR-${tierData[0].id}-${i}-${Date.now()}`,
            entry_status: 'pending',
          });
        }

        const { error: ticketsError } = await supabase
          .from('tickets')
          .insert(ticketsToInsert);

        if (ticketsError) throw ticketsError;

        setSuccess(`✅ Created ${newTier.total_tickets} tickets for "${newTier.tier_name || 'Standard'}" tier`);
      } else {
        setSuccess(`✅ Created tier: "${newTier.tier_name || 'Standard'}"`);
      }

      setTimeout(() => setSuccess(''), 4000);
      setShowAddTier(false);
      resetTierForm();
      loadData();
    } catch (err: any) {
      console.error('Create tier error:', err);
      setError(err.message || 'Failed to create tier');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Single Ticket - ALL FROM FORM, NOT HARDCODED
  const createSingleTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) {
      setError('Please select an event');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error } = await supabase
        .from('tickets')
        .insert([{
          tier_id: newTicket.tier_id || null,
          event_id: selectedEvent,
          seat_number: newTicket.seat_number || 'N/A',
          row_number: parseInt(newTicket.row_number) || 0,
          section_name: newTicket.section_name || 'General',
          ticket_holder_name: newTicket.ticket_holder_name || null,
          ticket_holder_email: newTicket.ticket_holder_email || null,
          qr_code: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          entry_status: 'pending',
        }]);

      if (error) throw error;

      setSuccess('✅ Ticket created successfully!');
      setTimeout(() => setSuccess(''), 4000);
      setShowAddTicket(false);
      resetTicketForm();
      loadData();
    } catch (err: any) {
      console.error('Create ticket error:', err);
      setError(err.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset forms
  const resetTierForm = () => {
    setNewTier({
      tier_name: '',
      section_name: '',
      price: 0,
      total_tickets: 0,
      is_vip: false,
      max_purchase_per_user: 10,
      includes_benefits: [],
      early_bird_price: null,
      early_bird_end_date: null,
    });
    setBenefitInput('');
    setSelectedEvent('');
  };

  const resetTicketForm = () => {
    setNewTicket({
      tier_id: '',
      seat_number: '',
      row_number: '',
      section_name: '',
      ticket_holder_name: '',
      ticket_holder_email: '',
    });
    setSelectedEvent('');
  };

  // Add/Remove benefits
  const addBenefit = () => {
    if (benefitInput.trim() && !newTier.includes_benefits.includes(benefitInput.trim())) {
      setNewTier({
        ...newTier,
        includes_benefits: [...newTier.includes_benefits, benefitInput.trim()]
      });
      setBenefitInput('');
    }
  };

  const removeBenefit = (benefit: string) => {
    setNewTier({
      ...newTier,
      includes_benefits: newTier.includes_benefits.filter(b => b !== benefit)
    });
  };

  // Update ticket status
  const updateTicketStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ entry_status: status })
        .eq('id', id);

      if (error) throw error;

      setSuccess(`✅ Ticket ${status}`);
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete ticket
  const deleteTicket = async (id: string) => {
    if (!confirm('Delete this ticket?')) return;
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('✅ Ticket deleted');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Export tickets
  const exportTickets = () => {
    const headers = 'Seat,Section,Tier,Holder,Email,Status,Price\n';
    const data = tickets.map(t => 
      `${t.seat_number},${t.section_name},${t.tier_name},${t.ticket_holder_name || ''},${t.ticket_holder_email || ''},${t.entry_status},${t.price}`
    ).join('\n');
    
    const blob = new Blob([headers + data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      used: 'bg-green-500/20 text-green-400 border-green-500/30',
      expired: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return styles[status] || styles.pending;
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchSearch = ticket.ticket_holder_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        ticket.seat_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        ticket.section_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === 'all' || ticket.entry_status === filterStatus;
    return matchSearch && matchStatus;
  });

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <button className="p-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition">
                <ArrowLeft size={20} />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-black text-white">🎫 Ticket Management</h1>
              <p className="text-zinc-500 text-sm">Manage tickets, tiers, and access</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddTier(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-400 rounded-xl font-bold transition"
            >
              <Plus size={18} />
              Add Tier
            </button>
            <button
              onClick={() => setShowAddTicket(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-xl font-bold transition"
            >
              <Plus size={18} />
              Add Ticket
            </button>
            <button
              onClick={exportTickets}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition"
            >
              <Download size={18} />
              Export
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="text-red-400" size={18} />
            <p className="text-red-400 text-sm flex-1">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
            <CheckCircle className="text-green-400" size={18} />
            <p className="text-green-400 text-sm flex-1">{success}</p>
            <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Stats - ALL FROM DATABASE */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500">Total Tickets</p>
            <p className="text-2xl font-black">{tickets.length}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500">Available</p>
            <p className="text-2xl font-black text-green-400">
              {tickets.filter(t => t.entry_status === 'pending').length}
            </p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500">Sold/Used</p>
            <p className="text-2xl font-black text-yellow-400">
              {tickets.filter(t => t.entry_status === 'used').length}
            </p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500">Tiers</p>
            <p className="text-2xl font-black text-purple-400">{tiers.length}</p>
          </div>
        </div>

        {/* Tiers Display - ALL FROM DATABASE */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2">
            <Ticket size={16} />
            Ticket Tiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tiers.length === 0 ? (
              <div className="col-span-3 text-center text-zinc-500 py-8">
                No tiers created yet. Click "Add Tier" to create one.
              </div>
            ) : (
              tiers.map((tier) => (
                <div key={tier.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-white">{tier.tier_name}</p>
                      <p className="text-sm text-zinc-400">{tier.section_name}</p>
                    </div>
                    {tier.is_vip && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">VIP</span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="text-zinc-400">${tier.price}</span>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-400">{tier.total_tickets} tickets</span>
                  </div>
                  {tier.includes_benefits && tier.includes_benefits.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tier.includes_benefits.map((benefit, i) => (
                        <span key={i} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                          {benefit}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-2.5 text-zinc-500" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by seat, section, or holder..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-400"
          >
            <option value="all">All Status</option>
            <option value="pending">Available</option>
            <option value="used">Used</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Tickets Table - ALL FROM DATABASE */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400">Seat</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400">Section</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400">Holder</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <Loader2 className="animate-spin inline mr-2" size={16} />
                      Loading...
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      No tickets found
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-zinc-800/30 transition">
                      <td className="px-4 py-3 font-mono font-bold">{ticket.seat_number}</td>
                      <td className="px-4 py-3">{ticket.section_name}</td>
                      <td className="px-4 py-3 text-purple-400">{ticket.tier_name}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{ticket.ticket_holder_name || 'Unassigned'}</p>
                        <p className="text-xs text-zinc-500">{ticket.ticket_holder_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getStatusBadge(ticket.entry_status)}`}>
                          {ticket.entry_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => updateTicketStatus(ticket.id, 'used')}
                            className="p-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition"
                            title="Mark as used"
                          >
                            <CheckCircle size={14} />
                          </button>
                          <button
                            onClick={() => updateTicketStatus(ticket.id, 'expired')}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                            title="Mark as expired"
                          >
                            <X size={14} />
                          </button>
                          <button
                            onClick={() => deleteTicket(ticket.id)}
                            className="p-1.5 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ============================================
            ADD TIER MODAL - ALL FROM FORM
        ============================================ */}
        {showAddTier && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Create Ticket Tier</h2>
                <button onClick={() => setShowAddTier(false)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={createTier} className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Event *</label>
                  <select
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    required
                  >
                    <option value="">Select Event</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} - {new Date(event.event_date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Tier Name *</label>
                    <input
                      type="text"
                      value={newTier.tier_name}
                      onChange={(e) => setNewTier({ ...newTier, tier_name: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      placeholder="VIP, Premium, Standard"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Section</label>
                    <input
                      type="text"
                      value={newTier.section_name}
                      onChange={(e) => setNewTier({ ...newTier, section_name: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      placeholder="Section A, Floor, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Price ($) *</label>
                    <input
                      type="number"
                      value={newTier.price}
                      onChange={(e) => setNewTier({ ...newTier, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Total Tickets *</label>
                    <input
                      type="number"
                      value={newTier.total_tickets}
                      onChange={(e) => setNewTier({ ...newTier, total_tickets: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Max Per User</label>
                    <input
                      type="number"
                      value={newTier.max_purchase_per_user}
                      onChange={(e) => setNewTier({ ...newTier, max_purchase_per_user: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      min="1"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      checked={newTier.is_vip}
                      onChange={(e) => setNewTier({ ...newTier, is_vip: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-700"
                    />
                    <label className="text-sm text-zinc-400">VIP Tier</label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Benefits</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={benefitInput}
                      onChange={(e) => setBenefitInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
                      className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      placeholder="Add benefit (e.g., VIP Lounge)"
                    />
                    <button
                      type="button"
                      onClick={addBenefit}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg font-bold transition"
                    >
                      Add
                    </button>
                  </div>
                  {newTier.includes_benefits.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newTier.includes_benefits.map((benefit) => (
                        <span key={benefit} className="flex items-center gap-1 px-3 py-1 bg-zinc-800 rounded-full text-xs">
                          {benefit}
                          <button
                            type="button"
                            onClick={() => removeBenefit(benefit)}
                            className="text-zinc-500 hover:text-red-400"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Early Bird Price</label>
                    <input
                      type="number"
                      value={newTier.early_bird_price || ''}
                      onChange={(e) => setNewTier({ ...newTier, early_bird_price: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Early Bird End Date</label>
                    <input
                      type="datetime-local"
                      value={newTier.early_bird_end_date || ''}
                      onChange={(e) => setNewTier({ ...newTier, early_bird_end_date: e.target.value || null })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
                    {submitting ? 'Creating...' : 'Create Tier & Tickets'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddTier(false)}
                    className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================
            ADD SINGLE TICKET MODAL - ALL FROM FORM
        ============================================ */}
        {showAddTicket && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Add Single Ticket</h2>
                <button onClick={() => setShowAddTicket(false)} className="text-zinc-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={createSingleTicket} className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Event *</label>
                  <select
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    required
                  >
                    <option value="">Select Event</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Tier (Optional)</label>
                  <select
                    value={newTicket.tier_id}
                    onChange={(e) => setNewTicket({ ...newTicket, tier_id: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="">No Tier</option>
                    {tiers.filter(t => t.event_id === selectedEvent).map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.tier_name} - ${tier.price}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Seat Number *</label>
                    <input
                      type="text"
                      value={newTicket.seat_number}
                      onChange={(e) => setNewTicket({ ...newTicket, seat_number: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      placeholder="A12"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Row Number</label>
                    <input
                      type="number"
                      value={newTicket.row_number}
                      onChange={(e) => setNewTicket({ ...newTicket, row_number: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      placeholder="5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Section</label>
                  <input
                    type="text"
                    value={newTicket.section_name}
                    onChange={(e) => setNewTicket({ ...newTicket, section_name: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    placeholder="Section A"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Ticket Holder Name</label>
                  <input
                    type="text"
                    value={newTicket.ticket_holder_name}
                    onChange={(e) => setNewTicket({ ...newTicket, ticket_holder_name: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Ticket Holder Email</label>
                  <input
                    type="email"
                    value={newTicket.ticket_holder_email}
                    onChange={(e) => setNewTicket({ ...newTicket, ticket_holder_email: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
                    {submitting ? 'Creating...' : 'Create Ticket'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddTicket(false)}
                    className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}