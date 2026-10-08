import { DEFAULT_GOAL_MINUTES, type WeekStart } from './fasts';
import type { PaletteName } from './theme';

export type Settings = {
  defaultGoalMinutes: number;
  weekStartsOn: WeekStart;
  clock24: boolean;
  goalNotification: boolean;
  forgottenReminder: boolean;
  theme: PaletteName;
  /** The goal line on the History chart; null follows the default goal. */
  chartGoalMinutes: number | null;
};

export const DEFAULT_SETTINGS: Settings = {
  defaultGoalMinutes: DEFAULT_GOAL_MINUTES,
  weekStartsOn: 1,
  clock24: true,
  goalNotification: true,
  forgottenReminder: true,
  theme: 'glow',
  chartGoalMinutes: null,
};
