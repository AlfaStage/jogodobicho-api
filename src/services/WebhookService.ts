import axios from 'axios';
import db from '../db.js';
import { randomUUID } from 'crypto';

export class WebhookService {

    // Registrar novo webhook
    async register(url: string) {
        const stmt = db.prepare('INSERT INTO webhooks (id, url) VALUES (?, ?)');
        stmt.run(randomUUID(), url);
    }

    // Listar webhooks
    list() {
        return db.prepare('SELECT * FROM webhooks').all();
    }

    // Remover webhook
    delete(id: string) {
        db.prepare('DELETE FROM webhooks WHERE id = ?').run(id);
    }

    // Disparar evento para todos os webhooks
    async notifyAll(event: string, payload: any) {
        const webhooks = this.list() as any[];
        console.log(`Disparando webhooks para ${webhooks.length} destinos...`);

        const fullPayload = {
            event,
            timestamp: new Date().toISOString(),
            data: payload
        };

        const promises = webhooks.map(webhook =>
            axios.post(webhook.url, fullPayload, { timeout: 5000 })
                .then(() => console.log(`Webhook enviado: ${webhook.url}`))
                .catch(err => console.error(`Falha no webhook ${webhook.url}: ${err.message}`))
        );

        await Promise.allSettled(promises);
    }
}
