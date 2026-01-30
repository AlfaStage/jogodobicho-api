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
    },
});

app.register(swaggerUi, {
    routePrefix: '/docs',
});

// Middleware de Auth
app.addHook('onRequest', async (request, reply) => {
    // Permitir rotas públicas (docs, health) sem auth se desejar, ou proteger tudo.
    // O usuário pediu "s tera uma key q sera configurada no env", mas não disse se era pra tudo.
    // Vamos deixar /docs e /health publicos.
    if (request.url.startsWith('/docs') || request.url.startsWith('/health')) return;

    const apiKey = request.headers['x-api-key'];
    const envKey = process.env.API_KEY;

    if (envKey && apiKey !== envKey) {
        reply.code(401).send({ error: 'Unauthorized: Invalid API Key' });
    }
});

// Registrar rotas
import { numerologiaRoutes } from './routes/numerologia.js';
import { webhooksRoutes } from './routes/webhooks.js';

// ...

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
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3333;
        await app.listen({ port, host: '0.0.0.0' });
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Docs running at http://localhost:${port}/docs`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
