'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  Users,
  Zap,
  Gamepad2,
  BarChart3,
  DollarSign,
  History,
  Settings,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

const adminNav = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Financial Center', href: '/admin/financial', icon: DollarSign },
  { label: 'Events', href: '/events', icon: Calendar },
  { label: 'Ticketing', href: '/ticketing', icon: Ticket },
  { label: 'Aviator', href: '/aviator', icon: Zap },
  { label: 'Crash Game', href: '/crash-game', icon: Gamepad2 },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white/5 backdrop-blur-xl border-r border-white/10 fixed h-screen transition-all duration-300 z-50 overflow-y-auto`}>
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

        <nav className="p-3 space-y-1">
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
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 relative z-10`}>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}