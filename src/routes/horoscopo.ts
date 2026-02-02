import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import db from '../db.js';

export async function horoscopoRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    server.get('/', {
        schema: {
            summary: 'Horóscopo do Dia',
            description: 'Retorna as previsões do horóscopo para todos os signos. Se não informada, usa a data atual.',
            tags: ['Horóscopo'],
            querystring: z.object({
                data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD").optional()
                    .describe('Data da previsão (ex: 2024-05-20)')
            }),
            response: {
                200: z.array(z.object({
                    signo: z.string().describe('Nome do signo'),
                    texto: z.string().nullable().describe('Texto da previsão'),
                    numeros: z.string().nullable().describe('Números da sorte sugeridos'),
                    data: z.string().describe('Data da previsão (YYYY-MM-DD)')
                })).describe('Lista de previsões por signo')
            }
        }
    }, async (request) => {
        const { data } = request.query;
        const targetDate = data || new Date().toISOString().split('T')[0];
        // Retornar do banco
        const stmt = db.prepare('SELECT signo, texto, numeros, data FROM horoscopo_diario WHERE data = ?');
        const results = stmt.all(targetDate);

        return results as any[];
    });
}
