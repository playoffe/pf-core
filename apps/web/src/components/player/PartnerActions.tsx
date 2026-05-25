'use client';

import { useState, useTransition } from 'react';
import {
  sendPartnerRequestAction,
  respondToPartnerRequestAction,
  cancelPartnerRequestAction,
} from '@/lib/actions/partners';

// Send mode: shown on a suggestion card
export function PartnerActions(
  props:
    | { mode: 'send'; targetId: string }
    | { mode: 'respond'; requestId: string }
    | { mode: 'cancel'; requestId: string },
) {
  if (props.mode === 'send') return <SendButton targetId={props.targetId} />;
  if (props.mode === 'respond') return <RespondButtons requestId={props.requestId} />;
  return <CancelButton requestId={props.requestId} />;
}

function SendButton({ targetId }: { targetId: string }) {
  const [showMsg, setShowMsg] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (sent) {
    return <span className="text-xs text-accent-400 font-medium">Request sent ✓</span>;
  }

  if (!showMsg) {
    return (
      <button
        onClick={() => setShowMsg(true)}
        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
      >
        Request partner
      </button>
    );
  }

  return (
    <div className="flex-1 space-y-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 300))}
        placeholder="Add a message (optional)"
        className="block w-full rounded-lg border border-slate-700 bg-surface px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-brand-500"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={isPending}
          onClick={() => startTransition(async () => {
            const res = await sendPartnerRequestAction(targetId, message);
            if (res.error) setError(res.error);
            else setSent(true);
          })}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Sending…' : 'Send'}
        </button>
        <button
          onClick={() => setShowMsg(false)}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function RespondButtons({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  if (done) {
    return (
      <span className={`text-xs font-medium ${done === 'accepted' ? 'text-accent-400' : 'text-slate-500'}`}>
        {done === 'accepted' ? 'Accepted ✓' : 'Declined'}
      </span>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        disabled={isPending}
        onClick={() => startTransition(async () => {
          await respondToPartnerRequestAction(requestId, 'accepted');
          setDone('accepted');
        })}
        className="rounded-lg bg-accent-500/20 px-3 py-1.5 text-xs font-semibold text-accent-400 hover:bg-accent-500/30 transition-colors disabled:opacity-50"
      >
        {isPending ? '…' : 'Accept'}
      </button>
      <button
        disabled={isPending}
        onClick={() => startTransition(async () => {
          await respondToPartnerRequestAction(requestId, 'declined');
          setDone('declined');
        })}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}

function CancelButton({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(async () => { await cancelPartnerRequestAction(requestId); })}
      className="text-xs text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
    >
      {isPending ? '…' : 'Cancel request'}
    </button>
  );
}
