// src/lib/admin/status-theme.ts

export type AdminStatus =
  | 'pending' | 'approved' | 'rejected' | 'suspended'
  | 'application_started' | 'documents_submitted' | 'under_review'
  | 'info_required';

export type StatusTheme = {
  label: string;
  pageGlow: string;
  pageBar: string;
  dotColor: string;
  barGlow: string;
  badge: string;
  headerRing: string;
  sectionBorder: string;
  chip: string;
  icon: string;
};

const baseThemes: Record<string, StatusTheme> = {
  // ---- marketer statuses (existing) ----
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

  // ---- vendor statuses (new) ----
  application_started: {
    label: 'Application started',
    pageGlow: 'from-slate-500/20 via-zinc-500/5 to-transparent',
    pageBar: 'bg-gradient-to-r from-slate-500 via-zinc-400 to-slate-500',
    dotColor: 'bg-slate-400',
    barGlow: 'shadow-[0_0_20px_rgba(148,163,184,0.45)]',
    badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    headerRing: 'ring-1 ring-slate-500/10',
    sectionBorder: 'border-l-2 border-l-slate-500/40',
    chip: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20',
    icon: 'text-slate-400',
  },
  documents_submitted: {
    label: 'Docs submitted',
    pageGlow: 'from-sky-500/20 via-blue-500/5 to-transparent',
    pageBar: 'bg-gradient-to-r from-sky-500 via-blue-400 to-sky-500',
    dotColor: 'bg-sky-400',
    barGlow: 'shadow-[0_0_20px_rgba(14,165,233,0.55)]',
    badge: 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-[0_0_16px_rgba(14,165,233,0.15)]',
    headerRing: 'ring-1 ring-sky-500/10',
    sectionBorder: 'border-l-2 border-l-sky-500/40',
    chip: 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20',
    icon: 'text-sky-400',
  },
  under_review: {
    label: 'Under review',
    pageGlow: 'from-violet-500/20 via-purple-500/5 to-transparent',
    pageBar: 'bg-gradient-to-r from-violet-500 via-purple-400 to-violet-500',
    dotColor: 'bg-violet-400',
    barGlow: 'shadow-[0_0_20px_rgba(139,92,246,0.55)]',
    badge: 'bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-[0_0_16px_rgba(139,92,246,0.15)]',
    headerRing: 'ring-1 ring-violet-500/10',
    sectionBorder: 'border-l-2 border-l-violet-500/40',
    chip: 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20',
    icon: 'text-violet-400',
  },
  info_required: {
    label: 'Info required',
    pageGlow: 'from-orange-500/20 via-amber-500/5 to-transparent',
    pageBar: 'bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500',
    dotColor: 'bg-orange-400',
    barGlow: 'shadow-[0_0_20px_rgba(249,115,22,0.55)]',
    badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_16px_rgba(249,115,22,0.15)]',
    headerRing: 'ring-1 ring-orange-500/10',
    sectionBorder: 'border-l-2 border-l-orange-500/40',
    chip: 'bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20',
    icon: 'text-orange-400',
  },
};

export const statusThemes = baseThemes;

export function getStatusTheme(status: string | null | undefined): StatusTheme {
  const key = (status ?? 'pending').toLowerCase();
  return baseThemes[key] ?? baseThemes.pending;
}