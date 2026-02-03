import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import db from '../db.js';
import { RenderService } from '../services/RenderService.js';

export async function resultadosRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();
    const renderService = new RenderService();

    // ===============
    // LISTAR RESULTADOS
    // ===============
    server.get('/', {
        schema: {
            summary: 'Listar Resultados',
            description: 'Retorna uma lista dos últimos resultados filtrados por data ou lotérica.',
            tags: ['Resultados'],
            querystring: z.object({
                data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD").optional()
                    .describe('Filtra por data (ex: 2024-05-20) - Formato YYYY-MM-DD'),
                loterica: z.string().optional()
                    .describe('Filtra por slug da lotérica (ex: pt-rio, look-goias, federal)'),
            }),
            response: {
                200: z.array(z.object({
                    id: z.string().uuid(),
                    data: z.string(),
                    horario: z.string(),
                    loterica: z.string(),
                    share_url: z.string().url(),
                    image_url: z.string().url(),
                    premios: z.array(z.object({
                        posicao: z.number().int(),
                        milhar: z.string().min(3).max(5),
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
        }

        if (loterica) {
            query += ' AND r.loterica_slug = ?';
            params.push(loterica);
        }

        query += ' ORDER BY r.data DESC, r.horario DESC LIMIT 20';

        const stmt = db.prepare(query);
        const resultados = stmt.all(...params) as any[];

        const response = [];
        const premiosStmt = db.prepare(`
            SELECT posicao, milhar, grupo, bicho 
            FROM premios WHERE resultado_id = ? ORDER BY posicao ASC
        `);

        // Obter URL base
        const protocol = request.protocol;
        const host = request.host; // Inclui porta se houver
        const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

        for (const r of resultados) {
            const premios = premiosStmt.all(r.id);
            response.push({
                ...r,
                share_url: `${baseUrl}/v1/resultados/${r.id}/html`,
                image_url: `${baseUrl}/v1/resultados/${r.id}/image`,
                premios
            });
        }

        return response;
    });

    // ===============
    // ENDPOINT HTML (IFRAME)
    // ===============
    server.get('/:id/html', {
        schema: { summary: 'Obter HTML do Resultado (Iframe)', tags: ['Compartilhamento'], params: z.object({ id: z.string().uuid() }) }
    }, async (req, reply) => {
        const { id } = req.params;
        const resultado = getResultadoById(id);

        if (!resultado) return reply.status(404).send("Resultado não encontrado.");

        const html = await renderService.renderHtml(resultado);
        reply.header('Content-Type', 'text/html');
        return reply.send(html);
    });

    // ===============
    // ENDPOINT IMAGEM (PNG)
    // ===============
    server.get('/:id/image', {
        schema: { summary: 'Obter Imagem do Resultado (PNG)', tags: ['Compartilhamento'], params: z.object({ id: z.string().uuid() }) }
    }, async (req, reply) => {
        const { id } = req.params;
        const resultado = getResultadoById(id);

        if (!resultado) return reply.status(404).send("Resultado não encontrado.");

        try {
            const buffer = await renderService.renderImage(resultado);
            reply.header('Content-Type', 'image/png');
            return reply.send(buffer);
        } catch (error: any) {
            console.error('[ResultadosRoute] Erro ao gerar imagem:', error);
            return reply.status(500).send({
                error: "Erro ao gerar imagem.",
                message: error.message || "Erro desconhecido"
            });
        }
    });

    // Helper para buscar resultado completo
    function getResultadoById(id: string) {
        const r = db.prepare(`
            SELECT r.id, r.data, r.horario, l.nome as loterica
            FROM resultados r
            JOIN lotericas l ON r.loterica_slug = l.slug
            WHERE r.id = ?
        `).get(id) as any;

        if (!r) return null;

        const premios = db.prepare(`
            SELECT posicao, milhar, grupo, bicho 
            FROM premios WHERE resultado_id = ? ORDER BY posicao ASC
        `).all(id);

        return { ...r, premios };
    }
}
