import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

export type PaletteName = 'glow' | 'green' | 'ocean' | 'berry';

const lightBase = {
  background: '#F7F7F5',
  card: '#FFFFFF',
  text: '#1C1C1E',
  muted: '#6B6B70',
  border: '#E3E3E0',
  danger: '#C53030',
  dangerSoft: '#F6C9C9',
  track: '#E3E3E0',
};

const darkBase: typeof lightBase = {
  background: '#111113',
  card: '#1C1C1F',
  text: '#F2F2F3',
  muted: '#9B9BA1',
  border: '#2C2C30',
  danger: '#FC8181',
  dangerSoft: '#5A2626',
  track: '#2C2C30',
};

type Accent = {
  accent: string;
  accentSoft: string;
  accentText: string;
  /** Met goals: "Met" labels, chart bars at or over the goal. */
  good: string;
  /** Met days on the calendar, chart bars under the goal. */
  goodSoft: string;
  /** The progress ring runs from ringStart to ringEnd. */
  ringStart: string;
  ringEnd: string;
};

/** Accent colors per palette, light then dark. Glow follows the app icon. */
const ACCENTS: Record<PaletteName, { label: string; light: Accent; dark: Accent }> = {
  glow: {
    label: 'Glow',
    light: {
      accent: '#E8553A',
      accentSoft: '#FFE9DC',
      accentText: '#FFFFFF',
      good: '#D46B08',
      goodSoft: '#FFD27A',
      ringStart: '#FFC94A',
      ringEnd: '#E53950',
    },
    dark: {
      accent: '#FF7A3D',
      accentSoft: '#45251A',
      accentText: '#2A0E04',
      good: '#FFB547',
      goodSoft: '#7A5512',
      ringStart: '#FFC94A',
      ringEnd: '#FF5A6E',
    },
  },
  green: {
    label: 'Green',
    light: {
      accent: '#2F855A',
      accentSoft: '#DCEFE3',
      accentText: '#FFFFFF',
      good: '#2F855A',
      goodSoft: '#9AD3AE',
      ringStart: '#2F855A',
      ringEnd: '#2F855A',
    },
    dark: {
      accent: '#48BB78',
      accentSoft: '#1B3626',
      accentText: '#0B1F14',
      good: '#48BB78',
      goodSoft: '#276749',
      ringStart: '#48BB78',
      ringEnd: '#48BB78',
    },
  },
  ocean: {
    label: 'Ocean',
    light: {
      accent: '#2B6CB0',
      accentSoft: '#DCEAF7',
      accentText: '#FFFFFF',
      good: '#2B6CB0',
      goodSoft: '#9CC3EA',
      ringStart: '#4FD1C5',
      ringEnd: '#2B6CB0',
    },
    dark: {
      accent: '#63B3ED',
      accentSoft: '#1A3550',
      accentText: '#0A1A2A',
      good: '#63B3ED',
      goodSoft: '#2A4E73',
      ringStart: '#4FD1C5',
      ringEnd: '#63B3ED',
    },
  },
  berry: {
    label: 'Berry',
    light: {
      accent: '#805AD5',
      accentSoft: '#EDE4FB',
      accentText: '#FFFFFF',
      good: '#805AD5',
      goodSoft: '#C7B3F0',
      ringStart: '#ED64A6',
      ringEnd: '#805AD5',
    },
    dark: {
      accent: '#B794F4',
      accentSoft: '#33264F',
      accentText: '#1A1030',
      good: '#B794F4',
      goodSoft: '#4E3A78',
      ringStart: '#F687B3',
      ringEnd: '#B794F4',
    },
  },
};

export const PALETTES = (Object.keys(ACCENTS) as PaletteName[]).map((name) => ({
  name,
  label: ACCENTS[name].label,
  swatch: ACCENTS[name].light,
}));

export type Theme = typeof lightBase & Accent;

/** The palette chosen in Settings; the store provides it. */
export const PaletteContext = createContext<PaletteName>('glow');

export function useTheme(): Theme {
  const palette = ACCENTS[useContext(PaletteContext)] ?? ACCENTS.glow;
  return useColorScheme() === 'dark' ? { ...darkBase, ...palette.dark } : { ...lightBase, ...palette.light };
}
