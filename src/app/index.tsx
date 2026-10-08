import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFasting } from '../lib/FastingContext';
import { formatClock, formatDuration, GOAL_OPTIONS } from '../lib/fasts';
import { useTheme } from '../lib/theme';

const HOUR = 60 * 60 * 1000;

function useNow(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function FastScreen() {
  const theme = useTheme();
  const { loaded, active, goalHours, setGoalHours, startFast, endFast, cancelFast } = useFasting();
  const now = useNow(active !== null);

  if (!loaded) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const elapsed = active ? Math.max(0, now - active.start) : 0;
  const goalMs = (active?.goalHours ?? goalHours) * HOUR;
  const progress = Math.min(1, elapsed / goalMs);
  const remaining = goalMs - elapsed;

  const confirmEnd = () => {
    if (remaining <= 0) return endFast();
    Alert.alert('End fast early?', `You're ${formatDuration(remaining)} short of your goal.`, [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: cancelFast },
      { text: 'End and save', onPress: endFast },
    ]);
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.muted }]}>
          {active ? 'Fasting for' : 'Not fasting'}
        </Text>
        <Text style={[styles.clock, { color: theme.text }]} accessibilityRole="timer">
          {formatClock(elapsed)}
        </Text>

        <View style={[styles.track, { backgroundColor: theme.track }]}>
          <View
            style={[styles.fill, { backgroundColor: theme.accent, width: `${progress * 100}%` }]}
          />
        </View>

        {active ? (
          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: theme.muted }]}>
              Started {formatTime(active.start)}
            </Text>
            <Text style={[styles.metaText, { color: remaining <= 0 ? theme.accent : theme.muted }]}>
              {remaining <= 0
                ? `Goal reached, ${formatDuration(-remaining)} over`
                : `${formatDuration(remaining)} to go, ends ${formatTime(active.start + goalMs)}`}
            </Text>
          </View>
        ) : (
          <Text style={[styles.metaText, styles.meta, { color: theme.muted }]}>
            Pick a goal and tap Start when you have your last meal.
          </Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Goal</Text>
      <View style={styles.goals}>
        {GOAL_OPTIONS.map((hours) => {
          const selected = (active?.goalHours ?? goalHours) === hours;
          return (
            <Pressable
              key={hours}
              onPress={() => setGoalHours(hours)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.goal,
                {
                  borderColor: selected ? theme.accent : theme.border,
                  backgroundColor: selected ? theme.accent : theme.card,
                },
              ]}
            >
              <Text style={[styles.goalText, { color: selected ? theme.accentText : theme.text }]}>
                {hours}h
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={active ? confirmEnd : startFast}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: active ? theme.card : theme.accent,
            borderColor: active ? theme.danger : theme.accent,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={[styles.buttonText, { color: active ? theme.danger : theme.accentText }]}>
          {active ? 'End fast' : 'Start fast'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, gap: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 24, alignItems: 'center', gap: 16 },
  label: { fontSize: 15, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  clock: { fontSize: 56, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, width: '100%', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  meta: { alignItems: 'center', gap: 4, textAlign: 'center' },
  metaText: { fontSize: 15 },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginTop: 8 },
  goals: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goal: { borderWidth: 1, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 },
  goalText: { fontSize: 16, fontWeight: '600' },
  button: { borderWidth: 2, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  buttonText: { fontSize: 18, fontWeight: '700' },
});
