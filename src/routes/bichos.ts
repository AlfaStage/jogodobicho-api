import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { bichosData, getBichoByDezena, getBichoByGrupo } from '../utils/bichos.js';

export async function bichosRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    server.get('/', {
        schema: {
            summary: 'Listar Bichos',
            tags: ['Bichos'],
            response: {
                200: z.array(z.object({
                    grupo: z.number(),
                    nome: z.string(),
                    dezenas: z.array(z.string()),
                }))
            }
        }
    }, async () => {
        return bichosData;
    });

    server.get('/:query', {
        schema: {
            summary: 'Buscar Bicho por Grupo ou Dezena',
            tags: ['Bichos'],
            params: z.object({
                query: z.string()
            }),
            response: {
                200: z.object({
                    grupo: z.number(),
                    nome: z.string(),
                    dezenas: z.array(z.string()),
                }).optional(),
                404: z.null().optional()
            }
        }
    }, async (req, reply) => {
        const { query } = req.params;

        const grupo = parseInt(query);
        if (!isNaN(grupo) && grupo >= 1 && grupo <= 25) {
            const bicho = getBichoByGrupo(grupo);
            if (bicho) return bicho;
        }

        if (query.length === 2) {
            const bicho = getBichoByDezena(query);
            if (bicho) return bicho;
        }

        return reply.status(404).send();
    });
}
