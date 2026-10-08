import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTime, shortDay } from '../lib/fasts';
import { useTheme } from '../lib/theme';
import { DateTimeSheet } from './DateTimeSheet';

export type DateTimeFieldProps = {
  label: string;
  value: Date;
  onChange?: (date: Date) => void;
  clock24: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  validate?: (date: Date) => string | null;
  describe?: (date: Date) => string;
  /** Colors the time, e.g. green once a goal is reached. */
  color?: string;
};

/** A labelled date and time. Tapping it opens the wheel picker; without onChange it is read-only. */
export function DateTimeField({ label, value, onChange, clock24, color, ...sheet }: DateTimeFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const editable = !!onChange;
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={!editable}
        accessibilityRole={editable ? 'button' : undefined}
        accessibilityLabel={`${label}: ${shortDay(value)} ${formatTime(value, clock24)}`}
        style={({ pressed }) => [
          styles.field,
          { borderColor: theme.border, backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.label, { color: theme.muted }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.day, { color: theme.muted }]} numberOfLines={1}>
          {shortDay(value)}
        </Text>
        <Text style={[styles.time, { color: color ?? theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatTime(value, clock24)}
        </Text>
        {editable && <View style={[styles.underline, { backgroundColor: theme.accent }]} />}
      </Pressable>
      {editable && (
        <DateTimeSheet
          visible={open}
          title={label}
          confirmLabel="Done"
          value={value}
          clock24={clock24}
          {...sheet}
          onCancel={() => setOpen(false)}
          onConfirm={(d) => {
            setOpen(false);
            onChange(d);
          }}
        />
      )}
    </>
  );
}

/** Lays date-time fields side by side on one line. */
export function TimeRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, gap: 1 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  day: { fontSize: 13 },
  time: { fontSize: 19, fontWeight: '700', fontVariant: ['tabular-nums'] },
  underline: { position: 'absolute', left: 10, right: 10, bottom: 0, height: 2, borderRadius: 1, opacity: 0.5 },
});
