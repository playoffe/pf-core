'use client';

import { useEffect, useRef } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' renders the confirm button in red */
  variant?: 'default' | 'danger';
}

interface Props extends ConfirmOptions {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Auto-focus confirm button; close on Escape
  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  // Prevent scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'confirm-title' : undefined}
      aria-describedby="confirm-message"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-backdrop-in"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl bg-surface-card ring-1 ring-surface-border shadow-2xl animate-dialog-in">
        <div className="px-6 pt-6 pb-5">
          {title && (
            <h2 id="confirm-title" className="text-base font-semibold text-white mb-2">
              {title}
            </h2>
          )}
          <p id="confirm-message" className="text-sm text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-border">
          <button
            onClick={onCancel}
            className="rounded-lg border border-surface-border px-4 py-2 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
