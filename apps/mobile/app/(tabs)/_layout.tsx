import { useEffect } from 'react';
import { Text } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/store/auth';
import { registerPushToken } from '@/lib/notifications';

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  // Register device push token once user is authenticated
  useEffect(() => {
    if (!user?.id) return;
    registerPushToken(user.id);
  }, [user?.id]);

  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Live',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>🔴</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>📅</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="bracket"
        options={{
          title: 'Bracket',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>🏆</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>📊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
