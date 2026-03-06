"use strict";
/**
 * FlowExecutor Unit Tests
 * Tests core flow execution functionality
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
describe("FlowExecutor", () => {
    let executor;
    let config;
    beforeEach(() => {
        config = {
            concurrency: { global_limit: 3 },
            providers: {
                llm: {
                    grok: {
                        apiKey: process.env.GROK_API_KEY || "test-key",
                    },
                    openai: {
                        apiKey: process.env.OPENAI_API_KEY || "test-key",
                    },
                },
                vectorDB: {
                    pinecone: {
                        provider: "pinecone",
                        apiKey: process.env.PINECONE_API_KEY || "test-key",
                        index_name: process.env.TEST_INDEX_NAME || "test-index",
                    },
                },
                embeddings: {
                    openai: {
                        apiKey: process.env.OPENAI_API_KEY || "test-key",
                    },
                },
            },
            logLevel: "warn",
            tempDir: process.env.TEST_TEMP_DIR || "./test_temp",
        };
        executor = new FlowExecutor_1.FlowExecutor(config);
    });
    afterEach(() => {
        // Clean up any resources
    });
    describe("Basic Flow Execution", () => {
        test.skip("should execute a basic LLM flow", () => __awaiter(void 0, void 0, void 0, function* () {
            const flow = {
                name: "test-basic-llm",
                version: "1.0.0",
                description: "Basic LLM test flow",
                author: "Test Suite",
                variables: [{ id: "user_prompt" }, { id: "llm_response" }],
                input: ["user_prompt"],
                output: ["llm_response"],
                nodes: [
                    {
                        id: "llm_process",
                        type: types_1.NodeType.LLM,
                        name: "Process with LLM",
                        config: { provider: "grok", model: "grok-3-latest" },
                        messages: [
                            {
                                type: "text",
                                role: "user",
                                text: "{{@user_prompt}}",
                            },
                        ],
                        output: {
                            explanation: {
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
                        value: "{{llm_process.explanation}}",
                    },
                ],
            };
            const result = yield executor.executeFlow(flow, {
                user_prompt: "Say hello",
            });
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.outputs).toBeDefined();
            expect(result.outputs.llm_response).toBeDefined();
            expect(typeof result.outputs.llm_response).toBe("string");
        }));
        test("should handle flow validation errors", () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidFlow = {
                name: "invalid-flow",
                // Missing required fields
            };
            yield expect(executor.executeFlow(invalidFlow)).rejects.toThrow();
        }));
        test("should handle variable interpolation", () => __awaiter(void 0, void 0, void 0, function* () {
            const flow = {
                name: "variable-test",
                version: "1.0.0",
                description: "Variable interpolation test",
                author: "Test Suite",
                variables: [
                    { id: "input_text", default: "default value" },
                    { id: "output_text" },
                ],
                input: ["input_text"],
                output: ["output_text"],
                nodes: [
                    {
                        id: "update_var",
                        type: types_1.NodeType.UPDATE_VARIABLE,
                        name: "Update Variable",
                        config: { type: "update", variable_id: "output_text" },
                        value: "Processed: {{@input_text}}",
                    },
                ],
            };
            const result = yield executor.executeFlow(flow, {
                input_text: "test input",
            });
            expect(result.success).toBe(true);
            expect(result.outputs.output_text).toBe("Processed: test input");
        }));
    });
    describe("Conditional Logic", () => {
        test("should execute conditional branches correctly", () => __awaiter(void 0, void 0, void 0, function* () {
            const flow = {
                name: "conditional-test",
                version: "1.0.0",
                description: "Conditional logic test",
                author: "Test Suite",
                variables: [{ id: "user_score" }, { id: "final_message" }],
                input: ["user_score"],
                output: ["final_message"],
                nodes: [
                    {
                        id: "score_evaluation",
                        type: types_1.NodeType.CONDITION,
                        name: "Evaluate Score",
                        input: { switch_value: "{{@user_score}}" },
                        branches: {
                            excellent: {
                                condition: "greater_than",
                                value: 90,
                                nodes: [
                                    {
                                        id: "excellent_badge",
                                        type: types_1.NodeType.UPDATE_VARIABLE,
                                        name: "Award Excellent Badge",
                                        config: { type: "update", variable_id: "final_message" },
                                        value: "Excellent! Score: {{@user_score}}",
                                    },
                                ],
                            },
                            good: {
                                condition: "greater_than",
                                value: 70,
                                nodes: [
                                    {
                                        id: "good_badge",
                                        type: types_1.NodeType.UPDATE_VARIABLE,
                                        name: "Award Good Badge",
                                        config: { type: "update", variable_id: "final_message" },
                                        value: "Good work! Score: {{@user_score}}",
                                    },
                                ],
                            },
                            default: {
                                nodes: [
                                    {
                                        id: "needs_improvement",
                                        type: types_1.NodeType.UPDATE_VARIABLE,
                                        name: "Needs Improvement",
                                        config: { type: "update", variable_id: "final_message" },
                                        value: "Keep improving! Score: {{@user_score}}",
                                    },
                                ],
                            },
                        },
                    },
                ],
            };
            // Test excellent score
            const excellentResult = yield executor.executeFlow(flow, {
                user_score: 95,
            });
            expect(excellentResult.outputs.final_message).toContain("Excellent");
            // Test good score
            const goodResult = yield executor.executeFlow(flow, { user_score: 80 });
            expect(goodResult.outputs.final_message).toContain("Good work");
            // Test default case
            const defaultResult = yield executor.executeFlow(flow, {
                user_score: 60,
            });
            expect(defaultResult.outputs.final_message).toContain("Keep improving");
        }));
    });
    describe("For Each Loop", () => {
        test("should process arrays with FOR_EACH node", () => __awaiter(void 0, void 0, void 0, function* () {
            const flow = {
                name: "foreach-test",
                version: "1.0.0",
                description: "For each loop test",
                author: "Test Suite",
                variables: [
                    { id: "items", default: ["item1", "item2", "item3"] },
                    { id: "processed_items" },
                ],
                input: ["items"],
                output: ["processed_items"],
                nodes: [
                    {
                        id: "process_items",
                        type: types_1.NodeType.FOR_EACH,
                        name: "Process Items",
                        config: {
                            delay_between: 0,
                            each_key: "current",
                        },
                        input: {
                            items: "{{@items}}",
                        },
                        each_nodes: [
                            {
                                id: "process_current",
                                type: types_1.NodeType.UPDATE_VARIABLE,
                                name: "Process Current Item",
                                config: {
                                    type: "join",
                                    variable_id: "processed_items",
                                    join_str: ", ",
                                },
                                value: "Processed: {{current}}",
                            },
                        ],
                    },
                ],
            };
            const result = yield executor.executeFlow(flow, {
                items: ["apple", "banana", "orange"],
            });
            expect(result.success).toBe(true);
            expect(result.outputs.processed_items).toContain("Processed: apple");
            expect(result.outputs.processed_items).toContain("Processed: banana");
            expect(result.outputs.processed_items).toContain("Processed: orange");
        }));
    });
    describe("Configuration Validation", () => {
        test("should validate executor configuration", () => {
            expect(() => new FlowExecutor_1.FlowExecutor(config)).not.toThrow();
        });
        test("should handle missing provider configuration", () => {
            const invalidConfig = {
                concurrency: { global_limit: 1 },
                providers: {},
                logLevel: "error",
            };
            expect(() => new FlowExecutor_1.FlowExecutor(invalidConfig)).not.toThrow();
        });
    });
    describe("Error Handling", () => {
        test("should handle node execution errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            const flow = {
                name: "error-test",
                version: "1.0.0",
                description: "Error handling test",
                author: "Test Suite",
                variables: [{ id: "result" }],
                input: [],
                output: ["result"],
                nodes: [
                    {
                        id: "invalid_node",
                        type: "INVALID_TYPE",
                        name: "Invalid Node",
                        config: {},
                    },
                ],
            };
            yield expect(executor.executeFlow(flow)).rejects.toThrow();
        }));
        test("should handle circular dependencies", () => __awaiter(void 0, void 0, void 0, function* () {
            const flow = {
                name: "circular-test",
                version: "1.0.0",
                description: "Circular dependency test",
                author: "Test Suite",
                variables: [{ id: "result" }],
                input: [],
                output: ["result"],
                nodes: [
                    {
                        id: "node_a",
                        type: types_1.NodeType.UPDATE_VARIABLE,
                        name: "Node A",
                        config: { type: "update", variable_id: "result" },
                        value: "{{node_b.output}}",
                    },
                    {
                        id: "node_b",
                        type: types_1.NodeType.UPDATE_VARIABLE,
                        name: "Node B",
                        config: { type: "update", variable_id: "result" },
                        value: "{{node_a.output}}",
                    },
                ],
            };
            yield expect(executor.executeFlow(flow)).rejects.toThrow();
        }));
    });
});
