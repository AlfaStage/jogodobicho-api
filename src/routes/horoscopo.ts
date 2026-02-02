import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import db from '../db.js';

export async function horoscopoRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    server.get('/', {
        schema: {
            summary: 'Horóscopo do Dia',
            description: 'Retorna as previsões do horóscopo para todos os signos na data atual.',
            tags: ['Horóscopo'],
            response: {
                200: z.array(z.object({
                    signo: z.string().describe('Nome do signo'),
                    texto: z.string().nullable().describe('Texto da previsão'),
                    numeros: z.string().nullable().describe('Números da sorte sugeridos'),
                    data: z.string().describe('Data da previsão (YYYY-MM-DD)')
                })).describe('Lista de previsões por signo')
            }
        }
    }, async () => {
        const today = new Date().toISOString().split('T')[0];
        // Retornar do banco
        const stmt = db.prepare('SELECT signo, texto, numeros, data FROM horoscopo_diario WHERE data = ?');
        const results = stmt.all(today);

        // Fallback: se não tiver no banco (scraper não rodou), retorna vazio ou avisa
        // O ideal é o scraper rodar.
        return results as any[];
    });
}
