import fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { resultadosRoutes } from './routes/resultados.js';
import { lotericasRoutes } from './routes/lotericas.js';
import { bichosRoutes } from './routes/bichos.js';
import { horoscopoRoutes } from './routes/horoscopo.js';
import { comoJogarRoutes } from './routes/comojogar.js';
import { numerologiaRoutes } from './routes/numerologia.js';
import { webhooksRoutes } from './routes/webhooks.js';
import { adminRoutes } from './routes/admin.js';
import { registerMcpRoutes } from './mcp/fastify-mcp.js';
import { CronService } from './services/CronService.js';
import { StartupSyncService } from './services/StartupSyncService.js';
import fs from 'fs';
import path from 'path';

const app = fastify({
    logger: true,
    trustProxy: true // Essencial para rodar atrás de reverse proxy (Easypanel/Nginx)
});

// Registrar plugin de arquivos estáticos
app.register(fastifyStatic, {
    root: path.resolve('public'),
    prefix: '/public/', // Opcional: prefixo para URL
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(cors, { origin: '*' });

app.register(swagger, {
    openapi: {
        info: {
            title: 'Jogo do Bicho API',
            description: 'API para resultados do Jogo do Bicho, Horóscopo e Numerologia',
            version: '1.0.0',
        },
        components: {
            securitySchemes: {
                apiKey: {
                    type: 'apiKey',
                    name: 'x-api-key',
                    in: 'header',
                },
            },
        },
        security: [{ apiKey: [] }],
    },
    transform: jsonSchemaTransform,
});

app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
        persistAuthorization: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
});

// Middleware de Auth
app.addHook('onRequest', async (request, reply) => {
    // Permitir rotas públicas
    if (
        request.url.startsWith('/docs') ||
        request.url.startsWith('/health') ||
        request.url.startsWith('/admin') || // Rota base do admin
        request.url.startsWith('/live') || // Página ao vivo
        request.url.startsWith('/css') || // CSS global
        request.url.startsWith('/public') || // Arquivos estáticos
        request.url.startsWith('/sse') || // MCP SSE
        request.url.startsWith('/messages') || // MCP Messages
        request.url === '/favicon.ico'
    ) return;

    const apiKey = request.headers['x-api-key'];
    const envKey = process.env.API_KEY;

    // Se tiver KEY no env, validar. Se não tiver, liberar (ou vice versa dependendo do rigor)
    if (envKey && apiKey !== envKey) {
        reply.code(401).send({ error: 'Unauthorized: Invalid API Key' });
    }
});

// Registrar rotas MCP
app.register(registerMcpRoutes);
app.register(resultadosRoutes, { prefix: '/v1/resultados' });
app.register(lotericasRoutes, { prefix: '/v1/lotericas' });
app.register(bichosRoutes, { prefix: '/v1/bichos' });
app.register(horoscopoRoutes, { prefix: '/v1/horoscopo' });
app.register(numerologiaRoutes, { prefix: '/v1/numerologia' });
app.register(webhooksRoutes, { prefix: '/v1/webhooks' });
app.register(comoJogarRoutes, { prefix: '/v1/como-jogar' });
app.register(adminRoutes, { prefix: '/admin' });

app.get('/health', async () => {
    return { status: 'ok', uptime: process.uptime() };
});

app.get('/live', async (req, reply) => {
    const html = fs.readFileSync(path.resolve('public/live.html'), 'utf-8');
    reply.header('Content-Type', 'text/html');
    return reply.send(html);
});

// Servir CSS
app.get('/css/:file', async (req, reply) => {
    const { file } = req.params as { file: string };
    try {
        const css = fs.readFileSync(path.resolve(`public/css/${file}`), 'utf-8');
        reply.header('Content-Type', 'text/css');
        return reply.send(css);
    } catch {
        return reply.status(404).send('CSS Not Found');
    }
});

let cronService: CronService | null = null;

const start = async () => {
    try {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
        await app.listen({ port, host: '0.0.0.0' });

        // Iniciar Cron Service (apenas uma vez)
        if (!cronService) {
            cronService = new CronService();
            console.log('[Server] CronService inicializado');
        }

        // Sincronização Inicial (não bloqueante)
        const syncService = new StartupSyncService();
        syncService.sync().catch(err => console.error('[StartupSyncService] Erro na sincronização inicial:', err));

        console.log(`Server running at http://localhost:${port}`);
        console.log(`Docs running at http://localhost:${port}/docs`);
        console.log(`MCP SSE available at http://localhost:${port}/sse`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
