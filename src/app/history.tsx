import { useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFasting } from '../lib/FastingContext';
import { computeStats, durationMs, formatDuration, metGoal, type Fast } from '../lib/fasts';
import { useTheme, type Theme } from '../lib/theme';

function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function Stat({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function FastRow({ fast, theme, onDelete }: { fast: Fast; theme: Theme; onDelete: () => void }) {
  const met = metGoal(fast);
  const confirmDelete = () =>
    Alert.alert('Delete this fast?', `${formatDay(fast.start)}, ${formatDuration(durationMs(fast))}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);

  return (
    <Pressable
      onLongPress={confirmDelete}
      accessibilityHint="Long-press to delete"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={[styles.rowDay, { color: theme.text }]}>
          {formatDay(fast.start)}
        </Text>
        <Text style={[styles.rowTimes, { color: theme.muted }]}>
          {formatTime(fast.start)} to {formatTime(fast.end)}
          {new Date(fast.end).toDateString() !== new Date(fast.start).toDateString() ? ' next day' : ''}
        </Text>
      </View>
      <View style={styles.rowSide}>
        <Text style={[styles.rowDuration, { color: theme.text }]}>
          {formatDuration(durationMs(fast))}
        </Text>
        <Text style={[styles.rowGoal, { color: met ? theme.accent : theme.muted }]}>
          {met ? `✓ ${fast.goalHours}h goal` : `${fast.goalHours}h goal`}
        </Text>
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const theme = useTheme();
  const { history, deleteFast } = useFasting();
  const stats = useMemo(() => computeStats(history), [history]);

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
      data={history}
      keyExtractor={(f) => f.id}
      ListHeaderComponent={
        history.length > 0 ? (
          <View style={[styles.stats, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Stat label="Fasts" value={String(stats.count)} theme={theme} />
            <Stat label="Average" value={formatDuration(stats.averageMs)} theme={theme} />
            <Stat label="Longest" value={formatDuration(stats.longestMs)} theme={theme} />
            <Stat label="Goals met" value={`${stats.goalsMet}/${stats.count}`} theme={theme} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: theme.muted }]}>
          No fasts yet. Finished fasts show up here.
        </Text>
      }
      ListFooterComponent={
        history.length > 0 ? (
          <Text style={[styles.hint, { color: theme.muted }]}>Long-press a fast to delete it.</Text>
        ) : null
      }
      renderItem={({ item }) => <FastRow fast={item} theme={theme} onDelete={() => deleteFast(item.id)} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 6,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 13, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  rowMain: { flex: 1, gap: 2 },
  rowDay: { fontSize: 16, fontWeight: '600' },
  rowTimes: { fontSize: 14 },
  rowSide: { alignItems: 'flex-end', gap: 2 },
  rowDuration: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  rowGoal: { fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 16 },
  hint: { textAlign: 'center', fontSize: 13, marginTop: 8 },
});
