import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { bichosData, getBichoByDezena, getBichoByGrupo } from '../utils/bichos.js';

export async function bichosRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    server.get('/', {
        schema: {
            summary: 'Listar Bichos',
            description: 'Retorna a tabela completa de bichos (grupos de 1 a 25).',
            tags: ['Bichos'],
            response: {
                200: z.array(z.object({
                    grupo: z.number().describe('Número do grupo (1-25)'),
                    nome: z.string().describe('Nome do bicho'),
                    dezenas: z.array(z.string()).describe('Lista de dezenas associadas'),
                }))
            }
        }
    }, async () => {
        return bichosData;
    });

    server.get('/:query', {
        schema: {
            summary: 'Buscar Bicho por Grupo ou Dezena',
            description: 'Busca um bicho específico. A query pode ser o número do grupo (ex: 9) ou uma dezena (ex: 34).',
            tags: ['Bichos'],
            params: z.object({
                query: z.string().describe('Número do grupo ou dezena')
            }),
            response: {
                200: z.object({
                    grupo: z.number(),
                    nome: z.string(),
                    dezenas: z.array(z.string()),
                }).describe('Dados do bicho encontrado').optional(),
                404: z.null().describe('Bicho não encontrado').optional()
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

        return reply.status(404).send(null);
    });
}
