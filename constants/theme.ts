/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#2563eb";
const tintColorDark = "#93c5fd";

export const Colors = {
  light: {
    text: "#0f172a",
    background: "#eff6ff",
    tint: tintColorLight,
    icon: "#64748b",
    tabIconDefault: "#94a3b8",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#f8fafc",
    background: "#172554",
    tint: tintColorDark,
    icon: "#bfdbfe",
    tabIconDefault: "#93c5fd",
    tabIconSelected: "#ffffff",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export enum BLE_DATA_TYPE {
  EVENT = "event",
  DATA = "data",
}

export enum BLE_EVENT_TYPE {
  SETTING_TIME = "SETTING_TIME",
  SETTING_ALARM_TIME = "SETTING_ALARM_TIME",
}

export const DISCLAIMER_KEY = "disclaimer_agreed";
