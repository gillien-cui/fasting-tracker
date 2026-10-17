import { addDays, addMonths, endOfMonth, format, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dayKey, monthResults, type Fast, type WeekStart } from '../lib/fasts';
import { useTheme } from '../lib/theme';

type Props = { fasts: Fast[]; weekStartsOn: WeekStart };

/** Month grid: filled days met the goal, red days missed it, today has an accent outline. */
export function MonthCalendar({ fasts, weekStartsOn }: Props) {
  const theme = useTheme();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const results = useMemo(() => monthResults(fasts, month), [fasts, month]);

  const first = startOfWeek(startOfMonth(month), { weekStartsOn });
  const last = endOfMonth(month);
  const days: Date[] = [];
  for (let d = first; d <= last || days.length % 7 !== 0; d = addDays(d, 1)) days.push(d);
  const weekdays = days.slice(0, 7).map((d) => format(d, 'EEEEE'));
  const isCurrentMonth = isSameMonth(month, new Date());
  const metCount = [...results.values()].filter((r) => r === 'met').length;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Pressable onPress={() => setMonth(addMonths(month, -1))} accessibilityLabel="Previous month" hitSlop={12}>
          <Text style={[styles.arrow, { color: theme.accent }]}>‹</Text>
        </Pressable>
        <View style={styles.title}>
          <Text style={[styles.month, { color: theme.text }]}>{format(month, 'MMMM yyyy')}</Text>
          <Text style={[styles.summary, { color: theme.muted }]}>
            {results.size ? `${metCount} of ${results.size} goals met` : 'No fasts this month'}
          </Text>
        </View>
        <Pressable
          onPress={() => !isCurrentMonth && setMonth(addMonths(month, 1))}
          accessibilityLabel="Next month"
          disabled={isCurrentMonth}
          hitSlop={12}
        >
          <Text style={[styles.arrow, { color: isCurrentMonth ? theme.border : theme.accent }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {weekdays.map((w, i) => (
          <Text key={`w${i}`} style={[styles.cell, styles.weekday, { color: theme.muted }]}>
            {w}
          </Text>
        ))}
        {days.map((d) => {
          const inMonth = isSameMonth(d, month);
          const result = inMonth ? results.get(dayKey(d)) : undefined;
          const today = isToday(d);
          return (
            <View key={dayKey(d)} style={styles.cell}>
              <View
                style={[
                  styles.day,
                  result === 'met' && { backgroundColor: theme.goodSoft },
                  result === 'missed' && { backgroundColor: theme.dangerSoft },
                  today && inMonth && { borderWidth: 2, borderColor: theme.accent },
                ]}
              >
                {inMonth && (
                  <Text style={[styles.dayText, { color: theme.text }, today && { fontWeight: '800' }]}>
                    {format(d, 'd')}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  arrow: { fontSize: 26, fontWeight: '600', lineHeight: 28 },
  title: { alignItems: 'center' },
  month: { fontSize: 16, fontWeight: '700' },
  summary: { fontSize: 12, marginTop: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  weekday: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  day: { width: 34, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14 },
});
