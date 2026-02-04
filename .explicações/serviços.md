# Serviços do Sistema

## CronService
- **Arquivo:** `src/services/CronService.ts`
- **Função:** Gerencia o agendamento de tarefas recorrentes.
- **Tarefas:**
  - `runSmartScheduler`: Loop de 5 minutos para buscar resultados pendentes.
  - `runHoroscopo6h`: Coleta diária de horóscopo às 06:00 BRT.
  - `runContent`: Atualização semanal de conteúdo estático.
- **Métodos Públicos:**
  - `start()`: Inicia todos os jobs.
  - `stop()`: Para todos os jobs de forma segura.
  - `checkHoroscopoOnStartup()`: Força verificação de horóscopo ao iniciar.

## WebhookService
- **Arquivo:** `src/services/WebhookService.ts`
- **Função:** Gerencia o registro e a notificação de webhooks de terceiros.

## RenderService
- **Arquivo:** `src/services/RenderService.ts`
- **Função:** Gera HTML e imagens (PNG) para compartilhamento de resultados usando Satori e Resvg.
