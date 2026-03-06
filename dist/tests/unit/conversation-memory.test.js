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
const ConversationMemoryNode_1 = require("../../core/nodes/memory/ConversationMemoryNode");
const types_1 = require("../../core/types");
const ExecutionRegistry_1 = require("../../core/executor/ExecutionRegistry");
const Logger_1 = require("../../core/utils/Logger");
(0, globals_1.describe)("ConversationMemoryNode Tests", () => {
    let memoryNode;
    let context;
    let registry;
    let logger;
    (0, globals_1.beforeEach)(() => {
        memoryNode = new ConversationMemoryNode_1.ConversationMemoryNode();
        const testFlow = {
            name: "test-flow",
            version: "1.0.0",
            description: "Test flow for conversation memory",
            author: "Test Suite",
            variables: [
                { id: "conversation_history" }
            ],
            input: [],
            output: ["conversation_history"],
            nodes: []
        };
        registry = new ExecutionRegistry_1.ExecutionRegistry("test-flow-id", testFlow, "./test_temp");
        logger = new Logger_1.Logger("test");
        context = {
            registry,
            logger,
            flowId: "test-flow",
            config: {
                concurrency: { global_limit: 1 },
                providers: {},
                logLevel: "error"
            }
        };
    });
    (0, globals_1.describe)("Append Operation", () => {
        (0, globals_1.it)("should append message to conversation", () => __awaiter(void 0, void 0, void 0, function* () {
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "append",
                    variable_id: "conversation_history",
                },
                input: {
                    role: "user",
                    content: "Hello, how are you?",
                },
            };
            const result = yield memoryNode.execute(node, context);
            (0, globals_1.expect)(result.message_count).toBe(1);
            (0, globals_1.expect)(result.last_message.role).toBe("user");
            (0, globals_1.expect)(result.last_message.content).toBe("Hello, how are you?");
            const messages = registry.getVariable("conversation_history");
            (0, globals_1.expect)(messages).toHaveLength(1);
            (0, globals_1.expect)(messages[0].content).toBe("Hello, how are you?");
        }));
        (0, globals_1.it)("should handle multiple messages", () => __awaiter(void 0, void 0, void 0, function* () {
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "append",
                    variable_id: "conversation_history",
                },
                input: {
                    role: "user",
                    content: "First message",
                },
            };
            yield memoryNode.execute(node, context);
            node.input = {
                role: "assistant",
                content: "Response message",
            };
            const result = yield memoryNode.execute(node, context);
            (0, globals_1.expect)(result.message_count).toBe(2);
            const messages = registry.getVariable("conversation_history");
            (0, globals_1.expect)(messages).toHaveLength(2);
            (0, globals_1.expect)(messages[0].role).toBe("user");
            (0, globals_1.expect)(messages[1].role).toBe("assistant");
        }));
        (0, globals_1.it)("should enforce max_messages limit", () => __awaiter(void 0, void 0, void 0, function* () {
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "append",
                    variable_id: "conversation_history",
                    max_messages: 3,
                },
                input: {
                    role: "user",
                    content: "Message 1",
                },
            };
            // Add 5 messages
            for (let i = 1; i <= 5; i++) {
                node.input.content = `Message ${i}`;
                yield memoryNode.execute(node, context);
            }
            const messages = registry.getVariable("conversation_history");
            (0, globals_1.expect)(messages).toHaveLength(3);
            // Should keep the most recent messages
            (0, globals_1.expect)(messages[0].content).toBe("Message 3");
            (0, globals_1.expect)(messages[1].content).toBe("Message 4");
            (0, globals_1.expect)(messages[2].content).toBe("Message 5");
        }));
        (0, globals_1.it)("should handle system messages", () => __awaiter(void 0, void 0, void 0, function* () {
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "append",
                    variable_id: "conversation_history",
                },
                input: {
                    role: "system",
                    content: "You are a helpful assistant",
                },
            };
            const result = yield memoryNode.execute(node, context);
            (0, globals_1.expect)(result.last_message.role).toBe("system");
            const messages = registry.getVariable("conversation_history");
            (0, globals_1.expect)(messages[0].role).toBe("system");
        }));
    });
    (0, globals_1.describe)("Load Operation", () => {
        (0, globals_1.it)("should load messages from input", () => __awaiter(void 0, void 0, void 0, function* () {
            const testMessages = [
                { role: "user", content: "Hello" },
                { role: "assistant", content: "Hi there!" },
            ];
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "load",
                    variable_id: "conversation_history",
                },
                input: {
                    messages: testMessages,
                },
            };
            const result = yield memoryNode.execute(node, context);
            (0, globals_1.expect)(result.message_count).toBe(2);
            (0, globals_1.expect)(result.loaded).toBe(true);
            const messages = registry.getVariable("conversation_history");
            (0, globals_1.expect)(messages).toEqual(testMessages);
        }));
        (0, globals_1.it)("should handle empty messages array", () => __awaiter(void 0, void 0, void 0, function* () {
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "load",
                    variable_id: "conversation_history",
                },
                input: {
                    messages: [],
                },
            };
            const result = yield memoryNode.execute(node, context);
            (0, globals_1.expect)(result.message_count).toBe(0);
            (0, globals_1.expect)(result.loaded).toBe(true);
        }));
    });
    (0, globals_1.describe)("Clear Operation", () => {
        (0, globals_1.it)("should clear conversation history", () => __awaiter(void 0, void 0, void 0, function* () {
            // First add some messages
            registry.setVariable("conversation_history", [
                { role: "user", content: "Message 1" },
                { role: "assistant", content: "Response 1" },
            ]);
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "clear",
                    variable_id: "conversation_history",
                },
                input: {},
            };
            const result = yield memoryNode.execute(node, context);
            (0, globals_1.expect)(result.message_count).toBe(0);
            (0, globals_1.expect)(result.cleared).toBe(true);
            const messages = registry.getVariable("conversation_history");
            (0, globals_1.expect)(messages).toEqual([]);
        }));
    });
    (0, globals_1.describe)("Slice Operation", () => {
        (0, globals_1.it)("should slice messages within range", () => __awaiter(void 0, void 0, void 0, function* () {
            // Set up initial messages
            const initialMessages = [];
            for (let i = 0; i < 10; i++) {
                initialMessages.push({
                    role: i % 2 === 0 ? "user" : "assistant",
                    content: `Message ${i + 1}`,
                });
            }
            registry.setVariable("conversation_history", initialMessages);
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "slice",
                    variable_id: "conversation_history",
                    slice_start: 5,
                    slice_end: 8,
                },
                input: {},
            };
            const result = yield memoryNode.execute(node, context);
            (0, globals_1.expect)(result.message_count).toBe(3);
            (0, globals_1.expect)(result.sliced).toBe(true);
            const messages = registry.getVariable("conversation_history");
            (0, globals_1.expect)(messages).toHaveLength(3);
            (0, globals_1.expect)(messages[0].content).toBe("Message 6");
            (0, globals_1.expect)(messages[2].content).toBe("Message 8");
        }));
        (0, globals_1.it)("should get recent messages", () => __awaiter(void 0, void 0, void 0, function* () {
            const initialMessages = [];
            for (let i = 0; i < 10; i++) {
                initialMessages.push({
                    role: "user",
                    content: `Message ${i + 1}`,
                });
            }
            registry.setVariable("conversation_history", initialMessages);
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "slice",
                    variable_id: "conversation_history",
                    slice_start: -5, // Last 5 messages
                },
                input: {},
            };
            const result = yield memoryNode.execute(node, context);
            (0, globals_1.expect)(result.message_count).toBe(5);
            const messages = registry.getVariable("conversation_history");
            (0, globals_1.expect)(messages[0].content).toBe("Message 6");
            (0, globals_1.expect)(messages[4].content).toBe("Message 10");
        }));
    });
    (0, globals_1.describe)("Serialize/Deserialize Operations", () => {
        (0, globals_1.it)("should serialize messages to JSON", () => __awaiter(void 0, void 0, void 0, function* () {
            const testMessages = [
                { role: "user", content: "Hello" },
                { role: "assistant", content: "Hi there!" },
            ];
            registry.setVariable("conversation_history", testMessages);
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "serialize",
                    variable_id: "conversation_history",
                },
                input: {},
            };
            const result = yield memoryNode.execute(node, context);
            (0, globals_1.expect)(result.message_count).toBe(2);
            (0, globals_1.expect)(result.serialized).toBeDefined();
            const parsed = JSON.parse(result.serialized);
            (0, globals_1.expect)(parsed).toHaveLength(2);
            (0, globals_1.expect)(parsed[0].content).toBe("Hello");
        }));
        (0, globals_1.it)("should deserialize JSON to messages", () => __awaiter(void 0, void 0, void 0, function* () {
            const testMessages = [
                { role: "user", content: "Deserialized message" },
            ];
            const serialized = JSON.stringify(testMessages);
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "deserialize",
                    variable_id: "conversation_history",
                },
                input: {
                    serialized: serialized,
                },
            };
            const result = yield memoryNode.execute(node, context);
            (0, globals_1.expect)(result.message_count).toBe(1);
            (0, globals_1.expect)(result.deserialized).toBe(true);
            const messages = registry.getVariable("conversation_history");
            (0, globals_1.expect)(messages).toHaveLength(1);
            (0, globals_1.expect)(messages[0].content).toBe("Deserialized message");
        }));
    });
    (0, globals_1.describe)("Error Handling", () => {
        (0, globals_1.it)("should throw error for missing variable_id", () => __awaiter(void 0, void 0, void 0, function* () {
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "append",
                },
                input: {},
            };
            yield (0, globals_1.expect)(memoryNode.execute(node, context)).rejects.toThrow("ConversationMemoryNode requires variable_id in config");
        }));
        (0, globals_1.it)("should throw error for unknown operation", () => __awaiter(void 0, void 0, void 0, function* () {
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "unknown",
                    variable_id: "conversation_history",
                },
                input: {},
            };
            yield (0, globals_1.expect)(memoryNode.execute(node, context)).rejects.toThrow("Unknown operation: unknown");
        }));
        (0, globals_1.it)("should handle invalid JSON in deserialize", () => __awaiter(void 0, void 0, void 0, function* () {
            const node = {
                id: "memory-node",
                name: "Memory Node",
                type: types_1.NodeType.CONVERSATION_MEMORY,
                config: {
                    operation: "deserialize",
                    variable_id: "conversation_history",
                },
                input: {
                    serialized: "invalid json",
                },
            };
            yield (0, globals_1.expect)(memoryNode.execute(node, context)).rejects.toThrow("Failed to deserialize messages");
        }));
    });
});
