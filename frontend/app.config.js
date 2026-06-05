import "dotenv/config";

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.API_URL ||
  "https://nhunng.ngrok.app/api";
const websocketUrl =
  process.env.EXPO_PUBLIC_WEBSOCKET_URL ||
  process.env.WEBSOCKET_URL ||
  "wss://nhunng.ngrok.app";

export default {
  expo: {
    name: "yolohome",
    slug: "yolohome",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: false,
    updates: {
      url: "https://u.expo.dev/5a3bd133-94ec-45fd-80a3-23dff71d5ade",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-updates",
      [
        "expo-camera",
        {
          cameraPermission:
            "Yolohome cần dùng camera để xác thực khuôn mặt khi mở cửa.",
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "5a3bd133-94ec-45fd-80a3-23dff71d5ade",
      },
      apiUrl,
      websocketUrl,
    },
  },
};
