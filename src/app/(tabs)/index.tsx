import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Celebration } from '../../components/Celebration';
import { DateTimeField, TimeRow } from '../../components/DateTimeField';
import { DateTimeSheet } from '../../components/DateTimeSheet';
import { GoalPicker } from '../../components/GoalPicker';
import { Ring } from '../../components/Ring';
import { goalFromReachedAt, timesError } from '../../lib/actions';
import { confirm } from '../../lib/confirm';
import {
  completedFasts,
  formatClock,
  formatDuration,
  formatGoal,
  formatTime,
  goalReachedAt,
  shortDay,
} from '../../lib/fasts';
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
  const store = useStore();
  return (
    <View style={styles.fill}>
      <TodayContent />
      {store.justEnded && <Celebration fast={store.justEnded} onDone={store.dismissJustEnded} />}
    </View>
  );
}

function TodayContent() {
  const theme = useTheme();
  const { loaded, active, fasts, settings, startFast, endFast, cancelFast, updateActive } = useStore();
  const [goal, setGoal] = useState<number | null>(null);
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const now = useNow(true);

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const clock24 = settings.clock24;
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
          onPress={() => setPicking('start')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.primaryText, { color: theme.accentText }]}>Start {formatGoal(nextGoal)} fast</Text>
        </Pressable>

        <DateTimeSheet
          visible={picking === 'start'}
          title="When did you start?"
          confirmLabel="Start fast"
          value={now}
          maximumDate={now}
          clock24={clock24}
          validate={(d) => timesError(d, null, new Date())}
          describe={(d) => {
            const at = new Date(d.getTime() + nextGoal * 60000);
            return `Goal reached ${shortDay(at).toLowerCase()} at ${formatTime(at, clock24)}`;
          }}
          onCancel={() => setPicking(null)}
          onConfirm={(d) => {
            setPicking(null);
            startFast(nextGoal, d);
          }}
        />
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
          <Text style={[styles.small, { color: reached ? theme.good : theme.muted }]}>
            {reached
              ? `Goal reached · ${Math.floor(progress * 100)}%`
              : `of ${formatGoal(active.goalMinutes)} goal · ${Math.floor(progress * 100)}%`}
          </Text>
        </Ring>
      </View>

      <TimeRow>
        <DateTimeField
          label="Started"
          value={start}
          maximumDate={now}
          clock24={clock24}
          validate={(d) => timesError(d, null, new Date())}
          onChange={(d) => updateActive({ startedAt: d })}
        />
        <DateTimeField
          label="Goal reached"
          value={goalAt}
          minimumDate={start}
          clock24={clock24}
          color={reached ? theme.good : undefined}
          validate={(d) => goalFromReachedAt(start, d).error}
          describe={(d) => `Goal ${formatGoal(goalFromReachedAt(start, d).goalMinutes)}`}
          onChange={(d) => updateActive({ goalMinutes: goalFromReachedAt(start, d).goalMinutes })}
        />
      </TimeRow>

      <GoalPicker value={active.goalMinutes} onChange={(m) => updateActive({ goalMinutes: m })} />

      <Pressable
        onPress={() => setPicking('end')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={[styles.primaryText, { color: theme.accentText }]}>End fast</Text>
      </Pressable>
      <Pressable onPress={onCancel} accessibilityRole="button" style={styles.secondary}>
        <Text style={[styles.secondaryText, { color: theme.muted }]}>Cancel fast</Text>
      </Pressable>

      <DateTimeSheet
        visible={picking === 'end'}
        title="When did you eat?"
        confirmLabel="End fast"
        value={now}
        minimumDate={start}
        maximumDate={now}
        clock24={clock24}
        validate={(d) => timesError(start, d, new Date())}
        describe={(d) => {
          const minutes = (d.getTime() - start.getTime()) / 60000;
          const met = minutes >= active.goalMinutes;
          return `${formatDuration(minutes)} fasted · ${met ? 'goal met' : `${formatDuration(active.goalMinutes - minutes)} short`}`;
        }}
        onCancel={() => setPicking(null)}
        onConfirm={(d) => {
          setPicking(null);
          endFast(d);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, gap: 14, paddingBottom: 40 },
  ringWrap: { alignItems: 'center', marginTop: 4 },
  clock: { fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] },
  small: { fontSize: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  primary: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  primaryText: { fontSize: 18, fontWeight: '700' },
  secondary: { alignItems: 'center', paddingVertical: 8 },
  secondaryText: { fontSize: 15 },
});
