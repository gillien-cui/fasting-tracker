import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_GOAL_HOURS, type Fast } from './fasts';

const KEY = 'fasting-tracker/state/v1';

export type ActiveFast = {
  start: number;
  goalHours: number;
};

export type PersistedState = {
  active: ActiveFast | null;
  history: Fast[];
  goalHours: number;
};

export const EMPTY_STATE: PersistedState = {
  active: null,
  history: [],
  goalHours: DEFAULT_GOAL_HOURS,
};

export async function loadState(): Promise<PersistedState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return EMPTY_STATE;
  try {
    return { ...EMPTY_STATE, ...(JSON.parse(raw) as Partial<PersistedState>) };
  } catch {
    return EMPTY_STATE;
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}
