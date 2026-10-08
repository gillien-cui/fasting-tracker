import { addDays, differenceInCalendarDays, set, startOfDay, subDays } from 'date-fns';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { shortDay } from '../lib/fasts';
import { useTheme } from '../lib/theme';
import { Sheet } from './Sheet';
import { WheelPicker, Wheels } from './WheelPicker';

export type DateTimeSheetProps = {
  visible: boolean;
  title: string;
  confirmLabel: string;
  value: Date;
  clock24: boolean;
  /** Earliest and latest day on the day wheel. Defaults: a year back, a week ahead. */
  minimumDate?: Date;
  maximumDate?: Date;
  /** Why the picked time can't be used, or null when it can. */
  validate?: (date: Date) => string | null;
  /** A line under the wheels describing the picked time, e.g. the fast's length. */
  describe?: (date: Date) => string;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
};

const pad = (n: number) => String(n).padStart(2, '0');
const MINUTES = Array.from({ length: 60 }, (_, m) => pad(m));
const HOURS_24 = Array.from({ length: 24 }, (_, h) => pad(h));
const HOURS_12 = Array.from({ length: 12 }, (_, h) => String(h === 0 ? 12 : h));

/** Picks a date and time on one page: day, hour and minute wheels (plus AM/PM on a 12 h clock). */
export function DateTimeSheet(props: DateTimeSheetProps) {
  if (!props.visible) return null;
  return <DateTimeSheetBody {...props} />;
}

function DateTimeSheetBody({
  title,
  confirmLabel,
  value,
  clock24,
  minimumDate,
  maximumDate,
  validate,
  describe,
  onConfirm,
  onCancel,
}: DateTimeSheetProps) {
  const theme = useTheme();
  const [today] = useState(() => startOfDay(new Date()));
  const [days] = useState(() => {
    let first = startOfDay(minimumDate ?? subDays(today, 365));
    let last = startOfDay(maximumDate ?? addDays(today, 7));
    if (value < first) first = startOfDay(value);
    if (value > last) last = startOfDay(value);
    const list: Date[] = [];
    for (let d = first; d <= last; d = addDays(d, 1)) list.push(d);
    return list;
  });
  const [dayIndex, setDayIndex] = useState(() =>
    Math.max(
      0,
      days.findIndex((d) => differenceInCalendarDays(d, value) === 0),
    ),
  );
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());

  const picked = set(days[dayIndex], { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
  const error = validate?.(picked) ?? null;
  const pm = hour >= 12;

  return (
    <Sheet
      visible
      title={title}
      confirmLabel={confirmLabel}
      confirmDisabled={!!error}
      onConfirm={() => onConfirm(picked)}
      onCancel={onCancel}
    >
      <Wheels>
        <WheelPicker
          label="Day"
          flex={2.2}
          items={days.map((d) => shortDay(d, today))}
          initialIndex={dayIndex}
          onChange={setDayIndex}
        />
        {clock24 ? (
          <WheelPicker label="Hour" items={HOURS_24} initialIndex={hour} onChange={setHour} />
        ) : (
          <WheelPicker
            label="Hour"
            items={HOURS_12}
            initialIndex={hour % 12}
            onChange={(i) => setHour(i + (pm ? 12 : 0))}
          />
        )}
        <WheelPicker label="Minute" items={MINUTES} initialIndex={minute} onChange={setMinute} />
        {!clock24 && (
          <WheelPicker
            label="AM or PM"
            items={['AM', 'PM']}
            initialIndex={pm ? 1 : 0}
            onChange={(i) => setHour((h) => (h % 12) + i * 12)}
          />
        )}
      </Wheels>
      <Text style={[styles.hint, { color: error ? theme.danger : theme.muted }]}>
        {error ?? describe?.(picked) ?? ' '}
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 15, fontWeight: '500', textAlign: 'center', minHeight: 20 },
});
