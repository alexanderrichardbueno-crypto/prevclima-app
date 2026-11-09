import { SvgUri } from "react-native-svg";

import { useCallback, useEffect, useState } from "react";

import { request, type Education, getServer } from "@/api";
import { Body, Card, Empty, Loading, Message, Screen, SourceLink, Title } from "@/components/ui";

export default function EducationScreen() {
  const [items, setItems] = useState<Education[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await request<Education[]>("/education"));
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return (
    <Screen topInset={false} onRefresh={refresh} refreshing={refreshing}>
      <Title>Prepare-se com segurança</Title>
      <Body muted size={13}>Orientações publicadas pela equipe PrevClima</Body>
      <Message text={error} />
      {!items && !error && <Loading text="Carregando informações..." />}
      {items && !items.length && <Empty text="Nenhuma informação foi publicada ainda." />}
      {items?.map((item) => (
        <Card key={item.id}>
          <Title size={18}>{item.title}</Title>
          <Body size={14}>{item.body}</Body>
          {item.media_url ? <SvgUri uri={`${getServer()}${item.media_url}`} width="100%" height={140} /> : null}
          <SourceLink url={/^https?:\/\//.test(item.reference_url) ? item.reference_url : null} label="Consultar fonte ↗" />
        </Card>
      ))}
    </Screen>
  );
}
