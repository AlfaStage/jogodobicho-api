import { FastifyInstance } from 'fastify';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import db from "../db.js";
import { getBichoByDezena, getBichoByGrupo } from "../utils/bichos.js";
import { NumerologyService } from "../services/NumerologyService.js";

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
                }
            ]
        };
    });

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

            if (name === "buscar_bicho") {
                const q = args?.query as string;
                if (!q) throw new Error("Query is required");
                const g = parseInt(q);
                const b = (!isNaN(g) && g > 0 && g <= 25) ? getBichoByGrupo(g) : getBichoByDezena(q);
                return { content: [{ type: "text", text: JSON.stringify(b || { error: "Não encontrado" }, null, 2) }] };
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
