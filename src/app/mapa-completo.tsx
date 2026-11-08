import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/Icon";
import { ALL_LAYERS, LayerMenu } from "@/components/LayerMenu";
import { MapLegend } from "@/components/MapLegend";
import { useColors } from "@/components/ui";
import { WeatherMap, type WeatherMapHandle } from "@/components/WeatherMap";
import { useMapData } from "@/useMapData";

function RoundButton({ icon, label, onPress, active = true }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.round, { backgroundColor: colors.panel, borderColor: active ? colors.accent : colors.line, opacity: pressed ? 0.8 : 1 }]}
    >
      <Icon name={icon} size={20} color={active ? colors.text : colors.muted} />
    </Pressable>
  );
}

/** Tela só com o mapa, ocupando todo o espaço; os controles flutuam sobre ele. */
export default function FullMapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const mapRef = useRef<WeatherMapHandle>(null);
  const { data, error, recenterKey, refresh } = useMapData(typeof q === "string" ? q : "");
  const [layers, setLayers] = useState(ALL_LAYERS);
  const [legend, setLegend] = useState(true);

  return (
    <View style={{ flex: 1, backgroundColor: colors.mapSea }}>
      <WeatherMap ref={mapRef} data={data} layers={layers} recenterKey={recenterKey} />

      <View style={[styles.top, { top: insets.top + 10 }]} pointerEvents="box-none">
        <RoundButton icon="back" label="Voltar" onPress={() => (router.canGoBack() ? router.back() : router.replace("/mapa"))} />
        <View style={{ flex: 1 }} />
        <RoundButton icon="refresh" label="Atualizar" onPress={() => void refresh()} />
        <RoundButton icon="focus" label="Ver todas as áreas" onPress={() => mapRef.current?.fitAll()} />
      </View>

      <View style={[styles.side, { top: insets.top + 66 }]} pointerEvents="box-none">
        <RoundButton icon="info" label="Legenda" active={legend} onPress={() => setLegend((v) => !v)} />
        <LayerMenu value={layers} onChange={setLayers} round />
      </View>

      {(legend || error) && (
        <View style={[styles.legend, { bottom: insets.bottom + 12, backgroundColor: colors.panel, borderColor: colors.line }]}>
          {error ? <Text style={{ color: colors.error, fontSize: 12 }}>{error}</Text> : null}
          {legend && <MapLegend compact />}
          {legend && data ? (
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              {data.alerts.length} aviso(s) · {data.published_areas.length} área(s) do painel
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: "absolute", left: 12, right: 12, flexDirection: "row", gap: 8 },
  side: { position: "absolute", left: 12, gap: 8 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  legend: { position: "absolute", left: 12, right: 64, borderWidth: 1, borderRadius: 12, padding: 10, gap: 6 },
});
