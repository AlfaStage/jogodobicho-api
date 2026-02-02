# Jogo do Bicho API & MCP Server

API robusta para consulta de resultados do Jogo do Bicho, horóscopo, animais e instruções de jogo. Inclui servidor MCP unificado e automação via Cron Jobs.

## 🚀 Funcionalidades

- **Resultados em Tempo Real:** Scraper inteligente que detecta resultados automaticamente.
- **Cron Jobs Integrados:** Execução automática 1 minuto após os sorteios oficiais (PT Rio, Federal, Look, etc).
- **API REST (Fastify):** Rotas completas com documentação Swagger interativa.
- **MCP Server (SSE):** Interface unificada para Agentes de IA (Claude via n8n ou local).
- **Webhooks:** Notificações instantâneas via POST para novos resultados.

## 📦 Instalação

1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Compile o projeto:
   ```bash
   npm run build
   ```

## 🛠️ Como Usar

### 1. Rodar em Desenvolvimento
Inicie o servidor com auto-reload (porta 3000):
```bash
npm run dev
```
- **API & Docs:** [http://localhost:3000/docs](http://localhost:3000/docs)
- **MCP SSE:** `http://localhost:3000/sse`

### 2. Autenticação
A API é protegida pela variável de ambiente `API_KEY`.
- No Swagger, use o botão **Authorize** para inserir sua chave.
- Nas requisições, envie o cabeçalho: `x-api-key: SUA_CHAVE`.

### 3. Cron Jobs (Automação)
O sistema possui um `CronService` interno que gerencia as coletas:
- **PT Rio:** 11:21, 14:21, 16:21, 18:21, 21:21.
- **Federal:** 19:01 (Quartas e Sábados).
- **Global:** Varredura a cada 15 minutos.
- **Horóscopo:** Diariamente às 06:00.

## 📚 Endpoints Principais

- `GET /v1/resultados`: Consulta resultados históricos e recentes.
- `GET /v1/lotericas`: Lista as lotéricas suportadas.
- `GET /v1/horoscopo`: Previsões diárias por signo.
- `GET /v1/numerologia`: Números da sorte baseados em nomes.
- `GET /v1/webhooks`: Gerenciamento de notificações Push.
- `GET /v1/como-jogar`: Guia e história do jogo.

## 🚀 Deploy no EasyPanel (Docker)

1. Crie um **App Service**.
2. Configure as **Environment Variables**:
   - `API_KEY`: Sua senha de acesso.
   - `DATABASE_PATH`: `/app/data/prod.db` (Importante para persistência).
3. Configure um **Volume/Mount**:
   - Mount Path: `/app/data`.
4. O `Dockerfile` cuidará do resto (compilação e inicialização do banco).

---

## 🏗️ Estrutura do Projeto

- `src/server.ts`: Ponto de entrada (Fastify + MCP + Cron).
- `src/mcp`: Lógica do servidor Model Context Protocol.
- `src/scrapers`: Motores de raspagem de dados reais.
- `src/services`: Serviços de Webhooks, Cron e Numerologia.
- `src/db.ts`: Conexão SQLite (Better-SQLite3).
