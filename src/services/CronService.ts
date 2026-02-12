import { CronJob } from 'cron';
import { ScraperService } from './ScraperService.js';
import { HoroscopoScraper } from '../scrapers/HoroscopoScraper.js';
import { ContentScraper } from '../scrapers/ContentScraper.js';
import { PalpitesScraper } from '../scrapers/PalpitesScraper.js';
import { LOTERIAS, LotericaConfig } from '../config/loterias.js';
import { logger } from '../utils/logger.js';
import { scrapingStatusService } from './ScrapingStatusService.js';
import db from '../db.js';

// Interface para rastrear horários específicos pendentes
interface LoteriaPendente {
    loteria: LotericaConfig;
    horariosPendentes: string[];
}

export class CronService {
    private scraperService = new ScraperService();
    private horoscopo = new HoroscopoScraper();
    private content = new ContentScraper();
    private palpites = new PalpitesScraper();
    private jobs: CronJob[] = [];
    private isStarted = false;
    private serviceName = 'CronService';
    private horoscopoCompletoHoje = false;
    private horoscopoJobHora?: CronJob;

    constructor() {
        logger.info(this.serviceName, 'Instância criada. Aguardando start()...');
    }

    start() {
        if (this.isStarted) {
            logger.warn(this.serviceName, 'Já está rodando, ignorando chamada duplicada');
            return;
        }
        this.isStarted = true;

        // 1. Smart Scraper Loop (A cada 5 minutos)
        this.jobs.push(
            new CronJob('*/5 * * * *', () => this.runSmartScheduler(), null, true, 'America/Sao_Paulo')
        );

        // 2. Horóscopo (06:00 DIARIO)
        this.jobs.push(
            new CronJob('0 6 * * *', () => this.runHoroscopo6h(), null, true, 'America/Sao_Paulo')
        );


        // 3. Palpites do Dia (07:00 DIARIO)
        this.jobs.push(
            new CronJob('0 7 * * *', () => this.palpites.execute([], 'palpites'), null, true, 'America/Sao_Paulo')
        );

        // 4. Bingos (Resultados Premiados) (23:30 DIARIO)
        this.jobs.push(
            new CronJob('30 23 * * *', () => this.palpites.execute([], 'bingos'), null, true, 'America/Sao_Paulo')
        );

        // 5. Conteúdo (Semanal)
        this.jobs.push(
            new CronJob('0 9 * * 1', () => this.runContent(), null, true, 'America/Sao_Paulo')
        );

        logger.success(this.serviceName, 'Smart Scheduler iniciado (Ciclo de 5 min)');
    }

    // Método público para verificar na inicialização se precisa buscar palpites (similar ao horóscopo)
    async checkPalpitesOnStartup(): Promise<void> {
        // Agora o startup dos palpites é controlado pelo sucesso do horóscopo.
        // Mas mantemos este método caso queiramos invocar separadamente ou para compatibilidade.
        // Se o horóscopo já estiver completo, ele chamará o runPalpites.
        // Se não estiver, quando completar chamará.

        // Verificação manual apenas se já temos horóscopo mas não palpites
        const today = new Date().toISOString().split('T')[0];
        const exists = db.prepare('SELECT id FROM palpites_dia WHERE data = ?').get(today);

        if (exists) {
            logger.info(this.serviceName, `Palpites de hoje (${today}) já existem. Pulando verificação inicial.`);
            return;
        }

        // Se horóscopo já estiver OK, roda palpites
        if (this.horoscopoCompletoHoje) {
            await this.runPalpites();
        }
    }

