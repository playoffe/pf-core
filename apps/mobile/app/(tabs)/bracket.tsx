import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/auth';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TournamentEntry = {
  id: string;
  category_id: string;
  tournament: { id: string; name: string; status: string; start_date: string | null } | null;
  category: { id: string; name: string; draw_format: string | null } | null;
};

type MatchPlayer = { id: string; player_id: string; player: { full_name: string } | null } | null;

type CategoryMatch = {
  id: string;
  status: string;
  round_name: string | null;
  round: number | null;
  sets: { score_a: number; score_b: number }[] | null;
  winner_entry_id: string | null;
  ea: MatchPlayer;
  eb: MatchPlayer;
};

type GroupedCategory = {
  entry: TournamentEntry;
  matches: CategoryMatch[];
};

type GroupedTournament = {
  tournament: { id: string; name: string; status: string; start_date: string | null };
  categories: GroupedCategory[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(status: string): string {
  if (status === 'in_progress') return 'LIVE';
  if (status === 'completed' || status === 'walkover') return 'Done';
  return 'Scheduled';
}

function statusColors(status: string): { bg: string; text: string } {
  if (status === 'in_progress') return { bg: '#dcfce7', text: '#16a34a' };
  if (status === 'completed' || status === 'walkover') return { bg: '#f3f4f6', text: '#6b7280' };
  return { bg: '#eff6ff', text: '#2563eb' };
}

function tournamentStatusColors(status: string): { bg: string; text: string } {
  if (status === 'active' || status === 'in_progress') return { bg: '#dcfce7', text: '#16a34a' };
  if (status === 'completed') return { bg: '#f3f4f6', text: '#6b7280' };
  return { bg: '#fef9c3', text: '#854d0e' };
}

function formatScore(sets: { score_a: number; score_b: number }[] | null): string {
  if (!sets || sets.length === 0) return '';
  return sets.map((s) => `${s.score_a}–${s.score_b}`).join('  ');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'xs' }) {
  const colors = statusColors(status);
  const fontSize = size === 'xs' ? 10 : 11;
  const paddingH = size === 'xs' ? 6 : 8;
  const paddingV = size === 'xs' ? 2 : 3;
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 4, paddingHorizontal: paddingH, paddingVertical: paddingV }}>
      <Text style={{ fontSize, fontWeight: '700', color: colors.text, letterSpacing: 0.3 }}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

function MatchRow({
  match,
  myEntryIds,
}: {
  match: CategoryMatch;
  myEntryIds: Set<string>;
}) {
  const isMyA = myEntryIds.has(match.ea?.id ?? '');
  const isMyB = myEntryIds.has(match.eb?.id ?? '');
  const nameA = match.ea?.player?.full_name ?? 'TBD';
  const nameB = match.eb?.player?.full_name ?? 'TBD';
  const isDone = match.status === 'completed' || match.status === 'walkover';
  const score = isDone ? formatScore(match.sets) : '';

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 10,
        paddingBottom: 10,
        paddingHorizontal: 16,
        gap: 6,
      }}
    >
      {/* Round label + status badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500' }}>
          {match.round_name ?? `Round ${match.round ?? ''}`}
        </Text>
        <StatusBadge status={match.status} size="xs" />
      </View>

      {/* Player A */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {isMyA ? (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' }} />
        ) : (
          <View style={{ width: 8, height: 8 }} />
        )}
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: isMyA ? '700' : '400',
            color: isMyA ? '#111827' : '#374151',
          }}
          numberOfLines={1}
        >
          {nameA}
        </Text>
        {isDone && (
          <Text style={{ fontSize: 13, color: '#6b7280', fontVariant: ['tabular-nums'] }}>
            {match.sets?.map((s) => s.score_a).join('  ') ?? ''}
          </Text>
        )}
      </View>

      {/* Player B */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {isMyB ? (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' }} />
        ) : (
          <View style={{ width: 8, height: 8 }} />
        )}
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: isMyB ? '700' : '400',
            color: isMyB ? '#111827' : '#374151',
          }}
          numberOfLines={1}
        >
          {nameB}
        </Text>
        {isDone && (
          <Text style={{ fontSize: 13, color: '#6b7280', fontVariant: ['tabular-nums'] }}>
            {match.sets?.map((s) => s.score_b).join('  ') ?? ''}
          </Text>
        )}
      </View>

      {/* Score summary for completed matches */}
      {isDone && score ? (
        <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
          Score: {score}
        </Text>
      ) : null}
    </View>
  );
}

