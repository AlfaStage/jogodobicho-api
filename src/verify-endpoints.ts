import axios from 'axios';

async function verify() {
    const baseUrl = 'http://localhost:3334';
    console.log(`Verificando API em ${baseUrl}...`);

    try {
        // 1. Health
        const health = await axios.get(`${baseUrl}/health`);
        console.log('✅ Health:', health.data);

        // 2. Lotericas
        const lotericas = await axios.get(`${baseUrl}/v1/lotericas`);
        console.log(`✅ Lotericas: ${lotericas.data.length} encontradas.`);

        // 3. Resultados
        const resultados = await axios.get(`${baseUrl}/v1/resultados`);
        console.log(`✅ Resultados: ${resultados.data.length} encontrados.`);
        if (resultados.data.length > 0) {
            console.log('   Exemplo:', resultados.data[0].loterica, resultados.data[0].horario);
        }

        // 4. Bichos
        const bichos = await axios.get(`${baseUrl}/v1/bichos`);
        console.log(`✅ Bichos: ${bichos.data.length} grupos.`);

        // 5. Busca Bicho
        const busca = await axios.get(`${baseUrl}/v1/bichos/01`); // Por grupo
        console.log('✅ Busca Grupo 01:', busca.data.nome);

        const buscaDezena = await axios.get(`${baseUrl}/v1/bichos/04`); // Por dezena
        console.log('✅ Busca Dezena 04:', buscaDezena.data.nome);

        // 6. Horoscopo
        const horoscopo = await axios.get(`${baseUrl}/v1/horoscopo`);
        console.log(`✅ Horóscopo: ${horoscopo.data.length} signos.`);

        console.log('\n🎉 Todos os testes passaram!');

    } catch (err: any) {
        console.error('❌ Falha na verificação:', err.message);
        if (err.response) {
            console.error('STATUS:', err.response.status);
            console.error('DATA:', err.response.data);
        }
    }
}

// Pequeno delay para garantir que o server subiu se rodado em paralelo (mas vamos rodar manualmente com server up)
verify();
