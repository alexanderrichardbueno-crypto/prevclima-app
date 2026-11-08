import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ComponentType, type Ref } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent, type WebViewProps } from "react-native-webview";

import { getServer, type MapData } from "../api";
import { relativeTime } from "../format";
import { useSession } from "../session";
import type { MapLayers } from "./LayerMenu";
import { useColors } from "./ui";
import { leafletHtml } from "./leafletHtml";

// Os tipos de classe do react-native-webview ainda não batem com os do React 19.
const MapWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebView> }>;

export type WeatherMapHandle = { fitAll: () => void; focus: (alertId: number) => void };

type Props = {
  data: MapData | null;
  layers: MapLayers;
  /** Muda quando a pessoa faz uma nova busca: o mapa recentraliza na cidade. */
  recenterKey: number;
};

/** Mapa do site (Leaflet + OpenStreetMap) dentro de uma WebView. */
export const WeatherMap = forwardRef<WeatherMapHandle, Props>(function WeatherMap({ data, layers, recenterKey }, ref) {
  const colors = useColors();
  const { isDark } = useSession();
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const centeredKey = useRef<number | null>(null);

  const run = useCallback((code: string) => {
    web.current?.injectJavaScript(`try { ${code} } catch (e) {} true;`);
  }, []);

  useImperativeHandle(ref, () => ({
    fitAll: () => run("window.prevclima && window.prevclima.fitAll();"),
    focus: (id: number) => run(`window.prevclima && window.prevclima.focus(${Number(id)});`),
  }));

  // Redesenha quando os dados chegam; recentraliza só em uma busca nova.
  useEffect(() => {
    if (!ready || !data) return;
    const recenter = centeredKey.current !== recenterKey;
    centeredKey.current = recenterKey;
    const state = {
      data,
      layers,
      recenter,
      publishedText: data.published_areas_at ? ` · publicado ${relativeTime(data.published_areas_at)}` : "",
    };
    run(`window.prevclima && window.prevclima.render(${JSON.stringify(state)});`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, data, recenterKey]);

  useEffect(() => {
    if (ready) run(`window.prevclima && window.prevclima.layers(${JSON.stringify(layers)});`);
  }, [ready, layers, run]);

  useEffect(() => {
    if (ready) run(`window.prevclima && window.prevclima.theme(${isDark});`);
  }, [ready, isDark, run]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "ready") {
        centeredKey.current = null;
        setReady(true);
      } else if (message.type === "tileerror") setNotice("Mapa-base indisponível. Consulte as previsões e os avisos na lista.");
      else if (message.type === "error") setNotice(message.message);
      else if (message.type === "open" && /^https:\/\//.test(message.url)) void Linking.openURL(message.url);
    } catch {
      // Mensagem inválida da página: ignorada.
    }
  }

  return (
    <View style={styles.fill}>
      <MapWebView
        ref={web}
        // A origem identifica o PrevClima nos pedidos de mosaicos (política de uso do OpenStreetMap).
        source={{ html: leafletHtml, baseUrl: `${getServer()}/` }}
        originWhitelist={["*"]}
        onMessage={onMessage}
        onLoadStart={() => setReady(false)}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        overScrollMode="never"
        bounces={false}
        nestedScrollEnabled
        style={[styles.fill, { backgroundColor: colors.mapSea }]}
        accessibilityLabel="Mapa de previsões e avisos meteorológicos"
      />
      {!ready && (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.mapSea }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
      {notice ? (
        <Text style={[styles.notice, { backgroundColor: colors.panel, color: colors.text, borderColor: colors.line }]}>{notice}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  notice: { position: "absolute", left: 10, right: 10, bottom: 10, borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 12 },
});
