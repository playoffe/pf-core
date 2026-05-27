'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { setActiveModeAction } from '@/lib/actions/mode';

interface Props {
  roles: string[];
}

// Pages that only make sense in admin mode — redirect to /dashboard when switching to player
const ADMIN_ONLY_ROUTES = ['/tournaments'];

export function RoleToggle({ roles }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const [activeMode, setActiveMode] = useState<'admin' | 'player'>('admin');

  useEffect(() => {
    const stored = localStorage.getItem('active_mode') as 'admin' | 'player' | null;
    if (stored === 'admin' || stored === 'player') {
      setActiveMode(stored);
    }
  }, []);

  // Only show when user has BOTH admin and player roles
  if (!roles.includes('admin') || !roles.includes('player')) return null;

  async function handleSwitch(mode: 'admin' | 'player') {
    // Optimistic update so the toggle responds immediately
    setActiveMode(mode);
    localStorage.setItem('active_mode', mode);
    // Persist to cookie so server components can read it
    await setActiveModeAction(mode);
    // If switching to player while on an admin-only page, go to dashboard instead
    if (mode === 'player' && ADMIN_ONLY_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
      router.push('/dashboard');
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center rounded-full bg-slate-800 p-0.5 text-xs font-semibold ring-1 ring-slate-700">
      <button
        onClick={() => handleSwitch('admin')}
        className={`rounded-full px-3 py-1 transition-colors ${
          activeMode === 'admin' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-300'
        }`}
      >
        Admin
      </button>
      <button
        onClick={() => handleSwitch('player')}
        className={`rounded-full px-3 py-1 transition-colors ${
          activeMode === 'player' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-300'
        }`}
      >
        Player
      </button>
    </div>
  );
}
