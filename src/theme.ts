// Paleta do painel/identidade PrevClima (public/assets/css/painel.css e o
// primeiro bloco de design-refresh.css): azul-marinho, azul e dourado.
export const palettes = {
  dark: {
    bg: "#040c24",
    panel: "#0a1734",
    panelSoft: "#0e1f45",
    inset: "#071230",
    line: "#1b3163",
    text: "#e9efff",
    muted: "#93a6d1",
    faint: "#6479a8",
    accent: "#7ea5ff",
    primary: "#3a74ff",
    button: "#3a74ff",
    buttonBorder: "#5b8cff",
    buttonText: "#ffffff",
    gold: "#f5b301",
    heroFrom: "#06308f",
    heroTo: "#020a24",
    heroLine: "#2c4a92",
    heroText: "#ffffff",
    heroMuted: "#bccaef",
    error: "#ff4b5f",
    success: "#2fd06a",
    brandYellow: "#f5b301",
    mapSea: "#071230",
    severity: { LOW: "#2fd06a", MODERATE: "#f5c400", HIGH: "#ff8a1f", CRITICAL: "#ff4b5f" } as Record<string, string>,
  },
  light: {
    bg: "#eef2f9",
    panel: "#ffffff",
    panelSoft: "#f3f6fc",
    inset: "#f3f6fc",
    line: "#d6dfef",
    text: "#0b1a3a",
    muted: "#52648a",
    faint: "#8494b5",
    accent: "#1447d4",
    primary: "#1447d4",
    button: "#1447d4",
    buttonBorder: "#1447d4",
    buttonText: "#ffffff",
    gold: "#f5b301",
    heroFrom: "#06308f",
    heroTo: "#031a55",
    heroLine: "#2c4a92",
    heroText: "#ffffff",
    heroMuted: "#bccaef",
    error: "#d11a33",
    success: "#13803f",
    brandYellow: "#8a5d00",
    mapSea: "#cfe0f7",
    severity: { LOW: "#13803f", MODERATE: "#8f6b00", HIGH: "#c2500a", CRITICAL: "#d11a33" } as Record<string, string>,
  },
};

export type Palette = typeof palettes.dark;

// Cores das áreas no mapa (iguais às do Leaflet em leafletHtml.ts).
export const severityColors: Record<string, string> = palettes.dark.severity;

export const forecastLevels: Record<string, { name: string; color: string }> = {
  T: { name: "Tempestades não severas", color: "#39ff14" },
  "1": { name: "Nível 1", color: "#ffe100" },
  "2": { name: "Nível 2", color: "#ff7a00" },
  "3": { name: "Nível 3", color: "#ff1a1a" },
  "4": { name: "Nível 4", color: "#9d1cff" },
};

export const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
