import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig, NodeType } from "../core/types";
import * as readline from "readline";
import path from "path";

require("dotenv").config({ path: ".env.test" });

interface DocumentData {
  id: string;
  text: string;
  metadata: Record<string, any>;
}

interface RAGDocumentSystem {
  executor: FlowExecutor;
  knowledgeBase: DocumentData[];
}

class RAGDocumentBot {
  private system: RAGDocumentSystem;
  private rl: readline.Interface;

  constructor(system: RAGDocumentSystem) {
    this.system = system;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async trainDocuments(pdf_file: string) {
    console.log("Training AI with new documents...");

    const embedAndStoreFlow = {
      name: "embed-and-store",
      version: "1.0.0",
      description: "Embed documents and store in vector database",
      author: "OpenFlow SDK",
      variables: [
        {
          id: "pdf_file",
          type: "file",
        },
        {
          id: "document_id",
          type: "string",
        },
        {
          id: "summary_chunks",
          type: "array",
          default: [],
        },
      ],
      input: ["pdf_file"],
      output: ["summary_chunks"],
      nodes: [
        {
          id: "pdf_splitter",
          type: NodeType.DOCUMENT_SPLITTER,
          name: "Split PDF",
          document: "{{pdf_file}}",
          config: {
            image_quality: "high",
            dpi: 200,
            image_format: "png",
          },
        },
        {
          id: "process_and_embed",
          type: NodeType.FOR_EACH,
          name: "Process Each Page and Store",
          config: {
            delay_between: 200,
            each_key: "current",
          },
          input: {
            items: "{{pdf_splitter.pages}}",
          },
          each_nodes: [
            {
              id: "analyze_page",
              type: NodeType.LLM,
              name: "Analyze Page",
              config: { provider: "openai", model: "gpt-4o-2024-11-20" },
              messages: [
                {
                  type: "image",
                  role: "user",
                  text: "Analyze this PDF page and extract all textual content. Focus on identifying key information, headings, and important details. Provide a comprehensive text representation:",
                  image_data: "{{current.fileId}}",
                },
              ],
              output: {
                explanation: {
                  type: "string",
                  description: "Page analysis and text extraction",
                },
              },
            },
            {
              id: "embed_page",
              type: NodeType.TEXT_EMBEDDING,
              name: "Generate Page Embedding",
              config: { provider: "openai", model: "text-embedding-ada-002" },
              input: { text: "{{analyze_page.explanation}}" },
            },
            {
              id: "store_page_vector",
              type: NodeType.VECTOR_INSERT,
              name: "Store Page in Vector DB",
              config: {
                provider: "pinecone",
                index_name: "knowledge-base",
                namespace: "document-chat",
              },
              input: {
                embedding: {
                  id: "{{document_id}}_page_{{current.pageNumber}}",
                  values: "{{embed_page.embedding.values}}",
                  metadata: {
                    text: "{{analyze_page.explanation}}",
                    pageNumber: "{{current.pageNumber}}",
                    documentId: "{{document_id}}",
                    source: "pdf_page",
                    type: "document_chunk",
                    extractedAt: new Date().toISOString(),
                  },
                },
              },
            },
            {
              id: "add_to_result",
              type: NodeType.UPDATE_VARIABLE,
              name: "Add to Result",
              config: {
                type: "append",
                variable_id: "summary_chunks",
              },
              value: {
                text: "{{analyze_page.explanation}}",
                pageNumber: "{{current.pageNumber}}",
                id: "{{document_id}}",
                source: "pdf_page",
                type: "document_chunk",
                extractedAt: new Date().toISOString(),
              },
            },
          ],
        },
      ],
    };

    try {
      const result = await this.system.executor.executeFlow(embedAndStoreFlow, {
        document_id: `doc_${Date.now()}`,
        pdf_file: pdf_file,
      });
      console.log(`Successfully trained with document!`);
      console.log(result);
      this.system.knowledgeBase.push(...result.outputs.summary_chunks);
      return result;
    } catch (error) {
      console.error("Training failed:", error);
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
          type: NodeType.TEXT_EMBEDDING,
          name: "Embed Search Query",
          config: { provider: "openai", model: "text-embedding-ada-002" },
          input: { text: "{{search_query}}" },
        },
        {
          id: "search_vectors",
          type: NodeType.VECTOR_SEARCH,
          name: "Search Vector Database",
          config: {
            provider: "pinecone",
            index_name: "knowledge-base",
            namespace: "document-chat",
            top_k: topK,
            similarity_threshold: 0.6,
          },
          input: { search_vector: "{{embed_query.embedding.values}}" },
        },
        {
          id: "save_results",
          type: NodeType.UPDATE_VARIABLE,
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
    console.log("Searching knowledge base...");
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
          type: NodeType.LLM,
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
          type: NodeType.UPDATE_VARIABLE,
          name: "Save Response",
          config: { type: "update", variable_id: "response" },
          value: "{{generate_response.content}}",
        },
      ],
    };

    console.log(`Found ${relevantDocs.length} relevant documents`);

    const result = await this.system.executor.executeFlow(chatFlow, {
      question: userQuestion,
      context: context,
    });

    return result.outputs.response;
  }

  async startInteractiveChat() {
    console.log("\nRAG Chat Bot is ready!");
    console.log("Type 'quit' to exit, 'help' for commands\n");

    const askQuestion = () => {
      this.rl.question("You: ", async (input) => {
        const query = input.trim();

        if (query.toLowerCase() === "quit") {
          console.log("Goodbye!");
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
          console.log("\nThinking...");
          const response = await this.generateRAGResponse(query);
          console.log(`\nBot: ${response}\n`);
        } catch (error) {
          console.error("Error generating response:", error);
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
  const ragSystem: RAGDocumentSystem = {
    executor,
    knowledgeBase: [],
  };

  const chatBot = new RAGDocumentBot(ragSystem);

  console.log("Initializing RAG Chat System...");

  try {
    const pdfPath = path.join(__dirname, "samples/sample.pdf");

    await chatBot.trainDocuments(pdfPath);
    console.log("Knowledge base loaded successfully!");

    await chatBot.startInteractiveChat();
  } catch (error) {
    console.error("Failed to initialize RAG system:", error);
  }
}

runRAGChatSystem().catch(console.error);
