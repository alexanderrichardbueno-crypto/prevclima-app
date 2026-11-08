import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { getServer, request, setServer } from "@/api";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Body, Button, Card, Eyebrow, Field, Message, Screen, useColors } from "@/components/ui";
import { useSession } from "@/session";

const PASSWORD_HELP = "Mínimo de 6 caracteres, com pelo menos uma letra maiúscula e um caractere especial.";

export default function LoginScreen() {
  const colors = useColors();
  const { login, register, continueAsGuest } = useSession();
  const [stage, setStage] = useState<"form" | "verify" | "forgot" | "reset">("form");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showServer, setShowServer] = useState(false);
  const [server, setServerText] = useState(getServer());

  async function submit() {
    setMessage("");
    if (!email.trim() || !password) return setMessage("Informe e-mail e senha.");
    if (mode === "register" && Boolean(city.trim()) !== Boolean(uf.trim())) return setMessage("Informe a cidade e a UF juntas.");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else {
        await register({ name: name.trim(), email, password, city: city.trim() || null, state: uf.trim().toUpperCase() || null });
        setCode("");
        setStage("verify");
        setMessage("Enviamos um código de confirmação para o seu e-mail.");
        return;
      }
      router.replace("/");
    } catch (error) {
      const text = (error as Error).message;
      setMessage(text);
      if (text === "Confirme seu e-mail antes de entrar") setStage("verify");
    } finally {
      setBusy(false);
    }
  }

  async function codeStep() {
    setMessage("");
    const mail = email.trim();
    if (!mail) return setMessage("Informe o e-mail.");
    setBusy(true);
    try {
      if (stage === "verify") {
        await request("/auth/verify-email", { method: "POST", body: { email: mail, code: code.trim() }, auth: false });
        await login(mail, password);
        router.replace("/");
      } else if (stage === "forgot") {
        const result = await request<{ message: string }>("/auth/forgot-password", { method: "POST", body: { email: mail }, auth: false });
        setCode("");
        setPassword("");
        setStage("reset");
        setMessage(result.message);
      } else {
        await request("/auth/reset-password", { method: "POST", body: { email: mail, code: code.trim(), password }, auth: false });
        setPassword("");
        setMode("login");
        setStage("form");
        setMessage("Senha redefinida. Entre com a nova senha.");
      }
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveServer() {
    try {
      await setServer(server);
      setShowServer(false);
      setMessage("");
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={{ alignItems: "flex-end" }}>
          <ThemeToggle />
        </View>
        <View style={styles.brand}>
          <Logo size={88} />
          <Text style={[styles.wordmark, { color: colors.text }]}>
            Prev<Text style={{ color: colors.gold }}>Clima</Text>
          </Text>
          <Body muted>Tecnologia a serviço da segurança climática</Body>
        </View>

        {stage !== "form" ? (
          <Card style={{ gap: 16 }}>
            <Body>{stage === "verify" ? "Confirme que este e-mail é seu" : "Redefina sua senha"}</Body>
            <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            {stage !== "forgot" && <Field label="Código recebido por e-mail" value={code} onChangeText={(text) => setCode(text.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={6} />}
            {stage === "reset" && <Field label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" maxLength={128} help={PASSWORD_HELP} />}
            <Message text={message} />
            <Button title={stage === "verify" ? "Confirmar cadastro" : stage === "forgot" ? "Enviar código" : "Redefinir senha"} onPress={codeStep} busy={busy} />
            <Button title="Voltar" variant="secondary" onPress={() => { setStage("form"); setMessage(""); }} />
          </Card>
        ) : (
        <Card style={{ gap: 16 }}>
          <View style={[styles.tabs, { backgroundColor: colors.inset, borderColor: colors.line }]} accessibilityRole="tablist">
            {(["login", "register"] as const).map((item) => (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === item }}
                onPress={() => {
                  setMode(item);
                  setMessage("");
                }}
                style={[styles.tab, mode === item && { backgroundColor: colors.button }]}
              >
                <Text style={{ color: mode === item ? "#fff" : colors.muted, fontWeight: "700" }}>{item === "login" ? "Entrar" : "Criar conta"}</Text>
              </Pressable>
            ))}
          </View>

          {mode === "register" && <Field label="Nome de usuário" value={name} onChangeText={setName} autoComplete="name" maxLength={120} />}
          <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            maxLength={128}
            help={mode === "register" ? PASSWORD_HELP : undefined}
            onSubmitEditing={mode === "login" ? submit : undefined}
          />
          {mode === "register" && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Field label="Cidade (opcional)" value={city} onChangeText={setCity} maxLength={100} style={{ flex: 1 }} />
              <Field label="UF" value={uf} onChangeText={(text) => setUf(text.replace(/[^a-z]/gi, "").toUpperCase())} maxLength={2} autoCapitalize="characters" style={{ width: 76 }} />
            </View>
          )}
          <Message text={message} />
          <Button title={mode === "login" ? "Entrar na plataforma" : "Criar conta"} onPress={submit} busy={busy} />
          {mode === "login" && (
            <Pressable onPress={() => { setMessage(""); setStage("forgot"); }} accessibilityRole="button" style={{ alignSelf: "center", padding: 6 }}>
              <Text style={{ color: colors.gold, fontWeight: "700" }}>Esqueci minha senha</Text>
            </Pressable>
          )}
        </Card>
        )}

        <Button
          title="Continuar como visitante"
          variant="secondary"
          onPress={() => {
            continueAsGuest();
            router.replace("/");
          }}
        />

        <Pressable onPress={() => setShowServer((value) => !value)} accessibilityRole="button" style={{ alignSelf: "center", padding: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Servidor: {getServer()} · alterar</Text>
        </Pressable>
        {showServer && (
          <Card>
            <Eyebrow>ENDEREÇO DO BACKEND</Eyebrow>
            <Field label="URL da API" value={server} onChangeText={setServerText} autoCapitalize="none" keyboardType="url" help="O mesmo servidor do site, por exemplo http://192.168.0.10:18080" />
            <Button title="Salvar endereço" onPress={saveServer} compact />
          </Card>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: "center", gap: 8, marginTop: 24, marginBottom: 8 },
  wordmark: { fontSize: 40, fontWeight: "800", letterSpacing: -2 },
  tabs: { flexDirection: "row", borderWidth: 1, borderRadius: 13, padding: 4 },
  tab: { flex: 1, minHeight: 42, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});
