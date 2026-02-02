import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import db from '../db.js';

export async function resultadosRoutes(app: FastifyInstance) {
    // Configuração para usar Zod
    const server = app.withTypeProvider<ZodTypeProvider>();

    server.get('/', {
        schema: {
            summary: 'Listar Resultados',
            description: 'Retorna uma lista dos últimos resultados filtrados por data ou lotérica.',
            tags: ['Resultados'],
            querystring: z.object({
                data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD").optional().describe('Filtra por data (ex: 2024-05-20)'),
                loterica: z.string().optional().describe('Filtra por slug da lotérica (ex: pt-rio)'),
            }),
            response: {
                200: z.array(z.object({
                    id: z.string().uuid(),
                    data: z.string(),
                    horario: z.string(),
                    loterica: z.string(),
                    premios: z.array(z.object({
                        posicao: z.number().int(),
                        milhar: z.string().length(4),
                        grupo: z.number().int(),
                        bicho: z.string(),
                    }))
                })).describe('Lista de resultados encontrados')
            }
        }
    }, async (request, reply) => {
        const { data, loterica } = request.query;

        let query = `
      SELECT r.id, r.data, r.horario, l.nome as loterica
      FROM resultados r
      JOIN lotericas l ON r.loterica_slug = l.slug
      WHERE 1=1
    `;
        const params: any[] = [];

        if (data) {
            query += ' AND r.data = ?';
            params.push(data);
        } else {
            // Se não filtrar data, pegar a última disponível? Ou limitar?
            // Vamos limitar a 10 ultimos resultados se sem filtro
            query += ' ORDER BY r.data DESC, r.horario DESC LIMIT 10';
        }

        if (loterica) {
            query += ' AND r.loterica_slug = ?';
            params.push(loterica);
        }

        const stmt = db.prepare(query);
        const resultados = stmt.all(...params) as any[];

        // Buscar premios para cada resultado
        // N+1 query simples (SQLite é rápido, mas poderiamos fazer JOIN)
        // Vamos fazer JOIN.

        // Na vdd melhor fazer query separada ou agrupar em memoria.
        // Como estamos paginando resultados (poucos), query separada é ok.

        const response = [];

        const premiosStmt = db.prepare(`
        SELECT posicao, milhar, grupo, bicho 
        FROM premios WHERE resultado_id = ? ORDER BY posicao ASC
    `);

        for (const r of resultados) {
            const premios = premiosStmt.all(r.id);
            response.push({
                ...r,
                premios
            });
        }

        return response;
    });
}
