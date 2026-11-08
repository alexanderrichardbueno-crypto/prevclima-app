import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { request, type Alert, type NearbyAlerts, type NearbyForecast } from "@/api";
import { Icon } from "@/components/Icon";
import { Body, Empty, Eyebrow, Loading, Message, Screen, SourceLink, Title, useColors } from "@/components/ui";
import { dateTime, relativeTime, severityName } from "@/format";
import { regionCoordinates } from "@/location";
import { useSession } from "@/session";

export default function AlertsScreen() {
  const colors = useColors();
  const { user, status, unreadAlerts, setUnreadAlerts } = useSession();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [forecasts, setForecasts] = useState<NearbyForecast[]>([]);
  const [region, setRegion] = useState<string | null | undefined>(undefined);
  const [usingDevice, setUsingDevice] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const notificationsOn = user?.weather_notifications !== false;

  const load = useCallback(async () => {
    try {
      const coords = await regionCoordinates();
      const result = await request<NearbyAlerts>(`/alerts/nearby${coords ? `?latitude=${coords.latitude}&longitude=${coords.longitude}` : ""}`);
      setUsingDevice(coords !== null);
      setAlerts(result.alerts);
      setForecasts(result.forecasts);
      setRegion(result.location);
      setError("");
      if (notificationsOn) setUnreadAlerts(result.alerts.filter((item) => !item.is_read).length);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [notificationsOn, setUnreadAlerts]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function toggle(alert: Alert) {
    setOpen((current) => (current === alert.id ? null : alert.id));
    if (status !== "signedIn" || alert.is_read) return;
    try {
      await request(`/alerts/${alert.id}/read`, { method: "POST" });
      setAlerts((items) => items?.map((item) => (item.id === alert.id ? { ...item, is_read: true } : item)) ?? null);
      setUnreadAlerts(Math.max(0, unreadAlerts - 1));
    } catch {
      // Marcar como lido é secundário; o aviso continua visível.
    }
  }

  const total = (alerts?.length ?? 0) + forecasts.length;
  const location = region === undefined
    ? "Verificando sua região..."
    : region
      ? `Sua região: ${region}${usingDevice || status === "signedIn" ? "" : " · Permita a localização ou entre e informe sua cidade no perfil"}`
      : "Não foi possível identificar sua região. Confira a cidade no seu perfil.";

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={styles.heading}>
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>TEMPO SEVERO</Eyebrow>
          <Title>Alertas</Title>
          <Body muted size={13}>Ocorrências meteorológicas ativas</Body>
        </View>
        <Text style={[styles.count, { color: colors.text, borderColor: colors.line, backgroundColor: colors.panelSoft }]}>
          {alerts ? `${total} ativo${total === 1 ? "" : "s"}` : error ? "Indisponível" : "Carregando"}
        </Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 13 }}>● {location}</Text>

      <Message text={error} />
      {!alerts && !error && <Loading text="Consultando alertas..." />}
      {alerts && !total && (
        <Empty text="Nenhum alerta ou previsão para a sua região. Confira também a fonte oficial do INMET; a ausência de avisos não confirma ausência de risco." />
      )}
      {alerts?.map((alert) => {
        const color = colors.severity[alert.severity] ?? colors.muted;
        const expanded = open === alert.id;
        return (
          <View key={alert.id} style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line, borderLeftColor: color }]}>
            <Pressable onPress={() => toggle(alert)} accessibilityRole="button" accessibilityState={{ expanded }} style={styles.summary}>
              <View style={[styles.icon, { backgroundColor: `${color}22`, borderColor: color }]}>
                <Icon name="alert" size={20} color={color} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>{severityName(alert.severity).toUpperCase()} · {alert.origin === "MANUAL" ? "PREVCLIMA" : "INMET"}</Text>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                  
                  {alert.title}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{alert.area_name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Emitido {relativeTime(alert.issued_at)} · válido até {dateTime(alert.valid_until)}
                </Text>
              </View>
              <Text style={{ color: alert.is_read ? colors.success : colors.muted, fontSize: 12, fontWeight: "700" }}>{alert.is_read ? "Lido" : expanded ? "Fechar" : "Abrir"}</Text>
            </Pressable>
            {expanded && (
              <View style={[styles.detail, { borderColor: colors.line }]}>
                <Body size={14}>{alert.message}</Body>
                <Body muted size={12}>Origem: {alert.source_name}</Body>
                {alert.source_url?.startsWith("https://") && <SourceLink url={alert.source_url} label="Abrir fonte oficial ↗" />}
                <Text style={{ color: colors.text, fontWeight: "700", marginTop: 4 }}>Recomendações</Text>
                {alert.recommendations.map((item) => (
                  <Body key={item} size={13}>
                    • {item}
                  </Body>
                ))}
              </View>
            )}
          </View>
        );
      })}
      {forecasts.map((forecast) => {
        const color = colors.severity[forecast.severity] ?? colors.muted;
        return (
          <View key={`previsao-${forecast.id}`} style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line, borderLeftColor: color }]}>
            <View style={styles.summary}>
              <View style={[styles.icon, { backgroundColor: `${color}22`, borderColor: color }]}>
                <Icon name="alert" size={20} color={color} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>{forecast.level_name.toUpperCase()} · PREVCLIMA</Text>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>Previsão de tempo severo</Text>
                <Body size={14}>{forecast.description}</Body>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  Emitida {relativeTime(forecast.issued_at)} · válida até {dateTime(forecast.valid_until)}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  count: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, fontWeight: "700", overflow: "hidden" },
  card: { borderWidth: 1, borderLeftWidth: 4, borderRadius: 16, overflow: "hidden" },
  summary: { flexDirection: "row", gap: 12, padding: 16, alignItems: "flex-start" },
  icon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  detail: { borderTopWidth: 1, padding: 16, gap: 8 },
});
