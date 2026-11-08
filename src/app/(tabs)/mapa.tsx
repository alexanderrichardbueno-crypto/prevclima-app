import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { MapAlert } from "@/api";
import { Icon } from "@/components/Icon";
import { ALL_LAYERS, LayerMenu } from "@/components/LayerMenu";
import { MapLegend } from "@/components/MapLegend";
import { Body, Button, Card, Empty, Eyebrow, Field, Message, Screen, SourceLink, Title, useColors } from "@/components/ui";
import { WeatherMap, type WeatherMapHandle } from "@/components/WeatherMap";
import { dateTime, feedStatus, relativeTime, severityName, trustedSource } from "@/format";
import { currentPlace } from "@/location";
import { useSession } from "@/session";
import { useMapData } from "@/useMapData";

const ORDER = ["CRITICAL", "HIGH", "MODERATE", "LOW"];

function hasArea(alert: MapAlert) {
  return Boolean(alert.polygon) || (alert.latitude != null && alert.longitude != null && Number(alert.radius_km) > 0);
}

export default function MapScreen() {
  const colors = useColors();
  const { status: session } = useSession();
  const mapRef = useRef<WeatherMapHandle>(null);
  const { data, query, error, setError, status, recenterKey, search, refresh } = useMapData();
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("SP");
  const [busy, setBusy] = useState<"search" | "gps" | "refresh" | null>(null);
  const [layers, setLayers] = useState(ALL_LAYERS);

  const alerts = useMemo(() => [...(data?.alerts ?? [])].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity)), [data]);
  const point = data?.forecast_points[0];

  async function searchCity() {
    if (city.trim().length < 2 || uf.length !== 2) return setError("Informe a cidade e a UF.");
    setBusy("search");
    await search(new URLSearchParams({ city: city.trim(), state: uf }).toString());
    setBusy(null);
  }

  async function useGps() {
    if (session !== "signedIn") return setError("Entre na sua conta para usar o GPS. A busca por cidade é pública.");
    setBusy("gps");
    try {
      const place = await currentPlace();
      const params = new URLSearchParams({ latitude: place.latitude.toFixed(2), longitude: place.longitude.toFixed(2) });
      if (place.city && place.state) {
        params.set("city", place.city);
        params.set("state", place.state);
        setCity(place.city);
        setUf(place.state);
      }
      await search(params.toString());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Eyebrow>EXPLORE SUA REGIÃO</Eyebrow>
        <Title>
          O tempo no mapa<Text style={{ color: colors.gold }}>.</Text>
        </Title>
        <Body muted size={13}>Previsões locais e avisos meteorológicos, com a origem de cada informação.</Body>
      </View>

      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
        <Field label="Cidade" placeholder="Ex.: Mongaguá" value={city} onChangeText={setCity} maxLength={100} returnKeyType="search" onSubmitEditing={searchCity} style={{ flex: 1 }} />
        <Field label="UF" value={uf} onChangeText={(text) => setUf(text.replace(/[^a-z]/gi, "").toUpperCase())} maxLength={2} autoCapitalize="characters" style={{ width: 70 }} />
      </View>
      <Button title="Buscar previsão" onPress={searchCity} busy={busy === "search"} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Minha localização" icon="locate" variant="secondary" compact onPress={useGps} busy={busy === "gps"} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Atualizar"
            icon="refresh"
            variant="secondary"
            compact
            busy={busy === "refresh"}
            onPress={async () => {
              setBusy("refresh");
              await refresh();
              setBusy(null);
            }}
          />
        </View>
      </View>
      <Message text={error} />
      {!error && <Message text={status} kind="info" />}

      <View style={[styles.mapBox, { borderColor: colors.line }]}>
        <WeatherMap ref={mapRef} data={data} layers={layers} recenterKey={recenterKey} />
        <View style={styles.mapButtons}>
          <Pressable onPress={() => mapRef.current?.fitAll()} accessibilityRole="button" style={[styles.mapButton, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>Ver todas as áreas</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: "/mapa-completo", params: { q: query } })}
            accessibilityRole="button"
            accessibilityLabel="Abrir mapa em tela cheia"
            style={[styles.mapButton, { backgroundColor: colors.panel, borderColor: colors.line }]}
          >
            <Icon name="expand" size={16} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.layerMenu} pointerEvents="box-none">
          <LayerMenu value={layers} onChange={setLayers} />
        </View>
      </View>
      <MapLegend />

      <Card>
        <Eyebrow color={colors.muted}>{point ? (point.is_stale ? "ÚLTIMO DADO SALVO" : `PREVISÃO · ${point.source_name.toUpperCase()}`) : "SEM PREVISÃO DISPONÍVEL"}</Eyebrow>
        {point ? (
          <>
            <Title size={20}>
              {point.city}, {point.state}
            </Title>
            <Text style={{ color: colors.text, fontSize: 44, fontWeight: "300" }}>{Math.round(Number(point.temperature_c))}°</Text>
            <Body muted size={13}>
              {point.condition} · Chuva: {point.rain_probability}%
            </Body>
            <Body muted size={12}>Atualizado {relativeTime(point.issued_at)}</Body>
            <SourceLink url={trustedSource(point.source_url)} />
          </>
        ) : (
          <Body muted size={13}>Confira a cidade e a UF ou tente atualizar em instantes. Nenhum valor estimado foi inserido.</Body>
        )}
      </Card>

      <Card>
        <Eyebrow color={colors.muted}>AVISOS OFICIAIS · INMET</Eyebrow>
        <Body muted size={13}>{data ? feedStatus(data.warning_feed) : "Verificando sincronização…"}</Body>
      </Card>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Title size={20}>Avisos no Brasil</Title>
        <Text style={{ color: colors.muted, fontWeight: "700" }}>{data ? alerts.length : "—"}</Text>
      </View>
      <Body muted size={12}>Toque em um aviso para localizar sua área no mapa.</Body>
      {data && !alerts.length && <Empty text="Nenhum aviso disponível. Confira o estado da sincronização acima e consulte a fonte oficial." />}
      {alerts.map((alert) => {
        const area = hasArea(alert);
        const color = colors.severity[alert.severity] ?? colors.muted;
        return (
          <Pressable
            key={alert.id}
            onPress={() => mapRef.current?.focus(alert.id)}
            disabled={!area}
            accessibilityRole="button"
            style={({ pressed }) => [styles.warning, { backgroundColor: colors.panel, borderColor: colors.line, borderLeftColor: color, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={{ color, fontSize: 11, fontWeight: "800" }}>
              {severityName(alert.severity).toUpperCase()} · {alert.source_name.includes("INMET") ? "INMET" : "PREVCLIMA"}
            </Text>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{alert.title}</Text>
            <Body muted size={12}>{alert.area_name}</Body>
            <Body muted size={12}>
              Fonte: {alert.source_name} · até {dateTime(alert.valid_until)}
            </Body>
            {!area && <Body muted size={12}>Área descrita em texto pela fonte, sem delimitação no mapa.</Body>}
            <SourceLink url={trustedSource(alert.source_url)} />
          </Pressable>
        );
      })}
      <Body muted size={12}>Nenhum aviso disponível não significa ausência de risco. Consulte também o INMET.</Body>
      <SourceLink url="https://avisos.inmet.gov.br/" label="avisos.inmet.gov.br ↗" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapBox: { height: 400, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  mapButtons: { position: "absolute", top: 10, right: 10, flexDirection: "row", gap: 8 },
  mapButton: { minHeight: 36, minWidth: 36, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  layerMenu: { position: "absolute", top: 10, left: 10 },
  warning: { borderWidth: 1, borderLeftWidth: 4, borderRadius: 14, padding: 14, gap: 4 },
});
