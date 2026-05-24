'use client';

import { useState, useEffect } from 'react';

interface Props {
  deadline: string; // ISO date string
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Closed';
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (days > 2) {
    return `${days}d ${hours}h remaining`;
  }
  if (days >= 1) {
    return `${days}d ${hours}h ${mins}m remaining`;
  }
  if (hours >= 1) {
    return `${hours}h ${mins}m remaining`;
  }
  return `${mins}m ${secs}s remaining`;
}

export function DeadlineCountdown({ deadline }: Props) {
  const [ms, setMs] = useState(() => new Date(deadline).getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setMs(new Date(deadline).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const isClosed = ms <= 0;
  const isUrgent = ms > 0 && ms < 24 * 60 * 60 * 1000; // under 24 hours

  return (
    <span
      className={`text-xs font-medium ${
        isClosed ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-slate-500'
      }`}
    >
      {isClosed ? '⛔ Registration closed' : `⏰ ${formatCountdown(ms)}`}
    </span>
  );
}
