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
const globals_1 = require("@jest/globals");
const MockLLMProvider_1 = require("../mocks/MockLLMProvider");
(0, globals_1.describe)("Stream Tests", () => {
    let provider;
    (0, globals_1.beforeEach)(() => {
        provider = new MockLLMProvider_1.MockLLMProvider();
    });
    (0, globals_1.describe)("Stream Generation", () => {
        (0, globals_1.it)("should stream tokens progressively", () => __awaiter(void 0, void 0, void 0, function* () {
            const messages = [
                { type: "text", role: "user", text: "test" },
            ];
            const receivedTokens = [];
            yield provider.generateCompletionStream(messages, undefined, (token) => __awaiter(void 0, void 0, void 0, function* () {
                receivedTokens.push(token);
            }));
            // Should have received multiple chunks
            (0, globals_1.expect)(receivedTokens.length).toBeGreaterThan(1);
            // All tokens should have assistant role
            receivedTokens.forEach((token) => {
                (0, globals_1.expect)(token.role).toBe("assistant");
            });
            // Concatenated content should match full response
            const fullContent = receivedTokens.map((t) => t.content).join("");
            (0, globals_1.expect)(fullContent).toContain("test successful");
        }));
        (0, globals_1.it)("should work without stream callback", () => __awaiter(void 0, void 0, void 0, function* () {
            const messages = [
                { type: "text", role: "user", text: "hello" },
            ];
            const response = yield provider.generateCompletionStream(messages);
            (0, globals_1.expect)(response).toBeDefined();
            (0, globals_1.expect)(response.content).toContain("Hello from mock provider");
            (0, globals_1.expect)(response.usage).toBeDefined();
        }));
        (0, globals_1.it)("should stream custom responses", () => __awaiter(void 0, void 0, void 0, function* () {
            provider.addMockResponse("stream-test", '{"streaming": "works perfectly"}');
            const messages = [
                { type: "text", role: "user", text: "stream-test" },
            ];
            const chunks = [];
            yield provider.generateCompletionStream(messages, undefined, (token) => __awaiter(void 0, void 0, void 0, function* () {
                chunks.push(token.content);
            }));
            const fullContent = chunks.join("");
            (0, globals_1.expect)(fullContent).toBe('{"streaming": "works perfectly"}');
        }));
        (0, globals_1.it)("should handle empty messages", () => __awaiter(void 0, void 0, void 0, function* () {
            const messages = [];
            const response = yield provider.generateCompletionStream(messages);
            (0, globals_1.expect)(response).toBeDefined();
            (0, globals_1.expect)(response.content).toBeDefined();
        }));
        (0, globals_1.it)("should maintain token usage in streamed response", () => __awaiter(void 0, void 0, void 0, function* () {
            const messages = [
                { type: "text", role: "user", text: "analyze" },
            ];
            const response = yield provider.generateCompletionStream(messages, undefined, () => __awaiter(void 0, void 0, void 0, function* () { }));
            (0, globals_1.expect)(response.usage).toBeDefined();
            (0, globals_1.expect)(response.usage.prompt_tokens).toBe(10);
            (0, globals_1.expect)(response.usage.completion_tokens).toBe(5);
            (0, globals_1.expect)(response.usage.total_tokens).toBe(15);
        }));
    });
    (0, globals_1.describe)("Stream Error Handling", () => {
        (0, globals_1.it)("should handle stream interruption gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            const messages = [
                { type: "text", role: "user", text: "test" },
            ];
            let tokenCount = 0;
            const maxTokens = 3;
            try {
                yield provider.generateCompletionStream(messages, undefined, (token) => __awaiter(void 0, void 0, void 0, function* () {
                    tokenCount++;
                    if (tokenCount >= maxTokens) {
                        throw new Error("Stream interrupted");
                    }
                }));
            }
            catch (error) {
                (0, globals_1.expect)(error).toBeDefined();
                (0, globals_1.expect)(error.message).toBe("Stream interrupted");
            }
            (0, globals_1.expect)(tokenCount).toBe(maxTokens);
        }));
    });
});
