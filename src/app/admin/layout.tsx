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
  History,
  Settings,
  Menu,
  X,
  Sparkles,
  Bell,
  Search,
  Crown,
  Shield
} from 'lucide-react';

const adminNav = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, color: 'text-purple-400', iconBg: 'from-purple-500/20 to-purple-600/20' },
  { label: 'Events', href: '/events', icon: Calendar, color: 'text-blue-400', iconBg: 'from-blue-500/20 to-blue-600/20' },
  { label: 'Ticketing', href: '/ticketing', icon: Ticket, color: 'text-amber-400', iconBg: 'from-amber-500/20 to-amber-600/20' },
  { label: 'Customers', href: '/customers', icon: Users, color: 'text-emerald-400', iconBg: 'from-emerald-500/20 to-emerald-600/20' },
  { label: 'Aviator', href: '/aviator', icon: Zap, color: 'text-rose-400', iconBg: 'from-rose-500/20 to-rose-600/20' },
  { label: 'Crash Game', href: '/crash-game', icon: Gamepad2, color: 'text-orange-400', iconBg: 'from-orange-500/20 to-orange-600/20' },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, color: 'text-cyan-400', iconBg: 'from-cyan-500/20 to-cyan-600/20' },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: History, color: 'text-indigo-400', iconBg: 'from-indigo-500/20 to-indigo-600/20' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, color: 'text-gray-400', iconBg: 'from-gray-500/20 to-gray-600/20' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#08080E] text-white flex">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none bg-grid-pattern">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/4 rounded-full blur-3xl"></div>
      </div>

      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'w-64' : 'w-20'
      } bg-[#0E0E1A]/80 backdrop-blur-xl border-r border-white/5 fixed h-screen transition-all duration-300 z-50 overflow-y-auto`}>
        {/* Brand */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <span className="text-white font-black text-lg">GH</span>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#08080E] animate-pulse"></div>
              </div>
              {sidebarOpen && (
                <div>
                  <span className="font-black text-lg gradient-text-primary">Global Hub</span>
                  <p className="text-[10px] text-white/30 font-medium tracking-wider">ADMIN PANEL</p>
                </div>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-white/5 transition text-white/30 hover:text-white"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                  isActive
                    ? `bg-white/8 text-white border border-white/5 shadow-lg shadow-purple-500/5`
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${isActive ? `bg-gradient-to-br ${item.iconBg}` : ''}`}>
                  <Icon size={18} className={isActive ? item.color : 'text-inherit group-hover:text-white transition'} />
                </div>
                {sidebarOpen && (
                  <span className={`${isActive ? 'font-semibold' : 'font-light'}`}>
                    {item.label}
                  </span>
                )}
                {isActive && sidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-gradient-to-t from-[#0E0E1A] to-transparent">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition cursor-pointer">
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/20 flex-shrink-0">
              A
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">Admin</p>
                <p className="text-xs text-white/30 truncate">admin@globalhub.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300 relative z-10`}>
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-[#0E0E1A]/80 backdrop-blur-xl border-b border-white/5 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold gradient-text-primary">
                {adminNav.find(n => n.href === pathname)?.label || 'Dashboard'}
              </h1>
              <span className="px-2 py-0.5 text-[8px] font-bold bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/20 uppercase tracking-wider">
                v2.0
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-xl hover:bg-white/5 transition">
                <Bell size={18} className="text-white/40" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[8px] font-bold bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center text-white">
                  3
                </span>
              </button>
              <button className="p-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 transition border border-white/5">
                <Sparkles size={16} className="text-purple-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-6 max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}