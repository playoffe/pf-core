'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { searchPlayersAction } from '@/lib/actions/superadmin';

export interface PlayerResult {
  id: string;
  full_name: string;
  username: string;
  email: string;
}

interface Props {
  onSelect: (player: PlayerResult) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PlayerSearchInput({ onSelect, placeholder = 'Search by name, @username or email…', disabled }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const data = await searchPlayersAction(q);
    setResults(data);
    setOpen(true);
    setLoading(false);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(player: PlayerResult) {
    onSelect(player);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-brand-500 disabled:opacity-50"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
          …
        </span>
      )}

      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-surface-border bg-surface-card shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">No players found</li>
          ) : (
            results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(p)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-xs font-bold text-brand-400">
                    {p.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">
                      {p.full_name}
                      <span className="ml-1.5 text-xs text-slate-500">@{p.username}</span>
                    </p>
                    <p className="text-xs text-slate-500 truncate">{p.email}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
