import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

export async function comoJogarRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    const getSection = (content: string, header: string) => {
        const regex = new RegExp(`## ${header}([\\s\\S]*?)(?=\\n## |$)`, 'i');
        const match = content.match(regex);
        return match ? match[header.toLowerCase() === 'tabela' ? 1 : 1].trim() : 'Seção não encontrada.';
    };

    const readContent = async () => {
        // Tenta vários caminhos para ser resiliente a diferentes estruturas de deploy
        const paths = [
            path.resolve('src/data/historia.md'),
            path.resolve('dist/src/data/historia.md'),
            path.join(process.cwd(), 'src/data/historia.md')
        ];

        for (const p of paths) {
            try {
                return await fs.readFile(p, 'utf-8');
            } catch { }
        }
        throw new Error('Arquivo historia.md não encontrado.');
    };

    // Rota Principal (Todo o conteúdo)
    server.get('/', {
        schema: {
            summary: 'Instruções Completas de Como Jogar',
            tags: ['Info'],
            response: { 200: z.object({ content: z.string() }) }
        }
    }, async () => {
        try {
            const content = await readContent();
            return { content };
        } catch (error) {
            return { content: 'Conteúdo ainda não disponível.' };
        }
    });

    // Sub-rotas para partes específicas
    const sections = [
        { path: '/regras', header: 'Regras Básicas', summary: 'Regras Básicas do Jogo' },
        { path: '/tabela', header: 'Tabela de Grupos e Dezenas', summary: 'Tabela Completa de Animais' },
        { path: '/modalidades', header: 'Modalidades de Aposta', summary: 'Diferentes formas de apostar' },
        { path: '/historia', header: 'Curiosidades Históricas', summary: 'História do Jogo do Bicho' },
    ];

    for (const section of sections) {
        server.get(section.path, {
            schema: {
                summary: section.summary,
                tags: ['Info'],
                response: { 200: z.object({ content: z.string() }) }
            }
        }, async () => {
            try {
                const content = await readContent();
                return { content: getSection(content, section.header) };
            } catch (error) {
                return { content: 'Seção indisponível.' };
            }
        });
    }
}
