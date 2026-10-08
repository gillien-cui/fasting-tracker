import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FastingProvider } from '../lib/FastingContext';
import { useTheme } from '../lib/theme';

export default function RootLayout() {
  const theme = useTheme();
  return (
    <FastingProvider>
      <StatusBar style="auto" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          sceneStyle: { backgroundColor: theme.background },
          tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.muted,
          tabBarIconStyle: { display: 'none' },
          tabBarLabelStyle: { fontSize: 15, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Fast' }} />
        <Tabs.Screen name="history" options={{ title: 'History' }} />
      </Tabs>
    </FastingProvider>
  );
}
