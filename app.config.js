export default {
  expo: {
    name: "nasara",
    slug: "nasara",
    version: "1.0.0",

    scheme: "nasara",

    platforms: ["ios", "android", "web"],

    plugins: ["expo-router", "expo-video"],

    // ✅ FIX ICON PATHS
    icon: "./assets/images/icon.png",

    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },

    android: {
      package: "com.nastipa.nasara",

      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },

      permissions: ["CAMERA", "RECORD_AUDIO"],
    },

    ios: {
      bundleIdentifier: "com.nastipa.nasara",

      infoPlist: {
        NSCameraUsageDescription:
          "Nasara needs camera access for live selling broadcasts.",
        NSMicrophoneUsageDescription:
          "Nasara needs microphone access for live selling broadcasts.",
      },
    },

    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

      eas: {
        projectId: "633ed251-5676-4382-83d6-34b631bc416b",
      },
    },
  },
};