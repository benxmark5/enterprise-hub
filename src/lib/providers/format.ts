// src/lib/providers/format.ts

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type ProviderApplication = {
  id: string;
  user_id: string | null;
  full_name: string;
  display_name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  facebook: string | null;
  linkedin: string | null;
  twitter: string | null;
  service_category: string;
  service_title: string;
  service_description: string | null;
  pricing_structure: string | null;
  refund_policy: string | null;
  expected_outcome: string | null;
  support_method: string | null;
  payout_method: string | null;
  payout_name: string | null;
  payout_identifier: string | null;
  payout_currency: string | null;
  country: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string | null;
  // Compliance
  agree_professional: boolean | null;
  agree_no_misrepresent: boolean | null;
  agree_no_fake_reviews: boolean | null;
  agree_no_impersonate: boolean | null;
  agree_support: boolean | null;
  agree_complaints: boolean | null;
  agree_terms: boolean | null;
  agree_escrow: boolean | null;
  agree_fees: boolean | null;
};

export function statusColor(status: string): {
  bg: string;
  border: string;
  text: string;
  dot: string;
  label: string;
} {
  switch (status) {
    case 'approved':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-300',
        dot: 'bg-emerald-400',
        label: 'Approved',
      };
    case 'rejected':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-300',
        dot: 'bg-red-400',
        label: 'Rejected',
      };
    case 'pending':
    default:
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
        dot: 'bg-amber-400',
        label: 'Pending',
      };
  }
}

export const SERVICE_CATEGORY_ICONS: Record<string, string> = {
  'football betting tips': '⚽',
  'aviator signals': '✈️',
  'odds trading': '📊',
  'virtual sports': '🎮',
  'basketball': '🏀',
  'tennis': '🎾',
  'crypto': '₿',
  'forex': '💱',
  'other': '🎯',
};

export function categoryIcon(category: string | null | undefined): string {
  if (!category) return '🎯';
  const key = category.toLowerCase();
  return SERVICE_CATEGORY_ICONS[key] || '🎯';
}

export const PAYOUT_METHOD_LABELS: Record<string, string> = {
  mpesa: 'M-Pesa',
  airtel_money: 'Airtel Money',
  bank_transfer: 'Bank Transfer',
  paypal: 'PayPal',
  crypto: 'Crypto',
  other: 'Other',
};

export function payoutLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYOUT_METHOD_LABELS[method.toLowerCase()] || method;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// Which compliance checkboxes are required for approval?
export const REQUIRED_COMPLIANCE: Array<keyof ProviderApplication> = [
  'agree_professional',
  'agree_no_misrepresent',
  'agree_no_fake_reviews',
  'agree_no_impersonate',
  'agree_support',
  'agree_complaints',
  'agree_terms',
  'agree_escrow',
  'agree_fees',
];

export function complianceLabel(key: string): string {
  const map: Record<string, string> = {
    agree_professional: 'Professional conduct',
    agree_no_misrepresent: 'No misrepresentation',
    agree_no_fake_reviews: 'No fake reviews',
    agree_no_impersonate: 'No impersonation',
    agree_support: 'Commitment to support',
    agree_complaints: 'Complaint handling policy',
    agree_terms: 'Provider terms accepted',
    agree_escrow: 'Escrow policy accepted',
    agree_fees: 'Fee schedule accepted',
  };
  return map[key] || key;
}

export function canApprove(app: ProviderApplication): { allowed: boolean; reason?: string } {
  if (app.status !== 'pending') {
    return { allowed: false, reason: `Application is already ${app.status}` };
  }
  if (!app.user_id) {
    return { allowed: false, reason: 'Application has no linked user' };
  }
  for (const key of REQUIRED_COMPLIANCE) {
    if (!app[key]) {
      return { allowed: false, reason: `${complianceLabel(key as string)} not accepted` };
    }
  }
  return { allowed: true };
}