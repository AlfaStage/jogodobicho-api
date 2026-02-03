import { StartupSyncService } from './src/services/StartupSyncService.js';
import db from './src/db.js';

async function testStartupSync() {
    console.log('--- Testando StartupSyncService ---');

    // Primeiro, vamos "deletar" os resultados de hoje de uma lotérica para forçar o sync
    console.log('[1] Limpando resultados de hoje para look-goias e jb-bahia...');
    const today = new Date().toISOString().split('T')[0];
    db.prepare('DELETE FROM premios WHERE resultado_id IN (SELECT id FROM resultados WHERE loterica_slug IN (?, ?) AND data = ?)').run('look-goias', 'jb-bahia', today);
    db.prepare('DELETE FROM resultados WHERE loterica_slug IN (?, ?) AND data = ?').run('look-goias', 'jb-bahia', today);

    const syncService = new StartupSyncService();
    console.log('[2] Iniciando sync...');
    await syncService.sync();

    console.log('[3] Verificando se os resultados foram recuperados...');
    const results = db.prepare('SELECT count(*) as count FROM resultados WHERE loterica_slug = ? AND data = ?').get('look-goias', today) as { count: number };

    console.log(`Resultados Look Goias encontrados hoje: ${results.count}`);

    if (results.count > 0) {
        console.log('✅ Sincronização funcionou para Look Goias!');
    } else {
        console.log('❌ Falha na sincronização ou nenhum resultado disponível no site.');
    }

    db.close();
    console.log('--- Teste Finalizado ---');
}

testStartupSync();
