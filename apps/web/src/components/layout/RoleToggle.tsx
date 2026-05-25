'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  roles: string[];
}

export function RoleToggle({ roles }: Props) {
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<'admin' | 'player'>('admin');

  useEffect(() => {
    const stored = localStorage.getItem('active_mode') as 'admin' | 'player' | null;
    if (stored === 'admin' || stored === 'player') {
      setActiveMode(stored);
    }
  }, []);

  // Only show when user has BOTH admin and player roles
  if (!roles.includes('admin') || !roles.includes('player')) return null;

  function handleSwitch(mode: 'admin' | 'player') {
    setActiveMode(mode);
    localStorage.setItem('active_mode', mode);
    router.refresh();
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