    // Método público para verificar na inicialização se precisa buscar horóscopo
    async checkHoroscopoOnStartup(): Promise<void> {
        const today = new Date().toISOString().split('T')[0];

        // Verificar se já tem horóscopo completo hoje
        const check = db.prepare('SELECT count(*) as count FROM horoscopo_diario WHERE data = ?').get(today) as { count: number };

        if (check && check.count >= 12) {
            logger.info(this.serviceName, `Horóscopo de hoje (${today}) já está completo. Pulando verificação de startup.`);
            this.horoscopoCompletoHoje = true;
            // Tentar rodar palpites se horóscopo já está ok
            await this.runPalpites();
            return;
        }

        // Verificar horário atual (timezone America/Sao_Paulo)
        const nowBr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const horaAtual = nowBr.getHours();

        if (horaAtual < 6) {
            // Antes das 6h: não faz nada, espera o cron das 6h
            logger.info(this.serviceName, `Horóscopo: São ${horaAtual}h, antes das 6h. Aguardando horário programado.`);
            return;
        }

        // Após as 6h e sem horóscopo: executa imediatamente
        logger.info(this.serviceName, `Horóscopo: São ${horaAtual}h e não há dados. Executando scraping imediato...`);
        await this.runHoroscopoWithRetry();
    }

    private async runSmartScheduler() {
        const now = new Date();
        const targets: LoteriaPendente[] = [];

        // Delay de 1 minuto após o horário do sorteio
        const DELAY_MS = 1 * 60 * 1000; // 1 minuto

        // Data string YYYY-MM-DD para consulta no banco (timezone America/Sao_Paulo)
        const nowBr = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const year = nowBr.getFullYear();
        const month = String(nowBr.getMonth() + 1).padStart(2, '0');
        const day = String(nowBr.getDate()).padStart(2, '0');
        const dataHoje = `${year}-${month}-${day}`;

        // Preparar statement para checagem rápida
        const checkResult = db.prepare('SELECT id FROM resultados WHERE loterica_slug = ? AND data = ? AND horario = ?');

        for (const loteria of LOTERIAS) {
            if (!loteria.horarios) continue;

            const horariosPendentes: string[] = [];

            for (const horario of loteria.horarios) {
                // Parse horario HH:mm
                const [h, m] = horario.split(':').map(Number);
                // Usar nowBr (timezone Brasil) para criar drawTime consistente
                const drawTime = new Date(nowBr.getFullYear(), nowBr.getMonth(), nowBr.getDate(), h, m, 0);

                // Verificar se passou 1 minuto após o horário do sorteio
                const minTimeToScrape = new Date(drawTime.getTime() + DELAY_MS);

                // Se já passou 1 minuto após o sorteio (usando nowBr)
                if (nowBr >= minTimeToScrape) {
                    // Registrar como pendente no status (se ainda não foi)
                    scrapingStatusService.registerPending(loteria.slug, loteria.nome, horario, dataHoje);

                    // Verificar se já temos resultado
                    const exists = checkResult.get(loteria.slug, dataHoje, horario);

                    if (!exists) {
                        // Não temos resultado ainda! Adicionar este horário específico
                        horariosPendentes.push(horario);
                        logger.info(this.serviceName, `Pendente: ${loteria.nome} das ${horario}`);
                    } else {
                        // Já temos resultado, marcar como sucesso
                        scrapingStatusService.registerSuccess(loteria.slug, horario, dataHoje, 'cached', (exists as any).id);
                    }
                }
            }

            if (horariosPendentes.length > 0) {
                targets.push({
                    loteria,
                    horariosPendentes
                });
            }
        }

        if (targets.length > 0) {
            const totalHorarios = targets.reduce((sum, t) => sum + t.horariosPendentes.length, 0);
            logger.info(this.serviceName, `${targets.length} lotéricas com ${totalHorarios} horários pendentes. Iniciando scraping direcionado...`);

            // Registrar tentativa de cada horário
            for (const target of targets) {
                for (const horario of target.horariosPendentes) {
                    scrapingStatusService.registerAttempt(target.loteria.slug, horario, dataHoje);
                }
            }

            // Executar scraping
            await this.scraperService.executeTargeted(targets);

            // Verificar resultados após scraping
            for (const target of targets) {
                for (const horario of target.horariosPendentes) {
                    const result = checkResult.get(target.loteria.slug, dataHoje, horario) as { id: string } | undefined;

                    if (result) {
                        scrapingStatusService.registerSuccess(target.loteria.slug, horario, dataHoje, 'scraper', result.id as any);
                    } else {
                        const proximaTentativa = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos
                        const motivoErro = this.scraperService.getDiagnosticSummary();
                        scrapingStatusService.registerError(
                            target.loteria.slug,
                            horario,
                            dataHoje,
                            motivoErro,
                            proximaTentativa
                        );
                    }
                }
            }
        }
    }

