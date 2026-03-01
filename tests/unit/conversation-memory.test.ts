import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  ConversationMemoryNode,
  ConversationMessage,
} from "../../core/nodes/memory/ConversationMemoryNode";
import { FlowNode, NodeType } from "../../core/types";
import { NodeExecutionContext } from "../../core/nodes/base/BaseNode";
import { ExecutionRegistry } from "../../core/executor/ExecutionRegistry";
import { Logger } from "../../core/utils/Logger";

describe("ConversationMemoryNode Tests", () => {
  let memoryNode: ConversationMemoryNode;
  let context: NodeExecutionContext;
  let registry: ExecutionRegistry;
  let logger: Logger;

  beforeEach(() => {
    memoryNode = new ConversationMemoryNode();
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
    registry = new ExecutionRegistry("test-flow-id", testFlow, "./test_temp");
    logger = new Logger("test");
    context = {
      registry,
      logger,
      flowId: "test-flow",
      config: {
        concurrency: { global_limit: 1 },
        providers: {},
        logLevel: "error" as const
      }
    };
  });

  describe("Append Operation", () => {
    it("should append message to conversation", async () => {
      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "append",
          variable_id: "conversation_history",
        },
        input: {
          role: "user",
          content: "Hello, how are you?",
        },
      };

      const result = await memoryNode.execute(node, context);

      expect(result.message_count).toBe(1);
      expect(result.last_message.role).toBe("user");
      expect(result.last_message.content).toBe("Hello, how are you?");

      const messages = registry.getVariable("conversation_history");
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Hello, how are you?");
    });

    it("should handle multiple messages", async () => {
      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "append",
          variable_id: "conversation_history",
        },
        input: {
          role: "user",
          content: "First message",
        },
      };

      await memoryNode.execute(node, context);

      node.input = {
        role: "assistant",
        content: "Response message",
      };
      const result = await memoryNode.execute(node, context);

      expect(result.message_count).toBe(2);
      const messages = registry.getVariable("conversation_history");
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("assistant");
    });

    it("should enforce max_messages limit", async () => {
      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
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
        await memoryNode.execute(node, context);
      }

      const messages = registry.getVariable("conversation_history");
      expect(messages).toHaveLength(3);
      // Should keep the most recent messages
      expect(messages[0].content).toBe("Message 3");
      expect(messages[1].content).toBe("Message 4");
      expect(messages[2].content).toBe("Message 5");
    });

    it("should handle system messages", async () => {
      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "append",
          variable_id: "conversation_history",
        },
        input: {
          role: "system",
          content: "You are a helpful assistant",
        },
      };

      const result = await memoryNode.execute(node, context);

      expect(result.last_message.role).toBe("system");
      const messages = registry.getVariable("conversation_history");
      expect(messages[0].role).toBe("system");
    });
  });

  describe("Load Operation", () => {
    it("should load messages from input", async () => {
      const testMessages: ConversationMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];

      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "load",
          variable_id: "conversation_history",
        },
        input: {
          messages: testMessages,
        },
      };

      const result = await memoryNode.execute(node, context);

      expect(result.message_count).toBe(2);
      expect(result.loaded).toBe(true);

      const messages = registry.getVariable("conversation_history");
      expect(messages).toEqual(testMessages);
    });

    it("should handle empty messages array", async () => {
      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "load",
          variable_id: "conversation_history",
        },
        input: {
          messages: [],
        },
      };

      const result = await memoryNode.execute(node, context);

      expect(result.message_count).toBe(0);
      expect(result.loaded).toBe(true);
    });
  });

  describe("Clear Operation", () => {
    it("should clear conversation history", async () => {
      // First add some messages
      registry.setVariable("conversation_history", [
        { role: "user", content: "Message 1" },
        { role: "assistant", content: "Response 1" },
      ]);

      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "clear",
          variable_id: "conversation_history",
        },
        input: {},
      };

      const result = await memoryNode.execute(node, context);

      expect(result.message_count).toBe(0);
      expect(result.cleared).toBe(true);

      const messages = registry.getVariable("conversation_history");
      expect(messages).toEqual([]);
    });
  });

  describe("Slice Operation", () => {
    it("should slice messages within range", async () => {
      // Set up initial messages
      const initialMessages: ConversationMessage[] = [];
      for (let i = 0; i < 10; i++) {
        initialMessages.push({
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i + 1}`,
        });
      }
      registry.setVariable("conversation_history", initialMessages);

      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "slice",
          variable_id: "conversation_history",
          slice_start: 5,
          slice_end: 8,
        },
        input: {},
      };

      const result = await memoryNode.execute(node, context);

      expect(result.message_count).toBe(3);
      expect(result.sliced).toBe(true);

      const messages = registry.getVariable("conversation_history");
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe("Message 6");
      expect(messages[2].content).toBe("Message 8");
    });

    it("should get recent messages", async () => {
      const initialMessages: ConversationMessage[] = [];
      for (let i = 0; i < 10; i++) {
        initialMessages.push({
          role: "user",
          content: `Message ${i + 1}`,
        });
      }
      registry.setVariable("conversation_history", initialMessages);

      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "slice",
          variable_id: "conversation_history",
          slice_start: -5, // Last 5 messages
        },
        input: {},
      };

      const result = await memoryNode.execute(node, context);

      expect(result.message_count).toBe(5);
      const messages = registry.getVariable("conversation_history");
      expect(messages[0].content).toBe("Message 6");
      expect(messages[4].content).toBe("Message 10");
    });
  });

  describe("Serialize/Deserialize Operations", () => {
    it("should serialize messages to JSON", async () => {
      const testMessages: ConversationMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];
      registry.setVariable("conversation_history", testMessages);

      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "serialize",
          variable_id: "conversation_history",
        },
        input: {},
      };

      const result = await memoryNode.execute(node, context);

      expect(result.message_count).toBe(2);
      expect(result.serialized).toBeDefined();

      const parsed = JSON.parse(result.serialized);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].content).toBe("Hello");
    });

    it("should deserialize JSON to messages", async () => {
      const testMessages: ConversationMessage[] = [
        { role: "user", content: "Deserialized message" },
      ];
      const serialized = JSON.stringify(testMessages);

      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "deserialize",
          variable_id: "conversation_history",
        },
        input: {
          serialized: serialized,
        },
      };

      const result = await memoryNode.execute(node, context);

      expect(result.message_count).toBe(1);
      expect(result.deserialized).toBe(true);

      const messages = registry.getVariable("conversation_history");
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Deserialized message");
    });
  });

  describe("Error Handling", () => {
    it("should throw error for missing variable_id", async () => {
      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "append",
        } as any,
        input: {},
      };

      await expect(memoryNode.execute(node, context)).rejects.toThrow(
        "ConversationMemoryNode requires variable_id in config",
      );
    });

    it("should throw error for unknown operation", async () => {
      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "unknown" as any,
          variable_id: "conversation_history",
        },
        input: {},
      };

      await expect(memoryNode.execute(node, context)).rejects.toThrow(
        "Unknown operation: unknown",
      );
    });

    it("should handle invalid JSON in deserialize", async () => {
      const node: FlowNode = {
        id: "memory-node",
        name: "Memory Node",
        type: NodeType.CONVERSATION_MEMORY,
        config: {
          operation: "deserialize",
          variable_id: "conversation_history",
        },
        input: {
          serialized: "invalid json",
        },
      };

      await expect(memoryNode.execute(node, context)).rejects.toThrow(
        "Failed to deserialize messages",
      );
    });
  });
});
