# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências de build necessárias para better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Instalar bibliotecas de runtime necessárias
RUN apk add --no-cache libstdc++ gcompat
# Instalar dependências de produção apenas
COPY package*.json ./
RUN npm install --production

# Copiar build e arquivos de dados/assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/src/assets ./src/assets
COPY --from=builder /app/src/templates ./src/templates
COPY --from=builder /app/public ./public

# Expor porta da API
EXPOSE 3002

# Variáveis de ambiente default
ENV PORT=3002
ENV NODE_ENV=production

# Comando de entrada
CMD ["sh", "-c", "node dist/init-db.js && node dist/server.js"]
