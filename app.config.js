export default {
  expo: {
    name: "nasara",
    slug: "nasara",
    version: "1.0.0",

    scheme: "nasara",

    platforms: ["ios", "android", "web"],

    plugins: ["expo-router", "expo-video"],

    android: {
      package: "com.nastipa.nasara",
    },

    ios: {
      bundleIdentifier: "com.nastipa.nasara",
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