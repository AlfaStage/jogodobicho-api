import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { WebhookService } from '../services/WebhookService.js';

export async function webhooksRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();
    const service = new WebhookService();

    server.post('/', {
        schema: {
            summary: 'Registrar Webhook',
            description: 'Registra um novo URL para receber notificações de novos resultados em tempo real.',
            tags: ['Webhooks'],
            body: z.object({
                url: z.string().url().describe('URL de destino do POST (ex: n8n webhook)')
            }),
            response: {
                201: z.object({ message: z.string() }).describe('Sucesso no registro')
            }
        }
    }, async (req, reply) => {
        const { url } = req.body;
        await service.register(url);
        return reply.status(201).send({ message: 'Webhook registrado com sucesso' });
    });

    server.get('/', {
        schema: {
            summary: 'Listar Webhooks',
            description: 'Lista todos os webhooks registrados no sistema.',
            tags: ['Webhooks'],
            response: {
                200: z.array(z.object({
                    id: z.string().uuid().describe('ID único do webhook'),
                    url: z.string().url().describe('URL registrada'),
                    created_at: z.string().describe('Data de criação')
                })).describe('Lista de webhooks')
            }
        }
    }, async () => {
        return service.list() as any[];
    });

    server.delete('/:id', {
        schema: {
            summary: 'Remover Webhook',
            description: 'Remove um webhook do sistema pelo seu ID.',
            tags: ['Webhooks'],
            params: z.object({
                id: z.string().uuid().describe('ID do webhook a remover')
            }),
            response: {
                204: z.null().describe('Webhook removido com sucesso')
            }
        }
    }, async (req, reply) => {
        const { id } = req.params;
        service.delete(id);
        return reply.status(204).send(null);
    });
}
