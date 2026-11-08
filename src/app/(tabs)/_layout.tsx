import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { Icon, type IconName } from "@/components/Icon";
import { useSession } from "@/session";

// Mesmos destinos e ordem da navegação inferior do site (shell.js).
const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Início", icon: "home" },
  { name: "estacoes", title: "Estações", icon: "stations" },
  { name: "mapa", title: "Mapa", icon: "map" },
  { name: "alertas", title: "Alertas", icon: "bell" },
  { name: "perfil", title: "Perfil", icon: "user" },
];

export default function TabLayout() {
  const { status, colors, unreadAlerts } = useSession();
  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
  if (status === "signedOut") return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <Icon name={tab.icon} color={String(color)} />,
            tabBarBadge: tab.name === "alertas" && unreadAlerts > 0 ? unreadAlerts : undefined,
          }}
        />
      ))}
    </Tabs>
  );
}
