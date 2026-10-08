import { DEFAULT_GOAL_MINUTES, type WeekStart } from './fasts';

export type Settings = {
  defaultGoalMinutes: number;
  weekStartsOn: WeekStart;
  clock24: boolean;
  goalNotification: boolean;
  forgottenReminder: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  defaultGoalMinutes: DEFAULT_GOAL_MINUTES,
  weekStartsOn: 1,
  clock24: false,
  goalNotification: true,
  forgottenReminder: true,
};
