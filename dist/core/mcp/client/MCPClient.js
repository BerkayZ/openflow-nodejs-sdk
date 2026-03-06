"use strict";
/*
 * MCPClient
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
exports.MCPClient = void 0;
const MCPConnection_1 = require("./MCPConnection");
class MCPClient {
    constructor() {
        this.requestId = 0;
        this.connectionManager = new MCPConnection_1.MCPConnectionManager();
    }
    addServer(config) {
        this.connectionManager.addServer(config);
    }
    connect(serverName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connectionManager.connect(serverName);
        });
    }
    connectAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const connections = this.connectionManager.getAllConnections();
            const promises = Object.keys(connections).map((serverName) => this.connectionManager.connect(serverName).catch((error) => {
                console.warn(`Failed to connect to server ${serverName}:`, error.message);
            }));
            yield Promise.allSettled(promises);
        });
    }
    disconnect(serverName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connectionManager.disconnect(serverName);
        });
    }
    listTools(serverName) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const request = {
                method: "tools/list",
                id: this.generateRequestId(),
            };
            const response = yield this.connectionManager.makeRequest(serverName, request);
            if (response.error) {
                throw new Error(`Failed to list tools: ${response.error.message}`);
            }
            return (((_a = response.result) === null || _a === void 0 ? void 0 : _a.tools) || []).map((tool) => (Object.assign(Object.assign({}, tool), { serverName })));
        });
    }
    listAllTools() {
        return __awaiter(this, void 0, void 0, function* () {
            const connections = this.connectionManager.getAllConnections();
            const tools = [];
            for (const serverName of Object.keys(connections)) {
                try {
                    const serverTools = yield this.listTools(serverName);
                    tools.push(...serverTools);
                }
                catch (error) {
                    console.warn(`Failed to list tools for server ${serverName}:`, error);
                }
            }
            return tools;
        });
    }
    callTool(serverName, toolCall) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = {
                method: "tools/call",
                params: {
                    name: toolCall.name,
                    arguments: toolCall.arguments,
                },
                id: this.generateRequestId(),
            };
            try {
                const response = yield this.connectionManager.makeRequest(serverName, request);
                if (response.error) {
                    return {
                        success: false,
                        error: response.error.message,
                    };
                }
                return {
                    success: true,
                    result: response.result,
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });
    }
    getTool(serverName, toolName) {
        return __awaiter(this, void 0, void 0, function* () {
            const tools = yield this.listTools(serverName);
            return tools.find((tool) => tool.name === toolName);
        });
    }
    findTool(toolName) {
        return __awaiter(this, void 0, void 0, function* () {
            const tools = yield this.listAllTools();
            return tools.find((tool) => tool.name === toolName);
        });
    }
    ping(serverName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const request = {
                    method: "ping",
                    id: this.generateRequestId(),
                };
                const response = yield this.connectionManager.makeRequest(serverName, request);
                return !response.error;
            }
            catch (error) {
                return false;
            }
        });
    }
    pingAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const connections = this.connectionManager.getAllConnections();
            const results = {};
            for (const serverName of Object.keys(connections)) {
                results[serverName] = yield this.ping(serverName);
            }
            return results;
        });
    }
    getConnectionStatus(serverName) {
        return this.connectionManager.getConnectionStatus(serverName);
    }
    getAllConnectionStatus() {
        return this.connectionManager.getAllConnections();
    }
    isConnected(serverName) {
        return this.connectionManager.isConnected(serverName);
    }
    generateRequestId() {
        return `req_${++this.requestId}_${Date.now()}`;
    }
}
exports.MCPClient = MCPClient;
