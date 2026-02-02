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

# Copiar build (contém o init-db.js compilado)
COPY --from=builder /app/dist ./dist

# Expor portas (API e SSE)
EXPOSE 3002 3001

# Variáveis de ambiente default
ENV PORT=3002
ENV NODE_ENV=production

# Comando de entrada
# Usa um script simples para iniciar migrations (se precisar) e depois o server
CMD ["sh", "-c", "node dist/init-db.js && node dist/server.js"]
