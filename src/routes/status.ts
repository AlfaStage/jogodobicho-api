import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { scrapingStatusService } from '../services/ScrapingStatusService.js';
import { ScraperService } from '../services/ScraperService.js';
import { LOTERIAS } from '../config/loterias.js';
import { logger } from '../utils/logger.js';

export async function statusRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>();
    const scraperService = new ScraperService();

    // GET /api/status/resumo - Resumo do status de scraping de hoje
    server.get('/resumo', {
        schema: {
            summary: 'Resumo do Status de Scraping',
            description: 'Retorna o resumo do status de scraping de todas as lotéricas de hoje.',
            tags: ['Status']
        }
    }, async (req, reply) => {
        const kpis = scrapingStatusService.getKPIsHoje();
        const loterias = scrapingStatusService.getResumoHoje();

        return {
            kpis,
            loterias
        };
    });

    // GET /api/status/hoje - Status detalhado de hoje
    server.get('/hoje', {
        schema: {
            summary: 'Status de Hoje',
            description: 'Retorna o status detalhado de todos os scrapings de hoje.',
            tags: ['Status']
        }
    }, async (req, reply) => {
        return scrapingStatusService.getStatusHoje();
    });

    // GET /api/status/:data - Status por data
    server.get('/:data', {
        schema: {
            summary: 'Status por Data',
            description: 'Retorna o status de scraping de uma data específica.',
            tags: ['Status'],
            params: z.object({
                data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
            })
        }
    }, async (req, reply) => {
        const { data } = req.params as { data: string };
        return scrapingStatusService.getStatusByDate(data);
    });

    // POST /api/scraper/force-all - Forçar scraping de todas as lotéricas
    server.post('/scraper/force-all', {
        schema: {
            summary: 'Forçar Scraping Global',
            description: 'Força o scraping de todas as lotéricas com horários pendentes.',
            tags: ['Scraper']
        }
    }, async (req, reply) => {
        logger.info('StatusAPI', '🔄 Forçando scraping global...');

        // Inicializar status de todos os horários que já passaram
        initializeStatusForToday();

        // Executar scraping global
        scraperService.executeGlobal(true).catch(err => {
            logger.error('StatusAPI', 'Erro no scraping forçado:', err);
        });

        return {
            message: 'Scraping global iniciado em background',
            loterias_total: LOTERIAS.length
        };
    });
}

// Função para inicializar status de todos os horários de hoje que já passaram
function initializeStatusForToday(): void {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dataHoje = `${year}-${month}-${day}`;
    const horaAtual = now.getHours() * 60 + now.getMinutes(); // minutos desde meia-noite

    for (const loteria of LOTERIAS) {
        if (!loteria.horarios) continue;

        for (const horario of loteria.horarios) {
            const [h, m] = horario.split(':').map(Number);
            const minutosHorario = h * 60 + m;

            // Só registrar horários que já passaram
            if (horaAtual >= minutosHorario + 1) { // +1 minuto de delay
                scrapingStatusService.registerPending(loteria.slug, loteria.nome, horario, dataHoje);
            }
        }
    }
}
