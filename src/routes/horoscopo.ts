import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import db from '../db.js';

export async function horoscopoRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();

    server.get('/', {
        schema: {
            summary: 'Horóscopo do Dia',
            description: 'Retorna as previsões do horóscopo para todos os signos. Se não informada, usa a data atual.',
            tags: ['Horóscopo'],
            querystring: z.object({
                data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD").optional()
                    .describe('Data da previsão (ex: 2026-02-03). Default: hoje.')
            }),
            response: {
                200: z.array(z.object({
                    signo: z.string().describe('Nome do signo'),
                    texto: z.string().nullable().describe('Texto da previsão'),
                    numeros: z.string().nullable().describe('Números da sorte sugeridos'),
                    data: z.string().describe('Data da previsão (YYYY-MM-DD)')
                })).describe('Lista de previsões por signo')
            }
        }
    }, async (request) => {
        const { data } = request.query;
        const targetDate = data || new Date().toISOString().split('T')[0];
        // Retornar do banco
        const stmt = db.prepare('SELECT signo, texto, numeros, data FROM horoscopo_diario WHERE data = ?');
        const results = stmt.all(targetDate);

        return results as any[];
    });

    // Rota por signo específico
    server.get('/:signo', {
        schema: {
            summary: 'Horóscopo por Signo',
            description: 'Retorna a previsão para um signo específico.',
            tags: ['Horóscopo'],
            params: z.object({
                signo: z.string().describe('Nome do signo (ex: aries, leao, touro)')
            }),
            querystring: z.object({
                data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD").optional()
            }),
            response: {
                200: z.object({
                    signo: z.string(),
                    texto: z.string().nullable(),
                    numeros: z.string().nullable(),
                    data: z.string()
                }),
                404: z.object({ message: z.string() })
            }
        }
    }, async (request, reply) => {
        const { signo } = request.params;
        const { data } = request.query;
        const targetDate = data || new Date().toISOString().split('T')[0];

        // Normalizar signo (sem acentos)
        const signoNorm = signo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const stmt = db.prepare('SELECT signo, texto, numeros, data FROM horoscopo_diario WHERE data = ?');
        const results = stmt.all(targetDate) as any[];

        const found = results.find(r => {
            const rNorm = r.signo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return rNorm === signoNorm;
        });

        if (found) return found;

        // Se não houver dados no banco, retornar previsão genérica
        return {
            signo: signo.charAt(0).toUpperCase() + signo.slice(1).toLowerCase(),
            texto: 'Previsão não disponível para esta data. Consulte novamente mais tarde.',
            numeros: null,
            data: targetDate
        };
    });
}
