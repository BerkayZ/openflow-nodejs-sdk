"use strict";
/*
 * TextEmbeddingNode
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
exports.TextEmbeddingNodeExecutor = void 0;
const BaseNode_1 = require("../base/BaseNode");
const OpenAIEmbeddingProvider_1 = require("./providers/OpenAIEmbeddingProvider");
class TextEmbeddingNodeExecutor extends BaseNode_1.BaseNode {
    /**
     * Execute Text Embedding node
     */
    execute(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const embeddingNode = node;
            // Resolve config variables
            const resolvedConfig = this.resolveConfigVariables(embeddingNode.config, context.registry);
            this.log(context, "info", `Executing Text Embedding node: ${embeddingNode.id} with provider: ${resolvedConfig.provider}`);
            // Resolve input variables
            const resolvedInput = this.resolveObjectVariables(embeddingNode.input, context.registry);
            this.log(context, "debug", `Resolved input:`, resolvedInput);
            // Prepare items for embedding
            const items = this.prepareEmbeddingItems(resolvedInput);
            this.log(context, "debug", `Prepared ${items.length} items for embedding`);
            // Get provider configuration
            const providerConfig = this.getProviderConfig(resolvedConfig.provider, context);
            // Create provider instance
            const provider = this.createProvider(resolvedConfig.provider, Object.assign(Object.assign({}, providerConfig), { model: resolvedConfig.model }));
            // Generate embeddings
            const result = yield provider.generateEmbeddings(items);
            this.log(context, "info", `Text embedding completed successfully. Generated ${result.embeddings.length} embeddings. Tokens used: ${result.usage.total_tokens}`);
            // Format output based on input type
            const output = this.formatOutput(resolvedInput, result);
            return output;
        });
    }
    /**
     * Prepare embedding items from input
     */
    prepareEmbeddingItems(input) {
        const items = [];
        // Handle single text
        if (input.text && typeof input.text === "string") {
            items.push({
                id: "single_text",
                text: input.text,
            });
        }
        // Handle multiple texts
        if (input.texts && Array.isArray(input.texts)) {
            input.texts.forEach((text, index) => {
                if (typeof text === "string") {
                    items.push({
                        id: `text_${index}`,
                        text,
                    });
                }
            });
        }
        // Handle structured items
        if (input.items && Array.isArray(input.items)) {
            input.items.forEach((item) => {
                if (item.id && item.text) {
                    items.push({
                        id: item.id,
                        text: item.text,
                        metadata: item.metadata,
                    });
                }
            });
        }
        if (items.length === 0) {
            throw new Error("No text provided for embedding. Please provide text, texts, or items.");
        }
        // Validate items
        this.validateEmbeddingItems(items);
        return items;
    }
    /**
     * Validate embedding items
     */
    validateEmbeddingItems(items) {
        for (const item of items) {
            if (!item.id || typeof item.id !== "string") {
                throw new Error(`Invalid item ID: ${item.id}. ID must be a non-empty string.`);
            }
            if (!item.text || typeof item.text !== "string") {
                throw new Error(`Invalid text for item ${item.id}. Text must be a non-empty string.`);
            }
            if (item.text.length === 0) {
                throw new Error(`Empty text for item ${item.id}. Text cannot be empty.`);
            }
            // Check for reasonable text length (OpenAI has token limits)
            if (item.text.length > 100000) {
                throw new Error(`Text too long for item ${item.id}. Maximum length is 100,000 characters.`);
            }
        }
    }
    /**
     * Format output based on input type
     */
    formatOutput(input, result) {
        // If single text input, return single embedding
        if (input.text && !input.texts && !input.items) {
            return {
                embedding: {
                    id: result.embeddings[0].id,
                    text: result.embeddings[0].text,
                    values: result.embeddings[0].embedding,
                    metadata: result.embeddings[0].metadata,
                },
                usage: result.usage,
            };
        }
        // If multiple texts or items, return embeddings array
        return {
            embeddings: result.embeddings.map((embedding) => ({
                id: embedding.id,
                text: embedding.text,
                values: embedding.embedding,
                metadata: embedding.metadata,
            })),
            usage: result.usage,
        };
    }
    /**
     * Get provider configuration from context
     */
    getProviderConfig(providerName, context) {
        var _a;
        if (!((_a = context.config.providers) === null || _a === void 0 ? void 0 : _a.embeddings)) {
            throw new Error("No embedding providers configured in FlowExecutorConfig");
        }
        const providerConfig = context.config.providers.embeddings[providerName.toLowerCase()];
        if (!providerConfig) {
            throw new Error(`Provider configuration not found for: ${providerName}. Available providers: ${Object.keys(context.config.providers.embeddings).join(", ")}`);
        }
        if (!providerConfig.apiKey) {
            throw new Error(`API key not configured for provider: ${providerName} in FlowExecutorConfig`);
        }
        return providerConfig;
    }
    /**
     * Create provider instance
     */
    createProvider(providerName, config) {
        switch (providerName.toLowerCase()) {
            case "openai":
                const provider = new OpenAIEmbeddingProvider_1.OpenAIEmbeddingProvider({
                    apiKey: config.apiKey,
                    model: config.model,
                });
                provider.validateConfig();
                return provider;
            default:
                throw new Error(`Unsupported embedding provider: ${providerName}`);
        }
    }
}
exports.TextEmbeddingNodeExecutor = TextEmbeddingNodeExecutor;
