import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { DateTimeField } from '../components/DateTimeField';
import { timesError } from '../lib/actions';
import { formatDuration, goalReachedAt } from '../lib/fasts';
import { useStore } from '../lib/store';
import { useTheme } from '../lib/theme';

/**
 * Ends the active fast at a chosen time. Opened from the "Still fasting?"
 * reminder, where the fast most likely ended long ago, so it suggests the
 * moment the goal was reached.
 */
export default function EndFastScreen() {
  const theme = useTheme();
  const { fromReminder } = useLocalSearchParams<{ fromReminder?: string }>();
  const { loaded, active, settings, endFast } = useStore();
  const [end, setEnd] = useState<Date | null>(null);

  if (!loaded) return null;
  if (!active) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.body, { color: theme.muted }]}>{"There's no fast running right now."}</Text>
        <Pressable onPress={() => router.back()} style={[styles.primary, { backgroundColor: theme.accent }]}>
          <Text style={[styles.primaryText, { color: theme.accentText }]}>Close</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const now = new Date();
  const start = new Date(active.startedAt);
  const suggested = fromReminder ? goalReachedAt(active) : now;
  const value = end ?? (suggested < now ? suggested : now);
  const error = timesError(start, value, now);

  const onSave = async () => {
    if (error) return;
    if (await endFast(value)) router.dismissTo('/');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>When did you break your fast?</Text>
      <Text style={[styles.body, { color: theme.muted }]}>
        {fromReminder
          ? "Set the time you actually ate. It's set to when your goal was reached; change it if that's not right."
          : 'Set the time you actually ate.'}
      </Text>
      <DateTimeField label="End time" value={value} onChange={setEnd} clock24={settings.clock24} maximumDate={now} />
      <Text style={[styles.summary, { color: error ? theme.danger : theme.text }]}>
        {error ?? `Fast of ${formatDuration((value.getTime() - start.getTime()) / 60000)}`}
      </Text>
      <Pressable
        onPress={onSave}
        disabled={!!error}
        accessibilityRole="button"
        style={[styles.primary, { backgroundColor: theme.accent, opacity: error ? 0.4 : 1 }]}
      >
        <Text style={[styles.primaryText, { color: theme.accentText }]}>End and save</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  summary: { fontSize: 15, fontWeight: '500' },
  primary: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  primaryText: { fontSize: 18, fontWeight: '700' },
});
