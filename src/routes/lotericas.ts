import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import db from '../db.js';

export async function lotericasRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    server.get('/', {
        schema: {
            summary: 'Listar Lotéricas',
            tags: ['Lotericas'],
            response: {
                200: z.array(z.object({
                    slug: z.string(),
                    nome: z.string(),
                }))
            }
        }
    }, async () => {
        const stmt = db.prepare('SELECT slug, nome FROM lotericas');
        return stmt.all() as any[];
    });
}
