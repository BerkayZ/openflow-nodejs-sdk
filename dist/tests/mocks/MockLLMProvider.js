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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockLLMProvider = void 0;
const BaseProvider_1 = require("../../core/nodes/llm/providers/BaseProvider");
/**
 * Mock LLM Provider for testing purposes
 * Provides deterministic responses without requiring API keys
 */
class MockLLMProvider extends BaseProvider_1.BaseProvider {
    constructor(config, apiKey = "mock-key") {
        super(config, apiKey);
        this.mockResponses = new Map();
        this.defaultResponse = {
            content: '{"message": "Mock response", "data": "test"}',
            tokens: { prompt: 10, completion: 5, total: 15 },
        };
        this.setupMockResponses();
    }
    setupMockResponses() {
        // Setup some predefined responses for common prompts
        this.mockResponses.set("test", '{"result": "test successful"}');
        this.mockResponses.set("hello", '{"greeting": "Hello from mock provider!"}');
        this.mockResponses.set("analyze", '{"analysis": "This is a mock analysis", "score": 0.95}');
    }
    generateCompletion(messages, outputSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulate API delay
            yield this.simulateDelay(100);
            // Extract the last user message for matching
            const lastUserMessage = [...messages]
                .reverse()
                .find((m) => m.role === "user");
            let content = "";
            if (lastUserMessage) {
                if (typeof lastUserMessage.content === "string") {
                    content = lastUserMessage.content;
                }
                else {
                    // Extract text from multimodal content
                    const textContent = lastUserMessage.content.find((c) => c.type === "text");
                    content = (textContent === null || textContent === void 0 ? void 0 : textContent.text) || "";
                }
            }
            // Check for predefined responses
            let responseContent = this.defaultResponse.content;
            for (const [key, value] of this.mockResponses.entries()) {
                if (content.toLowerCase().includes(key)) {
                    responseContent = value;
                    break;
                }
            }
            return {
                content: responseContent,
                usage: {
                    prompt_tokens: this.defaultResponse.tokens.prompt,
                    completion_tokens: this.defaultResponse.tokens.completion,
                    total_tokens: this.defaultResponse.tokens.total,
                },
            };
        });
    }
    generateCompletionStream(messages, outputSchema) {
        return __asyncGenerator(this, arguments, function* generateCompletionStream_1() {
            // Get the response that would be generated
            const response = yield __await(this.generateCompletion(messages, outputSchema));
            // Simulate streaming by chunking the response
            const chunks = this.chunkString(response.content, 10);
            for (const chunk of chunks) {
                yield __await(this.simulateDelay(50));
                yield yield __await({
                    content: chunk,
                    isComplete: false,
                });
            }
            // Final chunk with usage data
            yield yield __await({
                content: "",
                isComplete: true,
                usage: response.usage,
            });
        });
    }
    /**
     * Add a custom mock response for testing
     */
    addMockResponse(trigger, response) {
        this.mockResponses.set(trigger.toLowerCase(), response);
    }
    /**
     * Clear all mock responses except defaults
     */
    clearMockResponses() {
        this.mockResponses.clear();
        this.setupMockResponses();
    }
    /**
     * Set the default response for unmatched prompts
     */
    setDefaultResponse(content, tokens) {
        this.defaultResponse = {
            content,
            tokens: tokens || this.defaultResponse.tokens,
        };
    }
    simulateDelay(ms) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => setTimeout(resolve, ms));
        });
    }
    chunkString(str, size) {
        const chunks = [];
        for (let i = 0; i < str.length; i += size) {
            chunks.push(str.slice(i, i + size));
        }
        return chunks;
    }
}
exports.MockLLMProvider = MockLLMProvider;
