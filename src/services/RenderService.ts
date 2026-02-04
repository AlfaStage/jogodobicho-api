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
    private fontsInitialized = false;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.initPromise = this.initFonts();
    }

    async initFonts() {
        if (fontBuffer && fontBoldBuffer) {
            return; // Already loaded
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

    // Carregar o template HTML (único arquivo: result.html)
    async getTemplate(): Promise<string> {
        if (await fs.pathExists(TEMPLATE_PATH)) {
            return fs.readFile(TEMPLATE_PATH, 'utf-8');
        }
        return '<div>Template não encontrado</div>';
    }

    // Salvar template (escreve diretamente no result.html)
    async saveTemplate(html: string): Promise<void> {
        await fs.ensureDir(path.dirname(TEMPLATE_PATH));
        await fs.writeFile(TEMPLATE_PATH, html, 'utf-8');
    }

    // Gerar HTML preenchido com dados
    async renderHtml(resultado: any, overrideHtml?: string): Promise<string> {
        let template = overrideHtml || await this.getTemplate();

        // Extrair variáveis CSS do template
        const vars = this.extractCssVars(template);

        // Gerar HTML dos prêmios com estilos inline baseados nas variáveis
        // IMPORTANTE: Manter as classes para o Web Preview e estilos inline EXPLICITOS para o Satori
        const premiosHtml = resultado.premios.map((p: any, index: number) => {
            const isEven = index % 2 === 1;
            const bg = isEven ? vars.rowBgEven : vars.rowBg;

            // Usamos larguras fixas (pixels) para garantir que Satori renderize identico ao Web Preview
            return `<div class="row${isEven ? ' row-even' : ''}" style="display: flex; flex-direction: row; width: 350px; background-color: ${bg}; border-bottom: 1px solid ${vars.rowBorder}; box-sizing: border-box;">` +
                `<div style="display: flex; width: ${vars.colPWidth}; padding: ${vars.cellPadding}; justify-content: center; align-items: center; text-align: center; font-size: ${vars.fontSizeBase}; color: ${vars.colPremioColor}; box-sizing: border-box;">${p.posicao}º</div>` +
                `<div style="display: flex; width: ${vars.colMWidth}; padding: ${vars.cellPadding}; justify-content: center; align-items: center; text-align: center; font-weight: bold; font-size: ${vars.fontSizeMilhar}; color: ${vars.colMilharColor}; box-sizing: border-box;">${p.milhar}</div>` +
                `<div style="display: flex; width: ${vars.colGWidth}; padding: ${vars.cellPadding}; justify-content: center; align-items: center; text-align: center; font-size: ${vars.fontSizeBase}; color: ${vars.colGrupoColor}; box-sizing: border-box;">${String(p.grupo).padStart(2, '0')}</div>` +
                `<div style="display: flex; width: ${vars.colAWidth}; padding: ${vars.cellPadding}; justify-content: center; align-items: center; text-align: center; font-size: ${vars.fontSizeBase}; color: ${vars.colAnimalColor}; box-sizing: border-box;">${p.bicho}</div>` +
                `</div>`;
        }).join('');

        // Substituição de tokens
        template = template
            .replace(/{{DATA}}/g, resultado.data)
            .replace(/{{HORARIO}}/g, resultado.horario)
            .replace(/{{LOTERICA}}/g, resultado.loterica)
            .replace(/{{PREMIOS}}/g, premiosHtml);

        // Resolver variáveis CSS var(--...) para valores fixos
        template = this.resolveCssVariables(template, vars);

        return template;
    }

    // Resolver variáveis CSS var(--...) no HTML/Style
    private resolveCssVariables(html: string, vars: Record<string, string>): string {
        const keyToVar: Record<string, string> = {
            containerBg: '--container-bg',
            containerRadius: '--container-radius',
            containerBorder: '--container-border',
            rowBg: '--row-bg',
            rowBgEven: '--row-bg-even',
            rowBorder: '--row-border',
            titleBg: '--title-bg',
            titleColor: '--title-color',
            titleFontSize: '--title-font-size',
            titlePadding: '--title-padding',
            subtitleBg: '--subtitle-bg',
            subtitleColor: '--subtitle-color',
            subtitleFontSize: '--subtitle-font-size',
            subtitlePadding: '--subtitle-padding',
            headerBg: '--header-bg',
            headerColor: '--header-color',
            headerFontSize: '--header-font-size',
            colPremioColor: '--col-premio-color',
            colMilharColor: '--col-milhar-color',
            colGrupoColor: '--col-grupo-color',
            colAnimalColor: '--col-animal-color',
            fontSizeBase: '--font-size-base',
            fontSizeMilhar: '--font-size-milhar',
            cellPadding: '--cell-padding',
            colPWidth: '--col-p-width',
            colMWidth: '--col-m-width',
            colGWidth: '--col-g-width',
            colAWidth: '--col-a-width',
        };

        let resolved = html;
        for (const [key, value] of Object.entries(vars)) {
            const cssVar = keyToVar[key];
            if (cssVar) {
                const regex = new RegExp(`var\\(\\s*${cssVar}\\s*\\)`, 'g');
                resolved = resolved.replace(regex, value);
            }
        }
        return resolved;
    }

    // Extrair variáveis CSS do template
    private extractCssVars(html: string): Record<string, string> {
        const defaults: Record<string, string> = {
            containerBg: '#ffffff',
            containerRadius: '0px',
            containerBorder: 'none',
            rowBg: '#ffffff',
            rowBgEven: '#fafafa',
            rowBorder: '#eeeeee',
            titleBg: '#f8f9fa',
            titleColor: '#1a1a1a',
            titleFontSize: '26px',
            titlePadding: '10px 10px',
            subtitleBg: '#f8f9fa',
            subtitleColor: '#1a1a1a',
            subtitleFontSize: '18px',
            subtitlePadding: '10px 0px',
            headerBg: '#222222',
            headerColor: '#ffffff',
            headerFontSize: '14px',
            colPremioColor: '#666666',
            colMilharColor: '#000000',
            colGrupoColor: '#666666',
            colAnimalColor: '#444444',
            fontSizeBase: '16px',
            fontSizeMilhar: '18px',
            cellPadding: '14px 4px',
            colPWidth: '70px',
            colMWidth: '110px',
            colGWidth: '60px',
            colAWidth: '110px',
        };

        const varMap: Record<string, keyof typeof defaults> = {
            '--container-bg': 'containerBg',
            '--container-radius': 'containerRadius',
            '--container-border': 'containerBorder',
            '--row-bg': 'rowBg',
            '--row-bg-even': 'rowBgEven',
            '--row-border': 'rowBorder',
            '--title-bg': 'titleBg',
            '--title-color': 'titleColor',
            '--title-font-size': 'titleFontSize',
            '--title-padding': 'titlePadding',
            '--subtitle-bg': 'subtitleBg',
            '--subtitle-color': 'subtitleColor',
            '--subtitle-font-size': 'subtitleFontSize',
            '--subtitle-padding': 'subtitlePadding',
            '--header-bg': 'headerBg',
            '--header-color': 'headerColor',
            '--header-font-size': 'headerFontSize',
            '--col-premio-color': 'colPremioColor',
            '--col-milhar-color': 'colMilharColor',
            '--col-grupo-color': 'colGrupoColor',
            '--col-animal-color': 'colAnimalColor',
            '--font-size-base': 'fontSizeBase',
            '--font-size-milhar': 'fontSizeMilhar',
            '--cell-padding': 'cellPadding',
            '--col-p-width': 'colPWidth',
            '--col-m-width': 'colMWidth',
            '--col-g-width': 'colGWidth',
            '--col-a-width': 'colAWidth',
        };

        const rootMatch = html.match(/:root\s*\{([^}]+)\}/);
        if (rootMatch) {
            const rootBlock = rootMatch[1];
            for (const [cssVar, propName] of Object.entries(varMap)) {
                const regex = new RegExp(`${cssVar}\\s*:\\s*([^;]+);`);
                const match = rootBlock.match(regex);
                if (match) {
                    defaults[propName] = match[1].trim();
                }
            }
        }

        return defaults;
    }

    // Sanitizar HTML para Satori: garantir que TODOS os divs tenham display: flex inline
    // Isso previne erros de "Expected <div> to have explicit display: flex"
    private sanitizeForSatori(html: string): string {
        return html.replace(/<div([^>]*)>/gi, (match, attrs) => {
            // Detectar se deve ser row ou column baseado na classe
            const isRow = /class\s*=\s*["'][^"']*(row|header)[^"']*["']/i.test(attrs);
            const direction = isRow ? 'row' : 'column';
            const flexStyle = `display: flex; flex-direction: ${direction};`;

            // Se já tem style
            if (/style\s*=/i.test(attrs)) {
                // Se já tem display: flex
                if (/display\s*:\s*flex/i.test(attrs)) {
                    // Mas falta flex-direction, adiciona
                    if (!/flex-direction/i.test(attrs)) {
                        return match.replace(/style\s*=\s*["']([^"']*)["']/i, (styleMatch, styleContent) => {
                            return `style="${styleContent}; flex-direction: ${direction};"`;
                        });
                    }
                    return match;
                }
                // Adiciona flexStyle ao style existente
                return match.replace(/style\s*=\s*["']([^"']*)["']/i, (styleMatch, styleContent) => {
                    return `style="${styleContent}; ${flexStyle}"`;
                });
            }
            // Não tem style, adiciona um completo
            return `<div${attrs} style="${flexStyle}">`;
        });
    }

    // Gerar Imagem (PNG) a partir do resultado
    async renderImage(resultado: any, overrideHtml?: string): Promise<Buffer> {
        // Aguardar inicialização das fontes (evita race condition)
        if (this.initPromise) {
            await this.initPromise;
        }

        if (!fontBuffer || !fontBoldBuffer) {
            throw new Error("Fontes não carregadas. Verifique a conexão com a internet para baixar as fontes do Google Fonts.");
        }

        const html = await this.renderHtml(resultado, overrideHtml);

        // Sanitizar HTML para Satori: garantir que TODOS os divs tenham display: flex
        const sanitizedHtml = this.sanitizeForSatori(html);

        // Limpeza mínima para o Satori não quebrar com espaços entre tags
        const cleanHtml = sanitizedHtml
            .replace(/>\s+</g, '><')
            .replace(/\n\s+/g, '\n')
            .replace(/\s+\n/g, '\n')
            .trim();

        // Extrair o conteúdo do body se houver, senão usa tudo
        const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        const content = bodyMatch ? bodyMatch[1] : cleanHtml;

        // Wrapper minimalista com a largura exata do card (350px) e sem margens/padding
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
