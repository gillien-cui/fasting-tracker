import { subHours } from 'date-fns';
import { randomUUID } from 'expo-crypto';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimeField } from '../../components/DateTimeField';
import { GoalPicker } from '../../components/GoalPicker';
import { confirm } from '../../lib/confirm';
import { formatDuration, type Fast } from '../../lib/fasts';
import { useStore } from '../../lib/store';
import { useTheme } from '../../lib/theme';

/** Edit a past fast, or add one by hand when the id is "new". */
export default function EditFastScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fasts, settings, saveFast, deleteFast } = useStore();
  const existing = id === 'new' ? undefined : fasts.find((f) => f.id === id && f.status === 'completed');

  const [end, setEnd] = useState(() => (existing ? new Date(existing.endedAt!) : new Date()));
  const [start, setStart] = useState(() =>
    existing ? new Date(existing.startedAt) : subHours(new Date(), settings.defaultGoalMinutes / 60),
  );
  const [goalMinutes, setGoalMinutes] = useState(existing?.goalMinutes ?? settings.defaultGoalMinutes);
  const [note, setNote] = useState(existing?.note ?? '');

  if (id !== 'new' && !existing) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Fast' }} />
        <Text style={{ color: theme.muted, fontSize: 16 }}>This fast no longer exists.</Text>
      </View>
    );
  }

  const minutes = (end.getTime() - start.getTime()) / 60000;
  const error =
    end <= start ? 'The end has to be after the start.' : end > new Date() ? "The end can't be in the future." : null;

  const onSave = async () => {
    if (error) return;
    const fast: Fast = {
      id: existing?.id ?? randomUUID(),
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      goalMinutes,
      note: note.trim() || null,
      status: 'completed',
    };
    await saveFast(fast);
    router.back();
  };

  const onDelete = async () => {
    if (!existing) return;
    if (await confirm('Delete this fast?', 'This removes it from your history.', 'Delete', true)) {
      await deleteFast(existing.id);
      router.back();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: existing ? 'Edit fast' : 'Add past fast' }} />

      <Text style={[styles.label, { color: theme.muted }]}>Started</Text>
      <DateTimeField
        label="Start"
        value={start}
        onChange={setStart}
        clock24={settings.clock24}
        maximumDate={new Date()}
      />

      <Text style={[styles.label, { color: theme.muted }]}>Ended</Text>
      <DateTimeField label="End" value={end} onChange={setEnd} clock24={settings.clock24} maximumDate={new Date()} />

      <Text style={[styles.summary, { color: error ? theme.danger : theme.text }]}>
        {error ?? `Duration ${formatDuration(minutes)}`}
      </Text>

      <Text style={[styles.label, { color: theme.muted }]}>Goal</Text>
      <GoalPicker value={goalMinutes} onChange={setGoalMinutes} />

      <Text style={[styles.label, { color: theme.muted }]}>Note</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Optional"
        placeholderTextColor={theme.muted}
        multiline
        style={[styles.note, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
      />

      <Pressable
        onPress={onSave}
        disabled={!!error}
        accessibilityRole="button"
        style={[styles.primary, { backgroundColor: theme.accent, opacity: error ? 0.4 : 1 }]}
      >
        <Text style={[styles.primaryText, { color: theme.accentText }]}>Save</Text>
      </Pressable>
      {existing && (
        <Pressable onPress={onDelete} accessibilityRole="button" style={styles.secondary}>
          <Text style={[styles.secondaryText, { color: theme.danger }]}>Delete fast</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },
  summary: { fontSize: 15, fontWeight: '500', marginTop: 4 },
  note: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, minHeight: 70, textAlignVertical: 'top' },
  primary: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  primaryText: { fontSize: 18, fontWeight: '700' },
  secondary: { alignItems: 'center', paddingVertical: 10 },
  secondaryText: { fontSize: 16, fontWeight: '600' },
});
