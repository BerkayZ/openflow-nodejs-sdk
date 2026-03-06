"use strict";
/*
 * LLMNode
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
exports.LLMNodeExecutor = void 0;
const BaseNode_1 = require("../base/BaseNode");
const providers_1 = require("./providers");
const OutputFormatter_1 = require("./OutputFormatter");
const mcp_1 = require("../../mcp");
// Constants
const MAX_MCP_ITERATIONS = 5;
class LLMNodeExecutor extends BaseNode_1.BaseNode {
    /**
     * Execute LLM node
     */
    execute(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const llmNode = node;
            // Resolve config variables
            const resolvedConfig = this.resolveConfigVariables(llmNode.config, context.registry);
            this.log(context, "info", `Executing LLM node: ${llmNode.id} with provider: ${resolvedConfig.provider}`);
            // Initialize MCP if configured
            if (resolvedConfig.mcp_servers && resolvedConfig.mcp_servers.length > 0) {
                yield this.initializeMCP(llmNode, context, resolvedConfig);
            }
            // Resolve variables in messages
            const resolvedMessages = this.resolveMessages(llmNode, context);
            // Convert messages to provider format
            let providerMessages = this.convertToProviderMessages(resolvedMessages);
            // Inject MCP tool prompt if available
            if (this.mcpProvider && this.mcpProvider.isInitialized()) {
                providerMessages = this.injectMCPToolPrompt(providerMessages);
            }
            this.log(context, "debug", `Resolved messages:`, providerMessages);
            // Get provider configuration from context
            const providerConfig = this.getProviderConfig(resolvedConfig.provider, context);
            // Create provider instance
            const provider = providers_1.ProviderFactory.createProvider(resolvedConfig, providerConfig.apiKey);
            // Generate completion with MCP tool support
            const response = yield this.generateCompletionWithMCP(provider, providerMessages, llmNode.output, context);
            this.log(context, "debug", `Raw LLM response:`, response.content);
            // Parse and validate the response
            const parsedOutput = this.parseJsonResponse(response.content);
            const validatedOutput = OutputFormatter_1.OutputFormatter.validateAndFormat(parsedOutput, llmNode.output);
            this.log(context, "info", `LLM node completed successfully. Tokens used: ${((_a = response.usage) === null || _a === void 0 ? void 0 : _a.total_tokens) || "unknown"}`);
            return validatedOutput;
        });
    }
    /**
     * Get provider configuration from context
     */
    getProviderConfig(providerName, context) {
        var _a;
        if (!((_a = context.config.providers) === null || _a === void 0 ? void 0 : _a.llm)) {
            throw new Error("No LLM providers configured in FlowExecutorConfig");
        }
        const providerConfig = context.config.providers.llm[providerName.toLowerCase()];
        if (!providerConfig) {
            throw new Error(`Provider configuration not found for: ${providerName}. Available providers: ${Object.keys(context.config.providers.llm).join(", ")}`);
        }
        if (!providerConfig.apiKey) {
            throw new Error(`API key not configured for provider: ${providerName} in FlowExecutorConfig`);
        }
        return providerConfig;
    }
    /**
     * Resolve variables in messages
     */
    resolveMessages(llmNode, context) {
        return llmNode.messages.map((message) => {
            if (!message.type || message.type === "text") {
                return Object.assign(Object.assign({}, message), { text: this.resolveVariables(message.text || message.content || '', context.registry) });
            }
            else if (message.type === "image") {
                const resolvedMessage = Object.assign({}, message);
                // Handle image_url (could be a file ID or URL)
                if (message.image_url) {
                    const resolvedUrl = this.resolveVariables(message.image_url, context.registry);
                    // Check if it's a file ID
                    if (typeof resolvedUrl === "string" &&
                        context.registry.getFileManager().hasFile(resolvedUrl)) {
                        // It's a file ID, convert to data URL
                        resolvedMessage.image_data =
                            context.registry.getFileDataUrl(resolvedUrl);
                        resolvedMessage.image_url = undefined; // Clear the URL since we have data
                    }
                    else {
                        resolvedMessage.image_url = resolvedUrl;
                    }
                }
                // Handle image_path (could be a file ID or path)
                if (message.image_path) {
                    const resolvedPath = this.resolveVariables(message.image_path, context.registry);
                    // Check if it's a file ID
                    if (typeof resolvedPath === "string" &&
                        context.registry.getFileManager().hasFile(resolvedPath)) {
                        // It's a file ID, convert to data URL
                        resolvedMessage.image_data =
                            context.registry.getFileDataUrl(resolvedPath);
                        resolvedMessage.image_path = undefined; // Clear the path since we have data
                    }
                    else {
                        resolvedMessage.image_path = resolvedPath;
                    }
                }
                // Handle direct image_data
                if (message.image_data) {
                    const resolvedData = this.resolveVariables(message.image_data, context.registry);
                    // Check if it's a file ID
                    if (typeof resolvedData === "string" &&
                        context.registry.getFileManager().hasFile(resolvedData)) {
                        // It's a file ID, convert to data URL
                        resolvedMessage.image_data =
                            context.registry.getFileDataUrl(resolvedData);
                    }
                    else {
                        resolvedMessage.image_data = resolvedData;
                    }
                }
                return resolvedMessage;
            }
            return message;
        });
    }
    /**
     * Convert internal messages to provider format
     */
    convertToProviderMessages(messages) {
        return messages.map((msg) => {
            if (!msg.type || msg.type === "text") {
                return {
                    role: msg.role,
                    content: msg.text,
                };
            }
            else if (msg.type === "image") {
                // For image messages, we need to create a multimodal message
                const content = [];
                // Add text content if available
                if (msg.text) {
                    content.push({
                        type: "text",
                        text: msg.text,
                    });
                }
                // Add image content
                if (msg.image_data) {
                    content.push({
                        type: "image_url",
                        image_url: {
                            url: msg.image_data,
                            detail: "high",
                        },
                    });
                }
                else if (msg.image_url) {
                    content.push({
                        type: "image_url",
                        image_url: {
                            url: msg.image_url,
                            detail: "high",
                        },
                    });
                }
                return {
                    role: msg.role,
                    content: content,
                };
            }
            return {
                role: msg.role,
                content: msg.content || "",
            };
        });
    }
    /**
     * Initialize MCP Provider
     */
    initializeMCP(llmNode, context, resolvedConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!resolvedConfig.mcp_servers) {
                return;
            }
            this.log(context, "info", `Initializing MCP with ${resolvedConfig.mcp_servers.length} servers`);
            const mcpConfig = {
                mcp_servers: resolvedConfig.mcp_servers,
                tools: resolvedConfig.tools || {
                    auto_discover: true,
                    mcp_servers: resolvedConfig.mcp_servers.map((server) => server.name),
                },
            };
            this.mcpProvider = new mcp_1.MCPProvider();
            yield this.mcpProvider.initialize(mcpConfig);
            // Set current variables in MCP context
            const variables = context.registry.getAllVariables();
            Object.entries(variables).forEach(([key, value]) => {
                var _a;
                (_a = this.mcpProvider) === null || _a === void 0 ? void 0 : _a.setVariable(key, value);
            });
            this.log(context, "info", `MCP initialized with ${this.mcpProvider.getAvailableTools().length} tools`);
        });
    }
    /**
     * Inject MCP tool prompt into messages
     */
    injectMCPToolPrompt(messages) {
        if (!this.mcpProvider) {
            return messages;
        }
        const toolPrompt = this.mcpProvider.getToolPrompt();
        if (!toolPrompt) {
            return messages;
        }
        const enhancedMessages = [...messages];
        // Add tool prompt to system message or create new one
        if (enhancedMessages.length > 0 && enhancedMessages[0].role === "system") {
            const systemMessage = enhancedMessages[0];
            if (typeof systemMessage.content === "string") {
                enhancedMessages[0] = Object.assign(Object.assign({}, systemMessage), { content: `${systemMessage.content}\n\n${toolPrompt}` });
            }
        }
        else {
            enhancedMessages.unshift({
                role: "system",
                content: toolPrompt,
            });
        }
        return enhancedMessages;
    }
    /**
     * Generate completion with MCP tool support
     */
    generateCompletionWithMCP(provider, messages, outputSchema, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Helper function for retry logic
            const executeWithRetry = (fn, retryConfig) => __awaiter(this, void 0, void 0, function* () {
                const maxAttempts = (retryConfig === null || retryConfig === void 0 ? void 0 : retryConfig.max_attempts) || 1;
                const delayMs = (retryConfig === null || retryConfig === void 0 ? void 0 : retryConfig.delay_ms) || 1000;
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        return yield fn();
                    }
                    catch (error) {
                        const isLastAttempt = attempt === maxAttempts;
                        if (isLastAttempt) {
                            throw error;
                        }
                        this.log(context, "warn", `Attempt ${attempt} failed: ${error instanceof Error ? error.message : "Unknown error"}. Retrying in ${delayMs * attempt}ms...`);
                        // Exponential backoff
                        yield new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
                    }
                }
                throw new Error("Retry logic failed unexpectedly");
            });
            // Get retry configuration from node config
            const configWithRetry = provider.config;
            const retryConfig = configWithRetry === null || configWithRetry === void 0 ? void 0 : configWithRetry.retry;
            if (!this.mcpProvider || !this.mcpProvider.isInitialized()) {
                return yield executeWithRetry(() => provider.generateCompletion(messages, outputSchema), retryConfig);
            }
            const maxIterations = MAX_MCP_ITERATIONS;
            let currentMessages = messages;
            let iteration = 0;
            let totalTokens = 0;
            while (iteration < maxIterations) {
                const response = yield executeWithRetry(() => provider.generateCompletion(currentMessages, outputSchema), retryConfig);
                totalTokens += ((_a = response.usage) === null || _a === void 0 ? void 0 : _a.total_tokens) || 0;
                this.log(context, "debug", `MCP iteration ${iteration + 1}: checking for tool calls`);
                // Check if response contains tool calls
                const toolProcessingResult = yield this.mcpProvider.processLLMResponse(response.content);
                if (!toolProcessingResult.hasToolCalls) {
                    this.log(context, "debug", `No tool calls found, returning final response`);
                    return Object.assign(Object.assign({}, response), { usage: Object.assign(Object.assign({}, response.usage), { total_tokens: totalTokens }) });
                }
                this.log(context, "info", `Processing ${((_b = toolProcessingResult.toolResults) === null || _b === void 0 ? void 0 : _b.length) || 0} tool calls`);
                // Add tool results to conversation
                if (toolProcessingResult.toolResults) {
                    currentMessages = this.addToolResultsToMessages(currentMessages, response.content, toolProcessingResult.toolResults);
                    // Update variables in context from tool results
                    this.updateVariablesFromToolResults(toolProcessingResult.toolResults, context);
                }
                iteration++;
            }
            throw new Error(`Maximum MCP tool iterations (${maxIterations}) exceeded`);
        });
    }
    /**
     * Add tool results to message conversation
     */
    addToolResultsToMessages(messages, assistantResponse, toolResults) {
        const newMessages = [...messages];
        // Add assistant response
        newMessages.push({
            role: "assistant",
            content: assistantResponse,
        });
        // Add tool results
        const toolResultsText = toolResults
            .map((result, index) => {
            if (result.success) {
                return `Tool ${index + 1} Result: ${JSON.stringify(result.result, null, 2)}`;
            }
            else {
                return `Tool ${index + 1} Error: ${result.error}`;
            }
        })
            .join("\n\n");
        newMessages.push({
            role: "user",
            content: `The tool execution results are:\n\n${toolResultsText}\n\nPlease provide your response based on these results. If you need to call more tools, you can do so.`,
        });
        return newMessages;
    }
    /**
     * Update variables from tool results
     */
    updateVariablesFromToolResults(toolResults, context) {
        toolResults.forEach((result) => {
            if (result.success &&
                result.result &&
                typeof result.result === "object") {
                if (result.result.variables) {
                    Object.entries(result.result.variables).forEach(([key, value]) => {
                        var _a;
                        context.registry.setVariable(key, value);
                        (_a = this.mcpProvider) === null || _a === void 0 ? void 0 : _a.setVariable(key, value);
                    });
                }
            }
        });
    }
    /**
     * Parse JSON response (handles JSON in various formats)
     * Uses the same implementation as BaseProvider for consistency
     */
    parseJsonResponse(content) {
        try {
            const trimmed = content.trim();
            let jsonStr = trimmed;
            // Handle markdown code blocks
            if (trimmed.startsWith("```json")) {
                jsonStr = trimmed.slice(7, -3);
            }
            else if (trimmed.startsWith("```")) {
                jsonStr = trimmed.slice(3, -3);
            }
            // Handle cases where the response is wrapped in additional text
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }
            return JSON.parse(jsonStr, (key, value) => {
                if (key === "__proto__" ||
                    key === "constructor" ||
                    key === "prototype") {
                    return undefined;
                }
                return value;
            });
        }
        catch (error) {
            throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.LLMNodeExecutor = LLMNodeExecutor;
