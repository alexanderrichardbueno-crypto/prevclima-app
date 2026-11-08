import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

/**
 * Cliente da API do PrevClima. O aplicativo usa exatamente as mesmas rotas
 * (/api/v1/...) e o mesmo banco de dados do site; a única diferença é que a
 * sessão viaja no cabeçalho `Authorization: Bearer`, e não em cookies.
 */

const TOKEN_KEY = "prevclima_token";
const CSRF_KEY = "prevclima_csrf";
const SERVER_KEY = "prevclima_server";
const DEFAULT_PORT = "18080";

function defaultServer(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  // Em desenvolvimento, o Expo informa o IP do computador que roda o Metro;
  // o backend (Docker) costuma estar no mesmo computador.
  const hostUri = Constants.expoConfig?.hostUri ?? "";
  const host = hostUri.split(":")[0];
  return `http://${host || "127.0.0.1"}:${DEFAULT_PORT}`;
}

let server = defaultServer();
let token: string | null = null;
let csrf: string | null = null;
let onUnauthorized: (() => void) | null = null;

export async function loadStoredSession() {
  const [storedServer, storedToken, storedCsrf] = await Promise.all([
    SecureStore.getItemAsync(SERVER_KEY),
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(CSRF_KEY),
  ]);
  if (storedServer) server = storedServer;
  token = storedToken;
  csrf = storedCsrf;
  return { hasToken: Boolean(token) };
}

export async function saveSession(accessToken: string | null, csrfToken: string | null) {
  token = accessToken;
  csrf = csrfToken;
  if (accessToken) await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
  if (csrfToken) await SecureStore.setItemAsync(CSRF_KEY, csrfToken);
  else await SecureStore.deleteItemAsync(CSRF_KEY);
}

export function getServer() {
  return server;
}

export async function setServer(value: string) {
  const cleaned = value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s/]+/.test(cleaned)) throw new ApiError("Informe um endereço como http://192.168.0.10:18080", 0);
  server = cleaned;
  await SecureStore.setItemAsync(SERVER_KEY, cleaned);
}

export function hasSession() {
  return Boolean(token);
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const errorMessages: Record<string, string> = {
  "Token CSRF inválido": "A sessão expirou. Entre novamente.",
};

type Options = { method?: string; body?: unknown; auth?: boolean };

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const useAuth = options.auth !== false && token;
  if (useAuth) headers.Authorization = `Bearer ${token}`;
  // Se o sistema guardar cookies da resposta de login, o servidor exige o
  // mesmo token CSRF; enviá-lo sempre evita erros 403 inesperados.
  if (csrf && !["GET", "HEAD"].includes(method)) headers["X-CSRF-Token"] = csrf;

  let response: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    response = await fetch(`${server}/api/v1${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "omit",
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(`Não foi possível conectar ao PrevClima (${server}). Verifique a conexão e o endereço do servidor.`, 0);
  } finally {
    clearTimeout(timer);
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && useAuth) onUnauthorized?.();
    const detail = data?.detail;
    const raw = Array.isArray(detail) ? detail.map((item: { msg: string }) => item.msg).join(". ") : detail;
    throw new ApiError(errorMessages[raw] ?? raw ?? "Não foi possível concluir a solicitação.", response.status);
  }
  return data as T;
}

/* ---------- Tipos das respostas (espelham app/schemas.py) ---------- */

export type User = {
  id: number;
  public_code: string;
  name: string;
  email: string;
  role: string;
  role_name: string;
  city: string | null;
  state: string | null;
  latitude: string | null;
  longitude: string | null;
  weather_notifications: boolean;
  alert_sound: boolean;
  dark_theme: boolean;
  created_at: string;
};

export type AuthResponse = { user: User; csrf_token: string; access_token?: string | null };

export type Forecast = {
  id: number;
  city: string;
  state: string;
  condition: string;
  temperature_c: string;
  minimum_c: string;
  maximum_c: string;
  humidity: number;
  wind_kmh: string;
  rain_probability: number;
  severity: string;
  description: string | null;
  source_name: string;
  source_url: string | null;
  is_stale: boolean;
  issued_at: string;
  valid_until: string;
};

export type Alert = {
  id: number;
  title: string;
  message: string;
  event_type: string;
  severity: Severity;
  area_name: string;
  recommendations: string[];
  origin: string;
  source_name: string;
  source_url: string | null;
  validation_status: string;
  issued_at: string;
  valid_until: string;
  is_read: boolean;
};

export type NearbyForecast = {
  id: number;
  level: number;
  level_name: string;
  severity: Severity;
  description: string;
  issued_at: string;
  valid_until: string;
};

export type NearbyAlerts = { location: string | null; alerts: Alert[]; forecasts: NearbyForecast[] };

export type WarningFeed = { status: string; last_success_at: string | null };

export type Home = {
  forecast: Forecast | null;
  active_alerts: Alert[];
  unread_alert_count: number;
  warning_feed: WarningFeed;
};

export type Severity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type Polygon = { type: string; coordinates: number[][][] | number[][][][] };

export type MapAlert = {
  id: number;
  title: string;
  message: string;
  severity: Severity;
  area_name: string;
  latitude: string | null;
  longitude: string | null;
  radius_km: string | null;
  polygon: Polygon | null;
  source_name: string;
  source_url: string | null;
  valid_until: string;
};

export type MapData = {
  warning_feed: WarningFeed;
  alerts: MapAlert[];
  upcoming_alerts?: MapAlert[];
  forecast_areas: { id: number; city: string; state: string; severity: string; polygon: Polygon; source_name: string; valid_until: string }[];
  forecast_points: {
    id: number;
    city: string;
    state: string;
    latitude: string;
    longitude: string;
    condition: string;
    temperature_c: string;
    rain_probability: number;
    source_name: string;
    source_url: string | null;
    issued_at: string;
    is_stale: boolean;
  }[];
  published_areas: { geometry: Polygon; properties?: { tipo?: string; nivel?: string; nome?: string; descricao?: string; validade?: string; alerta?: string } }[];
  published_areas_at: string | null;
  generated_at: string;
};

export type Education = { id: number; title: string; body: string; media_url: string | null; reference_url: string; published_at: string };

export type Station = { code: string; name: string; state: string | null; kind: string; latitude: string | null; longitude: string | null };

export type Observation = {
  id: number;
  observed_at: string;
  period: "HOURLY" | "DAILY" | "MONTHLY";
  source: string;
  temperature_c: string | null;
  humidity: string | null;
  precipitation_mm: string | null;
  wind_ms: string | null;
};
