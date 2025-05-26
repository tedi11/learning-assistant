/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#000',
    background: '#f5f5f5',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    primary: '#2f95dc',
    gray: '#888888',
    lightGray: '#cccccc',
    border: '#e1e1e1',
    error: '#ff3b30',
    success: '#34c759',
    warning: '#ffcc00',
  },
  dark: {
    text: '#fff',
    background: '#1c1c1e',
    tint: tintColorDark,
    tabIconDefault: '#666',
    tabIconSelected: tintColorDark,
    primary: '#0a84ff',
    gray: '#666666',
    lightGray: '#444444',
    border: '#333333',
    error: '#ff453a',
    success: '#32d74b',
    warning: '#ffd60a',
  },
};
