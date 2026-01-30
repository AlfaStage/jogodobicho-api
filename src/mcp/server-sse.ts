import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import db from "../db.js";
import { getBichoByDezena, getBichoByGrupo } from "../utils/bichos.js";

// Reutilizando lógica do server stdio (poderia refatorar para compartilhar handlers)
// Para agilidade, duplicando handlers ou importando se extrairmos para controller.
// Vamos duplicar por enquanto para evitar refactor excessivo agora.

const server = new Server(
    {
        name: "jogodobicho-mcp-sse",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "listar_resultados",
                description: "Lista últimos resultados (real-time from DB)",
                inputSchema: {
                    type: "object",
                    properties: {
                        data: { type: "string" },
                        loterica: { type: "string" }
                    }
                }
            },
            {
                name: "buscar_bicho",
                description: "Busca informações de um bicho",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string" }
                    },
                    required: ["query"]
                }
            },
            {
                name: "calcular_numerologia",
                description: "Calcula numerologia para um nome",
                inputSchema: {
                    type: "object",
                    properties: {
                        nome: { type: "string" }
                    },
                    required: ["nome"]
                }
            },
            {
                name: "horoscopo_dia",
                description: "Retorna horóscopo do dia (raspado)",
                inputSchema: {
                    type: "object",
                    properties: {
                        signo: { type: "string" } // Opcional default all
                    }
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "listar_resultados") {
        const qs = `
        SELECT r.data, r.horario, r.loterica_slug, 
               json_group_array(json_object('posicao', p.posicao, 'bicho', p.bicho)) as premios
        FROM resultados r
        JOIN premios p ON r.id = p.resultado_id
        GROUP BY r.id
        ORDER BY r.data DESC, r.horario DESC LIMIT 5
       `;
        const res = db.prepare(qs).all();
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
    }

    if (name === "buscar_bicho") {
        const q = args?.query as string;
        if (!q) throw new Error("Query req");
        const g = parseInt(q);
        const b = (!isNaN(g) && g <= 25) ? getBichoByGrupo(g) : getBichoByDezena(q);
        return { content: [{ type: "text", text: JSON.stringify(b) }] };
    }

    // ... Implementar outros handlers (Numerologia via NumerologyService, Horoscopo via DB)

    return { content: [{ type: "text", text: "Tool not fully implemented in SSE yet" }] };
});

const app = express();
let transport: SSEServerTransport;

app.get("/sse", async (req, res) => {
    transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
});

app.post("/messages", async (req, res) => {
    // Note: SSEServerTransport handlePostMessage is async? SDK docs.
    // transport.handlePostMessage(req, res); 
    // O SDK sse transport requer tratamento especifico.
    // Na versão atual, transport.handlePostMessage(req, res) existe.
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(404).send("Session not started");
    }
});

const PORT = 3001; // Porta separada para MCP SSE
app.listen(PORT, () => {
    console.log(`MCP SSE Server running on http://localhost:${PORT}/sse`);
});
