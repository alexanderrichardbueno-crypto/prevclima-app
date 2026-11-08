import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { request, type Observation, type Station } from "@/api";
import { Body, Button, Card, Chip, Empty, Eyebrow, Field, Loading, Message, Screen, Title, useColors } from "@/components/ui";
import { dateTime, metric, olderThanOneDay } from "@/format";

const PERIODS: Record<string, string> = { HOURLY: "Horário", DAILY: "Diário", MONTHLY: "Mensal" };

export default function StationsScreen() {
  const colors = useColors();
  const [uf, setUf] = useState("");
  const [search, setSearch] = useState("");
  const [stations, setStations] = useState<Station[] | null>(null);
  const [selected, setSelected] = useState<Station | null>(null);
  const [observations, setObservations] = useState<Observation[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [oldData, setOldData] = useState(false);

  const loadStations = useCallback(async (state: string) => {
    try {
      const result = await request<Station[]>(`/stations?limit=1000${state ? `&state=${encodeURIComponent(state)}` : ""}`);
      setStations(result);
      setShowAll(false);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  async function filter() {
    setBusy(true);
    await loadStations(uf);
    setBusy(false);
  }

  useEffect(() => {
    // A carga inicial roda fora do corpo do efeito (estado só muda após a resposta).
    void Promise.resolve().then(() => loadStations(""));
  }, [loadStations]);

  async function open(station: Station) {
    setSelected(station);
    setObservations(null);
    setError("");
    try {
      const result = await request<Observation[]>(`/stations/${encodeURIComponent(station.code)}/observations?limit=100`);
      setOldData(Boolean(result[0]) && olderThanOneDay(result[0].observed_at));
      setObservations(result);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = stations ?? [];
    return term ? list.filter((s) => `${s.name} ${s.code} ${s.state ?? ""}`.toLowerCase().includes(term)) : list;
  }, [stations, search]);
  const visible = showAll ? filtered : filtered.slice(0, 40);

  if (selected) {
    const latest = observations?.[0];
    return (
      <Screen onRefresh={() => open(selected)} refreshing={false}>
        <Pressable onPress={() => setSelected(null)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
          <Text style={{ color: colors.accent, fontWeight: "700" }}>← Todas as estações</Text>
        </Pressable>
        <View style={{ gap: 4 }}>
          <Eyebrow>
            {selected.code} · {selected.state ?? "—"}
          </Eyebrow>
          <Title size={24}>{selected.name}</Title>
          <Body muted size={13}>
            {selected.kind === "AUTOMATIC" ? "Automática" : "Convencional"} · {selected.latitude ?? "—"}, {selected.longitude ?? "—"}
          </Body>
        </View>
        <Message text={error} />
        {!observations && !error && <Loading text="Consultando medições..." />}
        {observations && !observations.length && <Empty text="Nenhuma medição disponível para esta estação." />}
        {latest && (
          <Body muted size={12}>
            Até 100 registros mais recentes · {latest.source === "BDMEP" ? "Histórico BDMEP" : "INMET"}
            {oldData ? " · Dados anteriores às últimas 24 h" : ""}
          </Body>
        )}
        {observations?.map((o) => (
          <Card key={o.id} style={{ gap: 8, padding: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{dateTime(o.observed_at)}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {PERIODS[o.period] ?? o.period} · {o.source}
              </Text>
            </View>
            <View style={styles.obsGrid}>
              {[
                ["Temp.", metric(o.temperature_c, " °C")],
                ["Umidade", metric(o.humidity, "%")],
                ["Chuva", metric(o.precipitation_mm, " mm")],
                ["Vento", metric(o.wind_ms, " m/s")],
              ].map(([label, value]) => (
                <View key={label} style={[styles.obsCell, { backgroundColor: colors.inset, borderColor: colors.line }]}>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{label}</Text>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{value}</Text>
                </View>
              ))}
            </View>
          </Card>
        ))}
        <Body muted size={12}>A data da observação indica quando a medição ocorreu. O histórico pode conter lacunas e não substitui a previsão ou os avisos oficiais.</Body>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={filter} refreshing={busy}>
      <View style={{ gap: 6 }}>
        <Eyebrow>OBSERVAÇÕES INMET</Eyebrow>
        <Title>Estações meteorológicas</Title>
        <Body muted size={13}>Temperatura e medições registradas pelas estações. Horários no seu fuso local.</Body>
      </View>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
        <Field label="UF" placeholder="SP" value={uf} onChangeText={(text) => setUf(text.replace(/[^a-z]/gi, "").toUpperCase())} maxLength={2} autoCapitalize="characters" style={{ width: 80 }} />
        <View style={{ flex: 1 }}>
          <Button title="Filtrar" onPress={filter} busy={busy} />
        </View>
      </View>
      <Field label="Buscar por nome ou código" value={search} onChangeText={setSearch} placeholder="Ex.: Santos, A765" autoCorrect={false} />
      <Message text={error} />
      {!stations && !error && <Loading text="Carregando estações…" />}
      {stations && !filtered.length && <Empty text="Nenhuma estação disponível no momento." />}
      {stations && filtered.length > 0 && (
        <Body muted size={12}>
          {filtered.length} estação(ões){!showAll && filtered.length > visible.length ? ` · mostrando ${visible.length}` : ""}
        </Body>
      )}
      {visible.map((station) => (
        <Pressable
          key={station.code}
          onPress={() => open(station)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.station, { backgroundColor: colors.panel, borderColor: colors.line, opacity: pressed ? 0.8 : 1 }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{station.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {station.state ?? "—"} · {station.code} · {station.kind === "AUTOMATIC" ? "Automática" : "Convencional"}
            </Text>
          </View>
          <Chip label="Ver" />
        </Pressable>
      ))}
      {!showAll && filtered.length > visible.length && <Button title={`Mostrar todas (${filtered.length})`} variant="secondary" onPress={() => setShowAll(true)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  station: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  obsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  obsCell: { flexGrow: 1, flexBasis: "45%", borderWidth: 1, borderRadius: 10, padding: 10, gap: 2 },
});
