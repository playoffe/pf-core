'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addClubMemberAction, removeClubMemberAction } from '@/lib/actions/clubs';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import type { ClubMember } from '@/lib/actions/clubs';

interface Props {
  clubId: string;
  clubSlug: string;
  members: ClubMember[];
  isOwner: boolean;
}

export function ClubMembersPanel({ clubId, clubSlug, members, isOwner }: Props) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const activeMembers = members.filter((m) => m.is_current);
  const pastMembers = members.filter((m) => !m.is_current);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setMsg(null);
    const result = await addClubMemberAction(clubId, clubSlug, username.trim());
    if (result.error) {
      setMsg({ type: 'error', text: result.error });
    } else {
      setMsg({ type: 'success', text: `${result.playerName} added as a club member.` });
      setUsername('');
      router.refresh();
    }
    setLoading(false);
  }

  async function handleRemove(playerId: string, name: string) {
    if (
      !(await confirm({
        title: 'Remove member',
        message: `Remove ${name} from this club? They will appear in the past members list.`,
        confirmLabel: 'Remove',
        variant: 'danger',
      }))
    )
      return;
    setRemoving(playerId);
    const result = await removeClubMemberAction(clubId, clubSlug, playerId);
    if (result.error) setMsg({ type: 'error', text: result.error });
    else router.refresh();
    setRemoving(null);
  }

  return (
    <div>
      {/* Active members */}
      <div className="mb-6">
        <h2 className="mb-4 text-sm font-semibold text-white">
          Active members
          <span className="ml-2 text-xs font-normal text-slate-500">({activeMembers.length})</span>
        </h2>

        {activeMembers.length === 0 ? (
          <div className="rounded-xl bg-surface-card p-8 text-center ring-1 ring-surface-border">
            <p className="text-sm text-slate-500">
              No active members yet. Add players by username below.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-surface-card ring-1 ring-surface-border divide-y divide-surface-border">
            {activeMembers.map((member) => (
              <MemberRow
                key={member.player_id}
                member={member}
                isOwner={isOwner}
                removing={removing === member.player_id}
                onRemove={() => handleRemove(member.player_id, member.full_name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add member form */}
      <form onSubmit={handleAdd} className="mb-2 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="w-full rounded-lg border border-slate-700 bg-surface-card pl-7 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding…' : 'Add member'}
        </button>
      </form>
      <p className="mb-8 text-xs text-slate-600">
        {isOwner
          ? 'Owners and managers can add members. Only owners can remove them.'
          : 'Add a player to this club by entering their username.'}
      </p>

      {msg && (
        <p className={`mb-6 text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-accent-400'}`}>
          {msg.text}
        </p>
      )}

      {/* Past members */}
      {pastMembers.length > 0 && (
        <details className="group">
          <summary className="mb-4 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-300 list-none">
            <span className="transition-transform group-open:rotate-90">▶</span>
            Past members ({pastMembers.length})
          </summary>
          <div className="overflow-hidden rounded-xl bg-surface-card ring-1 ring-surface-border divide-y divide-surface-border">
            {pastMembers.map((member) => (
              <MemberRow
                key={member.player_id}
                member={member}
                isPast
                isOwner={false}
                removing={false}
                onRemove={() => {}}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function MemberRow({
  member,
  isPast = false,
  isOwner,
  removing,
  onRemove,
}: {
  member: ClubMember;
  isPast?: boolean;
  isOwner: boolean;
  removing: boolean;
  onRemove: () => void;
}) {
  const joinedDate = new Date(member.joined_at).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 ${isPast ? 'opacity-60' : ''}`}>
      {member.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.photo_url}
          alt={member.full_name}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-sm font-bold text-brand-300">
          {member.full_name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <Link
          href={`/p/${member.username}`}
          className="text-sm font-semibold text-white hover:text-brand-300 transition-colors"
        >
          {member.full_name}
        </Link>
        <p className="text-xs text-slate-500">
          @{member.username}
          {member.location && ` · ${member.location}`}
        </p>
      </div>

      {member.current_rating != null && member.current_rating > 0 && (
        <span className="rounded-full bg-brand-600/20 px-2.5 py-0.5 text-xs font-semibold text-brand-300">
          {member.current_rating.toFixed(2)}
        </span>
      )}

      <p className="shrink-0 text-xs text-slate-600">{joinedDate}</p>

      {isOwner && !isPast && (
        <button
          onClick={onRemove}
          disabled={removing}
          className="shrink-0 text-xs text-slate-600 hover:text-red-400 transition-colors disabled:opacity-50"
        >
          {removing ? '…' : 'Remove'}
        </button>
      )}
    </div>
  );
}
