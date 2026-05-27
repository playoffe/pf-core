import type { Metadata } from 'next';
import { getAllTournamentsForSuperAdminAction, getAllClubsAction } from '@/lib/actions/superadmin';
import { SuperAdminTournamentsClient } from '@/components/superadmin/SuperAdminTournamentsClient';
import { TournamentsListClient } from '@/components/superadmin/TournamentsListClient';

export const metadata: Metadata = { title: 'Tournaments · Super Admin' };

export default async function SuperAdminTournamentsPage() {
  const [tournaments, clubs] = await Promise.all([
    getAllTournamentsForSuperAdminAction(),
    getAllClubsAction(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Tournament management</h1>
        <p className="mt-1 text-sm text-slate-500">
          {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''} across all clubs.
        </p>
      </div>

      {/* Create tournament form */}
      <SuperAdminTournamentsClient clubs={clubs} />

      {/* Filtered tournament list */}
      <div className="mt-8">
        <TournamentsListClient tournaments={tournaments} clubs={clubs} />
      </div>
    </div>
  );
}
