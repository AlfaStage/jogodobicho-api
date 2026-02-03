/**
 * API Route Testing Script - Exaustivo (Hoje e Ontem)
 * Testa TODAS as lotéricas via API para Hoje e Ontem
 * Gera um relatório completo em Markdown com JSON bruto
 */

import axios from 'axios';
import fs from 'fs';
import { LOTERIAS } from './src/config/loterias.js';

const BASE_URL = 'http://127.0.0.1:3002';
const API_KEY = process.env.API_KEY || 'my-secret-key';
const headers = { 'x-api-key': API_KEY };

interface ApiCallResult {
    slug: string;
    nome: string;
    date: string;
    status: number;
    data: any;
    error?: string;
}

async function runFullTests() {
    console.log('🧪 Iniciando TESTE EXAUSTIVO da API (Hoje e Ontem)...\n');

    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const allResults: ApiCallResult[] = [];

    for (const loteria of LOTERIAS) {
        console.log(`📍 Processando: ${loteria.nome} (${loteria.slug})`);

        // Testar Hoje
        allResults.push(await fetchData(loteria.slug, loteria.nome, today));

        // Testar Ontem
        allResults.push(await fetchData(loteria.slug, loteria.nome, yesterday));
    }

    generateDetailedReport(today, yesterday, allResults);
    console.log('\n✅ Relatório EXAUSTIVO gerado em: full_api_test_results.md');
}

async function fetchData(slug: string, nome: string, date: string): Promise<ApiCallResult> {
    try {
        const url = `${BASE_URL}/v1/resultados?loterica=${slug}&data=${date}`;
        const response = await axios.get(url, { headers, validateStatus: () => true });

        return {
            slug,
            nome,
            date,
            status: response.status,
            data: response.data
        };
    } catch (error: any) {
        return {
            slug,
            nome,
            date,
            status: 0,
            data: null,
            error: error.message
        };
    }
}

function generateDetailedReport(today: string, yesterday: string, results: ApiCallResult[]) {
    let md = `# 📊 Relatório Exaustivo de Resultados de API

**Datas de Teste:** ${yesterday} e ${today}  
**Gerado em:** ${new Date().toLocaleString('pt-BR')}

---

## 📋 Resumo por Lotérica

| Lotérica | Hoje (${today}) | Ontem (${yesterday}) |
|----------|-----------------|-------------------|
`;

    LOTERIAS.forEach(loteria => {
        const todayRes = results.find(r => r.slug === loteria.slug && r.date === today);
        const yesterdayRes = results.find(r => r.slug === loteria.slug && r.date === yesterday);

        const todayStatus = (todayRes?.data && Array.isArray(todayRes.data) && todayRes.data.length > 0) ? `✅ ${todayRes.data.length}` : '⏳ 0';
        const yesterdayStatus = (yesterdayRes?.data && Array.isArray(yesterdayRes.data) && yesterdayRes.data.length > 0) ? `✅ ${yesterdayRes.data.length}` : '⏳ 0';

        md += `| ${loteria.nome} | ${todayStatus} | ${yesterdayStatus} |\n`;
    });

    md += `\n--- \n\n# 🔍 Detalhamento dos Resultados (JSON Bruto)\n\n`;

    LOTERIAS.forEach(loteria => {
        md += `## 🏢 ${loteria.nome} (\`${loteria.slug}\`)\n\n`;

        // Hoje
        const todayRes = results.find(r => r.slug === loteria.slug && r.date === today);
        md += `### 📅 Hoje: ${today}\n`;
        md += `**Status:** ${todayRes?.status || 'Erro'}\n`;
        md += `\`\`\`json\n${JSON.stringify(todayRes?.data, null, 2)}\n\`\`\`\n\n`;

        // Ontem
        const yesterdayRes = results.find(r => r.slug === loteria.slug && r.date === yesterday);
        md += `### 📅 Ontem: ${yesterday}\n`;
        md += `**Status:** ${yesterdayRes?.status || 'Erro'}\n`;
        md += `\`\`\`json\n${JSON.stringify(yesterdayRes?.data, null, 2)}\n\`\`\`\n\n`;

        md += `---\n\n`;
    });

    fs.writeFileSync('full_api_test_results.md', md, 'utf-8');
}

runFullTests();
