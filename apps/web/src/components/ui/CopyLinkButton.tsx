'use client';

import { useState } from 'react';

interface Props {
  url: string;
  label?: string;
}

export function CopyLinkButton({ url, label = 'Copy link' }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input
      const input = document.getElementById('copy-url-input') as HTMLInputElement | null;
      input?.select();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        id="copy-url-input"
        type="text"
        readOnly
        value={url}
        className="flex-1 rounded-lg border border-slate-700 bg-surface px-3 py-1.5 text-xs text-slate-400 font-mono truncate focus:outline-none"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <button
        onClick={handleCopy}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
          copied
            ? 'bg-accent-500/20 text-accent-400'
            : 'border border-slate-600 text-slate-300 hover:border-brand-500 hover:text-brand-400'
        }`}
      >
        {copied ? '✓ Copied' : label}
      </button>
    </div>
  );
}
