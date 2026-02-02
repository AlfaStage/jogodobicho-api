import fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { resultadosRoutes } from './routes/resultados.js';
import { lotericasRoutes } from './routes/lotericas.js';
import { bichosRoutes } from './routes/bichos.js';
import { horoscopoRoutes } from './routes/horoscopo.js';
import { comoJogarRoutes } from './routes/comojogar.js';

const app = fastify({ logger: true });

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
        request.url === '/favicon.ico'
    ) return;

    const apiKey = request.headers['x-api-key'];
    const envKey = process.env.API_KEY;

    // Se tiver KEY no env, validar. Se não tiver, liberar (ou vice versa dependendo do rigor)
    if (envKey && apiKey !== envKey) {
        reply.code(401).send({ error: 'Unauthorized: Invalid API Key' });
    }
});

// Registrar rotas
import { numerologiaRoutes } from './routes/numerologia.js';
import { webhooksRoutes } from './routes/webhooks.js';
import { registerMcpRoutes } from './mcp/fastify-mcp.js';
import { CronService } from './services/CronService.js';

app.register(registerMcpRoutes); // Unificado
app.register(resultadosRoutes, { prefix: '/v1/resultados' });
app.register(lotericasRoutes, { prefix: '/v1/lotericas' });
app.register(bichosRoutes, { prefix: '/v1/bichos' });
app.register(horoscopoRoutes, { prefix: '/v1/horoscopo' });
app.register(numerologiaRoutes, { prefix: '/v1/numerologia' });
app.register(webhooksRoutes, { prefix: '/v1/webhooks' });
app.register(comoJogarRoutes, { prefix: '/v1/como-jogar' });

app.get('/health', async () => {
    return { status: 'ok', uptime: process.uptime() };
});

const start = async () => {
    try {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
        await app.listen({ port, host: '0.0.0.0' });

        // Iniciar Cron
        const cron = new CronService();
        cron.start();

        console.log(`Server running at http://localhost:${port}`);
        console.log(`Docs running at http://localhost:${port}/docs`);
        console.log(`MCP SSE available at http://localhost:${port}/sse`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
