export default {
  expo: {
    name: "nasara",
    slug: "nasara",
    version: "1.0.0",

    scheme: "nasara",

    platforms: ["ios", "android", "web"],

    // ✅ App Icon (FIXED PATH)
    icon: "./assets/images/icon.png",

    // ✅ Splash Screen (FIXED PATH)
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },

    plugins: ["expo-router", "expo-video"],

    // ✅ Android Config + Permissions + Adaptive Icon
    android: {
      package: "com.nastipa.nasara",

      permissions: ["CAMERA", "RECORD_AUDIO"],

      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },

    // ✅ iOS Config + Permissions
    ios: {
      bundleIdentifier: "com.nastipa.nasara",

      infoPlist: {
        NSCameraUsageDescription:
          "Nasara needs camera access for live selling broadcasts.",
        NSMicrophoneUsageDescription:
          "Nasara needs microphone access for live selling broadcasts.",
      },
    },

    // ✅ Extra ENV + EAS Project ID
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

      eas: {
        projectId: "633ed251-5676-4382-83d6-34b631bc416b",
      },
    },
  },
};