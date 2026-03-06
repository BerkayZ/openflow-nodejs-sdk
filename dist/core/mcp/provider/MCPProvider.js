"use strict";
/*
 * MCPProvider
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
exports.MCPProvider = void 0;
const MCPClient_1 = require("../client/MCPClient");
const ToolRegistry_1 = require("../tools/ToolRegistry");
const ToolExecutor_1 = require("../tools/ToolExecutor");
const ToolContext_1 = require("../tools/ToolContext");
class MCPProvider {
    constructor() {
        this.client = new MCPClient_1.MCPClient();
        this.toolRegistry = new ToolRegistry_1.ToolRegistry(this.client);
    }
    initialize(config) {
        return __awaiter(this, void 0, void 0, function* () {
            this.config = config;
            config.mcp_servers.forEach((serverConfig) => {
                this.client.addServer(serverConfig);
            });
            yield this.client.connectAll();
            const toolsConfig = config.tools || {
                auto_discover: true,
                mcp_servers: config.mcp_servers.map((server) => server.name),
            };
            yield this.toolRegistry.discoverTools(toolsConfig);
            const executionContext = {
                tools: this.toolRegistry.getAllTools(),
                variables: {},
                serverConfigs: config.mcp_servers,
            };
            this.toolContext = new ToolContext_1.ToolContext(executionContext);
            this.toolExecutor = new ToolExecutor_1.ToolExecutor(this.client, this.toolContext);
        });
    }
    addServer(serverConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            this.client.addServer(serverConfig);
            yield this.client.connect(serverConfig.name);
            if (this.config) {
                this.config.mcp_servers.push(serverConfig);
                yield this.refreshTools();
            }
        });
    }
    removeServer(serverName) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.disconnect(serverName);
            if (this.config) {
                this.config.mcp_servers = this.config.mcp_servers.filter((server) => server.name !== serverName);
                yield this.refreshTools();
            }
        });
    }
    refreshTools() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config) {
                throw new Error("MCPProvider not initialized");
            }
            const toolsConfig = this.config.tools || {
                auto_discover: true,
                mcp_servers: this.config.mcp_servers.map((server) => server.name),
            };
            yield this.toolRegistry.discoverTools(toolsConfig);
            if (this.toolContext) {
                this.toolContext.updateContext({
                    tools: this.toolRegistry.getAllTools(),
                    serverConfigs: this.config.mcp_servers,
                });
            }
        });
    }
    getToolExecutor() {
        return this.toolExecutor;
    }
    getToolContext() {
        return this.toolContext;
    }
    getToolRegistry() {
        return this.toolRegistry;
    }
    getClient() {
        return this.client;
    }
    getAvailableTools() {
        return this.toolRegistry.getAllTools();
    }
    getToolPrompt() {
        if (!this.toolContext) {
            return "";
        }
        return this.toolContext.createToolPrompt();
    }
    processLLMResponse(response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.toolExecutor) {
                throw new Error("MCPProvider not initialized");
            }
            return yield this.toolExecutor.processLLMResponse(response);
        });
    }
    getServerStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const status = {};
            const connections = this.client.getAllConnectionStatus();
            for (const [serverName, connection] of Object.entries(connections)) {
                const isConnected = yield this.client.ping(serverName);
                status[serverName] = Object.assign(Object.assign({}, connection), { isConnected, toolCount: this.toolRegistry.getToolsByServer(serverName).length });
            }
            return status;
        });
    }
    getStats() {
        var _a;
        return Object.assign({ servers: ((_a = this.config) === null || _a === void 0 ? void 0 : _a.mcp_servers.length) || 0 }, this.toolRegistry.getToolStats());
    }
    setVariable(name, value) {
        if (!this.toolContext) {
            throw new Error("MCPProvider not initialized");
        }
        this.toolContext.setVariable(name, value);
    }
    getVariable(name) {
        if (!this.toolContext) {
            throw new Error("MCPProvider not initialized");
        }
        return this.toolContext.getVariable(name);
    }
    getVariables() {
        if (!this.toolContext) {
            throw new Error("MCPProvider not initialized");
        }
        return this.toolContext.getVariables();
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.config) {
                for (const server of this.config.mcp_servers) {
                    yield this.client.disconnect(server.name);
                }
            }
        });
    }
    isInitialized() {
        return (this.config !== undefined &&
            this.toolExecutor !== undefined &&
            this.toolContext !== undefined);
    }
}
exports.MCPProvider = MCPProvider;
