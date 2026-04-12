import "dotenv/config";

export default {
  expo: {
    name: "yolohome",
    slug: "yolohome",
    version: "1.0.0",
    extra: {
      apiUrl: process.env.API_URL,
      websocketUrl: process.env.WEBSOCKET_URL,
    },
    plugins: ["expo-secure-store"],
  },
};
