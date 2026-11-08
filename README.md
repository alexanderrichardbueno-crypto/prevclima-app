# PrevClima — aplicativo React Native

Versão mobile nativa (Expo + React Native) do site PrevClima. **Não existe um
backend separado**: o app consome as mesmas rotas `/api/v1/...` do FastAPI em
`../TCC-backend-main`, portanto lê e grava no **mesmo banco de dados** (contas,
preferências, avisos, estações).

A única diferença em relação ao site é o transporte da sessão: o site usa cookie
`HttpOnly`; o app guarda o token no armazenamento seguro do aparelho
(`expo-secure-store`) e o envia em `Authorization: Bearer`. A rota
`POST /api/v1/auth/login-mobile` passou a devolver também `access_token` no corpo
(o login do site continua sem expor o token).

## Telas

| App | Site equivalente | Rotas da API |
| --- | --- | --- |
| Entrar / Criar conta / Visitante | `index.html`, `cadastro.html` | `auth/login-mobile`, `auth/register`, `auth/mobile-session` |
| Início (previsão, avisos, localização) | `inicio.html`, `localizacao.html` | `home`, `users/me` |
| Estações | `estacoes.html` | `stations`, `stations/{code}/observations` |
| Mapa (previsão, avisos, áreas publicadas pelo painel) | `mapa.html` | `map-data` |
| Alertas (marcar como lido) | `alertas.html` | `alerts`, `alerts/{id}/read` |
| Perfil (dados, GPS, notificações, tema) | `perfil.html` | `users/me`, `auth/logout` |
| Informações educativas | `informacoes.html` | `education` |

Assim como o PWA em `/mobile/`, o login do app aceita apenas contas `USER`;
meteorologistas continuam usando a central do site. O tema
escuro/claro segue a preferência salva na conta (vale nos dois).

## Executar

1. Suba o backend expondo-o na rede local (o padrão só escuta em `127.0.0.1`).
   No `.env` do backend:

   ```
   PREVCLIMA_BIND=0.0.0.0
   ```

   e rode `docker compose up -d --build` (ou `uvicorn app.main:app --host 0.0.0.0 --port 18080`).
   Se o Firewall do Windows perguntar, permita redes privadas.

2. Instale e inicie o app:

   ```bash
   cd prevclima-app
   npm install
   npx expo start
   ```

   Leia o QR code com o **Expo Go** (Android/iOS) no mesmo Wi-Fi do computador.

O endereço da API é descoberto automaticamente (IP do computador que roda o Expo,
porta `18080`). Para outro endereço, crie `.env` a partir de `.env.example` com
`EXPO_PUBLIC_API_URL=http://SEU_IP:PORTA`, ou toque em **Servidor · alterar**
na tela de login. No emulador Android, `http://10.0.2.2:18080` aponta para o
computador.

Para gerar um APK/AAB instalável: `npx eas-cli@latest build -p android`.
Em produção use HTTPS no backend.

## Verificação

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
