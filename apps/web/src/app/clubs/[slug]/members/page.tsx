import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/AppNav';
import { ClubAdminNav } from '@/components/clubs/ClubAdminNav';
import { getClubMembersAction } from '@/lib/actions/clubs';

export const metadata: Metadata = { title: 'Club Members' };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ClubMembersPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?return=/clubs/${slug}/members`);

  const admin = createAdminClient();

  const { data: club } = await admin
    .from('clubs')
    .select('*, club_managers!inner(role, player_id)')
    .eq('slug', slug)
    .eq('club_managers.player_id', user.id)
    .single();

  if (!club) notFound();

  const role = (club.club_managers as { role: string }[])[0]?.role ?? 'manager';
  const isOwner = role === 'owner';

  const members = await getClubMembersAction(club.id);
  const activeMembers = members.filter((m) => m.is_current);
  const pastMembers = members.filter((m) => !m.is_current);

  return (
    <div className="min-h-screen bg-surface">
      <AppNav />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Club header */}
        <div className="mb-8 flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-black text-white shadow"
            style={{ backgroundColor: club.brand_primary_color }}
          >
            {club.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{club.name}</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {[club.city, club.location].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        <ClubAdminNav clubSlug={slug} activeTab="members" isOwner={isOwner} />

        {/* Active members */}
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-white">
            Active members
            <span className="ml-2 text-xs font-normal text-slate-500">
              ({activeMembers.length})
            </span>
          </h2>

          {activeMembers.length === 0 ? (
            <div className="rounded-xl bg-surface-card p-8 text-center ring-1 ring-surface-border">
              <p className="text-sm text-slate-500">No active members yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-surface-card ring-1 ring-surface-border divide-y divide-surface-border">
              {activeMembers.map((member) => (
                <MemberRow key={member.player_id} member={member} />
              ))}
            </div>
          )}
        </div>

        {/* Past members (collapsible) */}
        {pastMembers.length > 0 && (
          <details className="group">
            <summary className="mb-4 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-300 list-none">
              <span className="transition-transform group-open:rotate-90">▶</span>
              Past members ({pastMembers.length})
            </summary>
            <div className="overflow-hidden rounded-xl bg-surface-card ring-1 ring-surface-border divide-y divide-surface-border">
              {pastMembers.map((member) => (
                <MemberRow key={member.player_id} member={member} isPast />
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  );
}

function MemberRow({
  member,
  isPast = false,
}: {
  member: {
    player_id: string;
    full_name: string;
    username: string;
    photo_url: string | null;
    location: string | null;
    current_rating: number | null;
    joined_at: string;
  };
  isPast?: boolean;
}) {
  const joinedDate = new Date(member.joined_at).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 ${isPast ? 'opacity-60' : ''}`}>
      {member.photo_url ? (
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
    </div>
  );
}