    private async runHoroscopo6h() {
        logger.info(this.serviceName, '[CRON] Horóscopo: Execução programada das 6h');
        this.horoscopoCompletoHoje = false;
        await this.runHoroscopoWithRetry();
    }

    private async runHoroscopoWithRetry(): Promise<void> {
        if (this.horoscopoCompletoHoje) {
            logger.info(this.serviceName, 'Horóscopo já está completo para hoje. Não há necessidade de retry.');
            return;
        }

        try {
            await this.horoscopo.execute();

            // Verificar se ficou completo
            const today = new Date().toISOString().split('T')[0];
            const check = db.prepare('SELECT count(*) as count FROM horoscopo_diario WHERE data = ?').get(today) as { count: number };

            if (check && check.count >= 12) {
                this.horoscopoCompletoHoje = true;
                logger.success(this.serviceName, `Horóscopo completo! (${check.count} registros)`);

                if (this.horoscopoJobHora) {
                    this.horoscopoJobHora.stop();
                    this.horoscopoJobHora = undefined;
                    logger.info(this.serviceName, 'Job de retry do horóscopo removido (sucesso)');
                }

                // Chamar Palpites imediatamente após sucesso do Horóscopo
                await this.runPalpites();
                return;
            }

            // Não ficou completo, agenda retry a cada 1h
            logger.warn(this.serviceName, `Horóscopo incompleto (${check?.count || 0}/12). Agendando retry em 1h...`);
            this.scheduleHoroscopoRetry();

        } catch (error: any) {
            logger.error(this.serviceName, 'Erro no horóscopo:', error.message);
            // Agenda retry mesmo em caso de erro
            this.scheduleHoroscopoRetry();
        }
    }

    private scheduleHoroscopoRetry(): void {
        // Se já existe job de retry, não cria outro
        if (this.horoscopoJobHora) {
            return;
        }

        logger.info(this.serviceName, 'Agendando retry do horóscopo a cada 1h...');

        this.horoscopoJobHora = new CronJob('0 * * * *', async () => {
            // Verifica se ainda é necessário
            if (this.horoscopoCompletoHoje) {
                this.horoscopoJobHora?.stop();
                this.horoscopoJobHora = undefined;
                return;
            }

            // Verifica se já passou do dia seguinte (reset)
            const nowBr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
            const horaAtual = nowBr.getHours();

            // Se for meia-noite ou depois, verifica se é um novo dia
            if (horaAtual === 0) {
                const today = new Date().toISOString().split('T')[0];
                const check = db.prepare('SELECT count(*) as count FROM horoscopo_diario WHERE data = ?').get(today) as { count: number };
                if (check && check.count >= 12) {
                    this.horoscopoCompletoHoje = true;
                    this.horoscopoJobHora?.stop();
                    this.horoscopoJobHora = undefined;
                    return;
                }
            }

            logger.info(this.serviceName, '[RETRY] Tentando horóscopo novamente...');
            await this.runHoroscopoWithRetry();
        }, null, true, 'America/Sao_Paulo');
    }

    private async runContent() {
        logger.info(this.serviceName, 'Atualizando conteúdo estático...');
        try {
            await this.content.execute();
        } catch (error: any) {
            logger.error(this.serviceName, 'Erro no conteúdo:', error.message);
        }
    }

    private async runPalpites() {
        // Verificar horário mínimo (06:00)
        const nowBr = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        if (nowBr.getHours() < 6) return;

        logger.info(this.serviceName, 'Iniciando scraping de Palpites (pós-horóscopo)...');
        try {
            await this.palpites.execute([], 'palpites');
        } catch (error: any) {
            logger.error(this.serviceName, 'Erro ao buscar palpites:', error.message);
        }
    }

    stop() {
        if (!this.isStarted) return;
        this.jobs.forEach(job => job.stop());
        if (this.horoscopoJobHora) {
            this.horoscopoJobHora.stop();
        }
        this.isStarted = false;
        logger.success(this.serviceName, 'Todos os jobs parados');
    }
}
