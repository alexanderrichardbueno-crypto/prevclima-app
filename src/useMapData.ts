import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { request, type MapData } from "./api";
import { dateTime } from "./format";

/** Consulta /map-data e repete a cada 5 minutos enquanto a tela estiver aberta (como o site). */
export function useMapData(initialQuery = "") {
  const [data, setData] = useState<MapData | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Consultando fontes meteorológicas…");
  const [recenterKey, setRecenterKey] = useState(0);
  const requestId = useRef(0);

  const fetchData = useCallback(async (next: string) => {
    const id = ++requestId.current;
    try {
      const result = await request<MapData>(`/map-data${next ? `?${next}` : ""}`);
      if (id !== requestId.current) return false;
      setData(result);
      setError("");
      setStatus(`Consulta ${dateTime(result.generated_at).slice(-5)} · atualização automática a cada 5 min`);
      return true;
    } catch (err) {
      if (id === requestId.current) setError((err as Error).message);
      return false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void Promise.resolve().then(() => fetchData(query));
      const timer = setInterval(() => void fetchData(query), 5 * 60 * 1000);
      return () => clearInterval(timer);
    }, [fetchData, query]),
  );

  /** Nova busca: troca os parâmetros e recentraliza o mapa. */
  const search = useCallback(
    async (next: string) => {
      setQuery(next);
      setRecenterKey((key) => key + 1);
      return fetchData(next);
    },
    [fetchData],
  );

  const refresh = useCallback(() => fetchData(query), [fetchData, query]);

  return { data, query, error, setError, status, recenterKey, search, refresh };
}
