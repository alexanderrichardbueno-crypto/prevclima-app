import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { request, type Home } from "@/api";
import { Icon } from "@/components/Icon";
import { Brand } from "@/components/Logo";
import { Body, Button, Card, Eyebrow, Field, Message, Screen, Title, useColors } from "@/components/ui";
import { feedStatus, relativeTime, weatherEmoji } from "@/format";
import { currentPlace } from "@/location";
import { useSession } from "@/session";

type Query = { city?: string; state?: string; latitude?: number; longitude?: number };

export default function HomeScreen() {
  const colors = useColors();
  const { user, status, updateUser, setUnreadAlerts } = useSession();
  const [data, setData] = useState<Home | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<Query>({});
  const [modal, setModal] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(
    async (next: Query = query) => {
      const id = ++requestId.current;
      const params = new URLSearchParams();
      if (next.city && next.state) {
        params.set("city", next.city);
        params.set("state", next.state);
      }
      if (next.latitude !== undefined && next.longitude !== undefined) {
        params.set("latitude", String(next.latitude));
        params.set("longitude", String(next.longitude));
      }
      try {
        const result = await request<Home>(`/home${params.size ? `?${params}` : ""}`);
        if (id !== requestId.current) return false;
        setData(result);
        setError("");
        setUnreadAlerts(result.unread_alert_count);
        return true;
      } catch (err) {
        if (id === requestId.current) setError((err as Error).message);
        return false;
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [query, setUnreadAlerts],
  );

  useEffect(() => {
    void Promise.resolve().then(() => load({}));
    // Recarrega quando a pessoa entra ou sai da conta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function refresh() {
    setLoading(true);
    await load();
  }

  const forecast = data?.forecast;
  const first = data?.active_alerts[0];
  const placeName = forecast ? `${forecast.city}, ${forecast.state}` : user?.city && user.state ? `${user.city}, ${user.state}` : "Mongaguá, SP";

  return (
    <Screen onRefresh={refresh} refreshing={loading && Boolean(data)}>
      <Brand size={40} />
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 6 }}>
          <Eyebrow>SEU DIA, COM MAIS INFORMAÇÃO</Eyebrow>
          <Title size={28}>
            Olhe o céu. <Text style={{ color: colors.gold }}>Planeje o dia.</Text>
          </Title>
        </View>
      </View>

      <View style={[styles.locationRow, { borderColor: colors.line }]}>
        <Pressable onPress={() => setModal(true)} accessibilityRole="button" accessibilityLabel={`Alterar localização. Atual: ${placeName}`} style={styles.locationButton}>
          <Icon name="pin" size={20} color={colors.accent} />
          <View style={{ flexShrink: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }}>SUA REGIÃO AGORA</Text>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              {placeName}
            </Text>
          </View>
          <Icon name="down" size={18} color={colors.muted} />
        </Pressable>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, maxWidth: "40%" }}>
          {user ? user.name : "Visitante"}
        </Text>
      </View>

      <View style={[styles.hero, { backgroundColor: colors.heroFrom, borderColor: colors.heroLine }]}>
        <View style={[styles.heroGlow, { backgroundColor: colors.heroTo }]} />
        <View style={styles.heroTop}>
          <Eyebrow color={colors.heroMuted}>PANORAMA DO TEMPO</Eyebrow>
          <Text style={styles.badge}>{loading && !data ? "Consultando" : forecast ? (forecast.is_stale ? "Dado salvo" : "Previsão atualizada") : "Indisponível"}</Text>
        </View>
        <View style={styles.heroBody}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.temperature, { color: colors.heroText }]}>
              {forecast ? Math.round(Number(forecast.temperature_c)) : "--"}
              <Text style={{ fontSize: 26 }}>°C</Text>
            </Text>
            <Text style={{ color: colors.heroText, fontSize: 20, fontWeight: "600" }}>
              {forecast ? forecast.condition : error || (loading ? "Carregando previsão..." : "Sem previsão para esta localidade")}
            </Text>
          </View>
          <Text style={{ fontSize: 58 }} accessibilityElementsHidden importantForAccessibility="no">
            {weatherEmoji(forecast?.condition ?? "")}
          </Text>
        </View>
        <Text style={{ color: colors.heroMuted, fontSize: 13 }}>
          Máx. {forecast ? Math.round(Number(forecast.maximum_c)) : "--"}° | Mín. {forecast ? Math.round(Number(forecast.minimum_c)) : "--"}°
        </Text>
        {forecast && (
          <View style={{ gap: 4 }}>
            <Text style={{ color: colors.heroMuted, fontSize: 12 }}>Atualizado {relativeTime(forecast.issued_at)}</Text>
            <Text style={{ color: colors.heroMuted, fontSize: 11 }}>
              Fonte: {forecast.source_name}
              {forecast.is_stale ? " (último dado salvo)" : ""}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.metrics}>
        {[
          ["Umidade", forecast ? `${forecast.humidity}%` : "--%"],
          ["Vento", forecast ? `${Number(forecast.wind_kmh)} km/h` : "-- km/h"],
          ["Chuva", forecast ? `${forecast.rain_probability}%` : "--%"],
        ].map(([label, value]) => (
          <View key={label} style={[styles.metric, { backgroundColor: colors.panel, borderColor: colors.line }]}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }} numberOfLines={1} adjustsFontSizeToFit>
              {value}
            </Text>
          </View>
        ))}
      </View>

      <Card accent={first ? colors.severity[first.severity] : colors.muted}>
        <Eyebrow color={colors.muted}>AVISOS METEOROLÓGICOS</Eyebrow>
        <Title size={21}>{error && !data ? "Avisos indisponíveis" : first ? first.title : "Nenhum aviso disponível"}</Title>
        <Body muted size={13}>
          {first
            ? first.message
            : "A ausência de avisos disponíveis não confirma ausência de risco. Confira também os avisos oficiais do INMET."}
        </Body>
        {first && <Body muted size={12}>Origem: {first.source_name}</Body>}
        {data && (
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, borderTopWidth: 1, borderColor: colors.line, paddingTop: 10 }}>{feedStatus(data.warning_feed)}</Text>
        )}
        <Button title="Ver avisos" variant="secondary" onPress={() => router.navigate("/alertas")} compact />
      </Card>

      <View style={{ gap: 0 }}>
        {[
          ["01 / MAPA", "Veja o tempo na sua região", "Previsões pontuais e áreas de avisos.", "/mapa"],
          ["02 / MAPA EM TELA CHEIA", "Só o mapa, sem distrações", "Avisos do INMET e áreas publicadas pelos meteorologistas.", "/mapa-completo"],
          ["03 / OBSERVAÇÕES", "Consulte as estações INMET", "Medições registradas, com data e origem.", "/estacoes"],
          ["04 / PREVENÇÃO", "Saiba como se proteger", "Orientações para eventos meteorológicos.", "/informacoes"],
        ].map(([index, title, text, href]) => (
          <Pressable
            key={href}
            onPress={() => router.navigate(href as "/mapa")}
            accessibilityRole="link"
            style={({ pressed }) => [styles.shortcut, { borderColor: colors.line, opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.accent, fontSize: 10, letterSpacing: 1.2, fontWeight: "800" }}>{index}</Text>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{text}</Text>
            </View>
            <Icon name="chevron" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <LocationModal
        visible={modal}
        initialCity={user?.city ?? forecast?.city ?? ""}
        initialState={user?.state ?? forecast?.state ?? ""}
        onClose={() => setModal(false)}
        onConfirm={async (next) => {
          if (user) {
            await updateUser(
              next.latitude !== undefined
                ? { city: next.city ?? null, state: next.state ?? null, latitude: String(next.latitude), longitude: String(next.longitude) }
                : { city: next.city ?? null, state: next.state ?? null },
            );
          }
          setQuery(next);
          setLoading(true);
          if (!(await load(next))) throw new Error("Não foi possível consultar esta localidade. Tente novamente.");
        }}
      />
    </Screen>
  );
}

function LocationModal({
  visible,
  initialCity,
  initialState,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  initialCity: string;
  initialState: string;
  onClose: () => void;
  onConfirm: (query: Query) => Promise<void>;
}) {
  const colors = useColors();
  const [city, setCity] = useState(initialCity);
  const [uf, setUf] = useState(initialState);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"form" | "gps" | null>(null);

  function reset() {
    setCity(initialCity);
    setUf(initialState);
    setMessage("");
  }

  async function run(kind: "form" | "gps") {
    setMessage("");
    setBusy(kind);
    try {
      if (kind === "gps") {
        const place = await currentPlace();
        await onConfirm({ latitude: place.latitude, longitude: place.longitude, city: place.city ?? undefined, state: place.state ?? undefined });
      } else {
        if (city.trim().length < 2 || uf.trim().length !== 2) throw new Error("Informe a cidade e a UF (2 letras).");
        await onConfirm({ city: city.trim(), state: uf.trim().toUpperCase() });
      }
      onClose();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={reset}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar">
        <Pressable style={[styles.sheet, { backgroundColor: colors.panel, borderColor: colors.line }]} onPress={() => undefined}>
          <Title size={22}>Alterar localização</Title>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Field label="Cidade" value={city} onChangeText={setCity} maxLength={100} style={{ flex: 1 }} />
            <Field label="UF" value={uf} onChangeText={(text) => setUf(text.replace(/[^a-z]/gi, "").toUpperCase())} maxLength={2} autoCapitalize="characters" style={{ width: 76 }} />
          </View>
          <Button title="Usar minha localização atual" variant="secondary" icon="locate" onPress={() => run("gps")} busy={busy === "gps"} disabled={busy === "form"} />
          <Message text={message} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button title="Cancelar" variant="secondary" onPress={onClose} disabled={Boolean(busy)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Confirmar" onPress={() => run("form")} busy={busy === "form"} disabled={busy === "gps"} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 14, borderBottomWidth: 1 },
  locationButton: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1, minHeight: 44 },
  hero: { borderRadius: 22, borderWidth: 1, padding: 22, gap: 10, overflow: "hidden" },
  heroGlow: { position: "absolute", width: 260, height: 260, borderRadius: 130, right: -90, bottom: -110, opacity: 0.8 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  heroBody: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 },
  badge: { color: "#cee6ed", borderWidth: 1, borderColor: "#acd6e035", backgroundColor: "#ffffff10", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, fontSize: 10, fontWeight: "700", overflow: "hidden" },
  temperature: { fontSize: 76, fontWeight: "300", letterSpacing: -3, lineHeight: 84 },
  metrics: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 10, gap: 6 },
  shortcut: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 18, borderTopWidth: 1 },
  backdrop: { flex: 1, backgroundColor: "#000a", justifyContent: "center", padding: 18 },
  sheet: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
});
