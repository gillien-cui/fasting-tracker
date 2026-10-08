# Fasting Tracker

A simple intermittent fasting tracker for one person. Start a fast in one tap, watch a ring timer fill toward your goal, and end it when you eat. Every fast is kept in a history with a calendar, a streak and averages.

Built with [Expo](https://expo.dev) (React Native, TypeScript). It targets Android first; the same code can later ship to iOS and the web. All data stays on the phone.

| Today | History | Settings |
| --- | --- | --- |
| ![Today](docs/today.png) | ![History](docs/history.png) | ![Settings](docs/settings.png) |

## Features

- **Today:** start a fast with a goal (13, 16, 18, 20, 24 h or custom), live ring timer with percent of goal and when the goal is reached, adjust the start time if you forgot to tap, end or cancel. When idle it shows the time since your last fast.
- **History:** current streak, longest fast, 7 and 30-day averages, a month calendar (filled days met the goal), and fasts grouped by week. Tap a fast to edit its times, goal or note, or delete it. Add a missed fast by hand.
- **Settings** (gear on Today): default goal, week start day, 12/24 h clock, notification toggles, CSV export and import, clear all data.
- **Notifications:** one when the goal is reached, and a daily "Still fasting?" reminder with End and Keep going buttons once a fast runs 24 h past its goal. End lets you set the real end time.

Rules: only one fast runs at a time; a fast belongs to the day it ends on; it meets its goal when its duration is at least the goal; the streak counts consecutive days with a met fast, ending today or yesterday.

## Run it on your Android phone

1. Install [Node.js](https://nodejs.org) (LTS) and the **Expo Go** app from the Play Store.
2. In this folder run:
   ```bash
   npm install
   npm start
   ```
3. Scan the QR code in the terminal with Expo Go.

For a standalone APK you keep on the phone, use an EAS build: `npx eas-cli@latest build -p android --profile preview` (needs a free Expo account).

`npm run web` runs it in a browser. Notifications are phone-only.

## Develop

```bash
npm test           # Jest, including the plan's automatic acceptance tests
npm run typecheck
npm run lint
```

- `src/app/` screens (Expo Router): `(tabs)/index.tsx` Today, `(tabs)/history.tsx`, `settings.tsx`, `fast/[id].tsx` edit/add, `end-fast.tsx`.
- `src/lib/actions.ts` start/end/edit/import rules, `fasts.ts` stats and formatting, `csv.ts` backup format, `db.ts` SQLite (expo-sqlite), `store.tsx` app state, `notifications.ts` scheduling.

CSV backups have the columns `id,started_at,ended_at,goal_minutes,note,status`, with times in UTC ISO format. Importing matches fasts by id, so importing the same file twice doesn't create duplicates.

## Acceptance tests

v1 is done when all 24 cases in the plan pass. The automatic ones (T4–T15, T17–T19 and the data part of T24) live in `src/lib/__tests__/acceptance.test.ts`, named by ID, and run in the America/New_York time zone so daylight saving is covered. Check these by hand on an Android phone:

- **T1** Start a 16 h fast: ring at 0%, start time and goal-reached time shown.
- **T2** Close the app for 2 h and reopen: elapsed time moved on 2 h.
- **T3** Restart the phone mid-fast: still running, correct elapsed time.
- **T16** Several fasts across weeks: grouped by week, newest first, Met/Missed shown.
- **T20** Calendar: met days filled, missed days outlined, today marked.
- **T21** Reach the goal with the app closed: one notification.
- **T22** Leave a fast running 24 h past its goal: "Still fasting?" arrives daily; End opens the end-time screen, Keep going dismisses it.
- **T23** End a fast early, or turn alerts off in Settings: no goal or reminder alerts for it.
- **T24** Export CSV, clear all data, import the file: history and stats look exactly as before.
- Works in airplane mode, and the APK installs and runs.
