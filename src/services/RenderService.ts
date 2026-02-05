import fs from 'fs-extra';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { html as toReactNode } from 'satori-html';
import { logger } from '../utils/logger.js';

const TEMPLATE_PATH = path.resolve('src/templates/result.html');

// Fonte Inter (Regular e Bold) para o Satori renderizar corretamente
const REGULAR_FONT_PATH = path.resolve('src/assets/fonts/Inter-Regular.ttf');
const BOLD_FONT_PATH = path.resolve('src/assets/fonts/Inter-Bold.ttf');

let fontBuffer: Buffer | null = null;
let fontBoldBuffer: Buffer | null = null;

export class RenderService {
    private serviceName = 'RenderService';
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.initPromise = this.initFonts();
    }

    async initFonts() {
        if (fontBuffer && fontBoldBuffer) {
            return;
        }

        try {
            if (!fontBuffer && await fs.pathExists(REGULAR_FONT_PATH)) {
                logger.info(this.serviceName, 'Carregando fonte regular...');
                fontBuffer = await fs.readFile(REGULAR_FONT_PATH);
            }

            if (!fontBoldBuffer && await fs.pathExists(BOLD_FONT_PATH)) {
                logger.info(this.serviceName, 'Carregando fonte negrito...');
                fontBoldBuffer = await fs.readFile(BOLD_FONT_PATH);
            }

            if (!fontBuffer || !fontBoldBuffer) {
                const missing = [];
                if (!fontBuffer) missing.push('Inter-Regular.ttf');
                if (!fontBoldBuffer) missing.push('Inter-Bold.ttf');
                throw new Error(`Fontes locais não encontradas: ${missing.join(', ')}. Verifique src/assets/fonts/`);
            }
            logger.success(this.serviceName, 'Fontes carregadas com sucesso');
        } catch (e: any) {
            logger.error(this.serviceName, 'Falha crítica ao carregar fontes:', e.message);
            throw e;
        }
    }

    // Carregar o template HTML
    async getTemplate(): Promise<string> {
        if (await fs.pathExists(TEMPLATE_PATH)) {
            return fs.readFile(TEMPLATE_PATH, 'utf-8');
        }
        return '<div style="display: flex;">Template não encontrado</div>';
    }

    // Salvar template
    async saveTemplate(html: string): Promise<void> {
        await fs.ensureDir(path.dirname(TEMPLATE_PATH));
        await fs.writeFile(TEMPLATE_PATH, html, 'utf-8');
    }

    // Extrair template de linha de prêmio do HTML
    // Busca por: <!-- PREMIO_ROW -->...<!-- /PREMIO_ROW -->
    private extractRowTemplate(html: string): { rowTemplate: string; htmlWithoutRow: string } | null {
        const regex = /<!-- PREMIO_ROW -->([\s\S]*?)<!-- \/PREMIO_ROW -->/;
        const match = html.match(regex);

        if (match) {
            return {
                rowTemplate: match[1].trim(),
                htmlWithoutRow: html.replace(regex, '{{PREMIOS_GENERATED}}')
            };
        }
        return null;
    }

    // Gerar HTML dos prêmios usando o template de linha
    private generatePremiosFromTemplate(rowTemplate: string, premios: any[]): string {
        return premios.map((p: any, index: number) => {
            const isEven = index % 2 === 1;

            return rowTemplate
                .replace(/{{POSICAO}}/g, String(p.posicao))
                .replace(/{{MILHAR}}/g, String(p.milhar))
                .replace(/{{GRUPO}}/g, String(p.grupo).padStart(2, '0'))
                .replace(/{{BICHO}}/g, String(p.bicho))
                .replace(/{{INDEX}}/g, String(index))
                .replace(/{{IS_EVEN}}/g, isEven ? 'true' : 'false')
                .replace(/{{ROW_CLASS}}/g, isEven ? 'row-even' : 'row-odd');
        }).join('');
    }

    // Gerar HTML preenchido com dados
    async renderHtml(resultado: any, overrideHtml?: string): Promise<string> {
        let template = overrideHtml || await this.getTemplate();

        // Tentar extrair template de linha customizado
        const rowExtraction = this.extractRowTemplate(template);

        let premiosHtml: string;

        if (rowExtraction) {
            // Usar template de linha customizado
            premiosHtml = this.generatePremiosFromTemplate(rowExtraction.rowTemplate, resultado.premios);
            template = rowExtraction.htmlWithoutRow.replace(/{{PREMIOS_GENERATED}}/g, premiosHtml);
        } else {
            // Fallback: substituir {{PREMIOS}} diretamente (template já tem as linhas prontas)
            // Isso permite que o usuário coloque as linhas diretamente no HTML
            premiosHtml = '';
        }

        // Substituição de tokens globais
        template = template
            .replace(/{{DATA}}/g, resultado.data)
            .replace(/{{HORARIO}}/g, resultado.horario)
            .replace(/{{LOTERICA}}/g, resultado.loterica)
            .replace(/{{PREMIOS}}/g, premiosHtml);

        return template;
    }

    // Sanitizar HTML para Satori: garantir que TODOS os divs tenham display: flex
    private sanitizeForSatori(html: string): string {
        return html.replace(/<div([^>]*)>/gi, (match, attrs) => {
            if (/display\s*:\s*flex/i.test(attrs)) {
                return match;
            }

            if (/style\s*=/i.test(attrs)) {
                return match.replace(/style\s*=\s*["']([^"']*)["']/i, (styleMatch, styleContent) => {
                    return `style="${styleContent}; display: flex; flex-direction: column;"`;
                });
            }

            return `<div${attrs} style="display: flex; flex-direction: column;">`;
        });
    }

    // Gerar Imagem (PNG) a partir do resultado
    async renderImage(resultado: any, overrideHtml?: string): Promise<Buffer> {
        if (this.initPromise) {
            await this.initPromise;
        }

        if (!fontBuffer || !fontBoldBuffer) {
            throw new Error("Fontes não carregadas. Verifique src/assets/fonts/");
        }

        const html = await this.renderHtml(resultado, overrideHtml);
        const sanitizedHtml = this.sanitizeForSatori(html);

        const cleanHtml = sanitizedHtml
            .replace(/>\s+</g, '><')
            .replace(/\n\s+/g, '\n')
            .replace(/\s+\n/g, '\n')
            .trim();

        const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        const content = bodyMatch ? bodyMatch[1] : cleanHtml;

        const markup = toReactNode(`<div style="display: flex; flex-direction: column; width: 350px; background-color: transparent;">${content}</div>`) as any;

        const svg = await satori(
            markup,
            {
                width: 350,
                height: undefined,
                fonts: [
                    {
                        name: 'Inter',
                        data: fontBuffer!,
                        weight: 400,
                        style: 'normal',
                    },
                    {
                        name: 'Inter',
                        data: fontBoldBuffer!,
                        weight: 700,
                        style: 'normal',
                    },
                ],
            }
        );

        const resvg = new Resvg(svg, {
            fitTo: { mode: 'width', value: 350 },
        });

        return resvg.render().asPng();
    }
}
