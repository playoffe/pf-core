import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

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

const MATCH_SELECT = `
  id, status, scheduled_time, court, round_name, sets, winner_entry_id,
  tournament:tournaments!tournament_id(name),
  category:tournament_categories!category_id(name),
  ea:tournament_entries!entry_a_id(player_id, player:players!player_id(full_name)),
  eb:tournament_entries!entry_b_id(player_id, player:players!player_id(full_name))
`;

export default function LiveScreen() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createSupabaseClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select(MATCH_SELECT)
      .eq('status', 'in_progress')
      .order('scheduled_time');
    setMatches((data as MatchRow[]) ?? []);
  }, [supabase]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('live-matches')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, supabase]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{
        paddingTop: 56,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
      }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>Live Scores</Text>
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {matches.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#6b7280', marginTop: 60, fontSize: 16 }}>
            No live matches right now 🎾
          </Text>
        ) : (
          matches.map((match) => <MatchCard key={match.id} match={match} />)
        )}
      </ScrollView>
    </View>
  );
}

function MatchCard({ match }: { match: MatchRow }) {
  const sets = match.sets ?? [];
  const currentSet = sets.length > 0 ? sets[sets.length - 1] : null;

  const nameA = match.ea?.player?.full_name ?? 'TBD';
  const nameB = match.eb?.player?.full_name ?? 'TBD';

  const metaParts: string[] = [];
  if (match.court != null) metaParts.push(`Court ${match.court}`);
  if (match.round_name) metaParts.push(match.round_name);

  const scoreA = currentSet?.score_a ?? 0;
  const scoreB = currentSet?.score_b ?? 0;

  return (
    <View style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    }}>
      {/* Tournament / category header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{
          backgroundColor: '#dcfce7',
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
          marginRight: 8,
        }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a', letterSpacing: 0.5 }}>
            LIVE
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: '#6b7280', flex: 1 }} numberOfLines={1}>
          {[match.tournament?.name, match.category?.name].filter(Boolean).join(' · ')}
        </Text>
      </View>

      {/* Match metadata */}
      {metaParts.length > 0 && (
        <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
          {metaParts.join(' · ')}
        </Text>
      )}

      {/* Players and score */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' }}
          numberOfLines={1}
        >
          {nameA}
        </Text>

        <View style={{ alignItems: 'center', paddingHorizontal: 14 }}>
          <Text style={{
            fontSize: 34,
            fontWeight: '900',
            color: '#111827',
            fontVariant: ['tabular-nums'],
            letterSpacing: -1,
          }}>
            {scoreA}
            <Text style={{ color: '#16a34a' }}> : </Text>
            {scoreB}
          </Text>
          {sets.length > 1 && (
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              Set {sets.length}
            </Text>
          )}
        </View>

        <Text
          style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'right' }}
          numberOfLines={1}
        >
          {nameB}
        </Text>
      </View>

      {/* Previous sets */}
      {sets.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 8 }}>
          {sets.slice(0, -1).map((s, i) => (
            <Text key={i} style={{ fontSize: 12, color: '#6b7280' }}>
              {s.score_a}–{s.score_b}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
