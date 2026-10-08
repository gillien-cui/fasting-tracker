import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { goalError, MAX_GOAL_MINUTES } from '../lib/actions';
import { formatGoal, GOAL_PRESETS_HOURS } from '../lib/fasts';
import { useTheme } from '../lib/theme';
import { Sheet } from './Sheet';
import { WheelPicker, Wheels } from './WheelPicker';

const HOURS = Array.from({ length: MAX_GOAL_MINUTES / 60 }, (_, i) => `${i + 1} h`);
const MINUTE_STEPS = [0, 15, 30, 45];

type Props = { value: number; onChange: (goalMinutes: number) => void };

/** Preset goal chips on one line, plus a Custom chip that opens hour and minute wheels and then shows the custom goal. */
export function GoalPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const isPreset = GOAL_PRESETS_HOURS.some((h) => h * 60 === value);
  const [open, setOpen] = useState(false);

  const chip = (label: string, selected: boolean, onPress: () => void, a11y = label) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accent : theme.card },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? theme.accentText : theme.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {GOAL_PRESETS_HOURS.map((h) => chip(`${h} h`, value === h * 60, () => onChange(h * 60)))}
      {isPreset
        ? chip('Custom', false, () => setOpen(true))
        : chip(`${formatGoal(value)} ✓`, true, () => setOpen(true), `Custom goal ${formatGoal(value)}, tap to change`)}
      <CustomGoalSheet
        visible={open}
        value={value}
        onCancel={() => setOpen(false)}
        onConfirm={(m) => {
          setOpen(false);
          onChange(m);
        }}
      />
    </View>
  );
}

type SheetProps = { visible: boolean; value: number; onCancel: () => void; onConfirm: (goalMinutes: number) => void };

function CustomGoalSheet(props: SheetProps) {
  if (!props.visible) return null;
  return <CustomGoalBody {...props} />;
}

function CustomGoalBody({ value, onCancel, onConfirm }: SheetProps) {
  const theme = useTheme();
  const [hours, setHours] = useState(() => Math.min(HOURS.length, Math.max(1, Math.floor(value / 60))));
  const [minuteStep, setMinuteStep] = useState(() => Math.max(0, MINUTE_STEPS.indexOf(value % 60)));
  const goal = hours * 60 + MINUTE_STEPS[minuteStep];
  const error = goalError(goal);
  const days = goal >= 48 * 60 ? ` · ${+(goal / 1440).toFixed(1)} days` : '';

  return (
    <Sheet
      visible
      title="Custom goal"
      confirmLabel="Set goal"
      confirmDisabled={!!error}
      onCancel={onCancel}
      onConfirm={() => onConfirm(goal)}
    >
      <Wheels>
        <WheelPicker label="Hours" items={HOURS} initialIndex={hours - 1} onChange={(i) => setHours(i + 1)} />
        <WheelPicker
          label="Minutes"
          items={MINUTE_STEPS.map((m) => `${String(m).padStart(2, '0')} m`)}
          initialIndex={minuteStep}
          onChange={setMinuteStep}
        />
      </Wheels>
      <Text style={[styles.hint, { color: error ? theme.danger : theme.muted }]}>
        {error ?? `Fast for ${formatGoal(goal)}${days}`}
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: {
    flexGrow: 1,
    flexShrink: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  chipText: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
});
