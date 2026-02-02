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

## 📚 Endpoints da API

A API segue padrões REST e utiliza JSON para comunicação. Todas as chamadas (exceto `/docs` e `/health`) requerem o header `x-api-key`.

### 1. Resultados (`/v1/resultados`)
Retorna os resultados dos sorteios.
- **Query Params:**
  - `data`: Formato `YYYY-MM-DD` (ex: `2024-05-20`).
  - `loterica`: Slug da banca (ex: `pt-rio`, `look-goias`, `federal`).

**Exemplo Curl:**
```bash
curl -X GET "http://localhost:3002/v1/resultados?loterica=pt-rio&data=2024-05-20" \
     -H "x-api-key: SUA_CHAVE"
```

**Exemplo Resposta:**
```json
[
  {
    "id": "uuid-v4",
    "data": "2024-05-20",
    "horario": "11:00",
    "loterica": "PT Rio / Deu no Poste",
    "premios": [
      { "posicao": 1, "milhar": "1234", "grupo": 9, "bicho": "Cobra" },
      ...
    ]
  }
]
```

### 2. Lotéricas (`/v1/lotericas`)
Lista todas as bancas configuradas no sistema.

**Exemplo Curl:**
```bash
curl -X GET "http://localhost:3002/v1/lotericas" \
     -H "x-api-key: SUA_CHAVE"
```

### 3. Bichos (`/v1/bichos`)
Consulta a tabela do Jogo do Bicho.
- `GET /v1/bichos`: Lista todos os grupos.
- `GET /v1/bichos/:query`: Busca por número do grupo ou dezena.

**Exemplo Curl (Busca por dezena 34):**
```bash
curl -X GET "http://localhost:3002/v1/bichos/34" \
     -H "x-api-key: SUA_CHAVE"
```

### 4. Horóscopo (`/v1/horoscopo`)
Previsões diárias com números da sorte sugeridos.
- **Query Param:** `data` (opcional).

**Exemplo Curl:**
```bash
curl -X GET "http://localhost:3002/v1/horoscopo?data=2024-05-20" \
     -H "x-api-key: SUA_CHAVE"
```

### 5. Numerologia (`/v1/numerologia`)
Calcula o número da sorte baseado no nome (Tabela Pitagórica).
- **Query Param:** `nome` (obrigatório).

**Exemplo Curl:**
```bash
curl -X GET "http://localhost:3002/v1/numerologia?nome=Antigravity" \
     -H "x-api-key: SUA_CHAVE"
```

---

## 🏗️ Estrutura do Projeto

- `src/server.ts`: Ponto de entrada (Fastify + MCP + Cron).
- `src/config/loterias.ts`: Registro central de bancas e horários.
- `src/mcp`: Lógica do servidor Model Context Protocol.
- `src/scrapers`: Motores de raspagem (Global, GigaBicho, ResultadoFácil).
- `src/services`: Webhooks, Cron, ScraperService e Numerologia.
- `src/db.ts`: Conexão SQLite (Better-SQLite3).
