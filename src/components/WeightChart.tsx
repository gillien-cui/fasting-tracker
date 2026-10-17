import { parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Polyline } from 'react-native-svg';
import { useTheme } from '../lib/theme';
import {
  formatChange,
  formatWeight,
  sortWeights,
  toUnit,
  weightAxisLabels,
  weightPoints,
  type WeightEntry,
  type WeightRange,
  type WeightUnit,
} from '../lib/weights';

const RANGES: { value: WeightRange; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];
const HEIGHT = 120;
const PAD = 8;

type Props = {
  weights: WeightEntry[];
  unit: WeightUnit;
  /** Opens the weight sheet: on a day to edit it, or with no day to log a new one. */
  onLog: (day?: Date) => void;
};

/** Line chart of logged weight: the last 30 days, or monthly averages over the last year. */
export function WeightChart({ weights, unit, onLog }: Props) {
  const theme = useTheme();
  const [range, setRange] = useState<WeightRange>('month');
  const [width, setWidth] = useState(0);
  const points = useMemo(() => weightPoints(weights, range), [weights, range]);
  const labels = weightAxisLabels(range);
  const latest = sortWeights(weights)[0];

  const values = points.map((p) => toUnit(p.kg, unit));
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const spread = Math.max(2, hi - lo);
  const min = (lo + hi) / 2 - spread * 0.6;
  const max = (lo + hi) / 2 + spread * 0.6;
  const x = (p: number) => PAD + p * (width - PAD * 2);
  const y = (value: number) => PAD + (1 - (value - min) / (max - min)) * (HEIGHT - PAD * 2);
  const change = points.length > 1 ? points[points.length - 1].kg - points[0].kg : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Weight</Text>
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
          {latest ? formatWeight(latest.kg, unit) : 'No weights yet'}
          {change !== null && (
            <>
              {' · '}
              <Text style={{ color: change <= 0 ? theme.good : theme.danger }}>{formatChange(change, unit)}</Text>
              {range === 'month' ? ' in 30 days' : ' this year'}
            </>
          )}
        </Text>
        <Pressable
          onPress={() => onLog()}
          accessibilityRole="button"
          accessibilityLabel="Log weight"
          hitSlop={8}
          style={[styles.log, { backgroundColor: theme.accentSoft }]}
        >
          <Text style={[styles.logText, { color: theme.accent }]}>+ Log</Text>
        </Pressable>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {points.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              {weights.length ? 'Nothing logged in this period' : 'Tap + Log to add your first weight'}
            </Text>
          </View>
        ) : (
          width > 0 && (
            <Svg width={width} height={HEIGHT}>
              <Polyline
                points={points.map((p, i) => `${x(p.x)},${y(values[i])}`).join(' ')}
                fill="none"
                stroke={theme.accent}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
              {points.map((p, i) => {
                const last = i === points.length - 1;
                const entry = p.entry;
                return (
                  <G key={p.key} onPress={entry ? () => onLog(parseISO(entry.day)) : undefined}>
                    {/* A bigger, invisible circle makes the point easy to tap. */}
                    <Circle cx={x(p.x)} cy={y(values[i])} r={14} fill="transparent" />
                    <Circle
                      cx={x(p.x)}
                      cy={y(values[i])}
                      r={last ? 5 : 3.5}
                      fill={last ? theme.accent : theme.card}
                      stroke={theme.accent}
                      strokeWidth={2}
                    />
                  </G>
                );
              })}
            </Svg>
          )
        )}
      </View>
      <View style={styles.axis}>
        {labels.map((l) => (
          <Text key={l} style={[styles.axisText, { color: theme.muted }]}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: -6 },
  subtitle: { fontSize: 12, flexShrink: 1 },
  log: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10 },
  logText: { fontSize: 12, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  axisText: { fontSize: 11 },
  segmented: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segment: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  segmentText: { fontSize: 13, fontWeight: '600' },
});
