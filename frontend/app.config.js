import "dotenv/config";

export default {
  expo: {
    name: "yolohome",
    slug: "yolohome",
    version: "1.0.0",
    updates: {
      url: "https://u.expo.dev/5a3bd133-94ec-45fd-80a3-23dff71d5ade",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      apiUrl: process.env.API_URL,
      websocketUrl: process.env.WEBSOCKET_URL,
      eas: {
        projectId: "5a3bd133-94ec-45fd-80a3-23dff71d5ade",
      },
    },
    plugins: [
      "expo-secure-store",
      "@react-native-community/datetimepicker",
      "expo-font",
      "expo-router",
      "expo-web-browser",
    ],
  },
};
