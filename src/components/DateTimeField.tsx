import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { formatDayTime } from '../lib/fasts';
import { useTheme } from '../lib/theme';

export type DateTimeFieldProps = {
  value: Date;
  onChange: (date: Date) => void;
  clock24: boolean;
  maximumDate?: Date;
  label: string;
};

/** A date and time, edited with the platform picker (date first, then time on Android). */
export function DateTimeField({ value, onChange, clock24, maximumDate, label }: DateTimeFieldProps) {
  const theme = useTheme();

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="datetime"
        display="compact"
        maximumDate={maximumDate}
        accessibilityLabel={label}
        onChange={(_, date) => date && onChange(date)}
      />
    );
  }

  const open = () =>
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      maximumDate,
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          is24Hour: clock24,
          onChange: (timeEvent, time) => {
            if (timeEvent.type !== 'set' || !time) return;
            onChange(maximumDate && time > maximumDate ? maximumDate : time);
          },
        });
      },
    });

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${formatDayTime(value, clock24)}`}
      style={[styles.field, { borderColor: theme.border, backgroundColor: theme.card }]}
    >
      <Text style={[styles.text, { color: theme.text }]}>{formatDayTime(value, clock24)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignSelf: 'flex-start' },
  text: { fontSize: 16 },
});
