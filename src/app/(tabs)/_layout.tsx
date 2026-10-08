import { Link, Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../lib/theme';

function SettingsButton() {
  const theme = useTheme();
  return (
    <Link href="/settings" asChild>
      <Pressable accessibilityLabel="Settings" hitSlop={12} style={{ marginRight: 16 }}>
        <Text style={{ fontSize: 24, color: theme.muted }}>⚙︎</Text>
      </Pressable>
    </Link>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  return (
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
        headerRight: () => <SettingsButton />,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
    </Tabs>
  );
}
