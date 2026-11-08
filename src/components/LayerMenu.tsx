import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { Icon } from "./Icon";
import { useColors } from "./ui";

export type MapLayers = { prev: boolean; alerta: boolean; inmHoje: boolean; inmFut: boolean };

export const ALL_LAYERS: MapLayers = { prev: true, alerta: true, inmHoje: true, inmFut: true };

// Mesmas opções do painel "Mostrar" da central (site.tpl.html).
const OPTIONS: { key: keyof MapLayers; label: string }[] = [
  { key: "prev", label: "Previsão de tempo severo" },
  { key: "alerta", label: "Alertas de tempo severo" },
  { key: "inmHoje", label: "Avisos do INMET vigentes hoje" },
  { key: "inmFut", label: "Avisos do INMET para os próximos dias" },
];

export function LayerMenu({ value, onChange, round = false }: { value: MapLayers; onChange: (value: MapLayers) => void; round?: boolean }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8, alignItems: "flex-start" }}>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel="Mostrar ou ocultar camadas do mapa"
        accessibilityState={{ expanded: open }}
        style={[round ? styles.round : styles.button, { backgroundColor: colors.panel, borderColor: open ? colors.accent : colors.line }]}
      >
        <Icon name="layers" size={round ? 20 : 16} color={colors.text} />
        {!round && <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>Mostrar</Text>}
      </Pressable>
      {open && (
        <View style={[styles.panel, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          {OPTIONS.map(({ key, label }) => (
            <View key={key} style={styles.row}>
              <Text style={{ color: colors.text, flex: 1, fontSize: 13 }}>{label}</Text>
              <Switch
                value={value[key]}
                onValueChange={(checked) => onChange({ ...value, [key]: checked })}
                trackColor={{ true: colors.button, false: colors.line }}
                thumbColor="#fff"
                accessibilityLabel={label}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 36, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  panel: { width: 270, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 46 },
});
