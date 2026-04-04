import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#18792a",
        tabBarIcon: ({ color, size }) => {
          let iconName: any = "home-outline";

          if (route.name === "browse") iconName = "home-outline";
          else if (route.name === "sell") iconName = "add-circle-outline";
          else if (route.name === "chat") iconName = "chatbubble-ellipses-outline";
          else if (route.name === "profile") iconName = "settings-outline";
          else if (route.name === "reels") iconName = "play-circle-outline";
      

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="browse" options={{ title: "Browse" }} />
      <Tabs.Screen name="sell" options={{ title: "Sell" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="reels" options={{ title: "Reels" }} />


    </Tabs>
  );
}