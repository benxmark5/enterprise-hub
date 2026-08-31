export interface AuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target: string;
  previous_value: any;
  new_value: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
  // optional normalized fields used by some pages
  target_table?: string;
  target_id?: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  // some pages refer to `payout_method`/`payout_details`
  payment_method?: string;
  payment_details?: any;
  payout_method?: string;
  payout_details?: any;
  // processing metadata
  processed_at?: string | null;
  processed_by?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}