import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { RenderService } from '../services/RenderService.js';
import path from 'path';
import fs from 'fs';

export async function adminRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();
    const renderService = new RenderService();

    // Servir arquivos estáticos do admin
    // Como não temos @fastify/static configurado globalmente para essa pasta, 
    // vamos servir manualmente para simplificar sem nova dependência

    server.get('/webhooks', async (req, reply) => {
        const html = fs.readFileSync(path.resolve('public/admin/webhooks.html'), 'utf-8');
        reply.header('Content-Type', 'text/html');
        return reply.send(html);
    });

    server.get('/template', async (req, reply) => {
        const html = fs.readFileSync(path.resolve('public/admin/template.html'), 'utf-8');
        reply.header('Content-Type', 'text/html');
        return reply.send(html);
    });

    // API: Obter Template Atual
    server.get('/api/template', async () => {
        return { html: await renderService.getTemplate() };
    });

    // API: Salvar Template
    server.post('/api/template', {
        schema: {
            body: z.object({ html: z.string() })
        }
    }, async (req, reply) => {
        const { html } = req.body;
        await renderService.saveTemplate(html);
        return reply.send({ message: 'Template salvo com sucesso!' });
    });

    // API: Preview Template (Renderiza imagem temporária)
    server.post('/api/preview', {
        schema: {
            body: z.object({ html: z.string() })
        }
    }, async (req, reply) => {
        const { html } = req.body;

        // Mock de dados para preview
        const mockResultado = {
            data: '2026-02-03',
            horario: '16:20',
            loterica: 'LOOK Goiás (Preview)',
            premios: [
                { posicao: 1, milhar: '1234', grupo: 9, bicho: 'Cobra' },
                { posicao: 2, milhar: '5678', grupo: 20, bicho: 'Peru' },
                { posicao: 3, milhar: '9012', grupo: 3, bicho: 'Burro' },
                { posicao: 4, milhar: '3456', grupo: 14, bicho: 'Gato' },
                { posicao: 5, milhar: '7890', grupo: 23, bicho: 'Urso' },
                { posicao: 6, milhar: '1122', grupo: 6, bicho: 'Cabra' },
                { posicao: 7, milhar: '334', grupo: 9, bicho: 'Cobra' },
            ]
        };

        try {
            console.log('[Preview] Recebendo HTML:', html?.substring(0, 50) + '...');

            // Garantir que fontes estão carregadas
            await renderService['initFonts'](); // Acesso privado hack via string ou tornar público

            const buffer = await renderService.renderImage(mockResultado, html);
            const htmlRendered = await renderService.renderHtml(mockResultado, html);

            console.log('[Preview] Sucesso. Tamanho do Buffer:', buffer.length);

            return {
                image: `data:image/png;base64,${buffer.toString('base64')}`,
                html: htmlRendered
            };
        } catch (error: any) {
            console.error('[Preview] Erro detalhado:', error);
            return reply.status(500).send({
                message: "Erro ao gerar preview",
                error: error.message,
                stack: error.stack
            });
        }
    });
}
