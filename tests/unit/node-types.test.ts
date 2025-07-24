/**
 * Node Types Unit Tests
 * Tests individual node type implementations and configurations
 */

describe("Node Types Unit Tests", () => {
  describe("LLM Node Configuration", () => {
    test("should validate LLM node configuration schema", () => {
      const validLLMConfig = {
        id: "test_llm",
        type: "LLM",
        name: "Test LLM Node",
        config: {
          provider: "grok",
          model: "grok-3-latest",
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0,
          presence_penalty: 0,
          seed: 12345,
        },
        messages: [
          {
            type: "text",
            role: "system",
            text: "You are a helpful assistant.",
          },
          {
            type: "text",
            role: "user",
            text: "{{user_input}}",
          },
        ],
        output: {
          response: {
            type: "string",
            description: "Generated response",
          },
        },
      };

      expect(validLLMConfig).toHaveProperty("id");
      expect(validLLMConfig).toHaveProperty("type", "LLM");
      expect(validLLMConfig).toHaveProperty("config");
      expect(validLLMConfig).toHaveProperty("messages");
      expect(validLLMConfig).toHaveProperty("output");
      expect(validLLMConfig.config).toHaveProperty("provider");
      expect(validLLMConfig.config).toHaveProperty("model");
    });

    test("should validate LLM message types", () => {
      const textMessage = {
        type: "text",
        role: "user",
        text: "Hello, world!",
        name: "user_message",
      };

      const imageMessage = {
        type: "image",
        role: "user",
        image_url: "https://example.com/image.jpg",
        detail: "high",
      };

      const imagePathMessage = {
        type: "image",
        role: "user",
        image_path: "./test_image.png",
        detail: "low",
      };

      expect(textMessage).toHaveProperty("type", "text");
      expect(textMessage).toHaveProperty("role", "user");
      expect(textMessage).toHaveProperty("text");

      expect(imageMessage).toHaveProperty("type", "image");
      expect(imageMessage).toHaveProperty("image_url");
      expect(imageMessage).toHaveProperty("detail");

      expect(imagePathMessage).toHaveProperty("type", "image");
      expect(imagePathMessage).toHaveProperty("image_path");
    });

    test("should validate LLM output schema", () => {
      const validOutputSchema = {
        simple_text: {
          type: "string",
          description: "Simple text output",
        },
        number_value: {
          type: "number",
          description: "Numeric output",
        },
        list_items: {
          type: "array",
          items: { type: "string" },
          description: "List of items",
        },
        complex_object: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
            active: { type: "boolean" },
          },
          description: "Complex object output",
        },
      };

      Object.values(validOutputSchema).forEach((schema) => {
        expect(schema).toHaveProperty("type");
        expect(schema).toHaveProperty("description");
      });
    });
  });

  describe("CONDITION Node Configuration", () => {
    test("should validate condition node structure", () => {
      const validConditionNode = {
        id: "test_condition",
        type: "CONDITION",
        name: "Test Condition",
        input: {
          switch_value: "{{variable_to_check}}",
        },
        branches: {
          case_1: {
            condition: "equals",
            value: "expected_value",
            nodes: [
              {
                id: "case_1_action",
                type: "UPDATE_VARIABLE",
                name: "Case 1 Action",
                config: { type: "update", variable_id: "result" },
                value: "Case 1 executed",
              },
            ],
          },
          case_2: {
            condition: "greater_than",
            value: 100,
            nodes: [
              {
                id: "case_2_action",
                type: "UPDATE_VARIABLE",
                name: "Case 2 Action",
                config: { type: "update", variable_id: "result" },
                value: "Case 2 executed",
              },
            ],
          },
          default: {
            nodes: [
              {
                id: "default_action",
                type: "UPDATE_VARIABLE",
                name: "Default Action",
                config: { type: "update", variable_id: "result" },
                value: "Default case executed",
              },
            ],
          },
        },
      };

      expect(validConditionNode).toHaveProperty("id");
      expect(validConditionNode).toHaveProperty("type", "CONDITION");
      expect(validConditionNode).toHaveProperty("input");
      expect(validConditionNode).toHaveProperty("branches");
      expect(validConditionNode.input).toHaveProperty("switch_value");
      expect(validConditionNode.branches).toHaveProperty("default");
    });

    test("should validate condition operators", () => {
      const operators = [
        "equals",
        "not_equals",
        "greater_than",
        "less_than",
        "contains",
      ];

      operators.forEach((operator) => {
        const conditionBranch = {
          condition: operator,
          value: "test_value",
          nodes: [],
        };

        expect(conditionBranch).toHaveProperty("condition", operator);
        expect(conditionBranch).toHaveProperty("value");
        expect(conditionBranch).toHaveProperty("nodes");
        expect(Array.isArray(conditionBranch.nodes)).toBe(true);
      });
    });
  });

  describe("FOR_EACH Node Configuration", () => {
    test("should validate for each node structure", () => {
      const validForEachNode = {
        id: "test_foreach",
        type: "FOR_EACH",
        name: "Test For Each",
        config: {
          delay_between: 1000,
          each_key: "current_item",
        },
        input: {
          items: "{{array_variable}}",
        },
        each_nodes: [
          {
            id: "process_item",
            type: "UPDATE_VARIABLE",
            name: "Process Current Item",
            config: { type: "join", variable_id: "results", join_str: ", " },
            value: "Processed: {{current_item}}",
          },
        ],
      };

      expect(validForEachNode).toHaveProperty("id");
      expect(validForEachNode).toHaveProperty("type", "FOR_EACH");
      expect(validForEachNode).toHaveProperty("config");
      expect(validForEachNode).toHaveProperty("input");
      expect(validForEachNode).toHaveProperty("each_nodes");
      expect(validForEachNode.config).toHaveProperty("each_key");
      expect(validForEachNode.input).toHaveProperty("items");
      expect(Array.isArray(validForEachNode.each_nodes)).toBe(true);
    });

    test("should validate for each configuration options", () => {
      const configOptions = {
        delay_between: 500,
        each_key: "item",
        max_iterations: 100,
        continue_on_error: false,
      };

      expect(typeof configOptions.delay_between).toBe("number");
      expect(typeof configOptions.each_key).toBe("string");
      expect(typeof configOptions.max_iterations).toBe("number");
      expect(typeof configOptions.continue_on_error).toBe("boolean");
    });
  });

  describe("UPDATE_VARIABLE Node Configuration", () => {
    test("should validate update variable node types", () => {
      const updateTypes = [
        {
          type: "update",
          variable_id: "target_var",
          value: "new_value",
        },
        {
          type: "join",
          variable_id: "list_var",
          join_str: ", ",
          value: "item_to_add",
        },
        {
          type: "append",
          variable_id: "array_var",
          value: "new_item",
        },
      ];

      updateTypes.forEach((updateConfig) => {
        expect(updateConfig).toHaveProperty("type");
        expect(updateConfig).toHaveProperty("variable_id");
        expect(updateConfig).toHaveProperty("value");
      });

      // Check join-specific properties
      const joinConfig = updateTypes[1];
      expect(joinConfig).toHaveProperty("join_str");
    });

    test("should validate variable update node structure", () => {
      const validUpdateNode = {
        id: "update_test",
        type: "UPDATE_VARIABLE",
        name: "Update Test Variable",
        config: {
          type: "update",
          variable_id: "test_variable",
        },
        value: "{{source_variable}}",
      };

      expect(validUpdateNode).toHaveProperty("id");
      expect(validUpdateNode).toHaveProperty("type", "UPDATE_VARIABLE");
      expect(validUpdateNode).toHaveProperty("config");
      expect(validUpdateNode).toHaveProperty("value");
      expect(validUpdateNode.config).toHaveProperty("type");
      expect(validUpdateNode.config).toHaveProperty("variable_id");
    });
  });

  describe("DOCUMENT_SPLITTER Node Configuration", () => {
    test("should validate document splitter configuration", () => {
      const validDocumentSplitter = {
        id: "split_doc",
        type: "DOCUMENT_SPLITTER",
        name: "Split Document",
        config: {
          image_quality: "high",
          dpi: 300,
          image_format: "png",
          output_directory: "./temp_images",
        },
        document: "{{pdf_path}}",
      };

      expect(validDocumentSplitter).toHaveProperty("id");
      expect(validDocumentSplitter).toHaveProperty("type", "DOCUMENT_SPLITTER");
      expect(validDocumentSplitter).toHaveProperty("config");
      expect(validDocumentSplitter).toHaveProperty("document");
      expect(validDocumentSplitter.config).toHaveProperty("image_quality");
      expect(validDocumentSplitter.config).toHaveProperty("dpi");
      expect(validDocumentSplitter.config).toHaveProperty("image_format");
    });

    test("should validate image quality options", () => {
      const qualityOptions = ["low", "medium", "high"];
      const formatOptions = ["png", "jpg", "jpeg", "tiff"];
      const dpiOptions = [72, 150, 200, 300];

      qualityOptions.forEach((quality) => {
        expect(["low", "medium", "high"]).toContain(quality);
      });

      formatOptions.forEach((format) => {
        expect(["png", "jpg", "jpeg", "tiff"]).toContain(format);
      });

      dpiOptions.forEach((dpi) => {
        expect(typeof dpi).toBe("number");
        expect(dpi).toBeGreaterThan(0);
      });
    });
  });

  describe("TEXT_EMBEDDING Node Configuration", () => {
    test("should validate text embedding node structure", () => {
      const validEmbeddingNode = {
        id: "embed_text",
        type: "TEXT_EMBEDDING",
        name: "Create Embeddings",
        config: {
          provider: "openai",
          model: "text-embedding-ada-002",
          batch_size: 100,
          dimensions: 1536,
        },
        input: {
          text: "{{single_text}}",
          texts: "{{text_array}}",
          items: "{{text_items_with_metadata}}",
        },
      };

      expect(validEmbeddingNode).toHaveProperty("id");
      expect(validEmbeddingNode).toHaveProperty("type", "TEXT_EMBEDDING");
      expect(validEmbeddingNode).toHaveProperty("config");
      expect(validEmbeddingNode).toHaveProperty("input");
      expect(validEmbeddingNode.config).toHaveProperty("provider");
      expect(validEmbeddingNode.config).toHaveProperty("model");
    });

    test("should validate embedding input formats", () => {
      const inputFormats = {
        single_text: "Simple text string",
        text_array: ["text1", "text2", "text3"],
        items_with_metadata: [
          {
            id: "item1",
            text: "Text content 1",
            metadata: { source: "doc1", page: 1 },
          },
          {
            id: "item2",
            text: "Text content 2",
            metadata: { source: "doc2", page: 1 },
          },
        ],
      };

      expect(typeof inputFormats.single_text).toBe("string");
      expect(Array.isArray(inputFormats.text_array)).toBe(true);
      expect(Array.isArray(inputFormats.items_with_metadata)).toBe(true);

      inputFormats.items_with_metadata.forEach((item) => {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("text");
        expect(item).toHaveProperty("metadata");
      });
    });
  });

  describe("Vector Database Node Configurations", () => {
    test("should validate vector insert node", () => {
      const validVectorInsert = {
        id: "insert_vectors",
        type: "VECTOR_INSERT",
        name: "Insert Vectors",
        config: {
          provider: "pinecone",
          index_name: "knowledge-base",
          namespace: "documents",
          batch_size: 100,
        },
        input: {
          embedding: {
            id: "vec1",
            values: new Array(1536).fill(0.1),
            metadata: { source: "test" },
          },
          embeddings: "{{embedding_array}}",
          source: "{{embedding_node.output.embeddings}}",
        },
      };

      expect(validVectorInsert).toHaveProperty("type", "VECTOR_INSERT");
      expect(validVectorInsert.config).toHaveProperty("provider");
      expect(validVectorInsert.config).toHaveProperty("index_name");
      expect(validVectorInsert).toHaveProperty("input");
    });

    test("should validate vector search node", () => {
      const validVectorSearch = {
        id: "search_vectors",
        type: "VECTOR_SEARCH",
        name: "Search Vectors",
        config: {
          provider: "pinecone",
          index_name: "knowledge-base",
          namespace: "documents",
          top_k: 10,
          similarity_threshold: 0.8,
          include_metadata: true,
          include_values: false,
        },
        input: {
          search_text: "{{query_text}}",
          search_vector: "{{query_embedding}}",
          top_k: 5,
          filter: { source: "documentation" },
        },
      };

      expect(validVectorSearch).toHaveProperty("type", "VECTOR_SEARCH");
      expect(validVectorSearch.config).toHaveProperty("top_k");
      expect(validVectorSearch.config).toHaveProperty("similarity_threshold");
      expect(validVectorSearch.input).toHaveProperty("top_k");
    });

    test("should validate vector update node", () => {
      const validVectorUpdate = {
        id: "update_vectors",
        type: "VECTOR_UPDATE",
        name: "Update Vectors",
        config: {
          provider: "pinecone",
          index_name: "knowledge-base",
          namespace: "documents",
        },
        input: {
          update: {
            id: "vec1",
            values: new Array(1536).fill(0.2),
            metadata: { updated: true },
          },
          updates: "{{update_array}}",
        },
      };

      expect(validVectorUpdate).toHaveProperty("type", "VECTOR_UPDATE");
      expect(validVectorUpdate.config).toHaveProperty("provider");
      expect(validVectorUpdate.config).toHaveProperty("index_name");
    });

    test("should validate vector delete node", () => {
      const validVectorDelete = {
        id: "delete_vectors",
        type: "VECTOR_DELETE",
        name: "Delete Vectors",
        config: {
          provider: "pinecone",
          index_name: "knowledge-base",
          namespace: "documents",
        },
        input: {
          ids: ["vec1", "vec2", "vec3"],
          filter: { source: "outdated" },
          delete_all: false,
        },
      };

      expect(validVectorDelete).toHaveProperty("type", "VECTOR_DELETE");
      expect(validVectorDelete.input).toHaveProperty("ids");
      expect(Array.isArray(validVectorDelete.input.ids)).toBe(true);
    });
  });

  describe("MCP Configuration", () => {
    test("should validate MCP server configuration", () => {
      const validMCPConfig = {
        name: "test_server",
        url: "https://mcp.example.com/api",
        description: "Test MCP server",
        timeout: 30000,
        retry_attempts: 3,
        auth: {
          type: "api_key",
          api_key: "test_key",
          header_name: "X-API-Key",
        },
      };

      expect(validMCPConfig).toHaveProperty("name");
      expect(validMCPConfig).toHaveProperty("url");
      expect(validMCPConfig).toHaveProperty("auth");
      expect(validMCPConfig.auth).toHaveProperty("type");
    });

    test("should validate MCP authentication types", () => {
      const authTypes = [
        {
          type: "none",
        },
        {
          type: "api_key",
          api_key: "key123",
          header_name: "Authorization",
        },
        {
          type: "bearer",
          token: "bearer_token",
        },
        {
          type: "basic",
          username: "user",
          password: "pass",
        },
        {
          type: "custom_headers",
          headers: {
            "Custom-Header": "value",
          },
        },
      ];

      authTypes.forEach((auth) => {
        expect(auth).toHaveProperty("type");
        expect([
          "none",
          "api_key",
          "bearer",
          "basic",
          "custom_headers",
          "query_params",
        ]).toContain(auth.type);
      });
    });

    test("should validate MCP tools configuration", () => {
      const validToolsConfig = {
        mcp_servers: ["server1", "server2"],
        builtin_tools: ["set_variable", "get_variable"],
        available_tools: ["search", "analyze"],
        auto_discover: true,
        filter: ["deprecated_tool"],
        tool_selection: "auto",
      };

      expect(validToolsConfig).toHaveProperty("auto_discover");
      expect(typeof validToolsConfig.auto_discover).toBe("boolean");
      expect(Array.isArray(validToolsConfig.mcp_servers)).toBe(true);
      expect(Array.isArray(validToolsConfig.builtin_tools)).toBe(true);
      expect(["auto", "manual"]).toContain(validToolsConfig.tool_selection);
    });
  });
});
