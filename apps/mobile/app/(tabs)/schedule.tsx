import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/auth';

// ── types ──────────────────────────────────────────────────────────────────

type MatchRow = {
  id: string;
  status: string;
  scheduled_time: string | null;
  court: number | null;
  round_name: string | null;
  sets: { score_a: number; score_b: number }[] | null;
  winner_entry_id: string | null;
  tournament: { name: string } | null;
  category: { name: string } | null;
  ea: { player_id: string; player: { full_name: string } | null } | null;
  eb: { player_id: string; player: { full_name: string } | null } | null;
};

type DateGroup = { label: string; key: string; matches: MatchRow[] };

// ── constants ──────────────────────────────────────────────────────────────

const MATCH_SELECT = `
  id, status, scheduled_time, court, round_name, sets, winner_entry_id,
  tournament:tournaments!tournament_id(name),
  category:tournament_categories!category_id(name),
  ea:tournament_entries!entry_a_id(player_id, player:players!player_id(full_name)),
  eb:tournament_entries!entry_b_id(player_id, player:players!player_id(full_name))
`;

// ── helpers ────────────────────────────────────────────────────────────────

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localTodayKey(): string {
  return toLocalDateKey(new Date().toISOString());
}

function localTomorrowKey(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return toLocalDateKey(t.toISOString());
}

