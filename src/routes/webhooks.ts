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
            tags: ['Webhooks'],
            body: z.object({
                url: z.string().url()
            }),
            response: {
                201: z.object({ message: z.string() })
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
            tags: ['Webhooks'],
            response: {
                200: z.array(z.object({
                    id: z.string(),
                    url: z.string(),
                    created_at: z.string()
                }))
            }
        }
    }, async () => {
        return service.list();
    });

    server.delete('/:id', {
        schema: {
            summary: 'Remover Webhook',
            tags: ['Webhooks'],
            params: z.object({
                id: z.string()
            }),
            response: {
                204: z.null()
            }
        }
    }, async (req, reply) => {
        const { id } = req.params;
        service.delete(id);
        return reply.status(204).send(null);
    });
}
