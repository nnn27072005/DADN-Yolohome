import { Platform } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

const withOpacity = (color: string, opacity: number) => {
  const shortHex = /^#([0-9a-f]{3})$/i.exec(color);
  const hex = /^#([0-9a-f]{6})$/i.exec(color);

  if (shortHex) {
    const [r, g, b] = shortHex[1].split("").map((value) => parseInt(value + value, 16));
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  if (hex) {
    const value = hex[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  return color;
};

export const shadowStyle = (
  color: string,
  offsetX: number,
  offsetY: number,
  opacity: number,
  radius: number,
  elevation = 0
): ViewStyle =>
  Platform.select({
    web: {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${withOpacity(color, opacity)}`,
    },
    ios: {
      shadowColor: color,
      shadowOffset: { width: offsetX, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: offsetX, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  }) as ViewStyle;

export const textShadowStyle = (
  color: string,
  offsetX: number,
  offsetY: number,
  radius: number
): TextStyle =>
  Platform.select({
    web: {
      textShadow: `${offsetX}px ${offsetY}px ${radius}px ${color}`,
    },
    default: {
      textShadowColor: color,
      textShadowOffset: { width: offsetX, height: offsetY },
      textShadowRadius: radius,
    },
  }) as TextStyle;
