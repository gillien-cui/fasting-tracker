import { useColorScheme } from 'react-native';

const light = {
  background: '#F7F7F5',
  card: '#FFFFFF',
  text: '#1C1C1E',
  muted: '#6B6B70',
  border: '#E3E3E0',
  accent: '#2F855A',
  accentSoft: '#DCEFE3',
  accentText: '#FFFFFF',
  good: '#2F855A',
  goodSoft: '#9AD3AE',
  danger: '#C53030',
  track: '#E3E3E0',
};

const dark: typeof light = {
  background: '#111113',
  card: '#1C1C1F',
  text: '#F2F2F3',
  muted: '#9B9BA1',
  border: '#2C2C30',
  accent: '#48BB78',
  accentSoft: '#1B3626',
  accentText: '#0B1F14',
  good: '#48BB78',
  goodSoft: '#276749',
  danger: '#FC8181',
  track: '#2C2C30',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
