import { useState } from "react";
import { Image, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from "react-native-svg";

import { getServer } from "../api";
import { useColors } from "./ui";

/** Logo reserva do painel (LOGO_FALLBACK em public/assets/js/painel/painel.js). */
function FallbackLogo({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityElementsHidden importantForAccessibility="no">
      <Defs>
        <RadialGradient id="g" cx="50%" cy="42%" r="62%">
          <Stop offset="0" stopColor="#0b46c8" />
          <Stop offset="1" stopColor="#020a24" />
        </RadialGradient>
      </Defs>
      <Circle cx={100} cy={100} r={100} fill="url(#g)" />
      <G fill="none" stroke="#9cbcff" strokeOpacity={0.35} strokeWidth={2}>
        <Circle cx={100} cy={100} r={34} />
        <Circle cx={100} cy={100} r={60} />
        <Circle cx={100} cy={100} r={86} />
        <Path d="M100 14v172M14 100h172" />
      </G>
      <Path d="M62 114a24 24 0 0 1 9-46 33 33 0 0 1 63 9 20 20 0 0 1 3 37z" fill="#fff" />
      <Path d="M108 98 90 128h14l-8 28 27-38h-15l9-20z" fill="#f5b301" />
    </Svg>
  );
}

/**
 * Igual ao painel: usa public/assets/img/logo.png do servidor quando existe;
 * se a imagem não for encontrada, mostra a logo reserva em SVG.
 */
export function Logo({ size = 44 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FallbackLogo size={size} />;
  return (
    <Image
      source={{ uri: `${getServer()}/assets/img/logo.png` }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

/** Logo + "PrevClima" com "Clima" em dourado, como no painel. */
export function Brand({ size = 40, subtitle }: { size?: number; subtitle?: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessibilityRole="header" accessibilityLabel="PrevClima">
      <Logo size={size} />
      <View>
        <Text style={{ color: colors.text, fontSize: size * 0.5, fontWeight: "800", letterSpacing: -0.5 }}>
          Prev<Text style={{ color: colors.gold }}>Clima</Text>
        </Text>
        {subtitle ? <Text style={{ color: colors.muted, fontSize: 11 }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}
