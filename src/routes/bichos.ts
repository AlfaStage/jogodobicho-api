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
                200: z.array(z.object({
                    grupo: z.number(),
                    nome: z.string(),
                    dezenas: z.array(z.string()),
                })).describe('Lista de bichos encontrados que coincidem com o grupo ou dezena'),
                404: z.null().describe('Nenhum bicho encontrado').optional()
            }
        }
    }, async (req, reply) => {
        const { query } = req.params;
        const matches: any[] = [];

        // 1. Verificar se é um grupo (1-25)
        const grupoNum = parseInt(query);
        if (!isNaN(grupoNum) && grupoNum >= 1 && grupoNum <= 25) {
            const bicho = getBichoByGrupo(grupoNum);
            if (bicho) matches.push(bicho);
        }

        // 2. Verificar se é uma dezena (00-99)
        // Normaliza a dezena para garantir 2 dígitos se for busca por dezena específica
        const dezenaBusca = query.padStart(2, '0');
        const bichoPorDezena = getBichoByDezena(dezenaBusca);

        if (bichoPorDezena) {
            // Evitar duplicidade se o grupo já foi adicionado
            if (!matches.some(m => m.grupo === bichoPorDezena.grupo)) {
                matches.push(bichoPorDezena);
            }
        }

        if (matches.length > 0) {
            return matches;
        }

        return reply.status(404).send(null);
    });
}
