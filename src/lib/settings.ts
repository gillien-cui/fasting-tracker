import { DEFAULT_GOAL_MINUTES, type WeekStart } from './fasts';
import type { Appearance, PaletteName } from './theme';
import type { WeightUnit } from './weights';

export type Settings = {
  defaultGoalMinutes: number;
  weekStartsOn: WeekStart;
  clock24: boolean;
  goalNotification: boolean;
  forgottenReminder: boolean;
  theme: PaletteName;
  appearance: Appearance;
  /** The goal line on the History chart; null follows the default goal. */
  chartGoalMinutes: number | null;
  /** Weight log on Today and a weight chart on History. Off until turned on. */
  weightTracking: boolean;
  weightUnit: WeightUnit;
  /** The "Track your weight too?" card on History was closed. */
  weightHintDismissed: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  defaultGoalMinutes: DEFAULT_GOAL_MINUTES,
  weekStartsOn: 1,
  clock24: true,
  goalNotification: true,
  forgottenReminder: true,
  theme: 'glow',
  appearance: 'dark',
  chartGoalMinutes: null,
  weightTracking: false,
  weightUnit: 'kg',
  weightHintDismissed: false,
};
