"use strict";
/*
 * VectorDeleteNode
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
exports.VectorDeleteNodeExecutor = void 0;
const BaseNode_1 = require("../base/BaseNode");
const PineconeProvider_1 = require("./providers/PineconeProvider");
class VectorDeleteNodeExecutor extends BaseNode_1.BaseNode {
    /**
     * Execute Vector Delete node
     */
    execute(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const vectorNode = node;
            // Resolve config variables
            const resolvedConfig = this.resolveConfigVariables(vectorNode.config, context.registry);
            this.log(context, "info", `Executing Vector Delete node: ${vectorNode.id} with provider: ${resolvedConfig.provider}`);
            // Resolve input variables
            const resolvedInput = this.resolveObjectVariables(vectorNode.input, context.registry);
            this.log(context, "debug", `Resolved input:`, resolvedInput);
            // Prepare IDs for deletion
            const idsToDelete = this.prepareIdsForDeletion(resolvedInput);
            this.log(context, "debug", `Prepared ${idsToDelete.length} IDs for deletion`);
            // Get provider configuration
            const providerConfig = this.getProviderConfig(resolvedConfig.provider || "pinecone", context);
            // Create provider instance
            const provider = this.createProvider(resolvedConfig.provider || "pinecone", providerConfig);
            // Delete vectors
            const result = yield provider.deleteVectors(resolvedConfig.index_name, {
                ids: idsToDelete,
                namespace: resolvedConfig.namespace,
            });
            this.log(context, "info", `Vector delete completed successfully. Deleted ${result.deleted_count || idsToDelete.length} vectors`);
            return {
                success: true,
                deleted_count: result.deleted_count || idsToDelete.length,
                namespace: result.namespace,
                deleted_ids: idsToDelete,
            };
        });
    }
    /**
     * Prepare IDs for deletion from input
     */
    prepareIdsForDeletion(input) {
        const ids = [];
        // Handle single ID
        if (input.id && typeof input.id === "string") {
            ids.push(input.id);
        }
        // Handle multiple IDs array
        if (input.ids && Array.isArray(input.ids)) {
            input.ids.forEach((id) => {
                if (typeof id === "string") {
                    ids.push(id);
                }
                else {
                    throw new Error(`Invalid ID format: ${id}. All IDs must be strings.`);
                }
            });
        }
        // Handle source (resolved variable)
        if (input.source) {
            if (Array.isArray(input.source)) {
                input.source.forEach((id) => {
                    if (typeof id === "string") {
                        ids.push(id);
                    }
                    else {
                        throw new Error(`Invalid ID format in source: ${id}. All IDs must be strings.`);
                    }
                });
            }
            else if (typeof input.source === "string") {
                ids.push(input.source);
            }
            else {
                throw new Error(`Invalid source format: ${input.source}. Source must be a string or array of strings.`);
            }
        }
        if (ids.length === 0) {
            throw new Error("No IDs provided for deletion. Please provide id, ids, or source.");
        }
        // Validate and deduplicate IDs
        this.validateIds(ids);
        return [...new Set(ids)]; // Remove duplicates
    }
    /**
     * Validate ID format
     */
    validateIds(ids) {
        for (const id of ids) {
            if (!id || typeof id !== "string" || id.trim().length === 0) {
                throw new Error(`Invalid vector ID: "${id}". ID must be a non-empty string.`);
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
exports.VectorDeleteNodeExecutor = VectorDeleteNodeExecutor;
