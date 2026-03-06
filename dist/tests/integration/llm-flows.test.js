"use strict";
/**
 * LLM Integration Tests
 * Tests real LLM provider integration
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
const FlowExecutor_1 = require("../../core/executor/FlowExecutor");
const types_1 = require("../../core/types");
describe("LLM Integration Tests", () => {
    let executor;
    let config;
    beforeAll(() => {
        // Skip if no API keys provided
        if (!process.env.GROK_API_KEY && !process.env.OPENAI_API_KEY) {
            console.warn("Skipping LLM integration tests - no API keys provided");
            return;
        }
        config = {
            concurrency: { global_limit: 2 },
            providers: {
                llm: {
                    grok: {
                        apiKey: process.env.GROK_API_KEY,
                    },
                    openai: {
                        apiKey: process.env.OPENAI_API_KEY,
                    },
                },
            },
            logLevel: "warn",
            timeout: 60000,
            tempDir: process.env.TEST_TEMP_DIR || "./test_temp",
        };
        executor = new FlowExecutor_1.FlowExecutor(config);
    });
    beforeEach(() => {
        if (!process.env.GROK_API_KEY && !process.env.OPENAI_API_KEY) {
            pending("No API keys provided for LLM integration tests");
        }
    });
    describe("Basic LLM Operations", () => {
        test("should execute basic text generation with Grok", () => __awaiter(void 0, void 0, void 0, function* () {
            if (!process.env.GROK_API_KEY) {
                pending("No Grok API key provided");
                return;
            }
            const flow = {
                name: "grok-basic-test",
                version: "1.0.0",
                description: "Basic Grok LLM test",
                author: "Test Suite",
                variables: [{ id: "user_prompt" }, { id: "llm_response" }],
                input: ["user_prompt"],
                output: ["llm_response"],
                nodes: [
                    {
                        id: "llm_process",
                        type: types_1.NodeType.LLM,
                        name: "Process with Grok",
                        config: {
                            provider: "grok",
                            model: "grok-3-latest",
                            max_tokens: 100,
                            temperature: 0.1,
                        },
                        messages: [
                            {
                                type: "text",
                                role: "system",
                                text: "You are a helpful assistant. Respond concisely.",
                            },
                            {
                                type: "text",
                                role: "user",
                                text: "{{@user_prompt}}",
                            },
                        ],
                        output: {
                            response: {
                                type: "string",
                                description: "LLM response",
                            },
                        },
                    },
                    {
                        id: "save_response",
                        type: types_1.NodeType.UPDATE_VARIABLE,
                        name: "Save Response",
                        config: { type: "update", variable_id: "llm_response" },
                        value: "{{llm_process.response}}",
                    },
                ],
            };
            const result = yield executor.executeFlow(flow, {
                user_prompt: "What is 2+2? Answer with just the number.",
            });
            expect(result.success).toBe(true);
            expect(result.outputs.llm_response).toBeDefined();
            expect(typeof result.outputs.llm_response).toBe("string");
            expect(result.outputs.llm_response.length).toBeGreaterThan(0);
        }));
        test("should handle structured output from LLM", () => __awaiter(void 0, void 0, void 0, function* () {
            if (!process.env.GROK_API_KEY) {
                pending("No Grok API key provided");
                return;
            }
            const flow = {
                name: "structured-output-test",
                version: "1.0.0",
                description: "Structured LLM output test",
                author: "Test Suite",
                variables: [{ id: "analysis_result" }],
                input: [],
                output: ["analysis_result"],
                nodes: [
                    {
                        id: "analyze_text",
                        type: types_1.NodeType.LLM,
                        name: "Analyze Text",
                        config: {
                            provider: "grok",
                            model: "grok-3-latest",
                            max_tokens: 500,
                            temperature: 0.1,
                        },
                        messages: [
                            {
                                type: "text",
                                role: "system",
                                text: "You are a text analyzer. Provide structured analysis.",
                            },
                            {
                                type: "text",
                                role: "user",
                                text: 'Analyze this text: "The quick brown fox jumps over the lazy dog." Provide word count, sentiment, and key themes.',
                            },
                        ],
                        output: {
                            word_count: {
                                type: "number",
                                description: "Number of words",
                            },
                            sentiment: {
                                type: "string",
                                description: "Text sentiment",
                            },
                            themes: {
                                type: "array",
                                items: { type: "string" },
                                description: "Key themes",
                            },
                        },
                    },
                    {
                        id: "save_analysis",
                        type: types_1.NodeType.UPDATE_VARIABLE,
                        name: "Save Analysis",
                        config: { type: "update", variable_id: "analysis_result" },
                        value: "{{analyze_text}}",
                    },
                ],
            };
            const result = yield executor.executeFlow(flow);
            expect(result.success).toBe(true);
            expect(result.outputs.analysis_result).toBeDefined();
        }));
    });
    describe("LLM with Variable Interpolation", () => {
        test("should handle complex variable interpolation in prompts", () => __awaiter(void 0, void 0, void 0, function* () {
            if (!process.env.GROK_API_KEY) {
                pending("No Grok API key provided");
                return;
            }
            const flow = {
                name: "interpolation-test",
                version: "1.0.0",
                description: "Complex interpolation test",
                author: "Test Suite",
                variables: [
                    { id: "topic" },
                    { id: "style" },
                    { id: "length" },
                    { id: "result" },
                ],
                input: ["topic", "style", "length"],
                output: ["result"],
                nodes: [
                    {
                        id: "generate_content",
                        type: types_1.NodeType.LLM,
                        name: "Generate Content",
                        config: {
                            provider: "grok",
                            model: "grok-3-latest",
                            max_tokens: 200,
                            temperature: 0.7,
                        },
                        messages: [
                            {
                                type: "text",
                                role: "user",
                                text: "Write a {{@style}} piece about {{@topic}} in exactly {{@length}} sentences.",
                            },
                        ],
                        output: {
                            content: {
                                type: "string",
                                description: "Generated content",
                            },
                        },
                    },
                    {
                        id: "save_result",
                        type: types_1.NodeType.UPDATE_VARIABLE,
                        name: "Save Result",
                        config: { type: "update", variable_id: "result" },
                        value: "{{generate_content.content}}",
                    },
                ],
            };
            const result = yield executor.executeFlow(flow, {
                topic: "artificial intelligence",
                style: "technical",
                length: "3",
            });
            expect(result.success).toBe(true);
            expect(result.outputs.result).toBeDefined();
            expect(typeof result.outputs.result).toBe("string");
        }));
    });
    describe("Error Handling", () => {
        test("should handle invalid model names gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            if (!process.env.GROK_API_KEY) {
                pending("No Grok API key provided");
                return;
            }
            const flow = {
                name: "invalid-model-test",
                version: "1.0.0",
                description: "Invalid model test",
                author: "Test Suite",
                variables: [{ id: "result" }],
                input: [],
                output: ["result"],
                nodes: [
                    {
                        id: "invalid_model",
                        type: types_1.NodeType.LLM,
                        name: "Invalid Model",
                        config: {
                            provider: "grok",
                            model: "nonexistent-model", // Invalid model
                            max_tokens: 50,
                        },
                        messages: [
                            {
                                type: "text",
                                role: "user",
                                text: "Hello",
                            },
                        ],
                        output: {
                            response: {
                                type: "string",
                                description: "Response",
                            },
                        },
                    },
                ],
            };
            yield expect(executor.executeFlow(flow)).rejects.toThrow();
        }));
        test("should handle rate limiting gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            if (!process.env.GROK_API_KEY) {
                pending("No Grok API key provided");
                return;
            }
            // Create multiple rapid requests to test rate limiting
            const flow = {
                name: "rate-limit-test",
                version: "1.0.0",
                description: "Rate limit test",
                author: "Test Suite",
                variables: [{ id: "result" }],
                input: [],
                output: ["result"],
                nodes: [
                    {
                        id: "quick_request",
                        type: types_1.NodeType.LLM,
                        name: "Quick Request",
                        config: {
                            provider: "grok",
                            model: "grok-3-latest",
                            max_tokens: 10,
                        },
                        messages: [
                            {
                                type: "text",
                                role: "user",
                                text: "Hi",
                            },
                        ],
                        output: {
                            response: {
                                type: "string",
                                description: "Response",
                            },
                        },
                    },
                ],
            };
            // Execute multiple flows rapidly
            const promises = Array(5)
                .fill(null)
                .map(() => executor.executeFlow(flow));
            // At least some should succeed (others might be rate limited)
            const results = yield Promise.allSettled(promises);
            const successes = results.filter((r) => r.status === "fulfilled");
            expect(successes.length).toBeGreaterThan(0);
        }), 30000);
    });
    describe("Timeout Handling", () => {
        test("should handle request timeouts", () => __awaiter(void 0, void 0, void 0, function* () {
            if (!process.env.GROK_API_KEY) {
                pending("No Grok API key provided");
                return;
            }
            const flow = {
                name: "timeout-test",
                version: "1.0.0",
                description: "Timeout test",
                author: "Test Suite",
                variables: [{ id: "result" }],
                input: [],
                output: ["result"],
                nodes: [
                    {
                        id: "long_request",
                        type: types_1.NodeType.LLM,
                        name: "Long Request",
                        config: {
                            provider: "grok",
                            model: "grok-3-latest",
                            max_tokens: 5000, // Large request
                            temperature: 0.9,
                        },
                        timeout: 1000, // Very short timeout
                        messages: [
                            {
                                type: "text",
                                role: "user",
                                text: "Write a very long essay about the history of computing with detailed examples and explanations.",
                            },
                        ],
                        output: {
                            response: {
                                type: "string",
                                description: "Response",
                            },
                        },
                    },
                ],
            };
            yield expect(executor.executeFlow(flow)).rejects.toThrow();
        }), 10000);
    });
});
