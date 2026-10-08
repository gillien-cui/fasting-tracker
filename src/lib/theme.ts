import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

export type PaletteName = 'glow' | 'catppuccin' | 'nord' | 'dracula';
export type Appearance = 'dark' | 'light' | 'system';

export type Theme = {
  dark: boolean;
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  track: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  /** Met goals: "Met" labels, chart bars at or over the goal. */
  good: string;
  /** Met days on the calendar, chart bars under the goal. */
  goodSoft: string;
  danger: string;
  dangerSoft: string;
  /** The progress ring runs from ringStart to ringEnd. */
  ringStart: string;
  ringEnd: string;
};

type Colors = Omit<Theme, 'dark'>;

/**
 * Glow follows the app icon. The others are popular editor themes: Catppuccin (Mocha / Latte),
 * Nord (Polar Night / Snow Storm) and Dracula (Dracula / Alucard), with their published colors.
 */
const PALETTES_BY_NAME: Record<PaletteName, { label: string; dark: Colors; light: Colors }> = {
  glow: {
    label: 'Glow',
    dark: {
      background: '#14110F',
      card: '#1F1B18',
      text: '#F5EFEA',
      muted: '#A8A09A',
      border: '#2E2824',
      track: '#2E2824',
      accent: '#FF8A5B',
      accentSoft: '#3A2419',
      accentText: '#1A0C05',
      good: '#FFB547',
      goodSoft: '#6B4A12',
      danger: '#FF6B6B',
      dangerSoft: '#5A2424',
      ringStart: '#FFC94A',
      ringEnd: '#FF5E62',
    },
    light: {
      background: '#FFF8F3',
      card: '#FFFFFF',
      text: '#2B1D16',
      muted: '#7A6A60',
      border: '#F0E2D8',
      track: '#F0E2D8',
      accent: '#E8553A',
      accentSoft: '#FFE9DC',
      accentText: '#FFFFFF',
      good: '#D46B08',
      goodSoft: '#FFD27A',
      danger: '#C53030',
      dangerSoft: '#F6C9C9',
      ringStart: '#FFC94A',
      ringEnd: '#E53950',
    },
  },
  catppuccin: {
    label: 'Catppuccin',
    dark: {
      background: '#11111B',
      card: '#1E1E2E',
      text: '#CDD6F4',
      muted: '#A6ADC8',
      border: '#313244',
      track: '#313244',
      accent: '#CBA6F7',
      accentSoft: '#3B2F55',
      accentText: '#11111B',
      good: '#A6E3A1',
      goodSoft: '#3E5A3E',
      danger: '#F38BA8',
      dangerSoft: '#5A2E3C',
      ringStart: '#89B4FA',
      ringEnd: '#CBA6F7',
    },
    light: {
      background: '#E6E9EF',
      card: '#EFF1F5',
      text: '#4C4F69',
      muted: '#6C6F85',
      border: '#CCD0DA',
      track: '#CCD0DA',
      accent: '#8839EF',
      accentSoft: '#E4D7FB',
      accentText: '#FFFFFF',
      good: '#40A02B',
      goodSoft: '#B8DFA9',
      danger: '#D20F39',
      dangerSoft: '#F5C2CB',
      ringStart: '#1E66F5',
      ringEnd: '#8839EF',
    },
  },
  nord: {
    label: 'Nord',
    dark: {
      background: '#2E3440',
      card: '#3B4252',
      text: '#ECEFF4',
      muted: '#AEB7C6',
      border: '#434C5E',
      track: '#434C5E',
      accent: '#88C0D0',
      accentSoft: '#3A4F5C',
      accentText: '#2E3440',
      good: '#A3BE8C',
      goodSoft: '#4F5F45',
      danger: '#BF616A',
      dangerSoft: '#5B3A40',
      ringStart: '#8FBCBB',
      ringEnd: '#5E81AC',
    },
    light: {
      background: '#ECEFF4',
      card: '#FFFFFF',
      text: '#2E3440',
      muted: '#4C566A',
      border: '#D8DEE9',
      track: '#D8DEE9',
      accent: '#5E81AC',
      accentSoft: '#DCE6F0',
      accentText: '#FFFFFF',
      good: '#5F7F48',
      goodSoft: '#C9DBB8',
      danger: '#BF616A',
      dangerSoft: '#EFCDD0',
      ringStart: '#88C0D0',
      ringEnd: '#5E81AC',
    },
  },
  dracula: {
    label: 'Dracula',
    dark: {
      background: '#21222C',
      card: '#282A36',
      text: '#F8F8F2',
      muted: '#9AA0BF',
      border: '#44475A',
      track: '#44475A',
      accent: '#BD93F9',
      accentSoft: '#3D3557',
      accentText: '#21222C',
      good: '#50FA7B',
      goodSoft: '#2F5E3D',
      danger: '#FF5555',
      dangerSoft: '#5E2A2E',
      ringStart: '#FF79C6',
      ringEnd: '#BD93F9',
    },
    light: {
      background: '#FFFBEB',
      card: '#FFFFFF',
      text: '#1F1F1F',
      muted: '#6C664B',
      border: '#E8E2CF',
      track: '#E8E2CF',
      accent: '#644AC9',
      accentSoft: '#E6E0F8',
      accentText: '#FFFFFF',
      good: '#14710A',
      goodSoft: '#BFE3B4',
      danger: '#CB3A2A',
      dangerSoft: '#F4CBC4',
      ringStart: '#A3144D',
      ringEnd: '#644AC9',
    },
  },
};

export const PALETTES = (Object.keys(PALETTES_BY_NAME) as PaletteName[]).map((name) => ({
  name,
  label: PALETTES_BY_NAME[name].label,
  swatch: PALETTES_BY_NAME[name].dark,
}));

/** The palette and appearance chosen in Settings; the store provides them. */
export const ThemeChoiceContext = createContext<{ palette: PaletteName; appearance: Appearance }>({
  palette: 'glow',
  appearance: 'dark',
});

export function useTheme(): Theme {
  const { palette, appearance } = useContext(ThemeChoiceContext);
  const system = useColorScheme();
  const dark = appearance === 'system' ? system !== 'light' : appearance === 'dark';
  const colors = (PALETTES_BY_NAME[palette] ?? PALETTES_BY_NAME.glow)[dark ? 'dark' : 'light'];
  return { dark, ...colors };
}
