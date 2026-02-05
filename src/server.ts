import 'dotenv/config';
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
import { logger } from './utils/logger.js';
import fs from 'fs';
import path from 'path';
import './init-db.js'; // Garantir que as tabelas existam no startup

// Validação de variáveis de ambiente obrigatórias
const requiredEnvVars = ['API_KEY'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        logger.error('Server', `Variável de ambiente ${envVar} não definida`);
        process.exit(1);
    }
}

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

// Configuração aprimorada do Swagger
app.register(swagger, {
    openapi: {
        openapi: '3.0.3',
        info: {
            title: '🎰 Jogo do Bicho API',
            description: `
## API Completa para Resultados do Jogo do Bicho

Esta API fornece acesso aos resultados do Jogo do Bicho de diversas lotéricas, horóscopo diário, numerologia e sistema de webhooks para notificações em tempo real.

### 🔐 Autenticação
Todas as requisições devem incluir o header:
\`\`\`
x-api-key: SUA_API_KEY
\`\`\`

### 📚 Tags Organizadas
- **📊 Resultados** - Consulta de resultados e premiações
- **🦁 Bichos** - Tabela completa de bichos e grupos
- **🔮 Horóscopo** - Previsões diárias por signo
- **🔢 Numerologia** - Cálculo de números da sorte
- **🏪 Lotéricas** - Listagem de bancas disponíveis
- **🪝 Webhooks** - Sistema de notificações em tempo real
- **ℹ️ Info** - Informações sobre como jogar

### 📖 Exemplos de Uso

#### Listar últimos resultados:
\`\`\`bash
curl -X GET "https://api.exemplo.com/v1/resultados?limit=5" \\
  -H "x-api-key: SUA_API_KEY"
\`\`\`

#### Buscar resultado por data:
\`\`\`bash
curl -X GET "https://api.exemplo.com/v1/resultados?data=2026-02-04&loterica=pt-rio" \\
  -H "x-api-key: SUA_API_KEY"
\`\`\`

#### Consultar horóscopo:
\`\`\`bash
curl -X GET "https://api.exemplo.com/v1/horoscopo?data=2026-02-04" \\
  -H "x-api-key: SUA_API_KEY"
\`\`\`

#### Calcular numerologia:
\`\`\`bash
curl -X GET "https://api.exemplo.com/v1/numerologia?nome=Joao+Silva" \\
  -H "x-api-key: SUA_API_KEY"
\`\`\`

#### Registrar webhook:
\`\`\`bash
curl -X POST "https://api.exemplo.com/v1/webhooks" \\
  -H "x-api-key: SUA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://seu-webhook.com/endpoint"}'
\`\`\`

---
**Desenvolvida com ❤️ para a comunidade do Jogo do Bicho**
            `,
            version: '1.0.0',
            contact: {
                name: 'Suporte API',
                email: 'suporte@exemplo.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        externalDocs: {
            description: 'Documentação completa',
            url: '/docs'
        },
        servers: [
            {
                url: '/',
                description: 'Servidor local'
            },
            {
                url: 'http://localhost:3002',
                description: 'Desenvolvimento local'
            },
            {
                url: 'https://api.jogodobicho.com',
                description: 'Produção'
            }
        ],
        tags: [
            { name: '📊 Resultados', description: 'Consulta de resultados do Jogo do Bicho em tempo real' },
            { name: '🖼️ Compartilhamento', description: 'Geração de imagens e HTML para compartilhamento' },
            { name: '🦁 Bichos', description: 'Tabela completa de bichos e suas dezenas' },
            { name: '🔮 Horóscopo', description: 'Previsões diárias do horóscopo por signo' },
            { name: '🔢 Numerologia', description: 'Cálculo de números da sorte pelo nome' },
            { name: '🏪 Lotéricas', description: 'Listagem de bancas e lotéricas disponíveis' },
            { name: '🪝 Webhooks', description: 'Sistema de webhooks para notificações em tempo real' },
            { name: 'ℹ️ Info', description: 'Informações sobre como jogar e regras' },
            { name: '⚙️ Admin', description: 'Endpoints administrativos' },
            { name: '💓 Health', description: 'Verificação de saúde da API' }
        ],
        components: {
            securitySchemes: {
                apiKey: {
                    type: 'apiKey',
                    name: 'x-api-key',
                    in: 'header',
                    description: 'Chave de API fornecida para autenticação'
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Unauthorized' },
                        message: { type: 'string', example: 'Invalid API Key' }
                    }
                },
                ValidationError: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Validation Error' },
                        message: { type: 'string', example: 'Invalid input data' },
                        details: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            },
            examples: {
                ResultadoExample: {
                    summary: 'Exemplo de resultado',
                    value: {
                        id: "550e8400-e29b-41d4-a716-446655440000",
                        data: "2026-02-04",
                        horario: "16:20",
                        loterica: "PT Rio / Deu no Poste",
                        share_url: "https://api.exemplo.com/v1/resultados/550e8400-e29b-41d4-a716-446655440000/html",
                        image_url: "https://api.exemplo.com/v1/resultados/550e8400-e29b-41d4-a716-446655440000/image",
                        premios: [
                            { posicao: 1, milhar: "1234", grupo: 9, bicho: "Cobra" },
                            { posicao: 2, milhar: "5678", grupo: 20, bicho: "Peru" },
                            { posicao: 3, milhar: "9012", grupo: 3, bicho: "Burro" },
                            { posicao: 4, milhar: "3456", grupo: 14, bicho: "Gato" },
                            { posicao: 5, milhar: "7890", grupo: 23, bicho: "Urso" }
                        ]
                    }
                },
                BichoExample: {
                    summary: 'Exemplo de bicho',
                    value: {
                        grupo: 9,
                        nome: "Cobra",
                        dezenas: ["21", "22", "23", "24"]
                    }
                },
                HoroscopoExample: {
                    summary: 'Exemplo de horóscopo',
                    value: {
                        signo: "Áries",
                        texto: "Hoje é um dia favorável para novos projetos. Sua energia está alta e o universo conspira a seu favor.",
                        numeros: "09, 21, 34, 45, 67",
                        data: "2026-02-04"
                    }
                },
                WebhookExample: {
                    summary: 'Exemplo de webhook',
                    value: {
                        id: "550e8400-e29b-41d4-a716-446655440000",
                        url: "https://n8n.exemplo.com/webhook/jogo-do-bicho",
                        created_at: "2026-02-04T10:30:00.000Z",
                        lotericas: [
                            { slug: "pt-rio", nome: "PT Rio / Deu no Poste", enabled: true },
                            { slug: "look-goias", nome: "LOOK Goiás", enabled: true }
                        ]
                    }
                },
                WebhookPayloadExample: {
                    summary: 'Payload enviado pelo webhook',
                    value: {
                        event: "novo_resultado",
                        data: {
                            id: "550e8400-e29b-41d4-a716-446655440000",
                            data: "2026-02-04",
                            horario: "16:20",
                            loterica: "PT Rio / Deu no Poste",
                            premios: [
                                { posicao: 1, milhar: "1234", grupo: 9, bicho: "Cobra" },
                                { posicao: 2, milhar: "5678", grupo: 20, bicho: "Peru" }
                            ]
                        },
                        timestamp: "2026-02-04T16:20:05.000Z"
                    }
                }
            }
        },
        security: [{ apiKey: [] }],
    },
    transform: jsonSchemaTransform,
});

