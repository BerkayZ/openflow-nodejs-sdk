/**
 * Parallel Execution Tests
 * Tests level-based parallel node execution in FlowExecutor and
 * execution level grouping in FlowValidator.
 */

import { FlowExecutor } from "../../core/executor/FlowExecutor";
import { FlowValidator } from "../../core/validation/FlowValidator";
import { FlowExecutorConfig, NodeType, HookSignal } from "../../core/types";

const baseConfig: FlowExecutorConfig = {
  concurrency: { global_limit: 5 },
  providers: {
    llm: {},
    vectorDB: {},
    embeddings: {},
  },
  logLevel: "warn",
  tempDir: "./test_temp",
};

const makeFlow = (nodes: any[], variables: any[] = [], output: string[] = []) => ({
  name: "parallel-test",
  version: "1.0.0",
  description: "Parallel execution test flow",
  author: "Test Suite",
  variables,
  input: [] as string[],
  output,
  nodes,
});

describe("Parallel Execution", () => {
  let executor: FlowExecutor;

  beforeEach(() => {
    executor = new FlowExecutor(baseConfig);
  });

  describe("FlowValidator - execution levels", () => {
    test("independent nodes are grouped into the same execution level", () => {
      const flow = makeFlow([
        {
          id: "node_a",
          type: NodeType.UPDATE_VARIABLE,
          name: "Node A",
          config: { type: "update", variable_id: "var_a" },
          value: "hello",
        },
        {
          id: "node_b",
          type: NodeType.UPDATE_VARIABLE,
          name: "Node B",
          config: { type: "update", variable_id: "var_b" },
          value: "world",
        },
      ], [{ id: "var_a" }, { id: "var_b" }]);

      const result = FlowValidator.validateFlow(flow);
      const levels = result.dependencyGraph?.executionLevels;

      expect(levels).toBeDefined();
      expect(levels!.length).toBe(1);
      expect(levels![0]).toContain("node_a");
      expect(levels![0]).toContain("node_b");
    });

    test("node with depends_on is placed in a higher execution level", () => {
      const flow = makeFlow([
        {
          id: "first",
          type: NodeType.UPDATE_VARIABLE,
          name: "First",
          config: { variable_id: "var_first" },
          value: "step1",
        },
        {
          id: "second",
          type: NodeType.UPDATE_VARIABLE,
          name: "Second",
          config: { variable_id: "var_second" },
          value: "step2",
          depends_on: ["first"],
        },
      ], [{ id: "var_first" }, { id: "var_second" }]);

      const result = FlowValidator.validateFlow(flow);
      const levels = result.dependencyGraph?.executionLevels;

      expect(levels).toBeDefined();
      expect(levels!.length).toBe(2);
      expect(levels![0]).toContain("first");
      expect(levels![1]).toContain("second");
    });
  });

  describe("FlowExecutor - parallel execution", () => {
    test("two independent nodes run in parallel (both beforeNode hooks fire before either afterNode)", async () => {
      const events: string[] = [];

      const flow = makeFlow(
        [
          {
            id: "node_a",
            type: NodeType.UPDATE_VARIABLE,
            name: "Node A",
            config: { type: "update", variable_id: "result_a" },
            value: "a",
          },
          {
            id: "node_b",
            type: NodeType.UPDATE_VARIABLE,
            name: "Node B",
            config: { type: "update", variable_id: "result_b" },
            value: "b",
          },
        ],
        [{ id: "result_a" }, { id: "result_b" }],
        ["result_a", "result_b"],
      );

      const result = await executor.executeFlow(flow, {}, {
        beforeNode: async ({ node }) => {
          events.push(`before:${node.id}`);
        },
        afterNode: async ({ node }) => {
          events.push(`after:${node.id}`);
          return HookSignal.CONTINUE;
        },
      });

      expect(result.success).toBe(true);
      expect(result.outputs.result_a).toBe("a");
      expect(result.outputs.result_b).toBe("b");

      // With parallel execution, both beforeNode hooks fire before any afterNode
      // (both async fns are started by Promise.all before either resolves)
      const firstAfterIndex = events.findIndex((e) => e.startsWith("after:"));
      const lastBeforeIndex = events.reduce(
        (last, e, i) => (e.startsWith("before:") ? i : last),
        -1,
      );
      // All "before" events should come before any "after" events
      expect(lastBeforeIndex).toBeLessThan(firstAfterIndex);
    });

    test("node with depends_on runs after its dependency completes", async () => {
      const completionOrder: string[] = [];

      const flow = makeFlow(
        [
          {
            id: "step1",
            type: NodeType.UPDATE_VARIABLE,
            name: "Step 1",
            config: { type: "update", variable_id: "out1" },
            value: "step1_done",
          },
          {
            id: "step2",
            type: NodeType.UPDATE_VARIABLE,
            name: "Step 2",
            config: { type: "update", variable_id: "out2" },
            value: "step2_done",
            depends_on: ["step1"],
          },
        ],
        [{ id: "out1" }, { id: "out2" }],
        ["out1", "out2"],
      );

      const result = await executor.executeFlow(flow, {}, {
        afterNode: async ({ node }) => {
          completionOrder.push(node.id);
          return HookSignal.CONTINUE;
        },
      });

      expect(result.success).toBe(true);
      // step1 must complete before step2 starts (due to depends_on)
      expect(completionOrder.indexOf("step1")).toBeLessThan(
        completionOrder.indexOf("step2"),
      );
    });

    test("a failing node causes the flow to reject", async () => {
      // A node referencing a non-existent variable will fail at validation,
      // so we use a node type that fails at runtime: reference an output
      // from a non-existent node (this passes schema validation since we
      // use a plain string value that triggers an executor error via bad config).
      // The simplest approach: use a flow that is invalid to trigger rejection.
      const flow = makeFlow(
        [
          {
            id: "bad_node",
            type: NodeType.UPDATE_VARIABLE,
            name: "Bad Node",
            // Missing config.variable_id — executor will fail
            config: {},
            value: "something",
          },
        ],
        [],
      );

      await expect(executor.executeFlow(flow)).rejects.toThrow();
    });
  });
});
