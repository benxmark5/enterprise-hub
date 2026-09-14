// src/app/admin/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import {
  LayoutDashboard, Calendar, Ticket, Users, Zap, Gamepad2,
  BarChart3, DollarSign, History, Settings, Menu, X,
  Loader2, LogOut, ShieldAlert,
} from 'lucide-react';

const adminNav = [
  { label: 'Dashboard',       href: '/admin',              icon: LayoutDashboard },
  { label: 'Customers',       href: '/admin/customers',    icon: Users },
  { label: 'Financial Center',href: '/admin/financial',    icon: DollarSign },
  { label: 'Events',          href: '/events',             icon: Calendar },
  { label: 'Ticketing',       href: '/ticketing',          icon: Ticket },
  { label: 'Aviator',         href: '/aviator',            icon: Zap },
  { label: 'Crash Game',      href: '/crash-game',         icon: Gamepad2 },
  { label: 'Analytics',       href: '/admin/analytics',    icon: BarChart3 },
  { label: 'Audit Logs',      href: '/admin/audit-logs',   icon: History },
  { label: 'Settings',        href: '/admin/settings',     icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authState, setAuthState] = useState<'loading' | 'authed' | 'denied'>('loading');
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null = null;

    const check = async () => {
      // Don't guard the login page itself
      if (pathname === '/admin/login') {
        setAuthState('authed');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        if (mounted) router.replace('/admin/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'admin') {
        if (mounted) {
          setAdminEmail(session.user.email ?? null);
          setAuthState('authed');
        }
      } else {
        await supabase.auth.signOut();
        if (mounted) {
          setAuthState('denied');
          router.replace('/admin/login');
        }
      }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (pathname !== '/admin/login') router.replace('/admin/login');
      }
    });
    channel = subscription;

    return () => {
      mounted = false;
      channel?.unsubscribe();
    };
  }, [pathname, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  // Login page renders without chrome
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-bold">Access denied</p>
          <p className="text-white/40 text-sm mt-1">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex">
      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white/5 backdrop-blur-xl border-r border-white/10 fixed h-screen transition-all duration-300 z-50 overflow-y-auto flex flex-col`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <span className="text-white font-black text-lg">GH</span>
              </div>
              {sidebarOpen && (
                <div>
                  <span className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Global Hub</span>
                  <p className="text-[10px] text-white/30">Admin Panel</p>
                </div>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition text-white/40"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/5'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Signed in as / Sign out */}
        {sidebarOpen && adminEmail && (
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-300 text-xs font-bold">
                  {adminEmail[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-white/30">Signed in as</p>
                <p className="text-xs text-white/70 truncate">{adminEmail}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg text-xs font-bold transition border border-red-500/20"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 relative z-10`}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}