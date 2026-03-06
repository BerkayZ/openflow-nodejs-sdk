"use strict";
/*
 * VectorSearchNode
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
exports.VectorSearchNodeExecutor = void 0;
const BaseNode_1 = require("../base/BaseNode");
const PineconeProvider_1 = require("./providers/PineconeProvider");
class VectorSearchNodeExecutor extends BaseNode_1.BaseNode {
    /**
     * Execute Vector Search node
     */
    execute(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const vectorNode = node;
            // Resolve config variables
            const resolvedConfig = this.resolveConfigVariables(vectorNode.config, context.registry);
            this.log(context, "info", `Executing Vector Search node: ${vectorNode.id} with provider: ${resolvedConfig.provider}`);
            // Resolve input variables
            const resolvedInput = this.resolveObjectVariables(vectorNode.input, context.registry);
            this.log(context, "debug", `Resolved input:`, resolvedInput);
            // Prepare search parameters
            const searchParams = this.prepareSearchParams(resolvedInput, resolvedConfig);
            this.log(context, "debug", `Search parameters:`, searchParams);
            // Get provider configuration
            const providerConfig = this.getProviderConfig(resolvedConfig.provider || "pinecone", context);
            // Create provider instance
            const provider = this.createProvider(resolvedConfig.provider || "pinecone", providerConfig);
            // Perform search
            const result = yield provider.query(resolvedConfig.index_name, {
                vector: searchParams.vector,
                topK: searchParams.topK,
                filter: resolvedConfig.filter,
                namespace: resolvedConfig.namespace,
                includeMetadata: true,
                includeValues: true,
            });
            // Apply similarity threshold filtering if specified
            let filteredResults = result.matches;
            if (resolvedConfig.similarity_threshold !== undefined) {
                filteredResults = result.matches.filter((match) => match.score >= resolvedConfig.similarity_threshold);
            }
            // Calculate search metadata
            const searchMetadata = this.calculateSearchMetadata(filteredResults, searchParams);
            this.log(context, "info", `Vector search completed successfully. Found ${filteredResults.length} results`);
            return {
                results: filteredResults.map((match) => ({
                    id: match.id,
                    score: match.score,
                    metadata: match.metadata,
                    values: match.values,
                })),
                query_vector: searchParams.vector,
                search_metadata: searchMetadata,
            };
        });
    }
    /**
     * Prepare search parameters from input
     */
    prepareSearchParams(input, resolvedConfig) {
        let vector;
        const topK = resolvedConfig.top_k || input.top_k || 10;
        // Handle search_vector (resolved variable reference)
        if (input.search_vector) {
            if (Array.isArray(input.search_vector)) {
                vector = input.search_vector;
            }
            else if (input.search_vector.values &&
                Array.isArray(input.search_vector.values)) {
                vector = input.search_vector.values;
            }
            else {
                throw new Error("Invalid search_vector format. Expected array of numbers or object with values array.");
            }
        }
        // Handle search_text (for text-based search - would need embedding provider)
        if (input.search_text && !vector) {
            throw new Error("Text-based search not yet implemented. Please provide search_vector.");
        }
        if (!vector) {
            throw new Error("No search vector provided. Please provide search_vector or search_text.");
        }
        // Validate vector
        this.validateSearchVector(vector);
        return {
            vector,
            topK,
        };
    }
    /**
     * Validate search vector format
     */
    validateSearchVector(vector) {
        if (!Array.isArray(vector) || vector.length === 0) {
            throw new Error("Search vector must be a non-empty array of numbers.");
        }
        if (!vector.every((v) => typeof v === "number" && isFinite(v))) {
            throw new Error("All search vector values must be finite numbers.");
        }
    }
    /**
     * Calculate search metadata
     */
    calculateSearchMetadata(results, searchParams) {
        const scores = results.map((r) => r.score);
        return {
            total_matches: results.length,
            max_score: scores.length > 0 ? Math.max(...scores) : 0,
            min_score: scores.length > 0 ? Math.min(...scores) : 0,
            query_time_ms: Date.now(), // Placeholder - would need actual timing
        };
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
exports.VectorSearchNodeExecutor = VectorSearchNodeExecutor;
