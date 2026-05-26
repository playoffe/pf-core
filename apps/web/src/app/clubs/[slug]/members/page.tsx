import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/AppNav';
import { ClubAdminNav } from '@/components/clubs/ClubAdminNav';
import { ClubMembersPanel } from '@/components/clubs/ClubMembersPanel';
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

        <ClubMembersPanel
          clubId={club.id}
          clubSlug={slug}
          members={members}
          isOwner={isOwner}
        />
      </main>
    </div>
  );
}
