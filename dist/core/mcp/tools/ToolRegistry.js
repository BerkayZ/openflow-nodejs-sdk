"use strict";
/*
 * ToolRegistry
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
exports.ToolRegistry = void 0;
const ToolValidator_1 = require("./ToolValidator");
class ToolRegistry {
    constructor(client) {
        this.tools = new Map();
        this.serverTools = new Map();
        this.builtinTools = new Map();
        this.client = client;
        this.initializeBuiltinTools();
    }
    initializeBuiltinTools() {
        const builtinToolsDefinitions = [
            {
                name: "set_variable",
                description: "Set a variable value in the execution context",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Variable name" },
                        value: { description: "Variable value" },
                    },
                    required: ["name", "value"],
                },
                serverName: "builtin",
            },
            {
                name: "get_variable",
                description: "Get a variable value from the execution context",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Variable name" },
                    },
                    required: ["name"],
                },
                serverName: "builtin",
            },
        ];
        builtinToolsDefinitions.forEach((tool) => {
            this.builtinTools.set(tool.name, tool);
        });
    }
    discoverTools(config) {
        return __awaiter(this, void 0, void 0, function* () {
            this.tools.clear();
            this.serverTools.clear();
            if (config.mcp_servers) {
                yield this.discoverMCPServerTools(config.mcp_servers, config);
            }
            if (config.builtin_tools) {
                this.addBuiltinTools(config.builtin_tools);
            }
            if (config.available_tools) {
                this.filterAvailableTools(config.available_tools);
            }
            if (config.filter) {
                this.applyFilters(config.filter);
            }
        });
    }
    discoverMCPServerTools(serverNames, config) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const serverName of serverNames) {
                try {
                    const serverTools = yield this.client.listTools(serverName);
                    const validTools = serverTools.filter((tool) => ToolValidator_1.ToolValidator.validateTool(tool));
                    this.serverTools.set(serverName, validTools);
                    if (config.auto_discover !== false) {
                        validTools.forEach((tool) => {
                            this.tools.set(tool.name, tool);
                        });
                    }
                }
                catch (error) {
                    console.warn(`Failed to discover tools for server ${serverName}:`, error);
                }
            }
        });
    }
    addBuiltinTools(builtinToolNames) {
        builtinToolNames.forEach((toolName) => {
            const tool = this.builtinTools.get(toolName);
            if (tool) {
                this.tools.set(toolName, tool);
            }
            else {
                console.warn(`Builtin tool '${toolName}' not found`);
            }
        });
    }
    filterAvailableTools(availableTools) {
        const filteredTools = new Map();
        availableTools.forEach((toolName) => {
            const tool = this.tools.get(toolName);
            if (tool) {
                filteredTools.set(toolName, tool);
            }
        });
        this.tools = filteredTools;
    }
    applyFilters(filters) {
        const filteredTools = new Map();
        this.tools.forEach((tool, name) => {
            const matchesFilter = filters.some((filter) => {
                const regex = new RegExp(filter.replace(/\*/g, ".*"), "i");
                return regex.test(name);
            });
            if (matchesFilter) {
                filteredTools.set(name, tool);
            }
        });
        this.tools = filteredTools;
    }
    getTool(name) {
        return this.tools.get(name);
    }
    getAllTools() {
        return Array.from(this.tools.values());
    }
    getToolsByServer(serverName) {
        return Array.from(this.tools.values()).filter((tool) => tool.serverName === serverName);
    }
    getServerTools(serverName) {
        return this.serverTools.get(serverName) || [];
    }
    getBuiltinTools() {
        return Array.from(this.builtinTools.values());
    }
    hasTools() {
        return this.tools.size > 0;
    }
    getToolCount() {
        return this.tools.size;
    }
    getToolNames() {
        return Array.from(this.tools.keys());
    }
    addTool(tool) {
        if (ToolValidator_1.ToolValidator.validateTool(tool)) {
            this.tools.set(tool.name, tool);
        }
        else {
            throw new Error(`Invalid tool: ${tool.name}`);
        }
    }
    removeTool(name) {
        return this.tools.delete(name);
    }
    clearTools() {
        this.tools.clear();
    }
    refreshTools() {
        return __awaiter(this, void 0, void 0, function* () {
            const serverNames = Array.from(this.serverTools.keys());
            for (const serverName of serverNames) {
                try {
                    const serverTools = yield this.client.listTools(serverName);
                    const validTools = serverTools.filter((tool) => ToolValidator_1.ToolValidator.validateTool(tool));
                    this.serverTools.set(serverName, validTools);
                    validTools.forEach((tool) => {
                        this.tools.set(tool.name, tool);
                    });
                }
                catch (error) {
                    console.warn(`Failed to refresh tools for server ${serverName}:`, error);
                }
            }
        });
    }
    getToolStats() {
        const byServer = {};
        this.tools.forEach((tool) => {
            byServer[tool.serverName] = (byServer[tool.serverName] || 0) + 1;
        });
        return {
            total: this.tools.size,
            byServer,
        };
    }
}
exports.ToolRegistry = ToolRegistry;
