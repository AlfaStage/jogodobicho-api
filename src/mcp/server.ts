import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import db from "../db.js";
import { bichosData, getBichoByDezena, getBichoByGrupo } from "../utils/bichos.js";

// Instancia servidor MCP
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

// Definir Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "listar_resultados",
                description: "Lista os últimos resultados do Jogo do Bicho. Pode filtrar por data e lotérica.",
                inputSchema: {
                    type: "object",
                    properties: {
                        data: { type: "string", description: "Data no formato YYYY-MM-DD (opcional)" },
                        loterica: { type: "string", description: "Slug da lotérica (ex: pt-rio) (opcional)" },
                    },
                },
            },
            {
                name: "buscar_bicho",
                description: "Busca informações de um bicho pelo número do grupo (1-25) ou dezena (00-99).",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Número do grupo ou da dezena" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "listar_lotericas",
                description: "Lista todas as lotéricas disponíveis.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "listar_resultados") {
        const data = args?.data as string | undefined;
        const loterica = args?.loterica as string | undefined;

        let query = `
        SELECT r.id, r.data, r.horario, l.nome as loterica
        FROM resultados r
        JOIN lotericas l ON r.loterica_slug = l.slug
        WHERE 1=1
      `;
        const params: any[] = [];

        if (data) {
            query += ' AND r.data = ?';
            params.push(data);
        } else {
            query += ' ORDER BY r.data DESC, r.horario DESC LIMIT 5';
        }

        if (loterica) {
            query += ' AND r.loterica_slug = ?';
            params.push(loterica);
        }

        const stmt = db.prepare(query);
        const resultados = stmt.all(...params) as any[];

        const finalResult = [];
        const premiosStmt = db.prepare(`
        SELECT posicao, milhar, grupo, bicho 
        FROM premios WHERE resultado_id = ? ORDER BY posicao ASC
      `);

        for (const r of resultados) {
            const premios = premiosStmt.all(r.id);
            finalResult.push({ ...r, premios });
        }

        return {
            content: [{ type: "text", text: JSON.stringify(finalResult, null, 2) }],
        };
    }

    if (name === "buscar_bicho") {
        const query = args?.query as string;
        if (!query) throw new Error("Query requirida");

        const grupo = parseInt(query);
        let bicho;
        if (!isNaN(grupo) && grupo >= 1 && grupo <= 25) {
            bicho = getBichoByGrupo(grupo);
        } else if (query.length === 2) {
            bicho = getBichoByDezena(query);
        }

        if (!bicho) {
            return {
                content: [{ type: "text", text: "Bicho não encontrado para a query informada." }],
                isError: true
            };
        }

        return {
            content: [{ type: "text", text: JSON.stringify(bicho, null, 2) }],
        };
    }

    if (name === "listar_lotericas") {
        const stmt = db.prepare('SELECT slug, nome FROM lotericas');
        const lotericas = stmt.all();
        return {
            content: [{ type: "text", text: JSON.stringify(lotericas, null, 2) }],
        };
    }

    throw new Error(`Ferramenta desconhecida: ${name}`);
});

async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("JogodoBicho MCP Server running on stdio");
}

runServer().catch((error) => {
    console.error("Fatal error in main loop:", error);
    process.exit(1);
});
