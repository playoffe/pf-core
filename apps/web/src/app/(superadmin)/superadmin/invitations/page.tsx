import type { Metadata } from 'next';
import { getAdminInvitesAction } from '@/lib/actions/superadmin';
import { CreateInviteForm } from '@/components/superadmin/CreateInviteForm';
import { RevokeInviteButton } from '@/components/superadmin/RevokeInviteButton';

export const metadata: Metadata = { title: 'Invitations · Super Admin' };

function inviteStatus(invite: { claimed_at: string | null; revoked_at: string | null; expires_at: string }) {
  if (invite.revoked_at) return { label: 'Revoked',  style: 'bg-red-500/10 text-red-400' };
  if (invite.claimed_at) return { label: 'Claimed',  style: 'bg-accent-500/20 text-accent-400' };
  if (new Date(invite.expires_at) < new Date()) return { label: 'Expired', style: 'bg-slate-700/40 text-slate-400' };
  return { label: 'Pending', style: 'bg-amber-500/20 text-amber-400' };
}

export default async function SuperAdminInvitationsPage() {
  const invites = await getAdminInvitesAction();

  const pending = invites.filter((i) => !i.claimed_at && !i.revoked_at && new Date(i.expires_at) >= new Date());
  const others  = invites.filter((i) => i.claimed_at || i.revoked_at || new Date(i.expires_at) < new Date());

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin invitations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Invite club owners to set up their club on PLAYOFFE.
        </p>
      </div>

      {/* Create new invite */}
      <section className="mb-10 rounded-xl bg-surface-card p-6 ring-1 ring-surface-border">
        <h2 className="mb-4 text-sm font-semibold text-white">Generate a new invite</h2>
        <CreateInviteForm />
      </section>

      {/* Pending invites */}
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Pending — {pending.length}
          </h2>
          <div className="space-y-2">
            {pending.map((invite) => {
              const status = inviteStatus(invite);
              return (
                <div key={invite.id} className="flex items-center justify-between rounded-xl bg-surface-card px-5 py-4 ring-1 ring-amber-700/30">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{invite.club_name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${status.style}`}>{status.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {invite.invitee_email}
                      {invite.invitee_name ? ` · ${invite.invitee_name}` : ''}
                      {' · '}
                      Expires {new Date(invite.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <RevokeInviteButton inviteId={invite.id} clubName={invite.club_name} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Past invites */}
      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-600">
            Past invites — {others.length}
          </h2>
          <div className="space-y-2">
            {others.map((invite) => {
              const status = inviteStatus(invite);
              return (
                <div key={invite.id} className="flex items-center justify-between rounded-xl bg-surface-card px-5 py-3.5 ring-1 ring-surface-border opacity-70">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-300">{invite.club_name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${status.style}`}>{status.label}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{invite.invitee_email}</p>
                  </div>
                  <time className="text-xs text-slate-600 shrink-0 ml-4">
                    {invite.claimed_at
                      ? `Claimed ${new Date(invite.claimed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
                      : invite.revoked_at
                      ? `Revoked ${new Date(invite.revoked_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
                      : 'Expired'}
                  </time>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {invites.length === 0 && (
        <div className="rounded-xl bg-surface-card p-10 text-center ring-1 ring-surface-border">
          <p className="text-sm text-slate-500">No invites yet. Use the form above to invite a club owner.</p>
        </div>
      )}
    </div>
  );
}
