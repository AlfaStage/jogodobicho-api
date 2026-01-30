import axios from 'axios';
import { ContentScraper } from './scrapers/ContentScraper.js';
import { HoroscopoScraper } from './scrapers/HoroscopoScraper.js';

async function verify() {
    const baseUrl = 'http://localhost:3334'; // Usando a porta do servidor atual
    console.log('Iniciando Verificação Fase 5...');

    try {
        // 1. Popular Dados (Scrapers)
        console.log('--- Executando Scrapers ---');
        await new ContentScraper().execute();
        await new HoroscopoScraper().execute();
        console.log('✅ Scrapers finalizados.');

        // 2. Testar Como Jogar
        console.log('\n--- Testando /v1/como-jogar ---');
        const comoJogar = await axios.get(`${baseUrl}/v1/como-jogar`);
        console.log('Status:', comoJogar.status);
        console.log('Content Preview:', comoJogar.data.content.slice(0, 50));

        // 3. Testar Horóscopo
        console.log('\n--- Testando /v1/horoscopo ---');
        const horoscopo = await axios.get(`${baseUrl}/v1/horoscopo`);
        console.log(`Encontrados: ${horoscopo.data.length} signos.`);
        if (horoscopo.data.length > 0) {
            console.log('Exemplo:', horoscopo.data[0]);
        }

        // 4. Testar Numerologia
        console.log('\n--- Testando /v1/numerologia ---');
        const numerologia = await axios.get(`${baseUrl}/v1/numerologia?nome=João da Silva`);
        console.log('Resultado:', numerologia.data);

        // 5. Testar Webhooks (CRUD)
        console.log('\n--- Testando /v1/webhooks ---');
        const register = await axios.post(`${baseUrl}/v1/webhooks`, { url: 'https://webhook.site/test' });
        console.log('Registro:', register.status);

        const list = await axios.get(`${baseUrl}/v1/webhooks`);
        console.log(`Listagem: ${list.data.length} webhooks.`);

        if (list.data.length > 0) {
            const id = list.data[0].id;
            await axios.delete(`${baseUrl}/v1/webhooks/${id}`);
            console.log(`Deletado ID: ${id}`);
        }

        console.log('\n🎉 Verificação Fase 5 concluída com sucesso!');

    } catch (error: any) {
        console.error('❌ Erro na verificação:', error.message);
        if (error.response) console.error('Data:', error.response.data);
    }
}

verify();
