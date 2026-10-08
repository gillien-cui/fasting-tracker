import { format } from 'date-fns';
import { createElement } from 'react';
import { useTheme } from '../lib/theme';
import type { DateTimeFieldProps } from './DateTimeField';

const INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";

/** Web stand-in for the native picker: the browser's own datetime-local input. */
export function DateTimeField({ value, onChange, maximumDate, label }: DateTimeFieldProps) {
  const theme = useTheme();
  return createElement('input', {
    type: 'datetime-local',
    'aria-label': label,
    value: format(value, INPUT_FORMAT),
    max: maximumDate ? format(maximumDate, INPUT_FORMAT) : undefined,
    onChange: (e: { target: { value: string } }) => {
      const date = new Date(e.target.value);
      if (!isNaN(date.getTime())) onChange(date);
    },
    style: {
      fontSize: 16,
      padding: '8px 12px',
      borderRadius: 10,
      border: `1px solid ${theme.border}`,
      background: theme.card,
      color: theme.text,
      alignSelf: 'flex-start',
      fontFamily: 'inherit',
    },
  });
}
