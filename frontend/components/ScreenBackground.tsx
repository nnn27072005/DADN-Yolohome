import React from "react";
import {
  ImageBackground,
  StyleSheet,
  View,
  ViewStyle,
  StatusBar,
} from "react-native";
import { BlurView } from "expo-blur";

interface ScreenBackgroundProps {
  children: React.ReactNode;
  variant?: "main" | "tech";
  style?: ViewStyle;
  blur?: number;
  overlayOpacity?: number;
}

const backgrounds = {
  main: require("@/assets/images/main-background.png"),
  tech: require("@/assets/images/tech-background.png"),
};

export default function ScreenBackground({
  children,
  variant = "main",
  style,
  blur = 0,
  overlayOpacity = 0.3,
}: ScreenBackgroundProps) {
  return (
    <ImageBackground
      source={backgrounds[variant]}
      style={[styles.background, style]}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]}>
        {blur > 0 && (
          <BlurView intensity={blur} style={StyleSheet.absoluteFill} tint="dark" />
        )}
        {children}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    width: "100%",
  },
});
