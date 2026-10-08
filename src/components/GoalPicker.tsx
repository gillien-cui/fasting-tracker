import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_GOAL_MINUTES } from '../lib/actions';
import { GOAL_PRESETS_HOURS } from '../lib/fasts';
import { useTheme } from '../lib/theme';

const MAX_HOURS = MAX_GOAL_MINUTES / 60;

type Props = { value: number; onChange: (goalMinutes: number) => void };

/** Preset goal chips plus a "Custom" chip that takes hours (decimals allowed). */
export function GoalPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const isPreset = GOAL_PRESETS_HOURS.some((h) => h * 60 === value);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const [draft, setDraft] = useState(isPreset ? '' : String(+(value / 60).toFixed(2)));

  const commit = (text: string) => {
    const hours = Number(text.replace(',', '.'));
    if (Number.isFinite(hours) && hours > 0 && hours <= MAX_HOURS) onChange(Math.round(hours * 60));
  };

  const chip = (label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accent : theme.card },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? theme.accentText : theme.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {GOAL_PRESETS_HOURS.map((h) =>
          chip(`${h} h`, !customOpen && value === h * 60, () => {
            setCustomOpen(false);
            onChange(h * 60);
          }),
        )}
        {chip('Custom', customOpen, () => setCustomOpen(true))}
      </View>
      {customOpen && (
        <View style={styles.custom}>
          <TextInput
            value={draft}
            onChangeText={(t) => {
              setDraft(t);
              commit(t);
            }}
            placeholder="e.g. 14.5"
            placeholderTextColor={theme.muted}
            keyboardType="decimal-pad"
            accessibilityLabel="Custom goal in hours"
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          />
          <Text style={{ color: theme.muted, fontSize: 15 }}>hours (up to {MAX_HOURS})</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipText: { fontSize: 15, fontWeight: '600' },
  custom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, width: 100 },
});