app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        defaultModelRendering: 'model',
        displayOperationId: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    theme: {
        title: 'Jogo do Bicho API'
    }
});

// Middleware de Auth
app.addHook('onRequest', async (request, reply) => {
    // Permitir rotas públicas
    if (
        request.url.startsWith('/docs') ||
        request.url.startsWith('/health') ||
        request.url.startsWith('/live') || // Página ao vivo
        request.url.startsWith('/css') || // CSS global
        request.url.startsWith('/public') || // Arquivos estáticos
        request.url.startsWith('/sse') || // MCP SSE
        request.url.startsWith('/messages') || // MCP Messages
        request.url.startsWith('/mcp') || // MCP HTTP endpoints (health, tools, execute, streamable)
        request.url === '/favicon.ico'
    ) return;

    const apiKey = request.headers['x-api-key'] || (request.query as any)?.key;
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

app.get('/health', {
    schema: {
        tags: ['💓 Health'],
        summary: 'Verificar Saúde da API',
        description: 'Retorna informações sobre o estado atual da API',
        response: {
            200: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'ok' },
                    uptime: { type: 'number', example: 3600 },
                    timestamp: { type: 'string', example: '2026-02-04T12:00:00.000Z' }
                }
            }
        }
    }
}, async () => {
    return {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    };
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
let syncService: StartupSyncService | null = null;
let isStarting = false;

const start = async () => {
    if (isStarting) {
        logger.info('Server', 'Inicialização já em andamento, ignorando...');
        return;
    }

    isStarting = true;

    try {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
        await app.listen({ port, host: '0.0.0.0' });

        // Iniciar Cron Service (apenas uma vez)
        if (!cronService) {
            cronService = new CronService();
            cronService.start();
            logger.success('Server', 'CronService inicializado e iniciado');

            // Verificar horóscopo na inicialização (se for após 6h e não tiver dados)
            cronService.checkHoroscopoOnStartup().catch(err => {
                logger.error('Server', 'Erro na verificação de horóscopo na inicialização:', err);
            });
        }

        // Sincronização Inicial de resultados (singleton pattern)
        if (!syncService) {
            syncService = new StartupSyncService();
            syncService.sync().catch(err => logger.error('StartupSyncService', 'Erro na sincronização inicial:', err));
        }

        logger.success('Server', `Server running at http://localhost:${port}`);
        logger.info('Server', `Docs running at http://localhost:${port}/docs`);
        logger.info('Server', `MCP SSE available at http://localhost:${port}/sse`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    } finally {
        isStarting = false;
    }
};

start();

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    logger.info('Server', `${signal} recebido. Iniciando graceful shutdown...`);

    try {
        // Fechar servidor Fastify
        await app.close();
        logger.success('Server', 'Servidor Fastify fechado');

        // Fechar serviços
        if (cronService) {
            logger.info('Server', 'Parando CronService...');
            cronService.stop();
        }

        logger.success('Server', 'Shutdown completo');
        process.exit(0);
    } catch (error) {
        logger.error('Server', 'Erro durante shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
