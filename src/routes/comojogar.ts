import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export async function comoJogarRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    server.get('/', {
        schema: {
            summary: 'Instruções de Como Jogar',
            tags: ['Info'],
            response: {
                200: z.object({
                    content: z.string()
                })
            }
        }
    }, async () => {
        try {
            const filePath = path.resolve('src/data/historia.md');
            const content = await fs.readFile(filePath, 'utf-8');
            return { content };
        } catch (error) {
            return { content: 'Conteúdo ainda não disponível. Execute o ContentScraper.' };
        }
    });
}
