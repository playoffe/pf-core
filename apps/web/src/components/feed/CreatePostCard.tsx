'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { createPostAction } from '@/lib/actions/feed';

export function CreatePostCard({ playerName, playerPhotoUrl }: { playerName: string; playerPhotoUrl?: string | null }) {
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const remaining = 500 - body.length;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createPostAction(formData);
      if ('error' in result) {
        setError((result as { error: string }).error);
      } else {
        setBody('');
        setPreview(null);
        if (fileRef.current) fileRef.current.value = '';
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className="rounded-xl bg-surface-card ring-1 ring-surface-border px-5 py-4 mb-6">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {playerPhotoUrl ? (
            <div className="relative h-9 w-9 overflow-hidden rounded-full">
              <Image src={playerPhotoUrl} alt={playerName} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-sm font-bold text-brand-300">
              {playerName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1">
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share something with the community…"
            rows={3}
            maxLength={500}
            className="w-full resize-none rounded-lg bg-surface px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none ring-1 ring-surface-border focus:ring-brand-600/50 transition-colors"
          />

          {/* Image preview */}
          {preview && (
            <div className="relative mt-2 h-40 w-full overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white hover:bg-black/90"
              >
                ×
              </button>
            </div>
          )}

          {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Hidden file input */}
              <input
                ref={fileRef}
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-surface hover:text-slate-300 transition-colors text-sm"
                title="Add image"
              >
                📷
              </button>
              <span className={`text-xs tabular-nums ${remaining < 50 ? (remaining < 0 ? 'text-red-400' : 'text-amber-400') : 'text-slate-600'}`}>
                {remaining}
              </span>
            </div>

            <button
              type="submit"
              disabled={isPending || !body.trim() || remaining < 0}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
