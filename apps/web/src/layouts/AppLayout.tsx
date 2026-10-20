import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Database,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { SystemInfo } from '@tdc/shared';
import { Avatar } from '../components/ui/Avatar';
import { IconButton } from '../components/ui/Button';
import { useAuth } from '../features/auth/AuthContext';
import { useSystem } from '../features/system';
import { cn } from '../lib/format';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/matches', label: 'Match history', icon: HeartHandshake },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/outbox', label: 'Email outbox', icon: Mail },
];

const STORE_LABEL: Record<SystemInfo['dataStore'], string> = {
  mongo: 'MongoDB',
  file: 'Local JSON file',
  memory: 'In-memory',
};

function Sidebar({ system, onNavigate }: { system: SystemInfo | undefined; onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 font-serif text-lg font-semibold text-white">
          T
        </span>
        <div className="leading-tight">
          <p className="font-serif text-[17px] font-semibold tracking-tight text-stone-900">TDC</p>
          <p className="text-xs text-stone-500">Matchmaker console</p>
        </div>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      {system && (
        <div className="mx-3 mb-3 space-y-1.5 rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-2.5 text-xs text-stone-600">
          <p className="flex items-center gap-2" title={system.fallbackReason ?? undefined}>
            <Database className="h-3.5 w-3.5 text-stone-400" aria-hidden />
            {STORE_LABEL[system.dataStore]}
            <span className={system.persistent ? 'text-emerald-700' : 'font-medium text-amber-700'}>
              · {system.persistent ? 'persistent' : 'not persistent'}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-stone-400" aria-hidden />
            {system.aiEnabled ? `AI: ${system.aiModel}` : 'AI off · deterministic text'}
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-stone-400" aria-hidden />
            Email: simulated (mock)
          </p>
        </div>
      )}

      {user && (
        <div className="flex items-center gap-3 border-t border-stone-200 px-4 py-3.5">
          <Avatar
            id={user.id}
            firstName={user.name.split(' ')[0] ?? ''}
            lastName={user.name.split(' ')[1] ?? ''}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900">{user.name}</p>
            <p className="truncate text-xs text-stone-500">{user.title}</p>
          </div>
          <IconButton label="Sign out" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
          </IconButton>
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const system = useSystem();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow-pop"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-stone-200 bg-white lg:block">
        <Sidebar system={system} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-stone-950/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside
            className="absolute inset-y-0 left-0 w-72 animate-fade-in bg-white shadow-pop"
            aria-label="Navigation"
          >
            <div className="absolute right-2 top-4">
              <IconButton label="Close navigation" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <Sidebar system={system} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <IconButton label="Open navigation" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </IconButton>
          <span className="font-serif text-base font-semibold">TDC</span>
        </header>

        {system && !system.persistent && (
          <div
            role="alert"
            className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-900"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Data is held in memory only and will be lost when the API restarts.
          </div>
        )}

        <main id="main" className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
