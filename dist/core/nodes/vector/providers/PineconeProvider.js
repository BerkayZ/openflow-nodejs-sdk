"use strict";
/*
 * Pinecone Provider
 * OpenFlow Protocol - Copyright (C) 2025 Berkay Zelyurt
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
exports.PineconeProvider = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
class PineconeProvider {
    constructor(config) {
        this.config = config;
        this.client = new pinecone_1.Pinecone({
            apiKey: config.apiKey,
        });
    }
    listIndexes() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.client.listIndexes();
                return response;
            }
            catch (error) {
                throw new Error(`Failed to list Pinecone indexes: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        });
    }
    getIndexStats(indexName, namespace) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const index = this.client.index(indexName);
                const stats = yield index.describeIndexStats();
                return stats;
            }
            catch (error) {
                throw new Error(`Failed to get index stats: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        });
    }
    upsert(indexName, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const index = this.client.index(indexName);
                // Convert our VectorRecord format to Pinecone's format
                const pineconeVectors = options.vectors.map((vector) => {
                    const record = {
                        id: vector.id,
                        values: vector.values,
                    };
                    // Add metadata if present
                    if (vector.metadata && Object.keys(vector.metadata).length > 0) {
                        record.metadata = vector.metadata;
                    }
                    // Add sparse values if present
                    if (vector.sparse_values) {
                        record.sparseValues = {
                            indices: vector.sparse_values.indices,
                            values: vector.sparse_values.values,
                        };
                    }
                    return record;
                });
                // Upserting vectors to index
                // Perform the upsert using the correct namespace API
                let response;
                if (options.namespace) {
                    response = yield index
                        .namespace(options.namespace)
                        .upsert(pineconeVectors);
                }
                else {
                    response = yield index.upsert(pineconeVectors);
                }
                // Upsert completed
                return {
                    upserted_count: pineconeVectors.length,
                    namespace: options.namespace,
                };
            }
            catch (error) {
                // Log error internally - could be replaced with a proper logger if available
                // For now, just handle the error without console output
                if (error instanceof Error) {
                    if (error.message.includes("dimension")) {
                        throw new Error(`Vector dimension mismatch: ${error.message}`);
                    }
                    else if (error.message.includes("not found") ||
                        error.message.includes("404")) {
                        throw new Error(`Index '${indexName}' not found. Please create the index first.`);
                    }
                    else if (error.message.includes("unauthorized") ||
                        error.message.includes("401")) {
                        throw new Error(`Unauthorized: Please check your Pinecone API key.`);
                    }
                    else if (error.message.includes("quota") ||
                        error.message.includes("limit")) {
                        throw new Error(`Quota exceeded: ${error.message}`);
                    }
                    else {
                        throw new Error(`Pinecone upsert failed: ${error.message}`);
                    }
                }
                else {
                    throw new Error(`Pinecone upsert failed: Unknown error`);
                }
            }
        });
    }
    query(indexName, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const index = this.client.index(indexName);
                const queryRequest = {
                    topK: options.topK || 10,
                    includeMetadata: (_a = options.includeMetadata) !== null && _a !== void 0 ? _a : true,
                    includeValues: (_b = options.includeValues) !== null && _b !== void 0 ? _b : false,
                };
                if (options.vector) {
                    queryRequest.vector = options.vector;
                }
                if (options.id) {
                    queryRequest.id = options.id;
                }
                if (options.filter) {
                    queryRequest.filter = options.filter;
                }
                let response;
                if (options.namespace) {
                    response = yield index.namespace(options.namespace).query(queryRequest);
                }
                else {
                    response = yield index.query(queryRequest);
                }
                // Convert Pinecone response to our format
                const matches = ((_c = response.matches) === null || _c === void 0 ? void 0 : _c.map((match) => ({
                    id: match.id,
                    score: match.score || 0,
                    values: match.values,
                    metadata: match.metadata,
                }))) || [];
                return {
                    matches,
                    namespace: options.namespace,
                };
            }
            catch (error) {
                throw new Error(`Pinecone query failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        });
    }
    deleteVectors(indexName, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const index = this.client.index(indexName);
                const deleteRequest = {};
                if (options.deleteAll) {
                    deleteRequest.deleteAll = true;
                }
                else if (options.ids && options.ids.length > 0) {
                    deleteRequest.ids = options.ids;
                }
                else if (options.filter) {
                    deleteRequest.filter = options.filter;
                }
                else {
                    throw new Error("Must specify either ids, deleteAll, or filter for deletion");
                }
                let response;
                if (options.namespace) {
                    if (options.deleteAll) {
                        response = yield index.namespace(options.namespace).deleteAll();
                    }
                    else if (options.ids && options.ids.length > 0) {
                        response = yield index
                            .namespace(options.namespace)
                            .deleteMany(options.ids);
                    }
                    else if (options.filter) {
                        response = yield index
                            .namespace(options.namespace)
                            .deleteMany(options.filter);
                    }
                }
                else {
                    if (options.deleteAll) {
                        response = yield index.deleteAll();
                    }
                    else if (options.ids && options.ids.length > 0) {
                        response = yield index.deleteMany(options.ids);
                    }
                    else if (options.filter) {
                        response = yield index.deleteMany(options.filter);
                    }
                }
                return {
                    deleted_count: (_a = options.ids) === null || _a === void 0 ? void 0 : _a.length, // Estimate
                    namespace: options.namespace,
                };
            }
            catch (error) {
                throw new Error(`Pinecone delete failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        });
    }
    // Utility method to create an index
    createIndex(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.client.createIndex({
                    name: options.name,
                    dimension: options.dimension,
                    metric: options.metric || "cosine",
                    spec: {
                        serverless: {
                            cloud: "aws",
                            region: options.region || "us-east-1",
                        },
                    },
                });
                // Index created successfully
            }
            catch (error) {
                throw new Error(`Failed to create index: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        });
    }
    // Utility method to delete an index
    deleteIndex(indexName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.client.deleteIndex(indexName);
                // Index deleted successfully
            }
            catch (error) {
                throw new Error(`Failed to delete index: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        });
    }
    // Get index description
    describeIndex(indexName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const description = yield this.client.describeIndex(indexName);
                return description;
            }
            catch (error) {
                throw new Error(`Failed to describe index: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        });
    }
}
exports.PineconeProvider = PineconeProvider;
