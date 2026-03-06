"use strict";
/*
 * MCPConnection
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPConnectionManager = void 0;
const MCPAuth_1 = require("./MCPAuth");
class MCPConnectionManager {
    constructor() {
        this.connections = new Map();
        this.auth = new Map();
        this.serverConfigs = new Map();
    }
    addServer(config) {
        this.serverConfigs.set(config.name, config);
        this.auth.set(config.name, new MCPAuth_1.MCPAuth(config.auth));
        this.connections.set(config.name, {
            url: config.url,
            isConnected: false,
            retryCount: 0,
        });
    }
    connect(serverName) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = this.connections.get(serverName);
            const config = this.serverConfigs.get(serverName);
            if (!connection || !config) {
                throw new Error(`Server ${serverName} not found`);
            }
            try {
                // Use MCP initialize handshake
                const initRequest = {
                    method: "initialize",
                    params: {
                        protocolVersion: "2024-11-05",
                        capabilities: {
                            tools: {},
                        },
                        clientInfo: {
                            name: "openflow-nodejs-sdk",
                            version: "0.0.1",
                        },
                    },
                    id: `init_${Date.now()}`,
                };
                yield this.makeRequestDirect(serverName, initRequest);
                connection.isConnected = true;
                connection.lastPing = new Date();
                connection.retryCount = 0;
            }
            catch (error) {
                connection.isConnected = false;
                connection.retryCount++;
                throw error;
            }
        });
    }
    disconnect(serverName) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = this.connections.get(serverName);
            if (connection) {
                connection.isConnected = false;
                connection.lastPing = undefined;
            }
        });
    }
    isConnected(serverName) {
        var _a;
        const connection = this.connections.get(serverName);
        return (_a = connection === null || connection === void 0 ? void 0 : connection.isConnected) !== null && _a !== void 0 ? _a : false;
    }
    makeRequest(serverName, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = this.connections.get(serverName);
            if (!(connection === null || connection === void 0 ? void 0 : connection.isConnected)) {
                yield this.connect(serverName);
            }
            return yield this.makeRequestDirect(serverName, request);
        });
    }
    makeRequestDirect(serverName, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = this.connections.get(serverName);
            const config = this.serverConfigs.get(serverName);
            const auth = this.auth.get(serverName);
            if (!connection || !config || !auth) {
                throw new Error(`Server ${serverName} not found`);
            }
            const url = new URL(config.url);
            const headers = {
                "Content-Type": "application/json",
                "User-Agent": "openflow-nodejs-sdk/0.0.1",
                Accept: "application/json, text/event-stream",
            };
            // Include session ID if available and not an initialization request
            if (connection.sessionId && request.method !== "initialize") {
                headers["Mcp-Session-Id"] = connection.sessionId;
            }
            auth.applyAuth(headers, url);
            const timeout = config.timeout || 30000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                // Ensure proper JSON-RPC 2.0 format
                const jsonRpcRequest = {
                    jsonrpc: "2.0",
                    method: request.method,
                    params: request.params || {},
                    id: request.id || `req_${Date.now()}`,
                };
                const response = yield fetch(url.toString(), {
                    method: "POST",
                    headers,
                    body: JSON.stringify(jsonRpcRequest),
                    signal: controller.signal,
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                // Extract session ID from headers if this is an initialization
                if (request.method === "initialize") {
                    const sessionId = response.headers.get("mcp-session-id");
                    if (sessionId) {
                        connection.sessionId = sessionId;
                    }
                }
                // Check if response is SSE format
                const contentType = response.headers.get("content-type") || "";
                if (contentType.includes("text/event-stream")) {
                    // Parse SSE response
                    const text = yield response.text();
                    const data = this.parseSSEResponse(text);
                    return data;
                }
                else {
                    // Parse JSON response
                    const data = yield response.json();
                    return data;
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    if (error.name === "AbortError") {
                        throw new Error(`Request timeout after ${timeout}ms`);
                    }
                    throw error;
                }
                throw new Error(`Request failed: ${String(error)}`);
            }
            finally {
                clearTimeout(timeoutId);
            }
        });
    }
    parseSSEResponse(sseText) {
        const lines = sseText.split("\n");
        let eventType = "";
        let data = "";
        for (const line of lines) {
            if (line.startsWith("event: ")) {
                eventType = line.substring(7);
            }
            else if (line.startsWith("data: ")) {
                data = line.substring(6);
                // If this is a message event with JSON data, parse and return it
                if (eventType === "message") {
                    try {
                        return JSON.parse(data, (key, value) => {
                            if (key === "__proto__" ||
                                key === "constructor" ||
                                key === "prototype") {
                                return undefined;
                            }
                            return value;
                        });
                    }
                    catch (error) {
                        console.warn("Failed to parse SSE JSON data:", data);
                    }
                }
            }
        }
        throw new Error("No valid message found in SSE response");
    }
    getConnectionStatus(serverName) {
        return this.connections.get(serverName);
    }
    getAllConnections() {
        const result = {};
        this.connections.forEach((connection, name) => {
            result[name] = connection;
        });
        return result;
    }
    retryConnection(serverName) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = this.connections.get(serverName);
            const config = this.serverConfigs.get(serverName);
            if (!connection || !config) {
                throw new Error(`Server ${serverName} not found`);
            }
            const maxRetries = config.retry_attempts || 3;
            if (connection.retryCount >= maxRetries) {
                throw new Error(`Max retry attempts (${maxRetries}) exceeded for server ${serverName}`);
            }
            yield this.connect(serverName);
        });
    }
}
exports.MCPConnectionManager = MCPConnectionManager;
