export default {
  expo: {
    name: "nasara",
    slug: "nasara",
    version: "1.0.0",

    scheme: "nasara",

    platforms: ["ios", "android", "web"],

    plugins: ["expo-router", "expo-video"],

    web: {
      bundler: "metro",
    },

    android: {
      package: "com.nasara.app", // ✅ REQUIRED
    },

    ios: {
      bundleIdentifier: "com.nasara.app", // ✅ REQUIRED
    },

    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};