function dateLabel(key: string): string {
  if (key === localTodayKey()) return 'Today';
  if (key === localTomorrowKey()) return 'Tomorrow';
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatScore(sets: { score_a: number; score_b: number }[]): string {
  return sets.map((s) => `${s.score_a}–${s.score_b}`).join('  ');
}

function groupByDate(matches: MatchRow[]): DateGroup[] {
  const scheduled: MatchRow[] = [];
  const unscheduled: MatchRow[] = [];

  for (const m of matches) {
    if (m.scheduled_time) scheduled.push(m);
    else unscheduled.push(m);
  }

  scheduled.sort(
    (a, b) => new Date(a.scheduled_time!).getTime() - new Date(b.scheduled_time!).getTime()
  );

  const map = new Map<string, MatchRow[]>();
  for (const m of scheduled) {
    const key = toLocalDateKey(m.scheduled_time!);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }

  const groups: DateGroup[] = [];
  for (const [key, ms] of map) {
    groups.push({ label: dateLabel(key), key, matches: ms });
  }

  if (unscheduled.length > 0) {
    groups.push({ label: 'TBC', key: '__tbc__', matches: unscheduled });
  }

  return groups;
}

// ── main screen ────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const user = useAuthStore((s) => s.user);
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasEntries, setHasEntries] = useState(true);

  const supabase = createSupabaseClient();

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Fetch my active/pending tournament entries
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('id')
      .eq('player_id', user.id)
      .in('status', ['active', 'pending']);

    const ids = (entries ?? []).map((e) => e.id);

    if (ids.length === 0) {
      setHasEntries(false);
      setGroups([]);
      setLoading(false);
      return;
    }

    setHasEntries(true);

    // 2. Fetch all matches where I appear as entry_a or entry_b
    const orFilter = `entry_a_id.in.(${ids.join(',')}),entry_b_id.in.(${ids.join(',')})`;
    const { data: matches } = await supabase
      .from('matches')
      .select(MATCH_SELECT)
      .or(orFilter);

    setGroups(groupByDate((matches as MatchRow[]) ?? []));
    setLoading(false);
  }, [user, supabase]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  const userId = user?.id ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{
        paddingTop: 56,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
      }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>My Schedule</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />
        }
        contentContainerStyle={{ padding: 16 }}
      >
        {loading ? (
          <Text style={{ color: '#9ca3af', textAlign: 'center', marginTop: 60, fontSize: 15 }}>
            Loading…
          </Text>
        ) : !user ? (
          <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 60, fontSize: 15 }}>
            Sign in to see your schedule.
          </Text>
        ) : !hasEntries ? (
          <Text style={{
            color: '#6b7280',
            textAlign: 'center',
            marginTop: 60,
            fontSize: 15,
            lineHeight: 24,
          }}>
            No upcoming matches.{'\n'}Register for a tournament to get started.
          </Text>
        ) : groups.length === 0 ? (
          <Text style={{ color: '#6b7280', textAlign: 'center', marginTop: 60, fontSize: 15 }}>
            No matches scheduled yet.
          </Text>
        ) : (
          groups.map((group) => (
            <View key={group.key} style={{ marginBottom: 24 }}>
              {/* Date section header */}
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#374151',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                {group.label}
              </Text>

              <View style={{ gap: 10 }}>
                {group.matches.map((match) => (
                  <ScheduleMatchCard key={match.id} match={match} userId={userId} />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ── match card ─────────────────────────────────────────────────────────────

function ScheduleMatchCard({ match, userId }: { match: MatchRow; userId: string }) {
  // Determine which side is the current user based on player_id
  const iAmA = match.ea?.player_id === userId;
  const iAmB = match.eb?.player_id === userId;

  let opponentName: string;
  if (iAmA) {
    opponentName = match.eb?.player?.full_name ?? 'TBD';
  } else if (iAmB) {
    opponentName = match.ea?.player?.full_name ?? 'TBD';
  } else {
    // Fallback: show both names (observer view)
    const nameA = match.ea?.player?.full_name ?? 'TBD';
    const nameB = match.eb?.player?.full_name ?? 'TBD';
    opponentName = `${nameA} vs ${nameB}`;
  }

  const timeStr = match.scheduled_time ? formatTime(match.scheduled_time) : 'TBC';
  const sets = match.sets ?? [];
  const isLive = match.status === 'in_progress';
  const isCompleted = match.status === 'completed';

  const metaParts: string[] = [];
  if (match.tournament?.name) metaParts.push(match.tournament.name);
  if (match.category?.name) metaParts.push(match.category.name);

  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
      flexDirection: 'row',
      alignItems: 'stretch',
    }}>
      {/* Left column: time + court */}
      <View style={{
        width: 52,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 2,
        marginRight: 12,
      }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>{timeStr}</Text>
        {match.court != null && (
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            Ct {match.court}
          </Text>
        )}
      </View>

      {/* Vertical divider */}
      <View style={{ width: 1, backgroundColor: '#e5e7eb', marginRight: 12 }} />

      {/* Right column: match details */}
      <View style={{ flex: 1 }}>
        {/* Opponent name */}
        <Text
          style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 }}
          numberOfLines={1}
        >
          vs {opponentName}
        </Text>

        {/* Tournament · Category */}
        {metaParts.length > 0 && (
          <Text
            style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}
            numberOfLines={1}
          >
            {metaParts.join(' · ')}
          </Text>
        )}

        {/* Status badge or score */}
        <StatusBadge match={match} sets={sets} isLive={isLive} isCompleted={isCompleted} />
      </View>
    </View>
  );
}

function StatusBadge({
  match,
  sets,
  isLive,
  isCompleted,
}: {
  match: MatchRow;
  sets: { score_a: number; score_b: number }[];
  isLive: boolean;
  isCompleted: boolean;
}) {
  if (isLive) {
    return (
      <View style={{
        alignSelf: 'flex-start',
        backgroundColor: '#dcfce7',
        borderRadius: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a', letterSpacing: 0.5 }}>
          LIVE
        </Text>
      </View>
    );
  }

  if (isCompleted && sets.length > 0) {
    return (
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>
        {formatScore(sets)}
      </Text>
    );
  }

  const label =
    match.status === 'scheduled'
      ? 'UPCOMING'
      : match.status === 'walkover'
      ? 'WALKOVER'
      : match.status.toUpperCase();

  return (
    <View style={{
      alignSelf: 'flex-start',
      backgroundColor: '#f3f4f6',
      borderRadius: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
    }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280' }}>{label}</Text>
    </View>
  );
}
