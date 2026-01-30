# Jogo do Bicho API & MCP Server

API robusta para consulta de resultados do Jogo do Bicho, horóscopo, animais e instruções de jogo. Inclui servidor MCP para integração com Agentes de IA.

## 🚀 Funcionalidades

- **Resultados em Tempo Real:** Scraper integrado que busca dados do "Deu no Poste".
- **API REST:** Rotas para lotéricas, resultados, bichos e horóscopo.
- **MCP Server:** Interface para conectar Agentes de IA (Claude, etc) diretamente ao banco local.
- **SQLite Local:** Performance máxima sem dependência de APIs externas lentas no momento da consulta.

## 📦 Instalação

1. Clone o repositório.
2. Instale as dependências:
\`\`\`bash
npm install
\`\`\`

3. Inicialize o banco de dados e as tabelas:
\`\`\`bash
node src/init-db.js
\`\`\`

## 🛠️ Como Usar

### 1. Coletar Dados (Scraper)
Execute o scraper para popular o banco com os últimos resultados:
\`\`\`bash
npx tsx src/debug-scraper.ts
\`\`\`
*Dica: Você pode configurar um cronjob para rodar isso periodicamente.*

### 2. Rodar a API
Inicie o servidor API (padrão porta 3333):
\`\`\`bash
npm run dev
\`\`\`
- Swagger UI: [http://localhost:3333/docs](http://localhost:3333/docs)
- Health Check: [http://localhost:3333/health](http://localhost:3333/health)

### 3. Rodar Servidor MCP (Para IAs e n8n)
Temos dois modos:
1.  **Stdio (Claude Desktop):**
    \`\`\`bash
    npm run mcp
    \`\`\`
2.  **SSE (n8n / HTTP):**
    \`\`\`bash
    npm run mcp:sse
    \`\`\`
    - URL SSE: `http://localhost:3001/sse`
    - Mensagens: `http://localhost:3001/messages`

## 🔔 Webhooks (Tempo Real)
Receba notificações POST assim que novos resultados forem detectados.

**Registrar Webhook:**
\`POST /v1/webhooks\`
\`\`\`json
{ "url": "https://seu-sistema.com/hook" }
\`\`\`

**Payload do Evento:**
\`\`\`json
{
  "event": "novo_resultado",
  "data": {
    "loterica": "pt-rio",
    "horario": "PTM",
    "premios": [...]
  }
}
\`\`\`

## 📚 Rotas Principais

- `GET /v1/resultados`: Últimos resultados.
- `GET /v1/horoscopo`: Horóscopo do dia (fonte real).
- `GET /v1/numerologia`: Cálculo numerológico (query: `nome`).
- `GET /v1/comojogar`: Regras e História (fonte real).
- `GET /v1/webhooks`: Gerenciar webhooks.

## 🚀 Deploy no EasyPanel (Docker)

Esta API está pronta para ser implantada em qualquer ambiente Docker, incluindo EasyPanel.

### 1. Configuração do Projeto
1.  No EasyPanel, crie um novo **App Service**.
2.  **Source:** Conecte seu repositório GitHub ou escolha "Docker Image" se tiver publicado.
    - Se usar GitHub, o EasyPanel detectará o `Dockerfile` na raiz.

### 2. Variáveis de Ambiente
Configure as variáveis na aba "Environment":
\`\`\`env
# Opcional: Chave para proteger a API
API_KEY=sua_senha_secreta

# Obrigatório para persistência no EasyPanel
# Caminho onde o banco será salvo DENTRO do container
DATABASE_PATH=/app/data/prod.db
\`\`\`

### 3. Persistência de Dados (Importante!)
Para não perder os dados (resultados, inscrições de webhook) ao reiniciar o container, você deve configurar um **Volume**.

1.  Vá na aba **Storage/Volumes**.
2.  Adicione um "Mount":
    -   **Mount Path (Container):** `/app/data` (Deve corresponder ao diretório do `DATABASE_PATH`)
    -   **Volume Name (Host):** Deixe o EasyPanel criar ou defina um nome (ex: `jogodobicho-data`).

### 4. Deploy
Clique em **Deploy**. O Dockerfile cuidará de instalar as dependências, compilar o TypeScript e iniciar o banco.

---

## 🏗️ Estrutura do Projeto

- `src/routes`: Definição das rotas API.
- `src/scrapers`: Lógica de extração de dados (Cheerio).
- `src/mcp`: Implementação do servidor Model Context Protocol.
- `src/db.ts`: Conexão SQLite (Better-SQLite3).
