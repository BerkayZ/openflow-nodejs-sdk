/**
 * FlowValidator Unit Tests
 * Tests flow validation according to protocol specification
 */

import { FlowValidator } from "../../core/validation/FlowValidator";

describe("FlowValidator", () => {
  describe("Schema Validation", () => {
    test("should validate a valid basic flow", () => {
      const validFlow = {
        name: "test-flow",
        version: "1.0.0",
        description: "A valid test flow",
        author: "Test Suite",
        variables: [
          { id: "input_var", type: "string" },
          { id: "output_var", type: "string" },
        ],
        input: ["input_var"],
        output: ["output_var"],
        nodes: [
          {
            id: "test_node",
            type: "UPDATE_VARIABLE",
            name: "Test Node",
            config: { type: "update", variable_id: "output_var" },
            value: "{{input_var}}",
          },
        ],
      };

      const result = FlowValidator.validateFlow(validFlow);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should reject flow missing required fields", () => {
      const invalidFlow = {
        name: "incomplete-flow",
        // Missing version, description, author, etc.
      };

      const result = FlowValidator.validateFlow(invalidFlow as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should validate variable types", () => {
      const flowWithTypes = {
        name: "typed-flow",
        version: "1.0.0",
        description: "Flow with typed variables",
        author: "Test Suite",
        variables: [
          { id: "string_var", type: "string", default: "hello" },
          { id: "number_var", type: "number", default: 42 },
          { id: "boolean_var", type: "boolean", default: true },
          { id: "array_var", type: "array", default: [1, 2, 3] },
          { id: "object_var", type: "object", default: { key: "value" } },
        ],
        input: ["string_var"],
        output: ["string_var"],
        nodes: [],
      };

      const result = FlowValidator.validateFlow(flowWithTypes);
      expect(result.isValid).toBe(true);
    });

    test("should reject invalid variable types", () => {
      const invalidTypeFlow = {
        name: "invalid-type-flow",
        version: "1.0.0",
        description: "Flow with invalid variable type",
        author: "Test Suite",
        variables: [
          { id: "invalid_var", type: "invalid_type", default: "value" },
        ],
        input: ["invalid_var"],
        output: ["invalid_var"],
        nodes: [],
      };

      const result = FlowValidator.validateFlow(invalidTypeFlow as any);
      expect(result.isValid).toBe(false);
    });
  });

  describe("Node Validation", () => {
    test("should validate LLM node structure", () => {
      const llmFlow = {
        name: "llm-flow",
        version: "1.0.0",
        description: "LLM node test",
        author: "Test Suite",
        variables: [{ id: "prompt" }, { id: "response" }],
        input: ["prompt"],
        output: ["response"],
        nodes: [
          {
            id: "llm_node",
            type: "LLM",
            name: "LLM Processing",
            config: {
              provider: "grok",
              model: "grok-3-latest",
              max_tokens: 1000,
              temperature: 0.7,
            },
            messages: [
              {
                type: "text",
                role: "user",
                text: "{{prompt}}",
              },
            ],
            output: {
              text: {
                type: "string",
                description: "Generated text",
              },
            },
          },
        ],
      };

      const result = FlowValidator.validateFlow(llmFlow);
      expect(result.isValid).toBe(true);
    });

    test("should validate CONDITION node structure", () => {
      const conditionFlow = {
        name: "condition-flow",
        version: "1.0.0",
        description: "Condition node test",
        author: "Test Suite",
        variables: [{ id: "score" }, { id: "result" }],
        input: ["score"],
        output: ["result"],
        nodes: [
          {
            id: "condition_node",
            type: "CONDITION",
            name: "Score Evaluation",
            input: { switch_value: "{{score}}" },
            branches: {
              high: {
                condition: "greater_than",
                value: 80,
                nodes: [
                  {
                    id: "high_score",
                    type: "UPDATE_VARIABLE",
                    name: "High Score",
                    config: { type: "update", variable_id: "result" },
                    value: "High score!",
                  },
                ],
              },
              default: {
                nodes: [
                  {
                    id: "low_score",
                    type: "UPDATE_VARIABLE",
                    name: "Low Score",
                    config: { type: "update", variable_id: "result" },
                    value: "Try harder!",
                  },
                ],
              },
            },
          },
        ],
      };

      const result = FlowValidator.validateFlow(conditionFlow);
      expect(result.isValid).toBe(true);
    });

    test("should validate FOR_EACH node structure", () => {
      const forEachFlow = {
        name: "foreach-flow",
        version: "1.0.0",
        description: "For each node test",
        author: "Test Suite",
        variables: [{ id: "items" }, { id: "processed" }],
        input: ["items"],
        output: ["processed"],
        nodes: [
          {
            id: "foreach_node",
            type: "FOR_EACH",
            name: "Process Items",
            config: {
              delay_between: 100,
              each_key: "current_item",
            },
            input: {
              items: "{{items}}",
            },
            each_nodes: [
              {
                id: "process_item",
                type: "UPDATE_VARIABLE",
                name: "Process Current Item",
                config: {
                  type: "join",
                  variable_id: "processed",
                  join_str: ", ",
                },
                value: "{{current_item}}",
              },
            ],
          },
        ],
      };

      const result = FlowValidator.validateFlow(forEachFlow);
      expect(result.isValid).toBe(true);
    });
  });

  describe("Variable Reference Validation", () => {
    test("should validate forward references", () => {
      const invalidReferenceFlow = {
        name: "invalid-ref-flow",
        version: "1.0.0",
        description: "Invalid reference test",
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
            value: "{{node_b.output}}", // Forward reference
          },
          {
            id: "node_b",
            type: "UPDATE_VARIABLE",
            name: "Node B",
            config: { type: "update", variable_id: "result" },
            value: "valid value",
          },
        ],
      };

      const result = FlowValidator.validateFlow(invalidReferenceFlow);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((err) => err.code.includes("FORWARD_REFERENCE")),
      ).toBe(true);
    });

    test("should detect circular dependencies", () => {
      const circularFlow = {
        name: "circular-flow",
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

      const result = FlowValidator.validateFlow(circularFlow);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((err) => err.code.includes("CIRCULAR_DEPENDENCY")),
      ).toBe(true);
    });

    test("should validate variable interpolation syntax", () => {
      const interpolationFlow = {
        name: "interpolation-flow",
        version: "1.0.0",
        description: "Variable interpolation test",
        author: "Test Suite",
        variables: [{ id: "input_var" }, { id: "output_var" }],
        input: ["input_var"],
        output: ["output_var"],
        nodes: [
          {
            id: "interpolation_node",
            type: "UPDATE_VARIABLE",
            name: "Interpolation Test",
            config: { type: "update", variable_id: "output_var" },
            value: "Hello {{input_var}}!", // Valid interpolation
          },
        ],
      };

      const result = FlowValidator.validateFlow(interpolationFlow);
      expect(result.isValid).toBe(true);
    });
  });

  describe("Unique Identifier Validation", () => {
    test("should reject duplicate node IDs", () => {
      const duplicateIdFlow = {
        name: "duplicate-id-flow",
        version: "1.0.0",
        description: "Duplicate ID test",
        author: "Test Suite",
        variables: [{ id: "result" }],
        input: [],
        output: ["result"],
        nodes: [
          {
            id: "duplicate_id",
            type: "UPDATE_VARIABLE",
            name: "Node 1",
            config: { type: "update", variable_id: "result" },
            value: "value1",
          },
          {
            id: "duplicate_id", // Duplicate ID
            type: "UPDATE_VARIABLE",
            name: "Node 2",
            config: { type: "update", variable_id: "result" },
            value: "value2",
          },
        ],
      };

      const result = FlowValidator.validateFlow(duplicateIdFlow);
      expect(result.isValid).toBe(false);
      console.log("errors ", result.errors);
      expect(
        result.errors.some((err) => err.code.includes("DUPLICATE_NODE_ID")),
      ).toBe(true);
    });

    test("should reject duplicate variable IDs", () => {
      const duplicateVarFlow = {
        name: "duplicate-var-flow",
        version: "1.0.0",
        description: "Duplicate variable ID test",
        author: "Test Suite",
        variables: [
          { id: "var1" },
          { id: "var1" }, // Duplicate variable ID
        ],
        input: ["var1"],
        output: ["var1"],
        nodes: [],
      };

      const result = FlowValidator.validateFlow(duplicateVarFlow);
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((err) => err.code.includes("DUPLICATE_VARIABLE_ID")),
      ).toBe(true);
    });
  });

  describe("Protocol Compliance", () => {
    test("should validate semantic versioning format", () => {
      const versions = [
        { version: "1.0.0", valid: true },
        { version: "1.0.0-alpha", valid: true },
        { version: "1.0.0-beta.1", valid: true },
        { version: "1.0", valid: false },
        { version: "invalid", valid: false },
      ];

      versions.forEach(({ version, valid }) => {
        const flow = {
          name: "version-test",
          version,
          description: "Version test",
          author: "Test Suite",
          variables: [],
          input: [],
          output: [],
          nodes: [],
        };

        const result = FlowValidator.validateFlow(flow);

        expect(result.isValid).toBe(valid);
      });
    });

    test("should validate input/output variable references", () => {
      const invalidIOFlow = {
        name: "invalid-io-flow",
        version: "1.0.0",
        description: "Invalid I/O test",
        author: "Test Suite",
        variables: [{ id: "var1" }],
        input: ["nonexistent_var"], // References non-existent variable
        output: ["var1"],
        nodes: [],
      };

      const result = FlowValidator.validateFlow(invalidIOFlow);
      expect(result.isValid).toBe(false);
    });
  });
});
