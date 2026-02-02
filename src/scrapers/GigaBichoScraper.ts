import { ScraperBase } from './ScraperBase.js';
import db from '../db.js';
import { randomUUID } from 'crypto';
import { WebhookService } from '../services/WebhookService.js';
import { LOTERIAS } from '../config/loterias.js';
import * as cheerio from 'cheerio';

export class GigaBichoScraper extends ScraperBase {
    private webhookService = new WebhookService();

    constructor() {
        super('https://www.gigabicho.com.br/');
    }

    async execute(targetSlug?: string): Promise<void> {
        console.log('[GigaBichoScraper] Iniciando varredura...');

        let loteriasAlvo = LOTERIAS.filter(l => l.urlGigaBicho);

        if (targetSlug) {
            loteriasAlvo = loteriasAlvo.filter(l => l.slug === targetSlug);
        }

        console.log(`[GigaBichoScraper] Loterias encontradas para processar: ${loteriasAlvo.length}`);

        for (const loteria of loteriasAlvo) {
            try {
                if (loteria.urlGigaBicho) {
                    await this.scrapeUrl(loteria.urlGigaBicho, loteria.slug);
                }
            } catch (error) {
                console.error(`[GigaBichoScraper] Erro ao processar ${loteria.slug}:`, error);
            }
        }

        console.log('[GigaBichoScraper] Varredura finalizada.');
    }

    private async scrapeUrl(url: string, slug: string): Promise<void> {
        const $ = await this.fetchHtml(url);
        if (!$) return;

        const rawHtml = $.html();
        // Dividir por H3 que é o divisor padrão do GigaBicho para sorteios
        const parts = rawHtml.split(/<h3[^>]*>/i);

        console.log(`[GigaBichoScraper] ${slug}: Dividido em ${parts.length} partes.`);

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            const partHeaderMatch = part.match(/^([\s\S]*?)<\/h3>/i);
            if (!partHeaderMatch) continue;

            const titulo = cheerio.load(partHeaderMatch[1]).text().trim();
            const content = part.substring(partHeaderMatch[0].length);
            const $part = cheerio.load(content);

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
                    if (/^\d{3,4}$/.test(line)) {
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
                this.saveResult(slug, dataIso, horarioFormatado, premios);
            }
        }
    }

    private getGrupoFromMilhar(milhar: string): number {
        const m = parseInt(milhar);
        if (isNaN(m)) return 0;
        const dezenas = m % 100;
        if (dezenas === 0) return 25;
        return Math.ceil(dezenas / 4);
    }

    private saveResult(loteriaSlug: string, data: string, horario: string, premios: any[]): void {
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
            this.webhookService.notifyAll('resultado.novo', {
                loteria: loteriaSlug,
                data,
                horario,
                premios
            }).catch(() => { });

        } catch (error) {
            console.error(`[GigaBicho] Erro ao salvar resultado:`, error);
        }
    }
}
