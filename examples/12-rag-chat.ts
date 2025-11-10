import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../core/types";
import * as readline from "readline";

require("dotenv").config({ path: ".env.test" });

interface DocumentData {
  id: string;
  text: string;
  metadata: Record<string, any>;
}

interface RAGChatSystem {
  executor: FlowExecutor;
  knowledgeBase: DocumentData[];
}

class RAGChatBot {
  private system: RAGChatSystem;
  private rl: readline.Interface;

  constructor(system: RAGChatSystem) {
    this.system = system;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async uploadAndTrainDocuments(documents: DocumentData[]) {
    console.log("📚 Training AI with new documents...");

    const embedAndStoreFlow = {
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
            namespace: "rag-chat",
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

    try {
      const result = await this.system.executor.executeFlow(embedAndStoreFlow, {
        documents,
      });
      console.log(`✅ Successfully trained on ${documents.length} documents!`);
      this.system.knowledgeBase.push(...documents);
      return result;
    } catch (error) {
      console.error("❌ Training failed:", error);
      throw error;
    }
  }

  async searchKnowledge(query: string, topK: number = 3) {
    const searchFlow = {
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
            namespace: "rag-chat",
            top_k: topK,
            similarity_threshold: 0.6,
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

    const result = await this.system.executor.executeFlow(searchFlow, {
      search_query: query,
    });
    return result.outputs.search_results;
  }

  async generateRAGResponse(userQuestion: string) {
    console.log("🔍 Searching knowledge base...");
    const relevantDocs = await this.searchKnowledge(userQuestion);

    if (relevantDocs.length === 0) {
      return "I couldn't find relevant information in my knowledge base to answer your question. Please try rephrasing or ask about topics I've been trained on.";
    }

    const context = relevantDocs
      .map((doc: any) => {
        // Find the full document from our knowledge base
        const fullDoc = this.system.knowledgeBase.find(
          (kb) => kb.id === doc.id,
        );
        const text =
          fullDoc?.text || doc.metadata?.text || doc.text || doc.content;
        return `${text} (Source: ${doc.id})`;
      })
      .join("\n\n");

    const chatFlow = {
      name: "rag-chat",
      version: "1.0.0",
      description: "RAG-powered chat response generation",
      author: "OpenFlow SDK",
      variables: [{ id: "question" }, { id: "context" }, { id: "response" }],
      input: ["question", "context"],
      output: ["response"],
      nodes: [
        {
          id: "generate_response",
          type: "LLM",
          name: "Generate RAG Response",
          config: {
            provider: "openai",
            model: "gpt-4",
            temperature: 0.7,
            max_tokens: 500,
          },
          messages: [
            {
              type: "text",
              role: "system",
              text: `You are a helpful AI assistant. Answer the user's question based only on the provided context. If the context doesn't contain enough information to answer the question, say so. Be concise and accurate.

Context:
{{context}}`,
            },
            {
              type: "text",
              role: "user",
              text: "{{question}}",
            },
          ],
          output: {
            content: {
              type: "string",
              description: "Generated response",
            },
          },
        },
        {
          id: "save_response",
          type: "UPDATE_VARIABLE",
          name: "Save Response",
          config: { type: "update", variable_id: "response" },
          value: "{{generate_response.content}}",
        },
      ],
    };

    console.log(`📖 Found ${relevantDocs.length} relevant documents`);

    const result = await this.system.executor.executeFlow(chatFlow, {
      question: userQuestion,
      context: context,
    });

    return result.outputs.response;
  }

  async startInteractiveChat() {
    console.log("\n🤖 RAG Chat Bot is ready!");
    console.log("Type 'quit' to exit, 'help' for commands\n");

    const askQuestion = () => {
      this.rl.question("You: ", async (input) => {
        const query = input.trim();

        if (query.toLowerCase() === "quit") {
          console.log("👋 Goodbye!");
          this.rl.close();
          return;
        }

        if (query.toLowerCase() === "help") {
          console.log(`
Available commands:
- Type any question to get an AI response based on trained knowledge
- 'quit' - Exit the chat
- 'help' - Show this help message

Knowledge base contains ${this.system.knowledgeBase.length} documents.
          `);
          askQuestion();
          return;
        }

        if (query === "") {
          askQuestion();
          return;
        }

        try {
          console.log("\n🤔 Thinking...");
          const response = await this.generateRAGResponse(query);
          console.log(`\nBot: ${response}\n`);
        } catch (error) {
          console.error("❌ Error generating response:", error);
        }

        askQuestion();
      });
    };

    askQuestion();
  }
}

async function runRAGChatSystem() {
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
      llm: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY!,
        },
      },
    },
    logLevel: "error",
  };

  const executor = new FlowExecutor(config);
  const ragSystem: RAGChatSystem = {
    executor,
    knowledgeBase: [],
  };

  const chatBot = new RAGChatBot(ragSystem);

  console.log("🚀 Initializing RAG Chat System...");

  const knowledgeDocuments: DocumentData[] = [
    {
      id: "doc_python_basics",
      text: "Python is a high-level, interpreted programming language known for its clear syntax and readability. It was created by Guido van Rossum and first released in 1991. Python supports multiple programming paradigms including procedural, object-oriented, and functional programming. It's widely used in web development, data science, artificial intelligence, automation, and scientific computing.",
      metadata: {
        category: "Programming Languages",
        difficulty: "beginner",
        language: "Python",
        topics: ["syntax", "history", "paradigms", "applications"],
      },
    },
    {
      id: "doc_javascript_fundamentals",
      text: "JavaScript is a dynamic, weakly typed programming language that is primarily used for web development. Originally created by Brendan Eich in 1995, it enables interactive web pages and is an essential part of web applications. Modern JavaScript (ES6+) includes features like arrow functions, promises, async/await, classes, and modules. It can run on both client-side (browsers) and server-side (Node.js).",
      metadata: {
        category: "Programming Languages",
        difficulty: "intermediate",
        language: "JavaScript",
        topics: ["web development", "ES6", "client-server", "Node.js"],
      },
    },
    {
      id: "doc_machine_learning_intro",
      text: "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience without being explicitly programmed for every task. It involves training algorithms on large datasets to identify patterns and make predictions. Common types include supervised learning (using labeled data), unsupervised learning (finding patterns in unlabeled data), and reinforcement learning (learning through rewards and penalties).",
      metadata: {
        category: "Artificial Intelligence",
        difficulty: "advanced",
        topics: [
          "supervised learning",
          "unsupervised learning",
          "reinforcement learning",
          "algorithms",
          "datasets",
        ],
      },
    },
    {
      id: "doc_data_science_process",
      text: "Data science is an interdisciplinary field that combines statistical analysis, machine learning, and programming to extract insights from data. The typical data science process includes: 1) Problem definition, 2) Data collection and acquisition, 3) Data cleaning and preprocessing, 4) Exploratory data analysis, 5) Model building and training, 6) Model evaluation and validation, 7) Deployment and monitoring. Tools commonly used include Python, R, SQL, Pandas, NumPy, and various visualization libraries.",
      metadata: {
        category: "Data Science",
        difficulty: "intermediate",
        topics: [
          "process",
          "statistics",
          "tools",
          "Python",
          "R",
          "SQL",
          "analysis",
        ],
      },
    },
    {
      id: "doc_react_components",
      text: "React is a JavaScript library developed by Facebook for building user interfaces, particularly web applications. It uses a component-based architecture where UIs are built using reusable components. Key concepts include JSX (JavaScript XML syntax), virtual DOM for efficient rendering, state management for component data, props for passing data between components, and hooks for managing state and side effects in functional components. Popular hooks include useState, useEffect, useContext, and useReducer.",
      metadata: {
        category: "Frontend Frameworks",
        difficulty: "intermediate",
        framework: "React",
        topics: ["components", "JSX", "virtual DOM", "state", "props", "hooks"],
      },
    },
    {
      id: "doc_web_development_stack",
      text: "Modern web development typically involves a full-stack approach combining frontend and backend technologies. The frontend (client-side) handles user interface and experience using HTML, CSS, JavaScript, and frameworks like React, Vue, or Angular. The backend (server-side) manages data, business logic, and APIs using languages like Node.js, Python, Java, or PHP with frameworks like Express, Django, Spring, or Laravel. Databases store and manage data, with options including relational (PostgreSQL, MySQL) and NoSQL (MongoDB, Redis) databases.",
      metadata: {
        category: "Web Development",
        difficulty: "intermediate",
        topics: [
          "full-stack",
          "frontend",
          "backend",
          "databases",
          "frameworks",
          "APIs",
        ],
      },
    },
    {
      id: "doc_ai_applications",
      text: "Artificial intelligence has numerous real-world applications across various industries. In healthcare, AI assists with medical imaging, drug discovery, and personalized treatment plans. In finance, it's used for fraud detection, algorithmic trading, and credit scoring. Transportation benefits from AI through autonomous vehicles and route optimization. Other applications include natural language processing for chatbots and translation, computer vision for image recognition and surveillance, recommendation systems for content and e-commerce, and robotics for manufacturing and automation.",
      metadata: {
        category: "Artificial Intelligence",
        difficulty: "advanced",
        topics: [
          "healthcare",
          "finance",
          "transportation",
          "NLP",
          "computer vision",
          "robotics",
          "applications",
        ],
      },
    },
    {
      id: "berkay_zelyurt",
      text: "Berkay Zelyurt is a 23 years old computer engineer, who is trying to create visionary software solutions. He is the founder of OpenFlow SDK, an open-source low-code framework for building AI-powered applications. Berkay is passionate about technology and innovation, and he is always looking for new ways to push the boundaries of what is possible with software.",
      metadata: {
        category: "Biography",
        topics: [
          "OpenFlow SDK",
          "founder",
          "computer engineer",
          "software solutions",
          "berkay zelyurt",
        ],
      },
    },
  ];

  try {
    await chatBot.uploadAndTrainDocuments(knowledgeDocuments);
    console.log("🎯 Knowledge base loaded successfully!");

    await chatBot.startInteractiveChat();
  } catch (error) {
    console.error("❌ Failed to initialize RAG system:", error);
  }
}

runRAGChatSystem().catch(console.error);
