import { ScraperBase } from './ScraperBase.js';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { WebhookService } from '../services/WebhookService.js';
import { LOTERIAS, LotericaConfig } from '../config/loterias.js';
import * as cheerio from 'cheerio';

export class GigaBichoScraper extends ScraperBase {
    private webhookService = new WebhookService();

    constructor() {
        super('https://www.gigabicho.com.br/');
    }

    async execute(targets: LotericaConfig[] = LOTERIAS, targetSlug?: string, shouldNotify: boolean = true): Promise<void> {
        console.log(`[GigaBichoScraper] Iniciando varredura (${targets.length} alvos)...`);

        // Pegar URLs do GigaBicho dos alvos
        let configs = targets.filter(l => l.urlGigaBicho);

        if (targetSlug) {
            configs = configs.filter(l => l.slug === targetSlug);
        }

        const uniqueUrls = [...new Set(configs.map(l => l.urlGigaBicho!))];

        console.log(`[GigaBichoScraper] URLs únicas para processar: ${uniqueUrls.length}`);

        for (const url of uniqueUrls) {
            try {
                await this.scrapeUrl(url, shouldNotify);
            } catch (error) {
                console.error(`[GigaBichoScraper] Erro ao processar ${url}:`, error);
            }
        }

        console.log('[GigaBichoScraper] Varredura finalizada.');
    }

    private async scrapeUrl(url: string, shouldNotify: boolean): Promise<void> {
        const $ = await this.fetchHtml(url);
        if (!$) return;

        const rawHtml = $.html();
        const parts = rawHtml.split(/<h3[^>]*>/i);

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const partHeaderMatch = part.match(/^([\s\S]*?)<\/h3>/i);
            if (!partHeaderMatch) continue;

            const titulo = cheerio.load(partHeaderMatch[1]).text().trim();
            const content = part.substring(partHeaderMatch[0].length);
            const $part = cheerio.load(content);

            // Tentar encontrar qual lotérica esse título se refere
            // Ex: "Sorteio 10 horas Bahia" -> Bahia
            // Ex: "Sorteio 10 horas Bahia Maluca" -> Bahia Maluca
            const loteria = this.detectLoteria(titulo, url);
            if (!loteria) {
                // console.log(`[GigaBichoScraper] Título não reconhecido: "${titulo}"`);
                continue;
            }

            const horarioMatch = titulo.match(/(\d{1,2})[h:]?(\d{2})?\s*(horas)?/i);
            if (!horarioMatch) continue;

            const hora = parseInt(horarioMatch[1]);
            const minuto = horarioMatch[2] || '00';
            const horarioFormatado = `${hora.toString().padStart(2, '0')}:${minuto}`;

            let dataIso = '';
            const dataMatch = $part.text().match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (dataMatch) {
                dataIso = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
            } else {
                dataIso = new Date().toISOString().split('T')[0];
            }

            const premios: any[] = [];
            const lines = $part.text()
                .split('\n')
                .map(l => l.trim())
                .filter(l => l);

            let buffer: { pos?: number, milhar?: string, bicho?: string } = {};
            let captureStage = 0; // 0=pos, 1=milhar, 2=bicho

            lines.forEach(line => {
                const posMatch = line.match(/^(\d{1,2})º$/);
                if (posMatch) {
                    buffer = { pos: parseInt(posMatch[1]) };
                    captureStage = 1;
                    return;
                }

                if (captureStage === 1) {
                    if (/^\d{3,5}$/.test(line)) { // Ajustado para aceitar Soma (5 dígitos)
                        buffer.milhar = line;
                        captureStage = 2;
                    } else if (line === '--') {
                        captureStage = 0;
                        buffer = {};
                    }
                    return;
                }

                if (captureStage === 2) {
                    buffer.bicho = line.split('(')[0].trim();
                    premios.push({
                        posicao: buffer.pos,
                        milhar: buffer.milhar,
                        grupo: this.getGrupoFromMilhar(buffer.milhar!),
                        bicho: buffer.bicho
                    });
                    buffer = {};
                    captureStage = 0;
                }
            });

            if (premios.length > 0) {
                this.saveResult(loteria.slug, dataIso, horarioFormatado, premios, shouldNotify);
            }
        }
    }

    private detectLoteria(titulo: string, url: string): any {
        const tituloLower = titulo.toLowerCase();

        // Buscar loterias que usam essa URL
        const possiveis = LOTERIAS.filter(l => l.urlGigaBicho === url);

        if (possiveis.length === 1) return possiveis[0];

        // Se houver mais de uma (ex: Bahia), tentar diferenciar pelo título
        for (const loteria of possiveis) {
            // Se o nome da lotérica (ex: Maluca Bahia) está no título, é ela
            // Ajuste: remover acentos e ser flexível
            const nomeLoteria = loteria.nome.toLowerCase()
                .replace('bahia', '').trim(); // Removemos "Bahia" para bater em "Maluca" ou vazio

            if (nomeLoteria && tituloLower.includes(nomeLoteria)) {
                return loteria;
            }
        }

        // Default: retornar a primeira se não houver distinção clara
        return possiveis.find(l => !l.nome.toLowerCase().includes('maluca')) || possiveis[0];
    }

    private getGrupoFromMilhar(milhar: string): number {
        const m = parseInt(milhar);
        if (isNaN(m)) return 0;
        const dezenas = m % 100;
        if (dezenas === 0) return 25;
        return Math.ceil(dezenas / 4);
    }

    private saveResult(loteriaSlug: string, data: string, horario: string, premios: any[], shouldNotify: boolean = true): void {
        try {
            // Verificar se já existe
            const exists = db.prepare('SELECT id FROM resultados WHERE loterica_slug = ? AND data = ? AND horario = ?')
                .get(loteriaSlug, data, horario);

            if (exists) return;

            const resultadoId = randomUUID();
            db.prepare('INSERT INTO resultados (id, loterica_slug, data, horario) VALUES (?, ?, ?, ?)')
                .run(resultadoId, loteriaSlug, data, horario);

            const insertPremio = db.prepare('INSERT INTO premios (id, resultado_id, posicao, milhar, grupo, bicho) VALUES (?, ?, ?, ?, ?, ?)');

            for (const p of premios) {
                insertPremio.run(randomUUID(), resultadoId, p.posicao, p.milhar, p.grupo, p.bicho);
            }

            console.log(`[GigaBicho] Gravado: ${loteriaSlug} - ${data} ${horario} (${premios.length} prêmios)`);

            // Webhook opcional
            if (shouldNotify) {
                this.webhookService.notifyAll('resultado.novo', {
                    loteria: loteriaSlug,
                    data,
                    horario,
                    premios
                }).catch(() => { });
            }

        } catch (error) {
            console.error(`[GigaBicho] Erro ao salvar resultado:`, error);
        }
    }
}
