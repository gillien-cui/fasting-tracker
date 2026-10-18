import { Link, usePathname } from 'expo-router';
import TopTabs, { type MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';

const TITLES: Record<string, string> = { index: 'Today', history: 'History' };

function Header() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const title = usePathname().startsWith('/history') ? TITLES.history : TITLES.index;
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        {title}
      </Text>
      <Link href="/settings" asChild>
        <Pressable accessibilityLabel="Settings" hitSlop={12}>
          <Text style={{ fontSize: 24, color: theme.muted }}>⚙︎</Text>
        </Pressable>
      </Link>
    </View>
  );
}

/** Bottom tab bar whose page dot follows the swipe. */
function TabBar({ state, navigation, position }: MaterialTopTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: insets.bottom + 6 },
      ]}
    >
      <View style={styles.labels}>
        {state.routes.map((route: { key: string; name: string }, i: number) => {
          const focused = state.index === i;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.tab}
            >
              <Text style={[styles.label, { color: focused ? theme.accent : theme.muted }]}>
                {TITLES[route.name] ?? route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.dots}>
        {state.routes.map((route: { key: string; name: string }, i: number) => {
          const near = position.interpolate({
            inputRange: [i - 1, i, i + 1],
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={route.key}
              style={[
                styles.dot,
                {
                  backgroundColor: theme.border,
                  width: near.interpolate({ inputRange: [0, 1], outputRange: [6, 18] }),
                },
              ]}
            >
              <Animated.View style={[styles.dotFill, { backgroundColor: theme.accent, opacity: near }]} />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

/** Today and History side by side: swipe or tap the bar to switch. */
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <Header />
      <TopTabs
        tabBarPosition="bottom"
        tabBar={(props: MaterialTopTabBarProps) => <TabBar {...props} />}
        screenOptions={{ sceneStyle: { backgroundColor: theme.background } }}
      >
        <TopTabs.Screen name="index" options={{ title: TITLES.index }} />
        <TopTabs.Screen name="history" options={{ title: TITLES.history }} />
      </TopTabs>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  title: { fontSize: 22, fontWeight: '700' },
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  labels: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  label: { fontSize: 15, fontWeight: '600' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 6 },
  dot: { height: 6, borderRadius: 3, overflow: 'hidden' },
  dotFill: { flex: 1 },
});
