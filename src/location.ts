import * as Location from "expo-location";

import { UFS } from "./theme";

const STATE_NAMES: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE", "distrito federal": "DF",
  "espirito santo": "ES", goias: "GO", maranhao: "MA", "mato grosso": "MT", "mato grosso do sul": "MS",
  "minas gerais": "MG", para: "PA", paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI",
  "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};

function toUf(region?: string | null) {
  if (!region) return null;
  const upper = region.trim().toUpperCase();
  if (UFS.includes(upper)) return upper;
  const key = region.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  return STATE_NAMES[key] ?? null;
}

export type DevicePlace = { latitude: number; longitude: number; city: string | null; state: string | null };

const RECENT_POSITION_MS = 15 * 60 * 1000;
const POSITION_TIMEOUT_MS = 10000;
const GEOCODE_TIMEOUT_MS = 5000;
let askedThisSession = false;

async function withTimeout<T>(task: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([task, new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); })]);
  } finally {
    clearTimeout(timer);
  }
}

/** Posição recente ou atual; a atual pode demorar muito em ambientes fechados e não tem limite próprio. */
async function devicePosition() {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: RECENT_POSITION_MS });
  return recent ?? withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), POSITION_TIMEOUT_MS);
}

/** Coordenadas aproximadas para a seção de alertas; null sem permissão ou sem sinal. */
export async function regionCoordinates(): Promise<{ latitude: string; longitude: string } | null> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted && permission.canAskAgain && !askedThisSession) {
      askedThisSession = true;
      permission = await Location.requestForegroundPermissionsAsync();
    }
    if (!permission.granted) return null;
    const position = await devicePosition();
    if (!position) return null;
    return { latitude: position.coords.latitude.toFixed(2), longitude: position.coords.longitude.toFixed(2) };
  } catch {
    return null;
  }
}

/** Pede permissão somente quando a pessoa toca no botão, como no site. */
export async function currentPlace(): Promise<DevicePlace> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Permissão de localização negada. Você pode ativá-la nas configurações do aparelho.");
  const position = await devicePosition().catch(() => null);
  if (!position) throw new Error("Não foi possível obter sua localização. Verifique se o GPS está ligado ou use a busca por cidade.");
  const latitude = Number(position.coords.latitude.toFixed(6));
  const longitude = Number(position.coords.longitude.toFixed(6));
  let city: string | null = null;
  let state: string | null = null;
  try {
    const places = await withTimeout(Location.reverseGeocodeAsync({ latitude, longitude }), GEOCODE_TIMEOUT_MS);
    const place = places?.[0];
    if (place && (!place.isoCountryCode || place.isoCountryCode === "BR")) {
      city = place.city ?? place.subregion ?? null;
      state = toUf(place.region);
    }
  } catch {
    // Sem nome da cidade, as coordenadas continuam válidas.
  }
  if (!city || !state) {
    city = null;
    state = null;
  }
  return { latitude, longitude, city, state };
}
