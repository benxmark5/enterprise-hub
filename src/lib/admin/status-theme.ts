// src/lib/admin/status-theme.ts

export type AdminStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type StatusTheme = {
  label: string;
  /** Soft halo behind the header */
  pageGlow: string;
  /** Slim gradient bar at the top */
  pageBar: string;
  /** Pulsing dot color for the bar */
  dotColor: string;
  /** Outer glow color for the bar */
  barGlow: string;
  /** Pill badge */
  badge: string;
  /** Ring around the contact bar */
  headerRing: string;
  /** Left-edge tint on section cards */
  sectionBorder: string;
  /** Icon chip in section headers */
  chip: string;
  /** Icon tint */
  icon: string;
};

export const statusThemes: Record<AdminStatus, StatusTheme> = {
  pending: {
    label: 'Pending',
    pageGlow: 'from-amber-500/20 via-orange-500/5 to-transparent',
    pageBar: 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500',
    dotColor: 'bg-amber-400',
    barGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.55)]',
    badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_16px_rgba(245,158,11,0.15)]',
    headerRing: 'ring-1 ring-amber-500/10',
    sectionBorder: 'border-l-2 border-l-amber-500/40',
    chip: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
    icon: 'text-amber-400',
  },
  approved: {
    label: 'Approved',
    pageGlow: 'from-emerald-500/20 via-teal-500/5 to-transparent',
    pageBar: 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500',
    dotColor: 'bg-emerald-400',
    barGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.55)]',
    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_16px_rgba(16,185,129,0.15)]',
    headerRing: 'ring-1 ring-emerald-500/10',
    sectionBorder: 'border-l-2 border-l-emerald-500/40',
    chip: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
    icon: 'text-emerald-400',
  },
  rejected: {
    label: 'Rejected',
    pageGlow: 'from-rose-500/20 via-red-500/5 to-transparent',
    pageBar: 'bg-gradient-to-r from-rose-500 via-red-400 to-rose-500',
    dotColor: 'bg-rose-400',
    barGlow: 'shadow-[0_0_20px_rgba(244,63,94,0.55)]',
    badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_16px_rgba(244,63,94,0.15)]',
    headerRing: 'ring-1 ring-rose-500/10',
    sectionBorder: 'border-l-2 border-l-rose-500/40',
    chip: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',
    icon: 'text-rose-400',
  },
  suspended: {
    label: 'Suspended',
    pageGlow: 'from-slate-500/20 via-zinc-500/5 to-transparent',
    pageBar: 'bg-gradient-to-r from-slate-500 via-zinc-400 to-slate-500',
    dotColor: 'bg-slate-400',
    barGlow: 'shadow-[0_0_20px_rgba(148,163,184,0.45)]',
    badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-[0_0_16px_rgba(148,163,184,0.15)]',
    headerRing: 'ring-1 ring-slate-500/10',
    sectionBorder: 'border-l-2 border-l-slate-500/40',
    chip: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20',
    icon: 'text-slate-400',
  },
};

export function getStatusTheme(status: string | null | undefined): StatusTheme {
  const key = (status ?? 'pending').toLowerCase() as AdminStatus;
  return statusThemes[key] ?? statusThemes.pending;
}