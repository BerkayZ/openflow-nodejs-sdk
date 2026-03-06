"use strict";
/*
 * VectorInsertNode
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
exports.VectorInsertNodeExecutor = void 0;
const BaseNode_1 = require("../base/BaseNode");
const PineconeProvider_1 = require("./providers/PineconeProvider");
class VectorInsertNodeExecutor extends BaseNode_1.BaseNode {
    /**
     * Execute Vector Insert node
     */
    execute(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const vectorNode = node;
            // Resolve config variables
            const resolvedConfig = this.resolveConfigVariables(vectorNode.config, context.registry);
            this.log(context, "info", `Executing Vector Insert node: ${vectorNode.id} with provider: ${resolvedConfig.provider}`);
            // Resolve input variables
            const resolvedInput = this.resolveObjectVariables(vectorNode.input, context.registry);
            this.log(context, "debug", `Resolved input:`, resolvedInput);
            // Prepare vectors for insertion
            const vectors = this.prepareVectors(resolvedInput);
            this.log(context, "debug", `Prepared ${vectors.length} vectors for insertion`);
            // Get provider configuration
            const providerConfig = this.getProviderConfig(resolvedConfig.provider || "pinecone", context);
            // Create provider instance
            const provider = this.createProvider(resolvedConfig.provider || "pinecone", providerConfig);
            // Insert vectors
            const result = yield provider.upsert(resolvedConfig.index_name, {
                vectors,
                namespace: resolvedConfig.namespace,
            });
            this.log(context, "info", `Vector insert completed successfully. Inserted ${result.upserted_count} vectors`);
            return {
                success: true,
                upserted_count: result.upserted_count,
                namespace: result.namespace,
                vectors: vectors.map((v) => ({
                    id: v.id,
                    metadata: v.metadata,
                })),
            };
        });
    }
    /**
     * Prepare vectors from input
     */
    prepareVectors(input) {
        const vectors = [];
        // Handle single embedding
        if (input.embedding) {
            vectors.push({
                id: input.embedding.id,
                values: input.embedding.values,
                metadata: input.embedding.metadata,
            });
        }
        // Handle multiple embeddings
        if (input.embeddings && Array.isArray(input.embeddings)) {
            input.embeddings.forEach((embedding) => {
                vectors.push({
                    id: embedding.id,
                    values: embedding.values,
                    metadata: embedding.metadata,
                });
            });
        }
        // Handle source (resolved variable)
        if (input.source) {
            if (Array.isArray(input.source)) {
                input.source.forEach((embedding) => {
                    vectors.push({
                        id: embedding.id,
                        values: embedding.values,
                        metadata: embedding.metadata,
                    });
                });
            }
            else if (input.source.id && input.source.values) {
                vectors.push({
                    id: input.source.id,
                    values: input.source.values,
                    metadata: input.source.metadata,
                });
            }
        }
        if (vectors.length === 0) {
            throw new Error("No vectors provided for insertion. Please provide embedding, embeddings, or source.");
        }
        // Validate vectors
        this.validateVectors(vectors);
        return vectors;
    }
    /**
     * Validate vector format
     */
    validateVectors(vectors) {
        for (const vector of vectors) {
            if (!vector.id || typeof vector.id !== "string") {
                throw new Error(`Invalid vector ID: ${vector.id}. ID must be a non-empty string.`);
            }
            if (!vector.values || !Array.isArray(vector.values)) {
                throw new Error(`Invalid vector values for ID ${vector.id}. Values must be an array.`);
            }
            if (vector.values.length === 0) {
                throw new Error(`Empty vector values for ID ${vector.id}. Values array cannot be empty.`);
            }
            if (!vector.values.every((v) => typeof v === "number" && isFinite(v))) {
                throw new Error(`Invalid vector values for ID ${vector.id}. All values must be finite numbers.`);
            }
        }
    }
    /**
     * Get provider configuration from context
     */
    getProviderConfig(providerName, context) {
        var _a;
        if (!((_a = context.config.providers) === null || _a === void 0 ? void 0 : _a.vectorDB)) {
            throw new Error("No vector database providers configured in FlowExecutorConfig");
        }
        const providerConfig = context.config.providers.vectorDB[providerName.toLowerCase()];
        if (!providerConfig) {
            throw new Error(`Provider configuration not found for: ${providerName}. Available providers: ${Object.keys(context.config.providers.vectorDB).join(", ")}`);
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
            case "pinecone":
                return new PineconeProvider_1.PineconeProvider({
                    apiKey: config.apiKey,
                });
            default:
                throw new Error(`Unsupported vector database provider: ${providerName}`);
        }
    }
}
exports.VectorInsertNodeExecutor = VectorInsertNodeExecutor;
