import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3002';
const API_KEY = process.env.API_KEY || '';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    },
    validateStatus: () => true // Handle all status codes
});

async function runTests() {
    console.log('--- Iniciando Testes de API ---');

    // 1. Health Check
    const health = await client.get('/health');
    console.log(`[Health] Status: ${health.status}, OK: ${health.data.status === 'ok'}`);

    // 2. Lotericas
    const lotericas = await client.get('/v1/lotericas');
    console.log(`[Lotericas] Status: ${lotericas.status}, Count: ${lotericas.data.length}`);

    // 3. Bichos
    const bichos = await client.get('/v1/bichos');
    console.log(`[Bichos] Status: ${bichos.status}, Count: ${bichos.data.length}`);

    const bicho9 = await client.get('/v1/bichos/9');
    console.log(`[Bicho 9] Status: ${bicho9.status}, Nome: ${bicho9.data[0]?.nome || 'Não encontrado'}`);

    // 4. Resultados
    const resultados = await client.get('/v1/resultados');
    console.log(`[Resultados] Status: ${resultados.status}, Encontrados: ${resultados.data.length}`);

    // 5. Horóscopo
    const horoscopo = await client.get('/v1/horoscopo');
    console.log(`[Horoscopo] Status: ${horoscopo.status}`);

    // 6. Numerologia
    const num = await client.get('/v1/numerologia?nome=Antigravity');
    console.log(`[Numerologia] Status: ${num.status}, Lucky: ${num.data.luckyNumber}`);

    // 7. Webhooks
    const webhooks = await client.get('/v1/webhooks');
    console.log(`[Webhooks] Status: ${webhooks.status}`);

    console.log('--- Testes Finalizados ---');
}

runTests();
