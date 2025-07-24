/**
 * Vector Database Integration Tests
 * Tests embedding and vector database operations
 */

import { FlowExecutor } from "../../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../../core/types";

describe("Vector Database Integration Tests", () => {
  let executor: FlowExecutor;
  let config: FlowExecutorConfig;

  beforeAll(() => {
    if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) {
      console.warn("Skipping vector integration tests - no API keys provided");
      return;
    }

    config = {
      concurrency: { global_limit: 2 },
      providers: {
        vectorDB: {
          pinecone: {
            provider: "pinecone",
            apiKey: process.env.PINECONE_API_KEY!,
            index_name: process.env.TEST_INDEX_NAME || "openflow-test-index",
          },
        },
        embeddings: {
          openai: {
            apiKey: process.env.OPENAI_API_KEY!,
          },
        },
      },
      logLevel: "warn",
      timeout: 60000,
      tempDir: process.env.TEST_TEMP_DIR || "./test_temp",
    };
    executor = new FlowExecutor(config);
  });

  beforeEach(() => {
    if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) {
      pending("No API keys provided for vector integration tests");
    }
  });

  describe("Text Embedding Operations", () => {
    test("should generate embeddings for single text", async () => {
      const flow = {
        name: "single-embedding-test",
        version: "1.0.0",
        description: "Single text embedding test",
        author: "Test Suite",
        variables: [{ id: "input_text" }, { id: "embedding_result" }],
        input: ["input_text"],
        output: ["embedding_result"],
        nodes: [
          {
            id: "create_embedding",
            type: "TEXT_EMBEDDING",
            name: "Create Text Embedding",
            config: {
              provider: "openai",
              model: "text-embedding-ada-002",
            },
            input: {
              text: "{{input_text}}",
            },
          },
          {
            id: "save_embedding",
            type: "UPDATE_VARIABLE",
            name: "Save Embedding",
            config: { type: "update", variable_id: "embedding_result" },
            value: "{{create_embedding.embedding}}",
          },
        ],
      };

      const result = await executor.executeFlow(flow, {
        input_text:
          process.env.TEST_SAMPLE_TEXT ||
          "This is a test document for embedding.",
      });

      expect(result.success).toBe(true);
      expect(result.outputs.embedding_result).toBeDefined();
      expect(Array.isArray(result.outputs.embedding_result)).toBe(false);

      const embedding = result.outputs.embedding_result;
      expect(embedding).toHaveProperty("id");
      expect(embedding).toHaveProperty("values");
      expect(Array.isArray(embedding.values)).toBe(true);
      expect(embedding.values.length).toBeGreaterThan(0);
    });

    test("should generate embeddings for multiple texts", async () => {
      const flow = {
        name: "multiple-embedding-test",
        version: "1.0.0",
        description: "Multiple text embedding test",
        author: "Test Suite",
        variables: [{ id: "text_list" }, { id: "embeddings_result" }],
        input: ["text_list"],
        output: ["embeddings_result"],
        nodes: [
          {
            id: "create_embeddings",
            type: "TEXT_EMBEDDING",
            name: "Create Multiple Embeddings",
            config: {
              provider: "openai",
              model: "text-embedding-ada-002",
            },
            input: {
              texts: "{{text_list}}",
            },
          },
          {
            id: "save_embeddings",
            type: "UPDATE_VARIABLE",
            name: "Save Embeddings",
            config: { type: "update", variable_id: "embeddings_result" },
            value: "{{create_embeddings.embeddings}}",
          },
        ],
      };

      const testTexts = [
        "Machine learning is a subset of artificial intelligence.",
        "Deep learning uses neural networks with multiple layers.",
        "Natural language processing helps computers understand human language.",
      ];

      const result = await executor.executeFlow(flow, {
        text_list: testTexts,
      });

      expect(result.success).toBe(true);
      expect(result.outputs.embeddings_result).toBeDefined();
      expect(Array.isArray(result.outputs.embeddings_result)).toBe(true);
      expect(result.outputs.embeddings_result.length).toBe(testTexts.length);
    });

    test("should handle embeddings with metadata", async () => {
      const flow = {
        name: "embedding-metadata-test",
        version: "1.0.0",
        description: "Embedding with metadata test",
        author: "Test Suite",
        variables: [{ id: "items_with_metadata" }, { id: "embedding_result" }],
        input: ["items_with_metadata"],
        output: ["embedding_result"],
        nodes: [
          {
            id: "create_embeddings_with_metadata",
            type: "TEXT_EMBEDDING",
            name: "Create Embeddings with Metadata",
            config: {
              provider: "openai",
              model: "text-embedding-ada-002",
            },
            input: {
              items: "{{items_with_metadata}}",
            },
          },
          {
            id: "save_embeddings",
            type: "UPDATE_VARIABLE",
            name: "Save Embeddings",
            config: { type: "update", variable_id: "embedding_result" },
            value: "{{create_embeddings_with_metadata.embeddings}}",
          },
        ],
      };

      const itemsWithMetadata = [
        {
          id: "doc_1",
          text: "Artificial intelligence is transforming technology.",
          metadata: { category: "AI", source: "test", page: 1 },
        },
        {
          id: "doc_2",
          text: "Machine learning algorithms learn from data.",
          metadata: { category: "ML", source: "test", page: 2 },
        },
      ];

      const result = await executor.executeFlow(flow, {
        items_with_metadata: itemsWithMetadata,
      });

      expect(result.success).toBe(true);
      expect(result.outputs.embedding_result).toBeDefined();
      expect(Array.isArray(result.outputs.embedding_result)).toBe(true);

      result.outputs.embedding_result.forEach((embedding: any) => {
        expect(embedding).toHaveProperty("id");
        expect(embedding).toHaveProperty("values");
        expect(embedding).toHaveProperty("metadata");
        expect(embedding.metadata).toHaveProperty("category");
      });
    });
  });

  describe("Vector Database Operations", () => {
    const testNamespace = process.env.TEST_NAMESPACE || "test-namespace";

    test("should insert vectors into database", async () => {
      const flow = {
        name: "vector-insert-test",
        version: "1.0.0",
        description: "Vector insertion test",
        author: "Test Suite",
        variables: [{ id: "text_to_embed" }, { id: "insert_result" }],
        input: ["text_to_embed"],
        output: ["insert_result"],
        nodes: [
          {
            id: "create_embedding",
            type: "TEXT_EMBEDDING",
            name: "Create Embedding",
            config: {
              provider: "openai",
              model: "text-embedding-ada-002",
            },
            input: {
              items: [
                {
                  id: "test-vector-1",
                  text: "{{text_to_embed}}",
                  metadata: { test: true, timestamp: new Date().toISOString() },
                },
              ],
            },
          },
          {
            id: "insert_vector",
            type: "VECTOR_INSERT",
            name: "Insert Vector",
            config: {
              provider: "pinecone",
              index_name: process.env.TEST_INDEX_NAME || "openflow-test-index",
              namespace: testNamespace,
            },
            input: {
              source: "{{create_embedding.embeddings}}",
            },
          },
          {
            id: "save_result",
            type: "UPDATE_VARIABLE",
            name: "Save Insert Result",
            config: { type: "update", variable_id: "insert_result" },
            value: "{{insert_vector.result}}",
          },
        ],
      };

      const result = await executor.executeFlow(flow, {
        text_to_embed:
          "This is a test document for vector insertion and retrieval.",
      });

      console.log("res", result);

      expect(result.success).toBe(true);
    });

    test("should search vectors in database", async () => {
      // Wait a moment for the vector to be indexed
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Now search for similar vectors
      const searchFlow = {
        name: "vector-search-test",
        version: "1.0.0",
        description: "Vector search test",
        author: "Test Suite",
        variables: [{ id: "search_query" }, { id: "search_results" }],
        input: ["search_query"],
        output: ["search_results"],
        nodes: [
          {
            id: "embed_query",
            type: "TEXT_EMBEDDING",
            name: "Embed Search Query",
            config: { provider: "openai", model: "text-embedding-ada-002" },
            input: { text: "{{search_query}}" },
          },
          {
            id: "search_vectors",
            type: "VECTOR_SEARCH",
            name: "Search Vector Database",
            config: {
              provider: "pinecone",
              index_name: process.env.TEST_INDEX_NAME || "openflow-test-index",
              namespace: testNamespace,
              top_k: 5,
              similarity_threshold: 0.7,
            },
            input: { search_vector: "{{embed_query.embedding.values}}" },
          },
          {
            id: "save_search_results",
            type: "UPDATE_VARIABLE",
            name: "Save Search Results",
            config: { type: "update", variable_id: "search_results" },
            value: "{{search_vectors.results}}",
          },
        ],
      };

      const searchResult = await executor.executeFlow(searchFlow, {
        search_query: "test vector",
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.outputs.search_results).toBeDefined();
      expect(Array.isArray(searchResult.outputs.search_results)).toBe(true);
    });
  });

  describe("Complete Embed and Store Flow", () => {
    const testNamespace = process.env.TEST_NAMESPACE || "test-namespace";

    test("should execute complete embed and store workflow", async () => {
      const flow = {
        name: "complete-embed-store-test",
        version: "1.0.0",
        description: "Complete embed and store workflow test",
        author: "Test Suite",
        variables: [{ id: "documents" }, { id: "storage_result" }],
        input: ["documents"],
        output: ["storage_result"],
        nodes: [
          {
            id: "process_documents",
            type: "FOR_EACH",
            name: "Process Each Document",
            config: {
              delay_between: 500,
              each_key: "current_doc",
            },
            input: {
              items: "{{documents}}",
            },
            each_nodes: [
              {
                id: "embed_document",
                type: "TEXT_EMBEDDING",
                name: "Embed Document",
                config: {
                  provider: "openai",
                  model: "text-embedding-ada-002",
                },
                input: {
                  items: [
                    {
                      id: "{{current_doc.id}}",
                      text: "{{current_doc.content}}",
                      metadata: "{{current_doc.metadata}}",
                    },
                  ],
                },
              },
              {
                id: "store_embedding",
                type: "VECTOR_INSERT",
                name: "Store Embedding",
                config: {
                  provider: "pinecone",
                  index_name:
                    process.env.TEST_INDEX_NAME || "openflow-test-index",
                  namespace: testNamespace,
                },
                input: {
                  source: "{{embed_document.embeddings}}",
                },
              },
            ],
          },
          {
            id: "save_storage_result",
            type: "UPDATE_VARIABLE",
            name: "Save Storage Result",
            config: { type: "update", variable_id: "storage_result" },
            value: "All documents processed and stored successfully",
          },
        ],
      };

      const testDocuments = [
        {
          id: "doc-1",
          content:
            "React is a JavaScript library for building user interfaces.",
          metadata: { type: "documentation", framework: "react" },
        },
        {
          id: "doc-2",
          content: "Node.js is a JavaScript runtime built on Chrome V8 engine.",
          metadata: { type: "documentation", framework: "nodejs" },
        },
        {
          id: "doc-3",
          content: "TypeScript is a typed superset of JavaScript.",
          metadata: { type: "documentation", language: "typescript" },
        },
      ];

      const result = await executor.executeFlow(flow, {
        documents: testDocuments,
      });

      expect(result.success).toBe(true);
      expect(result.outputs.storage_result).toBeDefined();
      expect(result.outputs.storage_result).toContain("successfully");
    }, 30000);
  });

  describe("Vector Operations Error Handling", () => {
    test("should handle embedding provider errors", async () => {
      const flow = {
        name: "embedding-error-test",
        version: "1.0.0",
        description: "Embedding error handling test",
        author: "Test Suite",
        variables: [{ id: "result" }],
        input: [],
        output: ["result"],
        nodes: [
          {
            id: "invalid_embedding",
            type: "TEXT_EMBEDDING",
            name: "Invalid Embedding",
            config: {
              provider: "openai",
              model: "nonexistent-model", // Invalid model
            },
            input: {
              text: "Test text",
            },
          },
        ],
      };

      await expect(executor.executeFlow(flow)).rejects.toThrow();
    });

    test("should handle vector database connection errors", async () => {
      const configWithInvalidKey = {
        ...config,
        providers: {
          ...config.providers,
          vectorDB: {
            pinecone: {
              provider: "pinecone",
              apiKey: "invalid-key",
              index_name: "nonexistent-index",
            },
          },
        },
      };

      const executorWithInvalidConfig = new FlowExecutor(configWithInvalidKey);

      const flow = {
        name: "vector-db-error-test",
        version: "1.0.0",
        description: "Vector DB error test",
        author: "Test Suite",
        variables: [{ id: "result" }],
        input: [],
        output: ["result"],
        nodes: [
          {
            id: "invalid_insert",
            type: "VECTOR_INSERT",
            name: "Invalid Insert",
            config: {
              provider: "pinecone",
              index_name: "nonexistent-index",
              namespace: "test",
            },
            input: {
              embedding: {
                id: "test",
                values: new Array(1536).fill(0.1),
                metadata: {},
              },
            },
          },
        ],
      };

      await expect(
        executorWithInvalidConfig.executeFlow(flow),
      ).rejects.toThrow();
    });
  });
});
