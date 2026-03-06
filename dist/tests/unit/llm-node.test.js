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
(0, globals_1.describe)("LLMNode Tests", () => {
    let provider;
    (0, globals_1.beforeEach)(() => {
        provider = new MockLLMProvider_1.MockLLMProvider();
    });
    (0, globals_1.describe)("MockLLMProvider", () => {
        (0, globals_1.it)("should generate completion without API keys", () => __awaiter(void 0, void 0, void 0, function* () {
            const messages = [
                { type: "text", role: "user", text: "test" },
            ];
            const response = yield provider.generateCompletion(messages);
            (0, globals_1.expect)(response).toBeDefined();
            (0, globals_1.expect)(response.content).toContain("test successful");
            (0, globals_1.expect)(response.usage).toBeDefined();
            (0, globals_1.expect)(response.usage.total_tokens).toBe(15);
        }));
        (0, globals_1.it)("should handle custom mock responses", () => __awaiter(void 0, void 0, void 0, function* () {
            provider.addMockResponse("custom", '{"custom": "response"}');
            const messages = [
                { type: "text", role: "user", text: "This is a custom prompt" },
            ];
            const response = yield provider.generateCompletion(messages);
            (0, globals_1.expect)(response.content).toBe('{"custom": "response"}');
        }));
        (0, globals_1.it)("should return default response for unmatched prompts", () => __awaiter(void 0, void 0, void 0, function* () {
            const messages = [
                { type: "text", role: "user", text: "unknown prompt" },
            ];
            const response = yield provider.generateCompletion(messages);
            (0, globals_1.expect)(response.content).toContain("Mock response");
        }));
        (0, globals_1.it)("should handle system messages", () => __awaiter(void 0, void 0, void 0, function* () {
            const messages = [
                { type: "text", role: "system", text: "You are a helpful assistant" },
                { type: "text", role: "user", text: "hello" },
            ];
            const response = yield provider.generateCompletion(messages);
            (0, globals_1.expect)(response.content).toContain("Hello from mock provider");
        }));
        (0, globals_1.it)("should support multiple messages", () => __awaiter(void 0, void 0, void 0, function* () {
            const messages = [
                { type: "text", role: "user", text: "First message" },
                { type: "text", role: "assistant", text: "First response" },
                { type: "text", role: "user", text: "analyze this" },
            ];
            const response = yield provider.generateCompletion(messages);
            (0, globals_1.expect)(response.content).toContain("analysis");
            (0, globals_1.expect)(response.content).toContain("0.95");
        }));
    });
    (0, globals_1.describe)("Retry Policy", () => {
        (0, globals_1.it)("should handle retry configuration", () => __awaiter(void 0, void 0, void 0, function* () {
            const config = {
                model: "test-model",
                retry: {
                    max_attempts: 3,
                    delay_ms: 100,
                },
            };
            const providerWithRetry = new MockLLMProvider_1.MockLLMProvider(config);
            const messages = [
                { type: "text", role: "user", text: "test" },
            ];
            // Should work normally (mocked provider doesn't fail)
            const response = yield providerWithRetry.generateCompletion(messages);
            (0, globals_1.expect)(response).toBeDefined();
            (0, globals_1.expect)(response.content).toContain("test successful");
        }));
    });
});
