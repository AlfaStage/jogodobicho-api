# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências de build (necessário para compiladores nativos se houver)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Instalar dependências de produção apenas
COPY package*.json ./
RUN npm install --production

# Copiar build e scripts necessários
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src 
# Copiamos src pois alguns scrapers/serviços podem depender de arquivos não compilados ou estrutura (ex: init-db.js se rodar com node)
# Mas idealmente tudo estaria em dist. O script init-db.js é JS, então ok.

# Copiar script de inicialização do DB se necessário
COPY src/init-db.js ./init-db.js

# Expor portas (API e SSE)
EXPOSE 3334 3001

# Variáveis de ambiente default
ENV PORT=3334
ENV NODE_ENV=production

# Comando de entrada
# Usa um script simples para iniciar migrations (se precisar) e depois o server
CMD ["sh", "-c", "node init-db.js && node dist/server.js"]
