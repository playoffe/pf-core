'use client';

import { useState } from 'react';
import { CreateClubForm } from './CreateClubForm';

interface Props {
  clubCount: number;
}

export function ClubsPageHeader({ clubCount }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold text-white">Club management</h1>
          <p className="mt-1 text-sm text-slate-500">
            {clubCount} club{clubCount !== 1 ? 's' : ''} on the platform.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          + New Club
        </button>
      </div>

      {showForm && (
        <div className="mt-4">
          <CreateClubForm onClose={() => setShowForm(false)} />
        </div>
      )}
    </div>
  );
}
