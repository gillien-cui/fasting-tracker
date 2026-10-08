import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateTimeField } from '../../components/DateTimeField';
import { GoalPicker } from '../../components/GoalPicker';
import { Ring } from '../../components/Ring';
import { confirm } from '../../lib/confirm';
import { completedFasts, formatClock, formatDayTime, formatDuration, formatGoal, goalReachedAt } from '../../lib/fasts';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

/** Current time, ticking every second while enabled. */
function useNow(enabled: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

export default function TodayScreen() {
  const theme = useTheme();
  const { loaded, active, fasts, settings, startFast, endFast, cancelFast, updateActive } = useStore();
  const [goal, setGoal] = useState<number | null>(null);
  const now = useNow(true);

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const nextGoal = goal ?? settings.defaultGoalMinutes;
  const lastFast = completedFasts(fasts)[0];

  if (!active) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.ringWrap}>
          <Ring progress={0}>
            <Text style={[styles.small, { color: theme.muted }]}>Not fasting</Text>
            {lastFast ? (
              <>
                <Text style={[styles.clock, { color: theme.text }]}>
                  {formatDuration((now.getTime() - new Date(lastFast.endedAt!).getTime()) / 60000)}
                </Text>
                <Text style={[styles.small, { color: theme.muted }]}>since your last fast</Text>
              </>
            ) : (
              <Text style={[styles.clock, { color: theme.text }]}>Ready</Text>
            )}
          </Ring>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Goal</Text>
        <GoalPicker value={nextGoal} onChange={setGoal} />

        <Pressable
          onPress={() => startFast(nextGoal)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.primaryText, { color: theme.accentText }]}>Start {formatGoal(nextGoal)} fast</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const start = new Date(active.startedAt);
  const elapsedMs = Math.max(0, now.getTime() - start.getTime());
  const progress = elapsedMs / (active.goalMinutes * 60000);
  const goalAt = goalReachedAt(active);
  const reached = goalAt <= now;

  const onCancel = async () => {
    if (await confirm('Cancel this fast?', "It won't be saved to your history.", 'Cancel fast', true)) cancelFast();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.ringWrap}>
        <Ring progress={progress}>
          <Text style={[styles.clock, { color: theme.text }]} accessibilityRole="timer">
            {formatClock(elapsedMs)}
          </Text>
          <Text style={[styles.small, { color: theme.muted }]}>
            of {formatGoal(active.goalMinutes)} goal · {Math.floor(progress * 100)}%
          </Text>
        </Ring>
      </View>

      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: reached ? theme.good : theme.muted }]}>
          {reached
            ? `Goal reached ${formatDuration((now.getTime() - goalAt.getTime()) / 60000)} ago`
            : `Goal reached at ${formatDayTime(goalAt, settings.clock24, now)}`}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.muted }]}>Started (tap to adjust)</Text>
        <DateTimeField
          label="Start time"
          value={start}
          maximumDate={now}
          clock24={settings.clock24}
          onChange={(d) => updateActive({ startedAt: d.toISOString() })}
        />
        <Text style={[styles.label, { color: theme.muted, marginTop: 8 }]}>Goal</Text>
        <GoalPicker value={active.goalMinutes} onChange={(m) => updateActive({ goalMinutes: m })} />
      </View>

      <Pressable
        onPress={() => endFast()}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={[styles.primaryText, { color: theme.accentText }]}>End fast</Text>
      </Pressable>
      <Pressable onPress={onCancel} accessibilityRole="button" style={styles.secondary}>
        <Text style={[styles.secondaryText, { color: theme.muted }]}>Cancel fast</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, gap: 14, paddingBottom: 40 },
  ringWrap: { alignItems: 'center', marginTop: 4 },
  clock: { fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] },
  small: { fontSize: 14 },
  meta: { alignItems: 'center' },
  metaText: { fontSize: 15, fontWeight: '500' },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  primary: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  primaryText: { fontSize: 18, fontWeight: '700' },
  secondary: { alignItems: 'center', paddingVertical: 8 },
  secondaryText: { fontSize: 15 },
});
