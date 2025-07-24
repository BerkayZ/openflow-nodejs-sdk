import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../core/types";

require("dotenv").config({ path: ".env.test" });

async function runVectorSearch() {
  const config: FlowExecutorConfig = {
    concurrency: { global_limit: 3 },
    providers: {
      embeddings: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY!,
        },
      },
      vectorDB: {
        pinecone: {
          apiKey: process.env.PINECONE_API_KEY!,
          provider: "pinecone",
          index_name: "knowledge-base",
        },
      },
    },
    logLevel: "info",
  };

  const executor = new FlowExecutor(config);

  const flow = {
    name: "vector-search",
    version: "1.0.0",
    description: "Search documents in vector database",
    author: "OpenFlow SDK",
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
          index_name: "knowledge-base",
          namespace: "test-namespace",
          top_k: 5,
          similarity_threshold: 0.7,
        },
        input: { search_vector: "{{embed_query.embedding.values}}" },
      },
      {
        id: "save_results",
        type: "UPDATE_VARIABLE",
        name: "Save Search Results",
        config: { type: "update", variable_id: "search_results" },
        value: "{{search_vectors.results}}",
      },
    ],
  };

  // Different search queries to test
  const searchQueries = [
    "beginner programming languages",
    "web development frameworks",
    "artificial intelligence and machine learning",
    "data analysis and visualization",
  ];

  try {
    console.log("🔍 Testing vector search with different queries...\n");

    for (const query of searchQueries) {
      console.log(`📝 Query: "${query}"`);

      const result = await executor.executeFlow(flow, { search_query: query });

      console.log(`🎯 Found ${result.outputs.search_results.length} results:`);

      result.outputs.search_results.forEach((item: any, index: number) => {
        console.log(
          `  ${index + 1}. ${item.id} (Score: ${item.score.toFixed(3)})`,
        );
        console.log(`     Category: ${item.metadata.category}`);
        if (item.metadata.language)
          console.log(`     Language: ${item.metadata.language}`);
        if (item.metadata.framework)
          console.log(`     Framework: ${item.metadata.framework}`);
        if (item.metadata.topic)
          console.log(`     Topic: ${item.metadata.topic}`);
      });

      console.log(`⏱️ Search time: ${result.executionTime}ms\n`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

runVectorSearch().catch(console.error);
