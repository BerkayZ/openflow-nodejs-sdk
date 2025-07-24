import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../core/types";

require("dotenv").config({ path: ".env.test" });

async function runEmbedAndStore() {
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
    name: "embed-and-store",
    version: "1.0.0",
    description: "Embed documents and store in vector database",
    author: "OpenFlow SDK",
    variables: [{ id: "documents" }, { id: "storage_result" }],
    input: ["documents"],
    output: ["storage_result"],
    nodes: [
      {
        id: "embed_documents",
        type: "TEXT_EMBEDDING",
        name: "Generate Embeddings",
        config: { provider: "openai", model: "text-embedding-ada-002" },
        input: { items: "{{documents}}" },
      },
      {
        id: "store_embeddings",
        type: "VECTOR_INSERT",
        name: "Store in Vector DB",
        config: {
          provider: "pinecone",
          index_name: "knowledge-base",
          namespace: "test-namespace",
        },
        input: { source: "{{embed_documents.embeddings}}" },
      },
      {
        id: "save_result",
        type: "UPDATE_VARIABLE",
        name: "Save Storage Result",
        config: { type: "update", variable_id: "storage_result" },
        value: "{{store_embeddings.result}}",
      },
    ],
  };

  const documents = [
    {
      id: "doc_python",
      text: "Python is a high-level programming language known for its simplicity and readability. It's widely used in web development, data science, artificial intelligence, and automation.",
      metadata: {
        category: "Programming",
        difficulty: "beginner",
        language: "Python",
      },
    },
    {
      id: "doc_javascript",
      text: "JavaScript is the programming language of the web. It enables interactive websites, dynamic user interfaces, and runs on both client and server sides through Node.js.",
      metadata: {
        category: "Programming",
        difficulty: "intermediate",
        language: "JavaScript",
      },
    },
    {
      id: "doc_machine_learning",
      text: "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed. It requires large datasets and computational power.",
      metadata: {
        category: "AI",
        difficulty: "advanced",
        topic: "Machine Learning",
      },
    },
    {
      id: "doc_data_science",
      text: "Data science combines statistics, programming, and domain knowledge to extract insights from data. It involves data collection, cleaning, analysis, and visualization to make data-driven decisions.",
      metadata: {
        category: "Data",
        difficulty: "intermediate",
        topic: "Data Science",
      },
    },
    {
      id: "doc_react",
      text: "React is a popular JavaScript library for building user interfaces, especially web applications. It uses a component-based architecture and virtual DOM for efficient rendering.",
      metadata: {
        category: "Programming",
        difficulty: "intermediate",
        framework: "React",
      },
    },
  ];

  try {
    console.log("📚 Embedding and storing documents...");
    console.log(`📄 Processing ${documents.length} documents`);

    const result = await executor.executeFlow(flow, { documents });

    console.log("✅ Documents successfully embedded and stored!");
    console.log("📊 Storage result:", result.outputs.storage_result);
    console.log("⏱️ Total time:", result.executionTime + "ms");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

runEmbedAndStore().catch(console.error);
