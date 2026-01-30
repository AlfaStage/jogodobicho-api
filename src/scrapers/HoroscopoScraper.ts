import axios from 'axios';
import * as cheerio from 'cheerio';
import db from '../db.js';
import { randomUUID } from 'crypto';

const SIGNOS = [
    'aries', 'touro', 'gemeos', 'cancer', 'leao', 'virgem',
    'libra', 'escorpiao', 'sagitario', 'capricornio', 'aquario', 'peixes'
];

export class HoroscopoScraper {
    async execute() {
        console.log('Iniciando raspagem de horóscopo...');
        const today = new Date().toISOString().split('T')[0];

        // Prepare statements
        const insertStmt = db.prepare(`
            INSERT INTO horoscopo_diario (id, data, signo, texto, numeros)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(data, signo) DO UPDATE SET
            texto = excluded.texto,
            numeros = excluded.numeros
        `);

        for (const signo of SIGNOS) {
            try {
                const url = `https://www.ojogodobicho.com/${signo}.htm`;
                const { data: html } = await axios.get(url, {
                    responseType: 'arraybuffer',
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                const decoder = new TextDecoder('iso-8859-1'); // Site antigo costuma ser latin1
                const textHtml = decoder.decode(html);
                const $ = cheerio.load(textHtml);

                // Extração baseada em heurística do site (pode precisar de ajustes)
                // O texto costuma estar em parágrafos após o título 
                // e os números em uma lista ou abaixo de "Números da sorte"

                // Texto principal: Pegar o primeiro parágrafo relevante
                // O site tem estrutura antiga, muitas vezes texto solto ou em <p>
                let texto = $('p').first().text().trim();
                // Tenta ser mais específico se possível
                $('p').each((i, el) => {
                    const t = $(el).text().trim();
                    // Ignora textos curtos ou de menu
                    if (t.length > 50 && !t.includes('Copyright')) {
                        texto = t;
                        return false; // break
                    }
                });

                // Números da sorte
                // Geralmente estão em uma lista <ul> ou após "Números da sorte"
                const numeros: string[] = [];

                // Procura por padrão visual ou texto
                $('body').text().split('\n').forEach(line => {
                    if (line.includes('Números da sorte')) {
                        // Lógica de fallback se não achar estruturado
                    }
                });

                // Tentativa direta em listas (comum no site)
                $('li').each((i, el) => {
                    const txt = $(el).text().trim();
                    if (/^\d+$/.test(txt)) { // Apenas dígitos
                        numeros.push(txt);
                    }
                });

                // Filtrar números inválidos (ex: menu items que parecem numeros)
                const luckyNumbers = numeros.filter(n => n.length <= 4).slice(0, 10).join(', ');

                console.log(`Signo: ${signo} | Números: ${luckyNumbers}`);

                insertStmt.run(randomUUID(), today, signo, texto, luckyNumbers);

            } catch (error: any) {
                console.error(`Erro ao raspar signo ${signo}:`, error.message);
            }
        }
    }
}
