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
let askedThisSession = false;

/** Coordenadas aproximadas para a seção de alertas; null sem permissão ou sem sinal. */
export async function regionCoordinates(): Promise<{ latitude: string; longitude: string } | null> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted && permission.canAskAgain && !askedThisSession) {
      askedThisSession = true;
      permission = await Location.requestForegroundPermissionsAsync();
    }
    if (!permission.granted) return null;
    const recent = await Location.getLastKnownPositionAsync({ maxAge: RECENT_POSITION_MS });
    // A posição atual pode demorar muito em ambientes fechados e não tem tempo limite próprio.
    const position = recent ?? (await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), POSITION_TIMEOUT_MS)),
    ]));
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
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const latitude = Number(position.coords.latitude.toFixed(6));
  const longitude = Number(position.coords.longitude.toFixed(6));
  let city: string | null = null;
  let state: string | null = null;
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
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
