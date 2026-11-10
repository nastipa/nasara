export default {
  expo: {
    name: "nasara",
    slug: "nasara",
    version: "1.0.0",

    // 🟢 =====================================================
// 🟢 NASARA OVER-THE-AIR UPDATES
// 🟢 =====================================================

runtimeVersion: {
  policy: "appVersion",
},

updates: {
  url: "https://u.expo.dev/633ed251-5676-4382-83d6-34b631bc416b",
  enabled: true,
  checkAutomatically: "ON_LOAD",
},

    scheme: "nasara",

    platforms: ["ios", "android", "web"],

    /* ===================================================== */
    /* 🟢 APP ICON */
    /* ===================================================== */
    icon: "./assets/images/icon.png",

    /* ===================================================== */
    /* 🟢 SPLASH SCREEN */
    /* ===================================================== */
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },

    /* ===================================================== */
    /* 🟢 WEB (PWA SUPPORT) */
    /* ===================================================== */
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/icon.png",
    },

    /* ===================================================== */
    /* 🟢 PLUGINS */
    /* ===================================================== */
    plugins: [
      "expo-router",
      "expo-video",
      "expo-asset",
      "expo-audio",
      "expo-font",

      /* 🔵 LIVEKIT */
      [
        "@livekit/react-native-expo-plugin",
        {
          android: {
            audioType: "communication",
          },
        },
      ],
     

      /* 🟢 NOTIFICATIONS */
      [
        "expo-notifications",
        {
          sounds: [
            "./assets/sounds/message.mp3",
          ],
          enableBackgroundRemoteNotifications: true,
        },
      ],

      "@react-native-community/datetimepicker",

      /* 🟢 CAMERA */
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow Nasara to access your camera for Reels and live video broadcasting.",

          microphonePermission:
            "Allow Nasara to access your microphone for videos and live broadcasting.",
        },
      ],

      /* 🟢 LOCATION */
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow Nasara to access your location to help locate your service address.",
        },
      ],
    ],

    /* ===================================================== */
    /* 🟢 ANDROID */
    /* ===================================================== */
    android: {
      package: "com.nastipa.nasara",

      permissions: [
        "INTERNET",
        "CAMERA",
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
      ],

      adaptiveIcon: {
        foregroundImage:
          "./assets/images/adaptive-icon.png",

        backgroundColor: "#ffffff",
      },
    },

    /* ===================================================== */
    /* 🟢 IOS */
    /* ===================================================== */
    ios: {
      bundleIdentifier: "com.nastipa.nasara",

      supportsTablet: true,

      infoPlist: {
        NSCameraUsageDescription:
          "Nasara needs camera access for Reels and live video broadcasting.",

        NSMicrophoneUsageDescription:
          "Nasara needs microphone access for Reels, voice notes, voice statuses and live broadcasting.",

        NSPhotoLibraryUsageDescription:
          "Nasara needs access to your gallery to upload videos.",

        NSPhotoLibraryAddUsageDescription:
          "Nasara needs permission to save media.",

        NSLocationWhenInUseUsageDescription:
          "Nasara needs your location to help locate your property for utility services.",

        UIBackgroundModes: [
          "audio",
          "remote-notification",
        ],
      },
    },

    /* ===================================================== */
    /* 🟢 ENV + EAS PROJECT */
    /* ===================================================== */
    extra: {
      supabaseUrl:
        process.env.EXPO_PUBLIC_SUPABASE_URL,

      supabaseAnonKey:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

      eas: {
        projectId:
          "633ed251-5676-4382-83d6-34b631bc416b",
      },
    },
  },
};