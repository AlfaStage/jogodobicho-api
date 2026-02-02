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
            description: 'Calcula o número da sorte baseado no nome fornecido utilizando a tabela Pitagórica.',
            tags: ['Numerologia'],
            querystring: z.object({
                nome: z.string().min(1).describe('Nome para calcular a numerologia')
            }),
            response: {
                200: z.object({
                    input: z.string().describe('Nome original enviado'),
                    cleanInput: z.string().describe('Nome normalizado'),
                    sum: z.number().describe('Soma total dos valores'),
                    luckyNumber: z.number().describe('Número da sorte reduzido (1-9)'),
                    details: z.string().describe('Detalhes do cálculo'),
                    meaning: z.string().describe('Significado do número')
                }).describe('Resultado detalhado da numerologia')
            }
        }
    }, async (req, reply) => {
        const { nome } = req.query;
        return service.calculate(nome);
    });
}
