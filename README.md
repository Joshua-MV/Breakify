# Breakify

Breakify is a Chrome MV3 extension for people who can start work, but need help getting back to it after a break.

Set a break timer, choose the tabs you are using for the break, and Breakify helps you return to your saved work context when time is up. It can warn you before the break ends, close or ask about break tabs, restore work tabs, and track your consistency over time.

## Features

- Custom break timers with hours, minutes, and seconds.
- Soft reminder timer before the break ends.
- Break tab picker using currently open tabs.
- Return tab picker for the tabs you want to come back to after the break.
- Start, end early, extend, and complete break flows.
- Pomodoro-style methods, including Pomodoro, 52/17, Ultradian, and Custom.
- Preset settings for close behavior, theme, schedule method, and warning time.
- History dashboard with daily and weekly consistency stats.
- Light and dark mode.
- Chrome notifications and reminder window support.

## Tech Stack

- Chrome Extension Manifest V3
- React
- TypeScript
- Vite
- Vitest
- Local Chrome storage

## Project Structure

```text
src/
  background/   MV3 service worker and break lifecycle orchestration
  chrome/       Chrome API adapters for tabs, storage, alarms, notifications, windows
  components/   Shared React UI components
  core/         Pure business logic with no Chrome APIs
  options/      History dashboard page
  popup/        Main popup timer and tab selection UI
  reminder/     Break reminder and extend-break UI
  settings/     Preset settings page
  shared/       Shared types, constants, and message contracts
  tests/        Core and mocked Chrome adapter tests
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development build:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run tests:

```bash
npm run test
```

## Load In Chrome

1. Run `npm run build`.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the `dist` folder.
6. Pin Breakify from the extensions menu.

After every new build, reload the extension from `chrome://extensions`.

## Main Workflows

### Starting A Break

1. Open the popup.
2. Set the break length.
3. Choose a method if you want a preset.
4. Set the soft warning time.
5. Add break tabs.
6. Optionally add return tabs.
7. Start the timer.

### Ending A Break

When the timer ends, Breakify can either close break tabs automatically or ask first, depending on the user setting. It then restores or focuses the saved work tabs.

### Settings

The settings page lets users preset:

- Theme
- Break-end behavior
- Default method
- Default break length
- Soft warning length

## Development Notes

Core feature logic should stay in `src/core`. Chrome-specific code should stay behind adapters in `src/chrome`. React components should call typed services/messages rather than hiding business logic directly in UI components.

Useful commands:

```bash
npm run build
npm run test
```

## License

See [LICENSE](./LICENSE).
