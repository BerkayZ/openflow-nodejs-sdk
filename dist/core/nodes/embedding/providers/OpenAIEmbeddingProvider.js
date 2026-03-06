"use strict";
/*
 * OpenAI Embedding Provider
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
exports.OpenAIEmbeddingProvider = void 0;
class OpenAIEmbeddingProvider {
    constructor(config) {
        this.config = config;
    }
    generateEmbeddings(items) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const texts = items.map((item) => item.text);
                const response = yield fetch(this.config.baseUrl || "https://api.openai.com/v1/embeddings", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${this.config.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: this.config.model,
                        input: texts,
                        encoding_format: "float",
                    }),
                });
                if (!response.ok) {
                    const errorData = yield response.json().catch(() => ({}));
                    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
                }
                const data = yield response.json();
                // Convert OpenAI response to our format
                const embeddings = data.data.map((embedding, index) => ({
                    id: items[index].id,
                    text: items[index].text,
                    embedding: embedding.embedding,
                    metadata: items[index].metadata,
                }));
                return {
                    embeddings,
                    usage: {
                        prompt_tokens: ((_a = data.usage) === null || _a === void 0 ? void 0 : _a.prompt_tokens) || 0,
                        total_tokens: ((_b = data.usage) === null || _b === void 0 ? void 0 : _b.total_tokens) || 0,
                    },
                };
            }
            catch (error) {
                if (error instanceof Error) {
                    if (error.message.includes("401")) {
                        throw new Error(`OpenAI API authentication failed. Please check your API key.`);
                    }
                    else if (error.message.includes("quota") ||
                        error.message.includes("rate_limit")) {
                        throw new Error(`OpenAI API quota exceeded: ${error.message}`);
                    }
                    else if (error.message.includes("model")) {
                        throw new Error(`OpenAI model error: ${error.message}`);
                    }
                    else {
                        throw new Error(`OpenAI embedding failed: ${error.message}`);
                    }
                }
                else {
                    throw new Error(`OpenAI embedding failed: Unknown error`);
                }
            }
        });
    }
    generateSingleEmbedding(text) {
        return __awaiter(this, void 0, void 0, function* () {
            const items = [{ id: "single", text }];
            const response = yield this.generateEmbeddings(items);
            return response.embeddings[0].embedding;
        });
    }
    generateTextEmbeddings(texts) {
        return __awaiter(this, void 0, void 0, function* () {
            const items = texts.map((text, index) => ({
                id: `text_${index}`,
                text,
            }));
            const response = yield this.generateEmbeddings(items);
            return response.embeddings.map((e) => e.embedding);
        });
    }
    validateConfig() {
        if (!this.config.apiKey) {
            throw new Error("OpenAI API key is required");
        }
        if (!this.config.model) {
            throw new Error("OpenAI model is required");
        }
    }
}
exports.OpenAIEmbeddingProvider = OpenAIEmbeddingProvider;
