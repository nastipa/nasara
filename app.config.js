export default {
  expo: {
    name: "nasara",
    slug: "nasara",
    version: "1.0.0",

    scheme: "nasara",

    platforms: ["ios", "android", "web"],

    /* ✅ App Icon */
    icon: "./assets/images/icon.png",

    /* ✅ Splash Screen */
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },

    /* ===================================================== */
    /* ✅ WEB (PWA SUPPORT ADDED 🔥) */
    /* ===================================================== */
    web: {
      bundler: "webpack",
      output: "static",
      favicon: "./assets/images/icon.png"
    },

    /* ===================================================== */
    /* ✅ PLUGINS */
    /* ===================================================== */
    plugins: [
      "expo-router",
      "expo-video",

      [
        "expo-camera",
        {
          cameraPermission: "Allow Nasara to access your camera",
          microphonePermission:
            "Allow Nasara to record audio with videos",
        },
      ],
    ],

    /* ===================================================== */
    /* ✅ ANDROID PERMISSIONS */
    /* ===================================================== */
    android: {
      package: "com.nastipa.nasara",

      permissions: [
        "INTERNET",
        "CAMERA",
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
      ],

      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },

    /* ===================================================== */
    /* ✅ IOS PERMISSIONS */
    /* ===================================================== */
    ios: {
      bundleIdentifier: "com.nastipa.nasara",

      infoPlist: {
        NSCameraUsageDescription:
          "Nasara needs camera access to record reels.",
        NSMicrophoneUsageDescription:
          "Nasara needs microphone access to record audio in reels.",
        NSPhotoLibraryUsageDescription:
          "Nasara needs access to your gallery to upload videos.",
        NSPhotoLibraryAddUsageDescription:
          "Nasara needs permission to save media.",
      },
    },

    /* ===================================================== */
    /* ✅ ENV + EAS PROJECT */
    /* ===================================================== */
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

      eas: {
        projectId: "633ed251-5676-4382-83d6-34b631bc416b",
      },
    },
  },
};