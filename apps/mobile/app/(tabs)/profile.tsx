import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/lib/store/auth';
import { createSupabaseClient } from '@/lib/supabase';

interface GlobalStats {
  current_rating: number | null;
  total_matches: number | null;
  wins: number | null;
  losses: number | null;
  win_rate: number | null;
}

interface PlayerProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  location: string | null;
  global_stats: GlobalStats | null;
}

function getInitials(fullName: string | null): string {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function SkeletonBox({ width, height, borderRadius = 8 }: { width: number | string; height: number; borderRadius?: number }) {
  return (
    <View
      style={{
        width: width as number,
        height,
        borderRadius,
        backgroundColor: '#e5e7eb',
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
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
        <SkeletonBox width={120} height={28} />
      </View>

      {/* Avatar + name area */}
      <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24, gap: 12 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#e5e7eb' }} />
        <SkeletonBox width={160} height={24} borderRadius={6} />
        <SkeletonBox width={100} height={16} borderRadius={6} />
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: '#e5e7eb',
              borderRadius: 10,
              height: 72,
            }}
          />
        ))}
      </View>

      {/* Account section */}
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        <SkeletonBox width={80} height={16} borderRadius={4} />
        <View style={{ backgroundColor: '#e5e7eb', borderRadius: 10, height: 56 }} />
        <View style={{ backgroundColor: '#e5e7eb', borderRadius: 10, height: 48 }} />
      </View>
    </ScrollView>
  );
}

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    async function fetchProfile() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createSupabaseClient();
        const { data, error: dbError } = await supabase
          .from('players')
          .select(
            'id, full_name, username, email, location, global_stats(current_rating, total_matches, wins, losses, win_rate)'
          )
          .eq('id', user!.id)
          .single();

        if (dbError) throw dbError;
        // global_stats may be an array (one-to-one relation) or object depending on Supabase version
        const raw = data as any;
        const stats = Array.isArray(raw?.global_stats)
          ? raw.global_stats[0] ?? null
          : raw?.global_stats ?? null;

        setProfile({ ...raw, global_stats: stats });
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user?.id]);

  if (loading) return <LoadingSkeleton />;

  const stats = profile?.global_stats;
  const rating = stats?.current_rating ?? 0;
  const totalMatches = stats?.total_matches ?? 0;
  const wins = stats?.wins ?? 0;
  const winRate = stats?.win_rate ?? 0;

  const statCards = [
    { label: 'Rating', value: rating > 0 ? rating.toFixed(0) : '—' },
    { label: 'Matches', value: String(totalMatches) },
    { label: 'Wins', value: String(wins) },
    { label: 'Win Rate', value: `${winRate > 0 ? winRate.toFixed(0) : 0}%` },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
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
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>My Profile</Text>
      </View>

      {error ? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ color: '#b91c1c', fontSize: 14 }}>{error}</Text>
        </View>
      ) : null}

      {/* Avatar + name */}
      <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
        {/* Avatar circle */}
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: '#16a34a',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>
            {getInitials(profile?.full_name ?? null)}
          </Text>
        </View>

        {/* Full name */}
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>
          {profile?.full_name ?? 'Unknown Player'}
        </Text>

        {/* Username */}
        {profile?.username ? (
          <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
            @{profile.username}
          </Text>
        ) : null}

        {/* Location */}
        {profile?.location ? (
          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
            {'📍 '}{profile.location}
          </Text>
        ) : null}
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 24 }}>
        {statCards.map((card) => (
          <View
            key={card.label}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderRadius: 10,
              padding: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#f3f4f6',
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>
              {card.value}
            </Text>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              {card.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Account section */}
      <View style={{ paddingHorizontal: 16 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 8,
          }}
        >
          Account
        </Text>

        {/* Email row */}
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 14,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#f3f4f6',
          }}
        >
          <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>Email</Text>
          <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }}>
            {profile?.email ?? user?.email ?? '—'}
          </Text>
        </View>

        {/* Sign out button */}
        <TouchableOpacity
          onPress={signOut}
          style={{
            backgroundColor: '#fee2e2',
            borderRadius: 10,
            padding: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#b91c1c', fontWeight: '600', fontSize: 15 }}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
