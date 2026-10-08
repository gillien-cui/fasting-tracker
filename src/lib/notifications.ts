import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { formatGoal, goalReachedAt, type Fast } from './fasts';
import type { Settings } from './settings';

export const STILL_FASTING_CATEGORY = 'still-fasting';
export const ACTION_END = 'end';
export const ACTION_KEEP_GOING = 'keep-going';

const CHANNEL_ID = 'fasting';
const DAY_MS = 24 * 60 * 60 * 1000;
/** How many daily "Still fasting?" reminders to queue ahead. */
const REMINDER_DAYS = 14;

const supported = Platform.OS !== 'web';

export async function setUpNotifications(): Promise<void> {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Fasting',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  await Notifications.setNotificationCategoryAsync(STILL_FASTING_CATEGORY, [
    { identifier: ACTION_END, buttonTitle: 'End', options: { opensAppToForeground: true } },
    { identifier: ACTION_KEEP_GOING, buttonTitle: 'Keep going', options: { opensAppToForeground: false } },
  ]);
}

export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Replaces every scheduled notification with the ones the active fast needs:
 * one when the goal is reached, then a "Still fasting?" reminder each day
 * once the fast has run 24 h past its goal.
 */
export async function syncSchedule(active: Fast | null, settings: Settings): Promise<void> {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!active) return;

  const now = Date.now();
  const goalAt = goalReachedAt(active).getTime();

  if (settings.goalNotification && goalAt > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Goal reached 🎉',
        body: `You've fasted ${formatGoal(active.goalMinutes)}. End your fast whenever you're ready.`,
        data: { fastId: active.id, kind: 'goal' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: goalAt, channelId: CHANNEL_ID },
    });
  }

  if (settings.forgottenReminder) {
    for (let day = 1; day <= REMINDER_DAYS; day++) {
      const at = goalAt + day * DAY_MS;
      if (at <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Still fasting?',
          body: `Your fast passed its ${formatGoal(active.goalMinutes)} goal ${day === 1 ? 'a day' : `${day} days`} ago. Tap End to set when you actually ate.`,
          data: { fastId: active.id, kind: 'still-fasting' },
          categoryIdentifier: STILL_FASTING_CATEGORY,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
      });
    }
  }
}
