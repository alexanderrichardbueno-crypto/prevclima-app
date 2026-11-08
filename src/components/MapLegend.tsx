import { StyleSheet, Text, View } from "react-native";

import { useColors } from "./ui";

// Mesmas cores da legenda do site.
const ITEMS: [string, string][] = [
  ["Previsão", "#ff7a00"],
  ["Perigo potencial", "#FFFE00"],
  ["Perigo", "#F96602"],
  ["Grande perigo", "#e3001b"],
];

export function MapLegend({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.row, compact && { gap: 8 }]} accessibilityLabel="Legenda do mapa">
      {ITEMS.map(([label, color]) => (
        <View key={label} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={{ color: colors.muted, fontSize: compact ? 11 : 12 }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  item: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: "#0003" },
});
