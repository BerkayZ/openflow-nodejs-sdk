"use strict";
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
exports.MockEmbeddingProvider = void 0;
/**
 * Mock Embedding Provider for testing purposes
 * Generates deterministic embeddings without requiring API keys
 */
class MockEmbeddingProvider {
    constructor(dimension = 768) {
        this.dimension = dimension;
    }
    /**
     * Generate mock embeddings for text
     * Returns deterministic embeddings based on text hash
     */
    generateEmbedding(text) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulate API delay
            yield this.simulateDelay(50);
            // Generate deterministic embedding based on text
            const embedding = new Array(this.dimension);
            const hash = this.simpleHash(text);
            for (let i = 0; i < this.dimension; i++) {
                // Generate pseudo-random values based on hash and position
                embedding[i] = Math.sin(hash * (i + 1)) * 0.5 + 0.5;
            }
            return embedding;
        });
    }
    /**
     * Generate embeddings for multiple texts
     */
    generateEmbeddings(texts) {
        return __awaiter(this, void 0, void 0, function* () {
            const embeddings = [];
            for (const text of texts) {
                embeddings.push(yield this.generateEmbedding(text));
            }
            return embeddings;
        });
    }
    /**
     * Calculate cosine similarity between two embeddings
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error("Embeddings must have the same dimension");
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (normA * normB);
    }
    /**
     * Simple hash function for deterministic generation
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
    simulateDelay(ms) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => setTimeout(resolve, ms));
        });
    }
}
exports.MockEmbeddingProvider = MockEmbeddingProvider;
