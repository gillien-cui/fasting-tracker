import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { chartBars, formatDuration, formatGoal, type ChartRange, type Fast } from '../lib/fasts';
import { useTheme } from '../lib/theme';

const RANGES: { value: ChartRange; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];
const HEIGHT = 130;
const LABEL_SPACE = 2;

type Props = { fasts: Fast[]; goalMinutes: number };

/** Bar chart of hours fasted per day (week, month) or per month (year), with a dashed goal line. */
export function HistoryChart({ fasts, goalMinutes }: Props) {
  const theme = useTheme();
  const [range, setRange] = useState<ChartRange>('week');
  const [width, setWidth] = useState(0);
  const bars = useMemo(() => chartBars(fasts, range), [fasts, range]);

  const fasted = bars.filter((b) => b.minutes > 0);
  const average = fasted.length ? fasted.reduce((sum, b) => sum + b.minutes, 0) / fasted.length : null;
  const top = Math.max(goalMinutes * 1.25, ...bars.map((b) => b.minutes));
  const plot = HEIGHT - LABEL_SPACE;
  const y = (minutes: number) => plot - (minutes / top) * plot;
  const slot = width / bars.length;
  const barWidth = Math.max(2, slot * (range === 'month' ? 0.6 : 0.55));
  const showLabel = (i: number) => range !== 'month' || i % 5 === 4 || i === bars.length - 1;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Hours fasted</Text>
        <View style={[styles.segmented, { backgroundColor: theme.background }]}>
          {RANGES.map((r) => {
            const selected = r.value === range;
            return (
              <Pressable
                key={r.value}
                onPress={() => setRange(r.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.segment, selected && { backgroundColor: theme.card }]}
              >
                <Text style={[styles.segmentText, { color: selected ? theme.text : theme.muted }]}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.legend}>
        <Text style={[styles.subtitle, { color: theme.muted }]} numberOfLines={1}>
          {average === null
            ? 'No fasts in this period'
            : `${range === 'year' ? 'Monthly avg' : 'Avg'} ${formatDuration(average)} per day fasted`}
        </Text>
        <Text style={[styles.subtitle, { color: theme.accent }]}>- - {formatGoal(goalMinutes)} goal</Text>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {bars.map((b, i) => {
              const x = i * slot + (slot - barWidth) / 2;
              const h = Math.max(b.minutes > 0 ? 3 : 2, plot - y(b.minutes));
              const color = b.minutes === 0 ? theme.track : b.minutes >= goalMinutes ? theme.good : theme.goodSoft;
              return (
                <Rect
                  key={b.key}
                  x={x}
                  y={plot - h}
                  width={barWidth}
                  height={h}
                  rx={Math.min(4, barWidth / 2)}
                  fill={color}
                />
              );
            })}
            <Line
              x1={0}
              x2={width}
              y1={y(goalMinutes)}
              y2={y(goalMinutes)}
              stroke={theme.accent}
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          </Svg>
        )}
      </View>
      <View style={styles.labels}>
        {width > 0 &&
          bars.map((b, i) =>
            showLabel(i) ? (
              <Text
                key={b.key}
                style={[styles.axis, { color: theme.muted, left: i * slot + slot / 2 - 15 }]}
                numberOfLines={1}
              >
                {b.label}
              </Text>
            ) : null,
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: -6 },
  subtitle: { fontSize: 12, flexShrink: 1 },
  labels: { height: 14, marginTop: -6 },
  axis: { position: 'absolute', width: 30, textAlign: 'center', fontSize: 11 },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segment: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  segmentText: { fontSize: 13, fontWeight: '600' },
});
