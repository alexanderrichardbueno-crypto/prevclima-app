import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import type { User } from "@/api";
import { Icon } from "@/components/Icon";
import { Body, Button, Card, Field, LinkRow, Message, Screen, SectionLabel, SettingRow, Title, useColors } from "@/components/ui";
import { roleName } from "@/format";
import { currentPlace } from "@/location";
import { useSession } from "@/session";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, status, isDark, setDarkTheme } = useSession();
  if (status !== "signedIn" || !user) {
    return (
      <Screen>
        <View style={{ alignItems: "center", gap: 12, marginTop: 40 }}>
          <View style={[styles.avatar, { backgroundColor: colors.panelSoft, borderColor: colors.line }]}>
            <Icon name="user" size={34} color={colors.accent} />
          </View>
          <Title size={22}>Você está como visitante</Title>
          <Body muted style={{ textAlign: "center" }}>
            Entre ou crie uma conta para salvar sua cidade, receber avisos da sua região.
          </Body>
        </View>
        <Button title="Entrar ou criar conta" onPress={() => router.push("/login")} />
        <Card style={{ gap: 0 }}>
          <SectionLabel>Aparência</SectionLabel>
          <SettingRow title="Tema escuro" subtitle="Interface no modo noturno" value={isDark} onChange={(v) => void setDarkTheme(v)} />
        </Card>
        <Card>
          <SectionLabel>Recursos</SectionLabel>
          <LinkRow title="Informações educativas" icon="book" onPress={() => router.push("/informacoes")} />
        </Card>
      </Screen>
    );
  }

  return <SignedInProfile key={user.id} user={user} />;
}

function SignedInProfile({ user }: { user: User }) {
  const colors = useColors();
  const { updateUser, logout, refreshUser, setDarkTheme } = useSession();
  const [name, setName] = useState(user.name);
  const [city, setCity] = useState(user.city ?? "");
  const [uf, setUf] = useState(user.state ?? "");
  const [message, setMessage] = useState<{ text: string; kind: "error" | "success" }>({ text: "", kind: "error" });
  const [busy, setBusy] = useState<"save" | "gps" | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function notify(text: string, kind: "error" | "success" = "success") {
    setMessage({ text, kind });
    if (timer.current) clearTimeout(timer.current);
    if (kind === "success") timer.current = setTimeout(() => setMessage({ text: "", kind }), 2500);
  }

  async function save() {
    setMessage({ text: "", kind: "error" });
    if (Boolean(city.trim()) !== Boolean(uf.trim())) return notify("Informe a cidade e a UF juntas ou apague os dois campos.", "error");
    setBusy("save");
    try {
      await updateUser({ name: name.trim(), city: city.trim() || null, state: uf.trim().toUpperCase() || null });
      notify("Perfil atualizado");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function saveGps() {
    setBusy("gps");
    try {
      const place = await currentPlace();
      const changes: Partial<User> = { latitude: String(place.latitude), longitude: String(place.longitude) };
      if (place.city && place.state) Object.assign(changes, { city: place.city, state: place.state });
      const updated = await updateUser(changes);
      setCity(updated.city ?? "");
      setUf(updated.state ?? "");
      notify("Localização salva. Os avisos serão filtrados para a sua região.");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function toggleTheme(value: boolean) {
    try {
      await setDarkTheme(value);
    } catch (error) {
      notify((error as Error).message, "error");
    }
  }

  async function toggle(field: "weather_notifications" | "alert_sound", value: boolean) {
    try {
      await updateUser({ [field]: value });
      notify("Preferência atualizada");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  }

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await refreshUser().catch(() => undefined);
        setRefreshing(false);
      }}
    >
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={[styles.avatar, { backgroundColor: colors.panelSoft, borderColor: colors.line }]}>
          <Text style={{ color: colors.accent, fontSize: 24, fontWeight: "800" }}>{user.name.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Title size={19}>{user.name}</Title>
          <Body muted size={13}>{user.email}</Body>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Text style={[styles.pill, { color: colors.accent, borderColor: colors.line }]}>{roleName(user.role)}</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>Código: {user.public_code}</Text>
          </View>
        </View>
      </Card>

      <Message text={message.text} kind={message.kind} />

      <Card style={{ gap: 14 }}>
        <SectionLabel>Dados pessoais e localização</SectionLabel>
        <Field label="Nome" value={name} onChangeText={setName} maxLength={120} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Field label="Cidade" value={city} onChangeText={setCity} maxLength={100} style={{ flex: 1 }} />
          <Field label="UF" value={uf} onChangeText={(text) => setUf(text.replace(/[^a-z]/gi, "").toUpperCase())} maxLength={2} autoCapitalize="characters" style={{ width: 76 }} />
        </View>
        <Button title="Salvar perfil" onPress={save} busy={busy === "save"} disabled={busy === "gps"} />
        <Button title="Usar localização do aparelho" icon="locate" variant="secondary" onPress={saveGps} busy={busy === "gps"} disabled={busy === "save"} />
        <Body muted size={12}>
          {user.latitude != null ? "Localização exata salva: os avisos são filtrados pela sua área." : "Sem localização exata: os avisos mostram todas as áreas."}
        </Body>
      </Card>

      <Card style={{ gap: 0 }}>
        <SectionLabel>Notificações</SectionLabel>
        <SettingRow title="Alertas meteorológicos" subtitle="Notificações dentro do aplicativo" value={user.weather_notifications} onChange={(v) => toggle("weather_notifications", v)} />
        <SettingRow title="Som de alertas" subtitle="Tocar áudio ao receber alertas" value={user.alert_sound} onChange={(v) => toggle("alert_sound", v)} />
      </Card>

      <Card style={{ gap: 0 }}>
        <SectionLabel>Aparência</SectionLabel>
        <SettingRow title="Tema escuro" subtitle="Interface no modo noturno (vale também no site)" value={user.dark_theme} onChange={toggleTheme} />
      </Card>

      <Card style={{ gap: 0 }}>
        <SectionLabel>Recursos</SectionLabel>
        <LinkRow title="Informações educativas" icon="book" onPress={() => router.push("/informacoes")} />
      </Card>

      <Button
        title="Sair da conta"
        variant="danger"
        icon="logout"
        onPress={() =>
          Alert.alert("Sair da conta", "Deseja encerrar a sessão neste aparelho?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Sair", style: "destructive", onPress: () => void logout().then(() => router.replace("/login")) },
          ])
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, fontSize: 11, fontWeight: "700", overflow: "hidden" },
});
