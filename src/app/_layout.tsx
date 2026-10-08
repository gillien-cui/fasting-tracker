import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { DATABASE_NAME, migrate } from '../lib/db';
import { ACTION_END, ACTION_KEEP_GOING, setUpNotifications, STILL_FASTING_CATEGORY } from '../lib/notifications';
import { StoreProvider } from '../lib/store';
import { useTheme } from '../lib/theme';

setUpNotifications().catch((err) => console.warn('Could not set up notifications', err));

/** Routes taps on the "Still fasting?" reminder: End opens the end-time screen, Keep going just dismisses. */
function NotificationResponses() {
  const handled = useRef<string | null>(null);
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response) return;
    const { identifier, content } = response.notification.request;
    const key = `${identifier}:${response.actionIdentifier}`;
    if (handled.current === key) return;
    handled.current = key;
    if (content.categoryIdentifier !== STILL_FASTING_CATEGORY && content.data?.kind !== 'still-fasting') return;

    Notifications.dismissNotificationAsync(identifier).catch(() => {});
    if (response.actionIdentifier === ACTION_KEEP_GOING) return;
    if (
      response.actionIdentifier === ACTION_END ||
      response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      router.push({ pathname: '/end-fast', params: { fromReminder: '1' } });
    }
  }, [response]);

  return null;
}

/** The navigation stack, colored by the theme chosen in Settings. */
function AppStack() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {Platform.OS !== 'web' && <NotificationResponses />}
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="fast/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="end-fast" options={{ presentation: 'modal', title: 'End fast' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
      <StoreProvider>
        <AppStack />
      </StoreProvider>
    </SQLiteProvider>
  );
}
