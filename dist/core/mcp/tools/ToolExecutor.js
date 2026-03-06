"use strict";
/*
 * ToolExecutor
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
exports.ToolExecutor = void 0;
const ToolValidator_1 = require("./ToolValidator");
class ToolExecutor {
    constructor(client, context) {
        this.client = client;
        this.context = context;
    }
    executeTool(toolCall) {
        return __awaiter(this, void 0, void 0, function* () {
            const tool = this.context.getToolByName(toolCall.name);
            if (!tool) {
                return {
                    success: false,
                    error: `Tool '${toolCall.name}' not found`,
                };
            }
            const resolvedArgs = this.context.resolveArguments(toolCall.arguments);
            const resolvedToolCall = {
                name: toolCall.name,
                arguments: resolvedArgs,
            };
            const validation = ToolValidator_1.ToolValidator.validateToolCall(resolvedToolCall, tool);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Tool validation failed: ${validation.errors.join(", ")}`,
                };
            }
            try {
                const result = yield this.client.callTool(tool.serverName, resolvedToolCall);
                if (result.success && result.result) {
                    this.updateContextFromResult(result.result);
                }
                return result;
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        });
    }
    executeMultipleTools(toolCalls) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            for (const toolCall of toolCalls) {
                const result = yield this.executeTool(toolCall);
                results.push(result);
                if (!result.success) {
                    break;
                }
            }
            return results;
        });
    }
    parseToolCallFromResponse(response) {
        try {
            let jsonStr = response.trim();
            if (jsonStr.startsWith("```json")) {
                jsonStr = jsonStr.slice(7, -3).trim();
            }
            else if (jsonStr.startsWith("```")) {
                jsonStr = jsonStr.slice(3, -3).trim();
            }
            const parsed = JSON.parse(jsonStr, (key, value) => {
                if (key === "__proto__" ||
                    key === "constructor" ||
                    key === "prototype") {
                    return undefined;
                }
                return value;
            });
            if (parsed.tool_call &&
                parsed.tool_call.name &&
                parsed.tool_call.arguments) {
                return {
                    name: parsed.tool_call.name,
                    arguments: parsed.tool_call.arguments,
                };
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    parseMultipleToolCalls(response) {
        const toolCalls = [];
        const singleCall = this.parseToolCallFromResponse(response);
        if (singleCall) {
            toolCalls.push(singleCall);
            return toolCalls;
        }
        try {
            const parsed = JSON.parse(response, (key, value) => {
                if (key === "__proto__" ||
                    key === "constructor" ||
                    key === "prototype") {
                    return undefined;
                }
                return value;
            });
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    if (item.tool_call &&
                        item.tool_call.name &&
                        item.tool_call.arguments) {
                        toolCalls.push({
                            name: item.tool_call.name,
                            arguments: item.tool_call.arguments,
                        });
                    }
                }
            }
        }
        catch (error) { }
        return toolCalls;
    }
    processLLMResponse(response) {
        return __awaiter(this, void 0, void 0, function* () {
            const toolCalls = this.parseMultipleToolCalls(response);
            if (toolCalls.length === 0) {
                return { hasToolCalls: false, cleanedResponse: response };
            }
            const toolResults = yield this.executeMultipleTools(toolCalls);
            let cleanedResponse = response;
            try {
                const parsed = JSON.parse(response, (key, value) => {
                    if (key === "__proto__" ||
                        key === "constructor" ||
                        key === "prototype") {
                        return undefined;
                    }
                    return value;
                });
                if (parsed.tool_call) {
                    cleanedResponse = "";
                }
            }
            catch (error) { }
            return {
                hasToolCalls: true,
                toolResults,
                cleanedResponse,
            };
        });
    }
    updateContextFromResult(result) {
        if (result && typeof result === "object" && result.context_updates) {
            const updates = result.context_updates;
            if (updates.variables) {
                Object.entries(updates.variables).forEach(([key, value]) => {
                    this.context.setVariable(key, value);
                });
            }
        }
    }
    getContext() {
        return this.context;
    }
    updateContext(updates) {
        this.context.updateContext(updates);
    }
}
exports.ToolExecutor = ToolExecutor;
