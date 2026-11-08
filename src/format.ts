// Mesmos textos de public/assets/js/api.js.
export function severityName(severity: string) {
  return ({ LOW: "Baixo", MODERATE: "Moderado", HIGH: "Alto", CRITICAL: "Crítico" } as Record<string, string>)[severity] ?? severity;
}

export function roleName(role: string) {
  return ({ USER: "Usuário", METEOROLOGIST: "Meteorologista" } as Record<string, string>)[role] ?? role;
}

// O Hermes (motor JS do React Native) não implementa Intl.RelativeTimeFormat e
// pode não ter dados de localidade completos; por isso a formatação é manual,
// com os mesmos textos que o navegador produz em pt-BR.
function plural(amount: number, singular: string, pluralWord: string) {
  return `${amount} ${amount === 1 ? singular : pluralWord}`;
}

export function relativeTime(value: string | Date) {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (minutes === 0) return "agora";
  if (Math.abs(minutes) < 60) {
    const text = plural(Math.abs(minutes), "minuto", "minutos");
    return minutes < 0 ? `há ${text}` : `em ${text}`;
  }
  if (Math.abs(hours) < 24) {
    const text = plural(Math.abs(hours), "hora", "horas");
    return hours < 0 ? `há ${text}` : `em ${text}`;
  }
  if (days === -1) return "ontem";
  if (days === 1) return "amanhã";
  const text = plural(Math.abs(days), "dia", "dias");
  return days < 0 ? `há ${text}` : `em ${text}`;
}

const pad = (value: number) => String(value).padStart(2, "0");

export function dateTime(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function feedStatus(feed?: { status: string; last_success_at: string | null } | null) {
  const messages: Record<string, string> = {
    current: "Sincronização concluída. Avisos vigentes da última consulta.",
    stale: "Sincronização atrasada. Exibindo apenas avisos salvos ainda vigentes.",
    unavailable: "INMET indisponível na última tentativa. Os avisos salvos continuam até sua validade.",
    pending: "Aguardando a primeira sincronização do INMET.",
    disabled: "Sincronização do INMET desativada nesta instalação.",
  };
  const message = messages[feed?.status ?? ""] ?? "Estado da sincronização não disponível.";
  return message + (feed?.last_success_at ? ` Última consulta: ${dateTime(feed.last_success_at)}.` : "");
}

export function weatherEmoji(condition: string) {
  const text = condition.toLowerCase();
  if (/tempestade|granizo/.test(text)) return "⛈️";
  if (/chuva|garoa/.test(text)) return "🌧️";
  if (/limpo/.test(text)) return "☀️";
  return "☁️";
}

export function metric(value: string | number | null, unit = "") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const rounded = Math.round(Number(value) * 10) / 10;
  return `${String(rounded).replace(".", ",")}${unit}`;
}

/** Abre somente links HTTPS das fontes confiáveis, como o site faz. */
export function trustedSource(url: string | null | undefined) {
  if (!url) return null;
  const match = /^https:\/\/([^/:@]+)(?:[/?#]|$)/i.exec(url);
  if (!match) return null;
  const host = match[1].toLowerCase();
  return ["inmet.gov.br", "open-meteo.com"].some((item) => host === item || host.endsWith(`.${item}`)) ? url : null;
}

export function olderThanOneDay(value: string) {
  return Date.now() - new Date(value).getTime() > 86400000;
}
