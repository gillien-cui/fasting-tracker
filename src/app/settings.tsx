import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { GoalPicker } from '../components/GoalPicker';
import { exportCsv, pickCsv } from '../lib/backup';
import { confirm, notify } from '../lib/confirm';
import { requestPermission } from '../lib/notifications';
import { useStore } from '../lib/store';
import { useTheme, type Theme } from '../lib/theme';

function Segmented<T extends string | number | boolean>({
  options,
  value,
  onChange,
  theme,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  theme: Theme;
}) {
  return (
    <View style={[styles.segmented, { borderColor: theme.border }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.label}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.segmentText, { color: selected ? theme.accentText : theme.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({
  label,
  children,
  theme,
  last,
  color,
}: {
  label: string;
  children?: ReactNode;
  theme: Theme;
  last?: boolean;
  color?: string;
}) {
  return (
    <View
      style={[styles.row, !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
    >
      <Text style={[styles.rowLabel, { color: color ?? theme.text }]}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, updateSettings, fasts, importFasts, clearAll, active } = useStore();

  const toggleNotification = async (key: 'goalNotification' | 'forgottenReminder', on: boolean) => {
    if (on && !(await requestPermission())) {
      notify('Notifications are off', 'Allow notifications for this app in your phone settings to get reminders.');
    }
    await updateSettings({ [key]: on });
  };

  const onExport = async () => {
    try {
      await exportCsv(fasts);
    } catch (err) {
      notify('Export failed', String(err));
    }
  };

  const onImport = async () => {
    try {
      const result = await pickCsv();
      if (!result) return;
      const count = await importFasts(result.fasts);
      const skipped = result.skipped ? ` ${result.skipped} rows couldn't be read and were skipped.` : '';
      notify(
        'Import finished',
        `Imported ${count} fasts. Fasts already on this phone with the same id were updated.${skipped}`,
      );
    } catch (err) {
      notify('Import failed', err instanceof Error ? err.message : String(err));
    }
  };

  const onClear = async () => {
    const ok = await confirm(
      'Clear all data?',
      'This deletes every fast and resets settings. Export a backup first if you might want them back.',
      'Delete everything',
      true,
    );
    if (ok) await clearAll();
  };

  const card = [styles.card, { backgroundColor: theme.card, borderColor: theme.border }];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.section, { color: theme.muted }]}>Default goal</Text>
      <View style={[card, styles.padded]}>
        <GoalPicker value={settings.defaultGoalMinutes} onChange={(m) => updateSettings({ defaultGoalMinutes: m })} />
      </View>

      <Text style={[styles.section, { color: theme.muted }]}>Display</Text>
      <View style={card}>
        <Row label="Week starts on" theme={theme}>
          <Segmented
            theme={theme}
            value={settings.weekStartsOn}
            onChange={(v) => updateSettings({ weekStartsOn: v })}
            options={[
              { label: 'Mon', value: 1 as const },
              { label: 'Sun', value: 0 as const },
            ]}
          />
        </Row>
        <Row label="Clock" theme={theme} last>
          <Segmented
            theme={theme}
            value={settings.clock24}
            onChange={(v) => updateSettings({ clock24: v })}
            options={[
              { label: '12 h', value: false },
              { label: '24 h', value: true },
            ]}
          />
        </Row>
      </View>

      <Text style={[styles.section, { color: theme.muted }]}>Notifications</Text>
      <View style={card}>
        <Row label="Goal notification" theme={theme}>
          <Switch
            value={settings.goalNotification}
            onValueChange={(v) => toggleNotification('goalNotification', v)}
            trackColor={{ true: theme.accent }}
          />
        </Row>
        <Row label="Forgotten-fast reminder" theme={theme} last>
          <Switch
            value={settings.forgottenReminder}
            onValueChange={(v) => toggleNotification('forgottenReminder', v)}
            trackColor={{ true: theme.accent }}
          />
        </Row>
      </View>
      <Text style={[styles.hint, { color: theme.muted }]}>
        {'The reminder asks "Still fasting?" once a day after a fast runs 24 h past its goal.'}
      </Text>

      <Text style={[styles.section, { color: theme.muted }]}>Data</Text>
      <View style={card}>
        <Pressable onPress={onExport} accessibilityRole="button">
          <Row label="Export history (CSV)" theme={theme}>
            <Text style={{ color: theme.muted }}>{fasts.filter((f) => f.status === 'completed').length} fasts</Text>
          </Row>
        </Pressable>
        <Pressable onPress={onImport} accessibilityRole="button" disabled={!!active}>
          <Row label="Import backup" theme={theme}>
            <Text style={{ color: theme.muted }}>{active ? 'End your fast first' : 'CSV'}</Text>
          </Row>
        </Pressable>
        <Pressable onPress={onClear} accessibilityRole="button">
          <Row label="Clear all data" theme={theme} color={theme.danger} last />
        </Pressable>
      </View>
      <Text style={[styles.hint, { color: theme.muted }]}>Your fasts are stored only on this phone.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
  },
  card: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    minHeight: 50,
  },
  rowLabel: { fontSize: 16, flexShrink: 1 },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 999, overflow: 'hidden' },
  segment: { paddingVertical: 6, paddingHorizontal: 14 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  padded: { paddingVertical: 14 },
  hint: { fontSize: 13, marginTop: 6 },
});
