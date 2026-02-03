import { FastifyInstance } from 'fastify';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import db from "../db.js";
import { bichosData, getBichoByDezena, getBichoByGrupo } from "../utils/bichos.js";
import { NumerologyService } from "../services/NumerologyService.js";
import { WebhookService } from "../services/WebhookService.js";
import fs from "fs/promises";
import path from "path";

export async function registerMcpRoutes(app: FastifyInstance) {
    const server = new Server(
        {
            name: "jogodobicho-mcp",
            version: "1.0.0",
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    const numerologyService = new NumerologyService();

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: "listar_resultados",
                    description: "Lista últimos resultados do Jogo do Bicho",
                    inputSchema: {
                        type: "object",
                        properties: {
                            data: { type: "string", description: "Data no formato YYYY-MM-DD" },
                            loterica: { type: "string", description: "Slug da lotérica" }
                        }
                    }
                },
                {
                    name: "listar_lotericas",
                    description: "Lista todas as bancas/lotéricas disponíveis e seus slugs",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "tabela_bichos",
                    description: "Retorna a tabela completa de todos os 25 bichos e suas dezenas",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "buscar_bicho",
                    description: "Busca informações de um bicho pelo grupo ou dezena",
                    inputSchema: {
                        type: "object",
                        properties: {
                            query: { type: "string", description: "Grupo (ex: 1) ou Dezena (ex: 01)" }
                        },
                        required: ["query"]
                    }
                },
                {
                    name: "como_jogar",
                    description: "Retorna instruções, regras e história do Jogo do Bicho",
                    inputSchema: {
                        type: "object",
                        properties: {
                            secao: {
                                type: "string",
                                enum: ["regras", "tabela", "modalidades", "historia", "dicas"],
                                description: "Seção específica para ler"
                            }
                        }
                    }
                },
                {
                    name: "calcular_numerologia",
                    description: "Calcula os números da sorte para um nome",
                    inputSchema: {
                        type: "object",
                        properties: {
                            nome: { type: "string", description: "Nome para calcular" }
                        },
                        required: ["nome"]
                    }
                },
                {
                    name: "horoscopo_dia",
                    description: "Retorna o horóscopo do dia para um signo",
                    inputSchema: {
                        type: "object",
                        properties: {
                            signo: { type: "string", description: "Nome do signo" }
                        }
                    }
                },
                {
                    name: "listar_webhooks",
                    description: "Lista todos os webhooks de notificação registrados",
                    inputSchema: { type: "object", properties: {} }
                },
                {
                    name: "criar_webhook",
                    description: "Registra um novo webhook para receber resultados",
                    inputSchema: {
                        type: "object",
                        properties: {
                            url: { type: "string", description: "URL do webhook (POST)" }
                        },
                        required: ["url"]
                    }
                },
                {
                    name: "deletar_webhook",
                    description: "Remove um webhook pelo ID",
                    inputSchema: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "UUID do webhook" }
                        },
                        required: ["id"]
                    }
                }
            ]
        };
    });

    const webhookService = new WebhookService();

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        try {
            if (name === "listar_resultados") {
                const qs = `
                SELECT r.data, r.horario, r.loterica_slug, 
                       json_group_array(json_object('posicao', p.posicao, 'bicho', p.bicho, 'milhar', p.milhar)) as premios
                FROM resultados r
                JOIN premios p ON r.id = p.resultado_id
                GROUP BY r.id
                ORDER BY r.data DESC, r.horario DESC LIMIT 5
                `;
                const res = db.prepare(qs).all();
                return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
            }

            if (name === "listar_lotericas") {
                const res = db.prepare('SELECT slug, nome FROM lotericas').all();
                return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
            }

            if (name === "tabela_bichos") {
                return { content: [{ type: "text", text: JSON.stringify(bichosData, null, 2) }] };
            }

            if (name === "buscar_bicho") {
                const q = args?.query as string;
                if (!q) throw new Error("Query is required");
                const g = parseInt(q);
                const b = (!isNaN(g) && g > 0 && g <= 25) ? getBichoByGrupo(g) : getBichoByDezena(q);
                return { content: [{ type: "text", text: JSON.stringify(b || { error: "Não encontrado" }, null, 2) }] };
            }

            if (name === "como_jogar") {
                const secao = args?.secao as string;
                const filePath = path.resolve('src/data/historia.md');
                const content = await fs.readFile(filePath, 'utf-8');

                if (!secao) {
                    return { content: [{ type: "text", text: content }] };
                }

                const headers: Record<string, string> = {
                    regras: 'Regras Básicas',
                    tabela: 'Tabela de Grupos e Dezenas',
                    modalidades: 'Modalidades de Aposta',
                    historia: 'Curiosidades Históricas',
                    dicas: 'Dicas de Apostas'
                };

                const header = headers[secao];
                const regex = new RegExp(`#{2,3} ${header}([\\s\\S]*?)(?=\\n#{2,3} |$)`, 'i');
                const match = content.match(regex);
                const sectionContent = match ? match[1].trim() : 'Seção não encontrada.';

                return { content: [{ type: "text", text: sectionContent }] };
            }

            if (name === "calcular_numerologia") {
                const nome = args?.nome as string;
                const res = numerologyService.calculate(nome);
                return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
            }

            if (name === "horoscopo_dia") {
                const today = new Date().toISOString().split('T')[0];
                const signo = args?.signo as string;
                let query = 'SELECT signo, texto, numeros, data FROM horoscopo_diario WHERE data = ?';
                const params: any[] = [today];

                if (signo) {
                    query += ' AND signo LIKE ?';
                    params.push(`%${signo}%`);
                }

                const res = db.prepare(query).all(...params);
                return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
            }

            if (name === "listar_webhooks") {
                const res = await webhookService.list();
                return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
            }

            if (name === "criar_webhook") {
                const url = args?.url as string;
                await webhookService.register(url);
                return { content: [{ type: "text", text: "Webhook registrado com sucesso" }] };
            }

            if (name === "deletar_webhook") {
                const id = args?.id as string;
                await webhookService.delete(id);
                return { content: [{ type: "text", text: "Webhook removido com sucesso" }] };
            }

            return {
                content: [{ type: "text", text: `Tool ${name} not implemented` }],
                isError: true,
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    });

    let transport: SSEServerTransport | null = null;

    app.get("/sse", async (req, reply) => {
        console.log("MCP SSE connection opened");
        transport = new SSEServerTransport("/messages", reply.raw);
        await server.connect(transport);

        reply.raw.on('close', () => {
            console.log("MCP SSE connection closed");
            transport = null;
        });
    });

    app.post("/messages", async (req, reply) => {
        if (transport) {
            await transport.handlePostMessage(req.raw, reply.raw);
        } else {
            reply.code(404).send("Session not started");
        }
    });
}
