import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import db from '../db.js';

export async function horoscopoRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    server.get('/', {
        schema: {
            summary: 'Horóscopo do Dia',
            tags: ['Horóscopo'],
            response: {
                200: z.array(z.object({
                    signo: z.string(),
                    texto: z.string().nullable(),
                    numeros: z.string().nullable(),
                    data: z.string()
                }))
            }
        }
    }, async () => {
        const today = new Date().toISOString().split('T')[0];
        // Retornar do banco
        const stmt = db.prepare('SELECT signo, texto, numeros, data FROM horoscopo_diario WHERE data = ?');
        const results = stmt.all(today);

        // Fallback: se não tiver no banco (scraper não rodou), retorna vazio ou avisa
        // O ideal é o scraper rodar.
        return results;
    });
}
