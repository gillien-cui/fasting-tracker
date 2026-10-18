import { addDays, differenceInCalendarDays, parseISO, startOfDay, subDays } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { shortDay } from '../lib/fasts';
import { useTheme } from '../lib/theme';
import {
  formatChange,
  formatWeight,
  fromUnit,
  sortWeights,
  toUnit,
  weightOn,
  wholeRange,
  type WeightEntry,
  type WeightUnit,
} from '../lib/weights';
import { Sheet } from './Sheet';
import { WheelPicker, Wheels } from './WheelPicker';

type Props = {
  visible: boolean;
  /** The day the sheet opens on. Defaults to today. */
  day?: Date;
  unit: WeightUnit;
  weights: WeightEntry[];
  onSave: (day: Date, kg: number) => void;
  onDelete: (day: string) => void;
  onCancel: () => void;
};

const DECIMALS = Array.from({ length: 10 }, (_, i) => `.${i}`);
const FALLBACK: Record<WeightUnit, number> = { kg: 70, lb: 155 };

/** Logs a weight on one page: day, whole number and decimal wheels. */
export function WeightSheet(props: Props) {
  if (!props.visible) return null;
  return <WeightSheetBody {...props} />;
}

function WeightSheetBody({ day, unit, weights, onSave, onDelete, onCancel }: Props) {
  const theme = useTheme();
  const [today] = useState(() => startOfDay(new Date()));
  const [days] = useState(() => Array.from({ length: 366 }, (_, i) => addDays(subDays(today, 365), i)));
  const [dayIndex, setDayIndex] = useState(() =>
    Math.min(days.length - 1, Math.max(0, 365 - differenceInCalendarDays(today, day ?? today))),
  );
  const wholes = wholeRange(unit);
  const [start] = useState(() => {
    const entry = weightOn(weights, days[dayIndex]) ?? sortWeights(weights)[0];
    return entry ? toUnit(entry.kg, unit) : FALLBACK[unit];
  });
  const [whole, setWhole] = useState(() => Math.min(wholes.length - 1, Math.max(0, Math.floor(start) - wholes[0])));
  const [decimal, setDecimal] = useState(() => Math.round((start % 1) * 10) % 10);

  const picked = days[dayIndex];
  const value = wholes[whole] + decimal / 10;
  const kg = fromUnit(value, unit);
  const existing = weightOn(weights, picked);
  const before = sortWeights(weights).find((w) => parseISO(w.day) < picked);

  let hint = ' ';
  if (existing) hint = `Replaces ${formatWeight(existing.kg, unit)} logged that day`;
  else if (before) hint = `${formatChange(kg - before.kg, unit)} since ${shortDay(parseISO(before.day), today)}`;

  return (
    <Sheet visible title="Log weight" confirmLabel="Save" onConfirm={() => onSave(picked, kg)} onCancel={onCancel}>
      <Wheels>
        <WheelPicker
          label="Day"
          flex={2.2}
          items={days.map((d) => shortDay(d, today))}
          initialIndex={dayIndex}
          onChange={setDayIndex}
        />
        <WheelPicker label="Weight" items={wholes.map(String)} initialIndex={whole} onChange={setWhole} />
        <WheelPicker label="Decimal" flex={0.8} items={DECIMALS} initialIndex={decimal} onChange={setDecimal} />
        <View style={styles.unit} pointerEvents="none">
          <Text style={[styles.unitText, { color: theme.text }]}>{unit}</Text>
        </View>
      </Wheels>
      <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text>
      {existing && (
        <Pressable onPress={() => onDelete(existing.day)} accessibilityRole="button" style={styles.delete}>
          <Text style={[styles.deleteText, { color: theme.danger }]}>Delete this entry</Text>
        </Pressable>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  unit: { flex: 0.7, justifyContent: 'center', alignItems: 'center' },
  unitText: { fontSize: 19, fontWeight: '700' },
  hint: { fontSize: 15, fontWeight: '500', textAlign: 'center', minHeight: 20 },
  delete: { alignSelf: 'center', paddingVertical: 2 },
  deleteText: { fontSize: 15, fontWeight: '600' },
});
