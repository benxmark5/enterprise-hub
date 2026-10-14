// src/app/api/admin/treasury/vendors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

async function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Config missing');
  const cookieStore = await cookies();
  const authClient = createServerClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs) {
          try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* ignore */ }
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { admin: createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY), user };
}

export async function GET(req: NextRequest) {
  try {
    const { admin } = await getAdminClient();
    const url = new URL(req.url);
    const vendorFilter = url.searchParams.get('vendor_id'); // optional

    // ── 1. Company-wide totals from live transactions ────────
    let collQ = admin.from('vendor_collections').select('amount_usd, status');
    let remQ  = admin.from('vendor_remittances').select('amount_usd, net_amount_usd, status, due_at');
    if (vendorFilter) {
      collQ = collQ.eq('vendor_id', vendorFilter);
      remQ  = remQ.eq('vendor_id', vendorFilter);
    }

    const [collRes, remRes] = await Promise.all([collQ, remQ]);
    if (collRes.error) throw collRes.error;
    if (remRes.error)  throw remRes.error;

    const collections = collRes.data ?? [];
    const remittances = remRes.data ?? [];

    // ── 2. Aggregate collections ─────────────────────────────
    let totalCollected = 0;
    let verifiedCollected = 0;
    let pendingVerification = 0;
    const collByStatus: Record<string, number> = {};
    for (const c of collections) {
      const amt = Number((c as { amount_usd: number }).amount_usd ?? 0);
      const s = String((c as { status: string }).status);
      collByStatus[s] = (collByStatus[s] ?? 0) + 1;
      totalCollected += amt;
      if (s === 'reconciled' || s === 'credited') verifiedCollected += amt;
      if (s === 'reported') pendingVerification += amt;
    }

    // ── 3. Aggregate remittances ─────────────────────────────
    let totalRemittedNet = 0;      // net amount vendors actually sent
    let receivedNet = 0;            // received + reconciled
    let overdueAmount = 0;
    const now = new Date();
    const remByStatus: Record<string, number> = {};
    for (const r of remittances) {
      const net = Number((r as { net_amount_usd: number }).net_amount_usd ?? 0);
      const s = String((r as { status: string }).status);
      const due = (r as { due_at: string | null }).due_at;
      remByStatus[s] = (remByStatus[s] ?? 0) + 1;
      totalRemittedNet += net;
      if (s === 'received' || s === 'reconciled') receivedNet += net;
      // overdue = status='overdue' OR (not received/reconciled AND due_at in past)
      const isOverdue = s === 'overdue' || (
        due && !['received', 'reconciled'].includes(s) && new Date(due) < now
      );
      if (isOverdue) overdueAmount += net;
    }

    const outstanding = Math.max(0, totalCollected - receivedNet);

    // ── 4. Vendor breakdown ──────────────────────────────────
    const vendorIds = Array.from(new Set([
      ...collections.map((_, i) => vendorFilter).filter(Boolean),
    ]));
    // Simpler: fetch all vendors with aggregated stats
    const { data: vendors } = await admin
      .from('vendors')
      .select('id, legal_name, display_name, country, status, settlement_method, total_collected_usd, total_remitted_usd, outstanding_usd, total_earnings_usd, total_paid_usd')
      .order('total_collected_usd', { ascending: false });

    const vendorRows = (vendors ?? []).map(v => ({
      id: v.id,
      legal_name: v.legal_name,
      display_name: v.display_name,
      country: v.country,
      status: v.status,
      settlement_method: v.settlement_method,
      collected: Number(v.total_collected_usd ?? 0),
      remitted: Number(v.total_remitted_usd ?? 0),
      outstanding: Number(v.outstanding_usd ?? 0),
      earnings: Number(v.total_earnings_usd ?? 0),
      paid: Number(v.total_paid_usd ?? 0),
    }));

    // ── 5. Recent activity feed ──────────────────────────────
    const [collRecent, remRecent] = await Promise.all([
      admin.from('vendor_collections')
        .select('id, vendor_id, amount_usd, status, payment_method, external_ref, reported_at')
        .order('reported_at', { ascending: false })
        .limit(10),
      admin.from('vendor_remittances')
        .select('id, vendor_id, net_amount_usd, status, due_at, bank_reference, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Vendor name lookup
    const vendorNameMap: Record<string, string> = {};
    for (const v of vendors ?? []) {
      vendorNameMap[v.id] = v.display_name || v.legal_name;
    }

    const recentCollections = (collRecent.data ?? []).map(c => ({
      id: c.id,
      kind: 'collection' as const,
      vendor_name: vendorNameMap[c.vendor_id] || 'Unknown vendor',
      amount_usd: Number(c.amount_usd ?? 0),
      status: c.status,
      payment_method: c.payment_method,
      external_ref: c.external_ref,
      at: c.reported_at,
    }));

    const recentRemittances = (remRecent.data ?? []).map(r => ({
      id: r.id,
      kind: 'remittance' as const,
      vendor_name: vendorNameMap[r.vendor_id] || 'Unknown vendor',
      amount_usd: Number(r.net_amount_usd ?? 0),
      status: r.status,
      bank_reference: r.bank_reference,
      at: r.created_at,
    }));

    const activity = [...recentCollections, ...recentRemittances]
      .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
      .slice(0, 12);

    return NextResponse.json({
      ok: true,
      totals: {
        collected: totalCollected,
        verifiedCollected,
        pendingVerification,
        remitted: totalRemittedNet,
        received: receivedNet,
        outstanding,
        overdue: overdueAmount,
      },
      collectionsByStatus: collByStatus,
      remittancesByStatus: remByStatus,
      vendors: vendorRows,
      activity,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown';
    const status = message === 'Unauthorized' ? 401 : 500;
    if (status === 500) console.error('[treasury/vendors] error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}