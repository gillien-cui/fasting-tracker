import { format } from 'date-fns';
import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { HistoryChart } from '../../components/HistoryChart';
import { MonthCalendar } from '../../components/MonthCalendar';
import { WeightChart } from '../../components/WeightChart';
import { WeightSheet } from '../../components/WeightSheet';
import {
  averageMinutes,
  currentStreak,
  durationMinutes,
  fastDay,
  formatDuration,
  formatGoal,
  groupByWeek,
  isMet,
  longestFast,
} from '../../lib/fasts';
import { useStore } from '../../lib/store';
import { useTheme, type Theme } from '../../lib/theme';

function Stat({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

/** Shown on History while weight tracking is off, until it's turned on or closed. */
function WeightHint({ theme }: { theme: Theme }) {
  const { updateSettings } = useStore();
  return (
    <View style={[styles.hint, { borderColor: theme.border }]}>
      <Text style={[styles.hintIcon, { color: theme.accent }]}>⚖︎</Text>
      <View style={styles.hintText}>
        <Text style={[styles.hintTitle, { color: theme.text }]}>Track your weight too?</Text>
        <Text style={[styles.hintBody, { color: theme.muted }]}>Log it alongside your fasts and see the trend.</Text>
      </View>
      <Pressable
        onPress={() => updateSettings({ weightTracking: true })}
        accessibilityRole="button"
        style={[styles.hintButton, { backgroundColor: theme.accentSoft }]}
      >
        <Text style={[styles.hintButtonText, { color: theme.accent }]}>Turn on</Text>
      </Pressable>
      <Pressable
        onPress={() => updateSettings({ weightHintDismissed: true })}
        accessibilityRole="button"
        accessibilityLabel="Hide weight suggestion"
        hitSlop={10}
      >
        <Text style={{ color: theme.muted }}>✕</Text>
      </Pressable>
    </View>
  );
}

export default function HistoryScreen() {
  const theme = useTheme();
  const { fasts, settings, weights, saveWeight, deleteWeight } = useStore();
  // undefined: sheet closed; null: log a new weight; a date: edit that day.
  const [weightDay, setWeightDay] = useState<Date | null | undefined>(undefined);
  const sections = useMemo(
    () => groupByWeek(fasts, settings.weekStartsOn).map((g) => ({ ...g, data: g.fasts })),
    [fasts, settings.weekStartsOn],
  );
  const streak = currentStreak(fasts);
  const longest = longestFast(fasts);
  const avg7 = averageMinutes(fasts, 7);
  const avg30 = averageMinutes(fasts, 30);

  const header = (
    <View style={styles.headerWrap}>
      <View style={[styles.stats, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Stat label="Streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} theme={theme} />
        <Stat label="Longest" value={longest ? formatDuration(durationMinutes(longest)) : '–'} theme={theme} />
        <Stat label="7-day avg" value={avg7 === null ? '–' : formatDuration(avg7)} theme={theme} />
        <Stat label="30-day avg" value={avg30 === null ? '–' : formatDuration(avg30)} theme={theme} />
      </View>
      <HistoryChart fasts={fasts} goalMinutes={settings.chartGoalMinutes ?? settings.defaultGoalMinutes} />
      <MonthCalendar fasts={fasts} weekStartsOn={settings.weekStartsOn} />
      {settings.weightTracking ? (
        <WeightChart weights={weights} unit={settings.weightUnit} onLog={(day) => setWeightDay(day ?? null)} />
      ) : (
        !settings.weightHintDismissed && <WeightHint theme={theme} />
      )}
      <Link href="/fast/new" asChild>
        <Pressable accessibilityRole="button" style={styles.add}>
          <Text style={[styles.addText, { color: theme.accent }]}>+ Add past fast</Text>
        </Pressable>
      </Link>
    </View>
  );

  return (
    <>
      <SectionList
        contentContainerStyle={styles.container}
        sections={sections}
        keyExtractor={(f) => f.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.muted }]}>No fasts yet. Finished fasts show up here.</Text>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: theme.muted }]}>{section.title}</Text>
        )}
        renderItem={({ item, index, section }) => {
          const met = isMet(item);
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/fast/[id]', params: { id: item.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: pressed ? 0.7 : 1,
                  borderTopLeftRadius: index === 0 ? 12 : 0,
                  borderTopRightRadius: index === 0 ? 12 : 0,
                  borderBottomLeftRadius: index === section.data.length - 1 ? 12 : 0,
                  borderBottomRightRadius: index === section.data.length - 1 ? 12 : 0,
                  borderTopWidth: index === 0 ? 1 : 0,
                },
              ]}
            >
              <View style={styles.rowMain}>
                <Text style={[styles.rowDay, { color: theme.text }]}>{format(fastDay(item), 'EEE MMM d')}</Text>
                {item.note ? (
                  <Text style={[styles.rowNote, { color: theme.muted }]} numberOfLines={1}>
                    {item.note}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.rowDuration, { color: theme.text }]}>{formatDuration(durationMinutes(item))}</Text>
              <View style={styles.rowResult}>
                <Text style={[styles.rowStatus, { color: met ? theme.good : theme.danger }]}>
                  {met ? 'Met' : 'Missed'}
                </Text>
                <Text style={[styles.rowGoal, { color: theme.muted }]}>{formatGoal(item.goalMinutes)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
      <WeightSheet
        visible={weightDay !== undefined}
        day={weightDay ?? undefined}
        unit={settings.weightUnit}
        weights={weights}
        onCancel={() => setWeightDay(undefined)}
        onSave={(day, kg) => {
          setWeightDay(undefined);
          saveWeight(day, kg);
        }}
        onDelete={(day) => {
          setWeightDay(undefined);
          deleteWeight(day);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  headerWrap: { gap: 12, marginBottom: 4 },
  stats: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6 },
  stat: { alignItems: 'center', flex: 1, paddingHorizontal: 2 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  add: { alignSelf: 'flex-end', paddingVertical: 4 },
  addText: { fontSize: 15, fontWeight: '600' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowMain: { flex: 1 },
  rowDay: { fontSize: 16, fontWeight: '600' },
  rowNote: { fontSize: 13, marginTop: 2 },
  rowDuration: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  rowResult: { alignItems: 'flex-end', width: 56 },
  rowStatus: { fontSize: 14, fontWeight: '700' },
  rowGoal: { fontSize: 12 },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 12,
  },
  hintIcon: { fontSize: 22 },
  hintText: { flex: 1 },
  hintTitle: { fontSize: 14, fontWeight: '700' },
  hintBody: { fontSize: 12, marginTop: 2 },
  hintButton: { borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12 },
  hintButtonText: { fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 16 },
});
