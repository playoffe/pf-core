import type { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient, getCurrentUser } from '@/lib/supabase/server';
import { AdminInviteClaimForm } from '@/components/auth/AdminInviteClaimForm';

export const metadata: Metadata = { title: 'Set up your club · PLAYOFFE' };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function AdminInviteClaimPage({ params }: Props) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invite } = await (admin.from('admin_invites' as any) as any)
    .select('id, club_name, invite_type, invitee_email, invitee_name, expires_at, claimed_at, revoked_at')
    .eq('token', token)
    .single() as { data: {
      id: string;
      club_name: string;
      invite_type: string;
      invitee_email: string;
      invitee_name: string | null;
      expires_at: string;
      claimed_at: string | null;
      revoked_at: string | null;
    } | null };

  // ── Revoked ───────────────────────────────────────────────────────────────
  if (!invite || invite.revoked_at) {
    return (
      <Shell>
        <StatusCard
          icon="🚫"
          title="Invite revoked"
          body="This invite link has been revoked. Please contact the platform administrator to request a new one."
          cta={{ href: '/', label: 'Go to homepage' }}
        />
      </Shell>
    );
  }

  // ── Already claimed ───────────────────────────────────────────────────────
  if (invite.claimed_at) {
    const isManagerInvite = invite.invite_type === 'existing_club_manager';
    return (
      <Shell>
        <StatusCard
          icon="✅"
          title="Already set up"
          body={
            isManagerInvite
              ? `You've already joined "${invite.club_name}" as a manager. Log in to access your dashboard.`
              : `The club "${invite.club_name}" has already been created. Log in to access your dashboard.`
          }
          cta={{ href: '/login', label: 'Log in' }}
        />
      </Shell>
    );
  }

  // ── Expired ───────────────────────────────────────────────────────────────
  if (new Date(invite.expires_at) < new Date()) {
    return (
      <Shell>
        <StatusCard
          icon="⏳"
          title="Invite expired"
          body="This invite link has expired. Please contact the platform administrator to request a new one."
          cta={{ href: '/', label: 'Go to homepage' }}
        />
      </Shell>
    );
  }

  // ── Valid — determine auth state ──────────────────────────────────────────
  const isManagerInvite = invite.invite_type === 'existing_club_manager';

  // Check if the invitee already has a Supabase auth account
  let isExistingUser = false;
  if (isManagerInvite) {
    const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
    isExistingUser = (authList?.users ?? []).some((u) => u.email === invite.invitee_email);
  }

  // Check the current session to determine the login-gate state
  const currentUser = await getCurrentUser();
  const isLoggedInAsInvitee = currentUser?.email === invite.invitee_email;
  const isLoggedInAsOther   = !!currentUser && currentUser.email !== invite.invitee_email;

  // Build the return URL for the login page redirect
  const inviteReturnUrl = `${APP_URL}/invite/${token}`;

  return (
    <Shell>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-white">
            PLAY<span className="text-brand-600">OFFE</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isManagerInvite ? 'Club manager setup' : 'Club organiser setup'}
          </p>
        </div>

        <div className="rounded-xl bg-surface-card px-8 py-8 ring-1 ring-surface-border">
          {/* Invite context banner */}
          <div className="mb-6 rounded-lg bg-brand-600/10 border border-brand-600/30 px-4 py-3">
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-1">
              {isManagerInvite ? 'Join as club manager' : "You've been invited to manage"}
            </p>
            <p className="text-lg font-bold text-white">{invite.club_name}</p>
            <p className="text-xs text-slate-400 mt-1">as {invite.invitee_email}</p>
          </div>

          {/* Existing user — login-gate logic */}
          {isExistingUser && isLoggedInAsOther ? (
            /* Logged in as a DIFFERENT account */
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
                You&apos;re signed in as <strong>{currentUser?.email}</strong>, but this invite is
                for <strong>{invite.invitee_email}</strong>. Please sign out and log in with the
                correct account to accept this invitation.
              </div>
              <Link
                href="/login"
                className="block w-full rounded-lg border border-slate-600 px-4 py-2.5 text-center text-sm font-semibold text-slate-300 hover:border-brand-500 hover:text-brand-400 transition-colors"
              >
                Sign out and switch accounts
              </Link>
            </div>
          ) : isExistingUser && !isLoggedInAsInvitee ? (
            /* Existing user NOT logged in — gate behind login */
            <div className="space-y-4">
              <div className="rounded-lg border border-brand-800/40 bg-brand-950/30 px-4 py-3 text-sm text-brand-300">
                You already have a PLAYOFFE account. Log in with your existing password to accept
                this invitation and join <strong>{invite.club_name}</strong>.
              </div>
              <Link
                href={`/login?redirectTo=${encodeURIComponent(`/invite/${token}`)}`}
                className="block w-full rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Log in to accept →
              </Link>
            </div>
          ) : (
            /* New user OR existing user already logged in as invitee */
            <AdminInviteClaimForm
              token={token}
              email={invite.invitee_email}
              defaultName={invite.invitee_name ?? ''}
              clubName={invite.club_name}
              inviteType={invite.invite_type as 'new_club_owner' | 'existing_club_manager'}
              isExistingUser={isExistingUser && isLoggedInAsInvitee}
            />
          )}
        </div>

        {!isExistingUser && (
          <p className="mt-6 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link href={`/login?redirectTo=${encodeURIComponent(`/invite/${token}`)}`} className="text-brand-400 hover:text-brand-300 transition-colors">
              Log in instead
            </Link>
          </p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      {children}
    </div>
  );
}

function StatusCard({
  icon, title, body, cta,
}: {
  icon: string; title: string; body: string; cta: { href: string; label: string };
}) {
  return (
    <div className="w-full max-w-md rounded-xl bg-surface-card px-8 py-10 text-center ring-1 ring-surface-border">
      <div className="mb-4 text-5xl">{icon}</div>
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <p className="mt-3 text-sm text-slate-400">{body}</p>
      <Link
        href={cta.href}
        className="mt-6 inline-block rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
      >
        {cta.label}
      </Link>
    </div>
  );
}
