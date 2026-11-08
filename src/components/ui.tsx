import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "../session";
import { Icon, type IconName } from "./Icon";

export function useColors() {
  return useSession().colors;
}

/** Tela rolável com margem segura, fundo do tema e "puxar para atualizar". */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  topInset = true,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  topInset?: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 18, paddingTop: (topInset ? insets.top : 0) + 18, paddingBottom: 32, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.button]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const colors = useColors();
  return <Text style={[styles.eyebrow, { color: color ?? colors.accent }]}>{children}</Text>;
}

export function Title({ children, size = 26 }: { children: ReactNode; size?: number }) {
  const colors = useColors();
  return <Text style={{ color: colors.text, fontSize: size, fontWeight: "700", letterSpacing: -0.6, lineHeight: size * 1.2 }}>{children}</Text>;
}

export function Body({ children, muted, size = 14, style }: { children: ReactNode; muted?: boolean; size?: number; style?: object }) {
  const colors = useColors();
  return <Text style={[{ color: muted ? colors.muted : colors.text, fontSize: size, lineHeight: size * 1.5 }, style]}>{children}</Text>;
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.panel, borderColor: colors.line },
        accent ? { borderTopColor: accent, borderTopWidth: 3 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  const colors = useColors();
  return <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  busy = false,
  disabled = false,
  icon,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  busy?: boolean;
  disabled?: boolean;
  icon?: IconName;
  compact?: boolean;
}) {
  const colors = useColors();
  const palette = {
    primary: { bg: colors.button, border: colors.buttonBorder, text: colors.buttonText },
    secondary: { bg: colors.panelSoft, border: colors.line, text: colors.text },
    danger: { bg: "transparent", border: colors.error, text: colors.error },
  }[variant];
  const inactive = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && { minHeight: 42, paddingHorizontal: 14 },
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      {busy ? <ActivityIndicator color={palette.text} /> : icon ? <Icon name={icon} size={18} color={palette.text} /> : null}
      <Text style={{ color: palette.text, fontWeight: "700", fontSize: compact ? 13 : 15 }}>{busy ? "Aguarde..." : title}</Text>
    </Pressable>
  );
}

export function Field({ label, help, style, ...props }: TextInputProps & { label: string; help?: string }) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 6 }, style as object]}>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          styles.input,
          props.multiline && { minHeight: 110, paddingTop: 12, textAlignVertical: "top" },
          { backgroundColor: colors.inset, borderColor: focused ? colors.accent : colors.line, color: colors.text },
        ]}
      />
      {help ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{help}</Text> : null}
    </View>
  );
}

export function Message({ text, kind = "error" }: { text: string; kind?: "error" | "success" | "info" }) {
  const colors = useColors();
  if (!text) return null;
  const color = kind === "error" ? colors.error : kind === "success" ? colors.success : colors.muted;
  return (
    <Text accessibilityLiveRegion="polite" style={{ color, fontSize: 13, lineHeight: 19 }}>
      {text}
    </Text>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        { borderColor: active ? colors.accent : colors.line, backgroundColor: active ? colors.panelSoft : "transparent" },
      ]}
    >
      {color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} /> : null}
      <Text style={{ color: active ? colors.text : colors.muted, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export function SettingRow({ title, subtitle, value, onChange }: { title: string; subtitle: string; value: boolean; onChange: (value: boolean) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderColor: colors.line }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{title}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.button, false: colors.line }} thumbColor="#ffffff" accessibilityLabel={title} />
    </View>
  );
}

export function LinkRow({ title, icon, onPress }: { title: string; icon: IconName; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, { borderColor: colors.line, opacity: pressed ? 0.7 : 1 }]}>
      <Icon name={icon} size={20} color={colors.accent} />
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15, flex: 1 }}>{title}</Text>
      <Icon name="chevron" size={18} color={colors.muted} />
    </Pressable>
  );
}

export function SourceLink({ url, label = "Consultar fonte ↗" }: { url: string | null; label?: string }) {
  const colors = useColors();
  if (!url) return null;
  return (
    <Text accessibilityRole="link" onPress={() => Linking.openURL(url)} style={{ color: colors.accent, fontSize: 13, fontWeight: "700", textDecorationLine: "underline" }}>
      {label}
    </Text>
  );
}

export function Empty({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={[styles.empty, { borderColor: colors.line }]}>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

export function Loading({ text = "Carregando..." }: { text?: string }) {
  const colors = useColors();
  return (
    <View style={{ alignItems: "center", gap: 10, padding: 24 }}>
      <ActivityIndicator color={colors.accent} />
      <Text style={{ color: colors.muted }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 10 },
  button: { minHeight: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 16, padding: 22 },
});
