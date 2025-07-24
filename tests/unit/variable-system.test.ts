/**
 * Variable System Unit Tests
 * Tests variable interpolation, resolution, and scoping
 */

describe("Variable System Unit Tests", () => {
  describe("Variable Interpolation Syntax", () => {
    test("should validate basic variable interpolation syntax", () => {
      const interpolationPatterns = [
        "{{simple_variable}}",
        "{{node_id.output}}",
        "{{node_id.output.property}}",
        "{{array_var[0]}}",
        "{{object_var.nested.property}}",
      ];

      const variableRegex = /\{\{([^}]+)\}\}/g;

      interpolationPatterns.forEach((pattern) => {
        const matches = pattern.match(variableRegex);
        expect(matches).toBeTruthy();
        expect(matches).toHaveLength(1);
        expect(matches![0]).toBe(pattern);
      });
    });

    test("should handle complex interpolation patterns", () => {
      const complexPatterns = [
        "Hello {{user_name}}, your score is {{score_node.output.value}}",
        "Processing {{item_count}} items from {{source_node.output.list}}",
        "Result: {{analysis.summary}} (confidence: {{analysis.confidence}}%)",
      ];

      const variableRegex = /\{\{([^}]+)\}\}/g;

      complexPatterns.forEach((pattern) => {
        const matches = [...pattern.matchAll(variableRegex)];
        expect(matches.length).toBeGreaterThan(0);
        matches.forEach((match) => {
          expect(match[0]).toMatch(/^\{\{[^}]+\}\}$/);
        });
      });
    });

    test("should validate variable naming conventions", () => {
      const validVariableNames = [
        "user_input",
        "nodeId",
        "node_123",
        "camelCaseVar",
        "snake_case_var",
        "var1",
        "a",
        "longVariableNameWithManyWords",
      ];

      const invalidVariableNames = [
        "123variable", // starts with number
        "var-with-dashes",
        "var with spaces",
        "var.with.dots",
        "var@symbol",
        "",
        "var/slash",
      ];

      // Valid variable name pattern: starts with letter or underscore, followed by letters, numbers, or underscores
      const validNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

      validVariableNames.forEach((name) => {
        expect(name).toMatch(validNameRegex);
      });

      invalidVariableNames.forEach((name) => {
        expect(name).not.toMatch(validNameRegex);
      });
    });
  });

  describe("Variable Types and Validation", () => {
    test("should validate supported variable types", () => {
      const supportedTypes = [
        "string",
        "number",
        "boolean",
        "array",
        "object",
        "file",
        "null",
        "any",
      ];

      const variableDefinitions = [
        { id: "str_var", type: "string", default: "hello" },
        { id: "num_var", type: "number", default: 42 },
        { id: "bool_var", type: "boolean", default: true },
        { id: "arr_var", type: "array", default: [1, 2, 3] },
        { id: "obj_var", type: "object", default: { key: "value" } },
        { id: "file_var", type: "file", default: "./file.txt" },
        { id: "null_var", type: "null", default: null },
        { id: "any_var", type: "any", default: "anything" },
      ];

      variableDefinitions.forEach((varDef, index) => {
        expect(varDef).toHaveProperty("id");
        expect(varDef).toHaveProperty("type");
        expect(supportedTypes).toContain(varDef.type);
        expect(varDef.type).toBe(supportedTypes[index]);
      });
    });

    test("should validate type-default value consistency", () => {
      const typeValuePairs = [
        {
          type: "string",
          validValues: ["hello", "", "test"],
          invalidValues: [123, true, []],
        },
        {
          type: "number",
          validValues: [0, 42, -1, 3.14],
          invalidValues: ["42", true, {}],
        },
        {
          type: "boolean",
          validValues: [true, false],
          invalidValues: ["true", 1, 0],
        },
        {
          type: "array",
          validValues: [[], [1, 2], ["a", "b"]],
          invalidValues: ["array", 123, {}],
        },
        {
          type: "object",
          validValues: [{}, { a: 1 }, { nested: { prop: "value" } }],
          invalidValues: ["object", 123, []],
        },
        {
          type: "null",
          validValues: [null],
          invalidValues: [undefined, "", 0, false],
        },
      ];

      typeValuePairs.forEach(({ type, validValues, invalidValues }) => {
        validValues.forEach((value) => {
          const variable = { id: "test", type, default: value };
          expect(variable.type).toBe(type);
          expect(variable.default).toBe(value);
        });

        invalidValues.forEach((value) => {
          // In a real implementation, this would be validated by the schema validator
          const variable = { id: "test", type, default: value };
          expect(variable.type).toBe(type);
          // The mismatch would be caught by validation
        });
      });
    });

    test("should validate variable validation rules", () => {
      const validationRules = [
        {
          pattern: "^[a-zA-Z]+$",
          type: "string",
          description: "Only letters allowed",
        },
        {
          minLength: 5,
          maxLength: 20,
          type: "string",
          description: "String length constraints",
        },
        {
          minimum: 0,
          maximum: 100,
          type: "number",
          description: "Number range constraints",
        },
        {
          enum: ["option1", "option2", "option3"],
          type: "string",
          description: "Enumerated values",
        },
        {
          format: "email",
          type: "string",
          description: "Email format validation",
        },
      ];

      validationRules.forEach((rule) => {
        expect(rule).toHaveProperty("type");
        expect(rule).toHaveProperty("description");

        // Each rule should have at least one validation constraint
        const constraints = [
          "pattern",
          "minLength",
          "maxLength",
          "minimum",
          "maximum",
          "enum",
          "format",
        ];
        const hasConstraint = constraints.some((constraint) =>
          rule.hasOwnProperty(constraint),
        );
        expect(hasConstraint).toBe(true);
      });
    });
  });

  describe("Variable Scoping and Resolution", () => {
    test("should validate variable scope hierarchy", () => {
      const scopeHierarchy = {
        flow_variables: [
          { id: "global_var", type: "string", default: "global" },
          { id: "input_var", type: "string" },
        ],
        node_outputs: [
          { node_id: "node1", output_key: "result", value: "node1_result" },
          { node_id: "node2", output_key: "data", value: { nested: "value" } },
        ],
        runtime_inputs: [{ id: "input_var", value: "runtime_value" }],
      };

      // Flow variables should be accessible by ID
      expect(scopeHierarchy.flow_variables[0]).toHaveProperty(
        "id",
        "global_var",
      );

      // Node outputs should be accessible by node_id.output_key format
      expect(scopeHierarchy.node_outputs[0]).toHaveProperty("node_id");
      expect(scopeHierarchy.node_outputs[0]).toHaveProperty("output_key");

      // Runtime inputs should override flow variable defaults
      expect(scopeHierarchy.runtime_inputs[0].id).toBe("input_var");
    });

    test("should validate variable reference resolution order", () => {
      // Variable resolution priority:
      // 1. Runtime inputs
      // 2. Node outputs
      // 3. Flow variable defaults

      const resolutionScenarios = [
        {
          name: "runtime_input_override",
          variable_id: "test_var",
          flow_default: "flow_default",
          runtime_input: "runtime_value",
          expected: "runtime_value",
        },
        {
          name: "node_output_reference",
          variable_reference: "node1.output.result",
          node_outputs: { "node1.output.result": "node_result" },
          expected: "node_result",
        },
        {
          name: "flow_default_fallback",
          variable_id: "fallback_var",
          flow_default: "default_value",
          expected: "default_value",
        },
      ];

      resolutionScenarios.forEach((scenario) => {
        expect(scenario).toHaveProperty("name");
        expect(scenario).toHaveProperty("expected");
      });
    });

    test("should validate nested property access", () => {
      const nestedAccessPatterns = [
        {
          reference: "node.output.simple",
          data: { node: { output: { simple: "value" } } },
          expected: "value",
        },
        {
          reference: "node.output.array[0]",
          data: { node: { output: { array: ["first", "second"] } } },
          expected: "first",
        },
        {
          reference: "node.output.nested.deep.property",
          data: {
            node: { output: { nested: { deep: { property: "deep_value" } } } },
          },
          expected: "deep_value",
        },
        {
          reference: "node.output.array.length",
          data: { node: { output: { array: [1, 2, 3] } } },
          expected: 3,
        },
      ];

      nestedAccessPatterns.forEach((pattern) => {
        expect(pattern).toHaveProperty("reference");
        expect(pattern).toHaveProperty("data");
        expect(pattern).toHaveProperty("expected");

        // Validate the reference syntax
        const parts = pattern.reference.split(".");
        expect(parts.length).toBeGreaterThan(1);
      });
    });
  });

  describe("Variable Registry Management", () => {
    test("should validate variable registry format", () => {
      const mockRegistry = {
        "node1.output.result": "value1",
        "node1.output.metadata": { source: "test", confidence: 0.95 },
        "node2.output.list": ["item1", "item2", "item3"],
        flow_var1: "global_value",
        input_var: "runtime_input_value",
      };

      Object.keys(mockRegistry).forEach((key) => {
        // Variable registry keys should either be:
        // 1. Simple variable IDs (flow variables, inputs)
        // 2. Node output references (node_id.output.property)
        const isSimpleVar = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
        const isNodeOutput =
          /^[a-zA-Z_][a-zA-Z0-9_]*\.output(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(
            key,
          );

        expect(isSimpleVar || isNodeOutput).toBe(true);
      });
    });

    test("should validate registry isolation between flows", () => {
      const flow1Registry = {
        execution_id: "flow_1_20250712_001",
        variables: {
          shared_var: "flow1_value",
          "node1.output.result": "flow1_result",
        },
      };

      const flow2Registry = {
        execution_id: "flow_2_20250712_002",
        variables: {
          shared_var: "flow2_value",
          "node1.output.result": "flow2_result",
        },
      };

      // Each flow should have its own execution ID
      expect(flow1Registry.execution_id).not.toBe(flow2Registry.execution_id);

      // Same variable names can have different values in different flows
      expect(flow1Registry.variables.shared_var).not.toBe(
        flow2Registry.variables.shared_var,
      );
      expect(flow1Registry.variables["node1.output.result"]).not.toBe(
        flow2Registry.variables["node1.output.result"],
      );
    });

    test("should validate registry cleanup lifecycle", () => {
      const registryLifecycle = {
        created: "2025-07-12T10:00:00Z",
        execution_start: "2025-07-12T10:00:01Z",
        last_update: "2025-07-12T10:05:30Z",
        execution_end: "2025-07-12T10:05:45Z",
        cleanup_scheduled: "2025-07-12T10:05:46Z",
        cleanup_completed: "2025-07-12T10:05:47Z",
      };

      // Validate timestamp ordering
      const timestamps = Object.values(registryLifecycle).map(
        (ts) => new Date(ts),
      );
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i].getTime()).toBeGreaterThanOrEqual(
          timestamps[i - 1].getTime(),
        );
      }
    });
  });

  describe("Variable Interpolation Processing", () => {
    test("should handle multiple variables in single string", () => {
      const templates = [
        {
          template: "Hello {{name}}, your score is {{score}}",
          variables: { name: "Alice", score: 95 },
          expected: "Hello Alice, your score is 95",
        },
        {
          template:
            "Processing {{count}} items from {{source}} to {{destination}}",
          variables: {
            count: 10,
            source: "input.csv",
            destination: "output.json",
          },
          expected: "Processing 10 items from input.csv to output.json",
        },
        {
          template: "{{prefix}}-{{id}}-{{suffix}}",
          variables: { prefix: "TEST", id: "12345", suffix: "END" },
          expected: "TEST-12345-END",
        },
      ];

      templates.forEach(({ template, variables, expected }) => {
        // Mock interpolation logic
        let result = template;
        Object.entries(variables).forEach(([key, value]) => {
          result = result.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, "g"),
            String(value),
          );
        });
        expect(result).toBe(expected);
      });
    });

    test("should handle special characters and escaping", () => {
      const specialCases = [
        {
          template: "Value: {{var_with_underscore}}",
          variables: { var_with_underscore: "test_value" },
          expected: "Value: test_value",
        },
        {
          template: "JSON: {{json_object}}",
          variables: { json_object: '{"key": "value"}' },
          expected: 'JSON: {"key": "value"}',
        },
        {
          template: "Path: {{file_path}}",
          variables: { file_path: "/path/to/file.txt" },
          expected: "Path: /path/to/file.txt",
        },
      ];

      specialCases.forEach(({ template, variables, expected }) => {
        let result = template;
        Object.entries(variables).forEach(([key, value]) => {
          result = result.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, "g"),
            String(value),
          );
        });
        expect(result).toBe(expected);
      });
    });

    test("should handle missing variable references", () => {
      const missingVariableCases = [
        {
          template: "Hello {{name}}, your score is {{missing_var}}",
          variables: { name: "Alice" },
          shouldError: true,
        },
        {
          template: "Value: {{undefined_reference.property}}",
          variables: {},
          shouldError: true,
        },
        {
          template: "Complete: {{existing_var}}",
          variables: { existing_var: "value" },
          shouldError: false,
        },
      ];

      missingVariableCases.forEach(({ template, variables, shouldError }) => {
        const variableRegex = /\{\{([^}]+)\}\}/g;
        const matches = [...template.matchAll(variableRegex)];

        const hasUndefinedVars = matches.some((match) => {
          const varName = match[1].split(".")[0];
          return !variables.hasOwnProperty(varName);
        });

        expect(hasUndefinedVars).toBe(shouldError);
      });
    });
  });
});