function CategorySection({
  groupedCategory,
  myEntryIds,
}: {
  groupedCategory: GroupedCategory;
  myEntryIds: Set<string>;
}) {
  const { entry, matches } = groupedCategory;
  const catName = entry.category?.name ?? 'Unknown Category';

  return (
    <View style={{ marginBottom: 12 }}>
      {/* Category header */}
      <View
        style={{
          backgroundColor: '#f9fafb',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{catName}</Text>
        {entry.category?.draw_format ? (
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
            {entry.category.draw_format}
          </Text>
        ) : null}
      </View>

      {/* Matches */}
      {matches.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text style={{ fontSize: 13, color: '#9ca3af' }}>No matches scheduled yet</Text>
        </View>
      ) : (
        matches.map((m) => (
          <MatchRow key={m.id} match={m} myEntryIds={myEntryIds} />
        ))
      )}
    </View>
  );
}

function TournamentCard({
  group,
  myEntryIds,
}: {
  group: GroupedTournament;
  myEntryIds: Set<string>;
}) {
  const { tournament, categories } = group;
  const tColors = tournamentStatusColors(tournament.status);

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 16,
      }}
    >
      {/* Tournament header */}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' }} numberOfLines={2}>
            {tournament.name}
          </Text>
          <View
            style={{
              backgroundColor: tColors.bg,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: tColors.text, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {tournament.status}
            </Text>
          </View>
        </View>
        {tournament.start_date ? (
          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {formatDate(tournament.start_date)}
          </Text>
        ) : null}
      </View>

      {/* Categories */}
      {categories.map((gc) => (
        <CategorySection
          key={gc.entry.id}
          groupedCategory={gc}
          myEntryIds={myEntryIds}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function BracketScreen() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<GroupedTournament[]>([]);
  const [myEntryIds, setMyEntryIds] = useState<Set<string>>(new Set());

  const supabase = createSupabaseClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  const load = useCallback(async () => {
    if (!user) return;

    // 1. Fetch my entries with tournament + category info
    const { data: entries, error } = await supabase
      .from('tournament_entries')
      .select(`
        id, category_id,
        tournament:tournaments!tournament_id(id, name, status, start_date),
        category:tournament_categories!category_id(id, name, draw_format)
      `)
      .eq('player_id', user.id)
      .in('status', ['active', 'pending']);

    if (error || !entries) {
      setLoading(false);
      return;
    }

    const typedEntries = entries as unknown as TournamentEntry[];

    // Track all my entry IDs for highlighting
    const entryIds = new Set(typedEntries.map((e) => e.id));
    setMyEntryIds(entryIds);

    // 2. Group entries by tournament
    const tournamentMap = new Map<string, GroupedTournament>();
    for (const entry of typedEntries) {
      if (!entry.tournament) continue;
      const tid = entry.tournament.id;
      if (!tournamentMap.has(tid)) {
        tournamentMap.set(tid, {
          tournament: entry.tournament,
          categories: [],
        });
      }
      tournamentMap.get(tid)!.categories.push({ entry, matches: [] });
    }

    // 3. Fetch matches for each category
    const groupedList = Array.from(tournamentMap.values());
    await Promise.all(
      groupedList.flatMap((group) =>
        group.categories.map(async (gc) => {
          const { data: matchData } = await supabase
            .from('matches')
            .select(`
              id, status, round_name, round, sets, winner_entry_id,
              ea:tournament_entries!entry_a_id(id, player_id, player:players!player_id(full_name)),
              eb:tournament_entries!entry_b_id(id, player_id, player:players!player_id(full_name))
            `)
            .eq('category_id', gc.entry.category_id)
            .order('round', { ascending: true });

          gc.matches = (matchData ?? []) as unknown as CategoryMatch[];
        })
      )
    );

    setGroups(groupedList);
    setLoading(false);
  }, [user, supabase]);

  // Setup realtime subscriptions after groups are loaded
  const subscribeToCategories = useCallback(() => {
    // Remove old channels
    for (const ch of channelsRef.current) {
      supabase.removeChannel(ch);
    }
    channelsRef.current = [];

    const categoryIds = groups.flatMap((g) => g.categories.map((gc) => gc.entry.category_id));
    const uniqueIds = Array.from(new Set(categoryIds));

    for (const catId of uniqueIds) {
      const ch = supabase
        .channel(`matches-cat-${catId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'matches', filter: `category_id=eq.${catId}` },
          () => { load(); }
        )
        .subscribe();
      channelsRef.current.push(ch);
    }
  }, [groups, supabase, load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    subscribeToCategories();
    return () => {
      for (const ch of channelsRef.current) {
        supabase.removeChannel(ch);
      }
    };
  }, [subscribeToCategories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>My Tournaments</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        >
          {groups.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 60, gap: 8 }}>
              <Text style={{ fontSize: 16, color: '#374151', fontWeight: '600' }}>
                No active tournaments
              </Text>
              <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>
                You are not registered in any active tournaments
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <TournamentCard
                key={group.tournament.id}
                group={group}
                myEntryIds={myEntryIds}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
