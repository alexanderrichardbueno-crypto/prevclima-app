import Svg, { Circle, Path } from "react-native-svg";

// Ícones de traço usados na navegação do site (public/assets/js/shell.js).
const paths = {
  home: ["m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"],
  map: ["m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z", "M9 3v16m6-14v16"],
  user: ["M4 21a8 8 0 0 1 16 0"],
  stations: ["M4 20V10m8 10V4m8 16v-7"],
  pin: ["M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"],
  locate: ["M12 2v3m0 14v3M2 12h3m14 0h3"],
  refresh: ["M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"],
  chevron: ["m9 6 6 6-6 6"],
  down: ["m6 9 6 6 6-6"],
  back: ["m15 6-6 6 6 6"],
  alert: ["M12 3 2 21h20L12 3Z", "M12 10v4m0 3v.5"],
  book: ["M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Z", "M4 21V5"],
  send: ["m3 11 18-8-8 18-2-8-8-2Z"],
  logout: ["M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4", "M10 17l-5-5 5-5M5 12h11"],
  bolt: ["m13 2-8 12h6l-1 8 8-12h-6l1-8Z"],
  expand: ["M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"],
  focus: ["M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4", "M9 12h6M12 9v6"],
  cloud: ["M6 18h12a4 4 0 0 0 .4-8A6 6 0 0 0 7 10a4 4 0 0 0-1 8Z"],
  info: ["M12 11v6M12 7.5v.5"],
  sun: ["M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"],
  moon: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"],
  layers: ["m12 2 10 5-10 5L2 7z", "m2 17 10 5 10-5M2 12l10 5 10-5"],
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 22, color, strokeWidth = 1.9 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {name === "user" && <Circle cx={12} cy={8} r={4} />}
      {name === "pin" && <Circle cx={12} cy={9} r={2.5} />}
      {name === "locate" && <Circle cx={12} cy={12} r={6} />}
      {name === "info" && <Circle cx={12} cy={12} r={9} />}
      {name === "sun" && <Circle cx={12} cy={12} r={4} />}
      {paths[name].map((d) => (
        <Path key={d} d={d} />
      ))}
    </Svg>
  );
}
