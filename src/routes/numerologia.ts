import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { NumerologyService } from '../services/NumerologyService.js';

export async function numerologiaRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();
    const service = new NumerologyService();

    server.get('/', {
        schema: {
            summary: 'Calcular Numerologia',
            tags: ['Numerologia'],
            querystring: z.object({
                nome: z.string().min(1)
            }),
            response: {
                200: z.object({
                    input: z.string(),
                    cleanInput: z.string(),
                    sum: z.number(),
                    luckyNumber: z.number(),
                    details: z.string(),
                    meaning: z.string()
                })
            }
        }
    }, async (req, reply) => {
        const { nome } = req.query;
        return service.calculate(nome);
    });
}
