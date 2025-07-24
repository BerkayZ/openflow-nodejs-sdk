/**
 * FlowExecutor Unit Tests
 * Tests core flow execution functionality
 */

import { FlowExecutor } from "../../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../../core/types";

describe("FlowExecutor", () => {
  let executor: FlowExecutor;
  let config: FlowExecutorConfig;

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
    executor = new FlowExecutor(config);
  });

  afterEach(() => {
    // Clean up any resources
  });

  describe("Basic Flow Execution", () => {
    test("should execute a basic LLM flow", async () => {
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
            type: "LLM",
            name: "Process with LLM",
            config: { provider: "grok", model: "grok-3-latest" },
            messages: [
              {
                type: "text",
                role: "user",
                text: "{{user_prompt}}",
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
            type: "UPDATE_VARIABLE",
            name: "Save Response",
            config: { type: "update", variable_id: "llm_response" },
            value: "{{llm_process.explanation}}",
          },
        ],
      };

      const result = await executor.executeFlow(flow, {
        user_prompt: "Say hello",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.outputs).toBeDefined();
      expect(result.outputs.llm_response).toBeDefined();
      expect(typeof result.outputs.llm_response).toBe("string");
    });

    test("should handle flow validation errors", async () => {
      const invalidFlow = {
        name: "invalid-flow",
        // Missing required fields
      };

      await expect(executor.executeFlow(invalidFlow as any)).rejects.toThrow();
    });

    test("should handle variable interpolation", async () => {
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
            type: "UPDATE_VARIABLE",
            name: "Update Variable",
            config: { type: "update", variable_id: "output_text" },
            value: "Processed: {{input_text}}",
          },
        ],
      };

      const result = await executor.executeFlow(flow, {
        input_text: "test input",
      });

      expect(result.success).toBe(true);
      expect(result.outputs.output_text).toBe("Processed: test input");
    });
  });

  describe("Conditional Logic", () => {
    test("should execute conditional branches correctly", async () => {
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
            type: "CONDITION",
            name: "Evaluate Score",
            input: { switch_value: "{{user_score}}" },
            branches: {
              excellent: {
                condition: "greater_than",
                value: 90,
                nodes: [
                  {
                    id: "excellent_badge",
                    type: "UPDATE_VARIABLE",
                    name: "Award Excellent Badge",
                    config: { type: "update", variable_id: "final_message" },
                    value: "Excellent! Score: {{user_score}}",
                  },
                ],
              },
              good: {
                condition: "greater_than",
                value: 70,
                nodes: [
                  {
                    id: "good_badge",
                    type: "UPDATE_VARIABLE",
                    name: "Award Good Badge",
                    config: { type: "update", variable_id: "final_message" },
                    value: "Good work! Score: {{user_score}}",
                  },
                ],
              },
              default: {
                nodes: [
                  {
                    id: "needs_improvement",
                    type: "UPDATE_VARIABLE",
                    name: "Needs Improvement",
                    config: { type: "update", variable_id: "final_message" },
                    value: "Keep improving! Score: {{user_score}}",
                  },
                ],
              },
            },
          },
        ],
      };

      // Test excellent score
      const excellentResult = await executor.executeFlow(flow, {
        user_score: 95,
      });
      expect(excellentResult.outputs.final_message).toContain("Excellent");

      // Test good score
      const goodResult = await executor.executeFlow(flow, { user_score: 80 });
      expect(goodResult.outputs.final_message).toContain("Good work");

      // Test default case
      const defaultResult = await executor.executeFlow(flow, {
        user_score: 60,
      });
      expect(defaultResult.outputs.final_message).toContain("Keep improving");
    });
  });

  describe("For Each Loop", () => {
    test("should process arrays with FOR_EACH node", async () => {
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
            type: "FOR_EACH",
            name: "Process Items",
            config: {
              delay_between: 0,
              each_key: "current",
            },
            input: {
              items: "{{items}}",
            },
            each_nodes: [
              {
                id: "process_current",
                type: "UPDATE_VARIABLE",
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

      const result = await executor.executeFlow(flow, {
        items: ["apple", "banana", "orange"],
      });

      expect(result.success).toBe(true);
      expect(result.outputs.processed_items).toContain("Processed: apple");
      expect(result.outputs.processed_items).toContain("Processed: banana");
      expect(result.outputs.processed_items).toContain("Processed: orange");
    });
  });

  describe("Configuration Validation", () => {
    test("should validate executor configuration", () => {
      expect(() => new FlowExecutor(config)).not.toThrow();
    });

    test("should handle missing provider configuration", () => {
      const invalidConfig = {
        concurrency: { global_limit: 1 },
        providers: {},
        logLevel: "error" as const,
      };

      expect(() => new FlowExecutor(invalidConfig)).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    test("should handle node execution errors gracefully", async () => {
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
            type: "INVALID_TYPE" as any,
            name: "Invalid Node",
            config: {},
          },
        ],
      };

      await expect(executor.executeFlow(flow)).rejects.toThrow();
    });

    test("should handle circular dependencies", async () => {
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
            type: "UPDATE_VARIABLE",
            name: "Node A",
            config: { type: "update", variable_id: "result" },
            value: "{{node_b.output}}",
          },
          {
            id: "node_b",
            type: "UPDATE_VARIABLE",
            name: "Node B",
            config: { type: "update", variable_id: "result" },
            value: "{{node_a.output}}",
          },
        ],
      };

      await expect(executor.executeFlow(flow)).rejects.toThrow();
    });
  });
});
