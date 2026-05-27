import type { Metadata } from 'next';
import { getAllClubsAction } from '@/lib/actions/superadmin';
import { ClubsPageHeader } from '@/components/superadmin/ClubsPageHeader';
import { ClubsListClient } from '@/components/superadmin/ClubsListClient';

export const metadata: Metadata = { title: 'Clubs · Super Admin' };

export default async function SuperAdminClubsPage() {
  const clubs = await getAllClubsAction();

  return (
    <div>
      <ClubsPageHeader clubCount={clubs.length} />
      <ClubsListClient clubs={clubs} />
    </div>
  );
}
