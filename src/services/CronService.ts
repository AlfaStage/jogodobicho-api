import { CronJob } from 'cron';
import { ScraperService } from './ScraperService.js';
import { HoroscopoScraper } from '../scrapers/HoroscopoScraper.js';
import { ContentScraper } from '../scrapers/ContentScraper.js';
import { LOTERIAS, LotericaConfig } from '../config/loterias.js';
import db from '../db.js';

export class CronService {
    private scraperService = new ScraperService();
    private horoscopo = new HoroscopoScraper();
    private content = new ContentScraper();
    private jobs: CronJob[] = [];

    constructor() {
        console.log('[CronService] Inicializando...');
        this.start();
    }

    start() {
        // 1. Smart Scraper Loop (A cada 2 minutos)
        // Substitui varreduras fixas e fallback.
        // Verifica o que está pendente e busca apenas o necessário.
        this.jobs.push(
            new CronJob('*/2 * * * *', () => this.runSmartScheduler(), null, true, 'America/Sao_Paulo')
        );

        // 2. Horóscopo (06:00 DIARIO)
        this.jobs.push(
            new CronJob('0 6 * * *', () => this.runHoroscopo(), null, true, 'America/Sao_Paulo')
        );

        // 3. Conteúdo (Semanal)
        this.jobs.push(
            new CronJob('0 9 * * 1', () => this.runContent(), null, true, 'America/Sao_Paulo')
        );

        console.log(`[CronService] Smart Scheduler iniciado (Ciclo de 2 min).`);
    }

    private async runSmartScheduler() {
        const now = new Date();
        const targets: LotericaConfig[] = [];

        // Janela de busca: Sorteios ocorridos nas últimas 4 horas
        // (Aumentei um pouco para garantir que atrasos longos sejam pegos)
        const WINDOW_MS = 4 * 60 * 60 * 1000;

        // Data string YYYY-MM-DD para consulta no banco
        // Ajustando fuso para garantir dia correto do ponto de vista do usuário (Brasil)
        // new Date() já retorna com offset local se o OS estiver configurado, mas vamos garantir.
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dataHoje = `${year}-${month}-${day}`;

        // Preparar statement para checagem rápida
        const checkResult = db.prepare('SELECT id FROM resultados WHERE loterica_slug = ? AND data = ? AND horario = ?');

        for (const loteria of LOTERIAS) {
            if (!loteria.horarios) continue;

            let isPending = false;

            for (const horario of loteria.horarios) {
                // Parse horario HH:mm
                const [h, m] = horario.split(':').map(Number);
                const drawTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);

                // Se sorteio já passou e está dentro da janela
                if (drawTime <= now && (now.getTime() - drawTime.getTime()) < WINDOW_MS) {

                    // Verificar se já temos resultado
                    const exists = checkResult.get(loteria.slug, dataHoje, horario);

                    if (!exists) {
                        // Não temos resultado ainda! Adicionar aos alvos.
                        // Mas só adicionamos a loteria uma vez na lista
                        isPending = true;
                        // console.log(`[SmartScheduler] Pendente: ${loteria.nome} das ${horario}`);
                    }
                }
            }

            if (isPending) {
                targets.push(loteria);
            }
        }

        if (targets.length > 0) {
            console.log(`[SmartScheduler] ${targets.length} lotéricas com sorteios pendentes. Iniciando scraping direcionado...`);
            await this.scraperService.executeTargeted(targets);
        } else {
            // console.log(`[SmartScheduler] Todos os sorteios recentes já estão atualizados.`);
        }
    }

    private async runHoroscopo() {
        console.log(`[CRON] Atualizando horóscopo...`);
        try {
            await this.horoscopo.execute();
        } catch (error: any) {
            console.error(`[CRON] Erro no horóscopo: ${error.message} `);
        }
    }

    private async runContent() {
        console.log(`[CRON] Atualizando conteúdo estático...`);
        try {
            await this.content.execute();
        } catch (error: any) {
            console.error(`[CRON] Erro no conteúdo: ${error.message} `);
        }
    }
}
