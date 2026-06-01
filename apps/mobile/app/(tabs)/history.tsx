import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HistoryMatch = {
  id: string;
  status: string;
  scheduled_time: string | null;
  sets: { score_a: number; score_b: number }[] | null;
  winner_entry_id: string | null;
  tournament: { name: string } | null;
  category: { name: string } | null;
  ea: { id: string; player_id: string; player: { full_name: string } | null } | null;
  eb: { id: string; player_id: string; player: { full_name: string } | null } | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatScore(
  sets: { score_a: number; score_b: number }[] | null,
  status: string
): string {
  if (status === 'walkover') return 'W/O';
  if (!sets || sets.length === 0) return '—';
  return sets.map((s) => `${s.score_a}–${s.score_b}`).join('  ');
}

function getResult(
  match: HistoryMatch,
  myEntryIds: Set<string>
): 'WON' | 'LOST' | 'UNKNOWN' {
  if (!match.winner_entry_id) return 'UNKNOWN';
  return myEntryIds.has(match.winner_entry_id) ? 'WON' : 'LOST';
}

function getNames(
  match: HistoryMatch,
  myEntryIds: Set<string>
): { myName: string; opponentName: string } {
  const isMyA = !!(match.ea && myEntryIds.has(match.ea.id));
  const myName = isMyA
    ? (match.ea?.player?.full_name ?? 'Me')
    : (match.eb?.player?.full_name ?? 'Me');
  const opponentName = isMyA
    ? (match.eb?.player?.full_name ?? 'TBD')
    : (match.ea?.player?.full_name ?? 'TBD');
  return { myName, opponentName };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ResultBadge({ result }: { result: 'WON' | 'LOST' | 'UNKNOWN' }) {
  const colors =
    result === 'WON'
      ? { bg: '#dcfce7', text: '#16a34a' }
      : result === 'LOST'
      ? { bg: '#fee2e2', text: '#b91c1c' }
      : { bg: '#f3f4f6', text: '#6b7280' };

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: colors.text,
          letterSpacing: 0.5,
        }}
      >
        {result === 'UNKNOWN' ? '—' : result}
      </Text>
    </View>
  );
}

function HistoryMatchCard({
  match,
  myEntryIds,
}: {
  match: HistoryMatch;
  myEntryIds: Set<string>;
}) {
  const result = getResult(match, myEntryIds);
  const { myName, opponentName } = getNames(match, myEntryIds);
  const score = formatScore(match.sets, match.status);
  const isWalkover = match.status === 'walkover';

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        gap: 10,
      }}
    >
      {/* Tournament · Category + Date */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text
          style={{ flex: 1, fontSize: 12, color: '#6b7280', fontWeight: '500' }}
          numberOfLines={2}
        >
          {match.tournament?.name ?? 'Unknown Tournament'}
          {match.category?.name ? ` · ${match.category.name}` : ''}
        </Text>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>
          {formatDate(match.scheduled_time)}
        </Text>
      </View>

      {/* Players */}
      <View style={{ gap: 4 }}>
        <Text
          style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}
          numberOfLines={1}
        >
          {myName}
        </Text>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>vs</Text>
        <Text
          style={{ fontSize: 15, fontWeight: '400', color: '#374151' }}
          numberOfLines={1}
        >
          {opponentName}
        </Text>
      </View>

      {/* Result + Score */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <ResultBadge result={result} />
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: isWalkover ? '#9ca3af' : '#374151',
            fontVariant: ['tabular-nums'],
            fontStyle: isWalkover ? 'italic' : 'normal',
          }}
        >
          {score}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const user = useAuthStore((s) => s.user);
  const supabase = createSupabaseClient();

  const [myEntryIds, setMyEntryIds] = useState<Set<string>>(new Set());
  const [matches, setMatches] = useState<HistoryMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const pageRef = useRef(0);
  const entryIdsRef = useRef<string[]>([]);

  // Step 1: Fetch all my entry IDs
  const fetchEntryIds = useCallback(async (): Promise<string[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('tournament_entries')
      .select('id')
      .eq('player_id', user.id);
    return (data ?? []).map((e) => e.id);
  }, [user, supabase]);

  // Step 2: Fetch one page of completed matches where I am entry_a or entry_b
  const fetchPage = useCallback(
    async (page: number, entryIds: string[]): Promise<HistoryMatch[]> => {
      if (entryIds.length === 0) return [];
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch matches where I am entry_a
      const { data: aMatches } = await supabase
        .from('matches')
        .select(`
          id, status, scheduled_time, sets, winner_entry_id,
          tournament:tournaments!tournament_id(name),
          category:tournament_categories!category_id(name),
          ea:tournament_entries!entry_a_id(id, player_id, player:players!player_id(full_name)),
          eb:tournament_entries!entry_b_id(id, player_id, player:players!player_id(full_name))
        `)
        .in('status', ['completed', 'walkover'])
        .in('entry_a_id', entryIds)
        .order('scheduled_time', { ascending: false })
        .range(from, to);

      // Fetch matches where I am entry_b
      const { data: bMatches } = await supabase
        .from('matches')
        .select(`
          id, status, scheduled_time, sets, winner_entry_id,
          tournament:tournaments!tournament_id(name),
          category:tournament_categories!category_id(name),
          ea:tournament_entries!entry_a_id(id, player_id, player:players!player_id(full_name)),
          eb:tournament_entries!entry_b_id(id, player_id, player:players!player_id(full_name))
        `)
        .in('status', ['completed', 'walkover'])
        .in('entry_b_id', entryIds)
        .order('scheduled_time', { ascending: false })
        .range(from, to);

      // Merge, deduplicate, and sort descending by scheduled_time
      const all = [
        ...((aMatches ?? []) as unknown as HistoryMatch[]),
        ...((bMatches ?? []) as unknown as HistoryMatch[]),
      ];
      const seen = new Set<string>();
      const deduped: HistoryMatch[] = [];
      for (const m of all) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          deduped.push(m);
        }
      }
      deduped.sort((a, b) => {
        if (!a.scheduled_time) return 1;
        if (!b.scheduled_time) return -1;
        return (
          new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime()
        );
      });

      return deduped;
    },
    [supabase]
  );

  const initialLoad = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    pageRef.current = 0;

    const ids = await fetchEntryIds();
    entryIdsRef.current = ids;
    setMyEntryIds(new Set(ids));

    const page0 = await fetchPage(0, ids);
    setMatches(page0);
    setHasMore(page0.length >= PAGE_SIZE);
    setLoading(false);
  }, [user, fetchEntryIds, fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    pageRef.current += 1;
    const next = await fetchPage(pageRef.current, entryIdsRef.current);
    setMatches((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = next.filter((m) => !seen.has(m.id));
      return [...prev, ...fresh];
    });
    setHasMore(next.length >= PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initialLoad();
    setRefreshing(false);
  }, [initialLoad]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  const renderItem = useCallback(
    ({ item }: { item: HistoryMatch }) => (
      <HistoryMatchCard match={item} myEntryIds={myEntryIds} />
    ),
    [myEntryIds]
  );

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#16a34a" />
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={{ alignItems: 'center', marginTop: 60, gap: 8 }}>
        <Text style={{ fontSize: 16, color: '#374151', fontWeight: '600' }}>
          No history yet
        </Text>
        <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>
          No match history yet
        </Text>
      </View>
    );
  }, [loading]);

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
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>
          Match History
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#16a34a"
            />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
