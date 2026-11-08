import { Pressable } from "react-native";

import { useSession } from "../session";
import { Icon } from "./Icon";
import { useColors } from "./ui";

/** Alterna entre o modo claro e o escuro, inclusive para visitantes. */
export function ThemeToggle() {
  const colors = useColors();
  const { isDark, setDarkTheme } = useSession();
  return (
    <Pressable
      onPress={() => void setDarkTheme(!isDark).catch(() => undefined)}
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Usar tema claro" : "Usar tema escuro"}
      style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.panel, borderColor: colors.line }}
    >
      <Icon name={isDark ? "sun" : "moon"} size={20} color={colors.text} />
    </Pressable>
  );
}
