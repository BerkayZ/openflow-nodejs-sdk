import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../core/types";

require("dotenv").config({ path: ".env.test" });

async function runMCPLLMFlow() {
  const config: FlowExecutorConfig = {
    concurrency: { global_limit: 3 },
    providers: {
      llm: {
        grok: {
          apiKey: process.env.GROK_API_KEY!,
        },
      },
    },
    logLevel: "info",
  };

  const executor = new FlowExecutor(config);

  const flow = {
    name: "mcp-research-flow",
    version: "1.0.0",
    description: "Research flow with MCP DeepWiki integration",
    author: "OpenFlow SDK",
    variables: [{ id: "research_topic" }, { id: "research_result" }],
    input: ["research_topic"],
    output: ["research_result"],
    nodes: [
      {
        id: "research_with_mcp",
        type: "LLM",
        name: "Research with DeepWiki MCP",
        config: {
          provider: "grok",
          model: "grok-3-latest",
          max_tokens: 4000,
          temperature: 0.1,
          // MCP configuration
          mcp_servers: [
            {
              name: "deepwiki",
              url: "https://mcp.deepwiki.com/mcp",
              description: "DeepWiki knowledge search and retrieval",
              timeout: 30000,
              retry_attempts: 3,
              auth: { type: "none" },
            },
          ],
          tools: {
            auto_discover: true,
            mcp_servers: ["deepwiki"],
            builtin_tools: ["set_variable", "get_variable"],
          },
        },
        messages: [
          {
            type: "text",
            role: "system",
            text: "You are a research assistant with access to DeepWiki knowledge search tools. Use the available tools to find comprehensive information about the requested topic. Always search for information first before providing your answer.",
          },
          {
            type: "text",
            role: "user",
            text: "Research the topic: {{research_topic}}. Please search for detailed information and provide a comprehensive summary with key points and sources.",
          },
        ],
        output: {
          summary: {
            type: "string",
            description: "Comprehensive summary of the research findings",
          },
          key_points: {
            type: "array",
            items: { type: "string" },
            description: "Key points and insights from the research",
          },
          sources: {
            type: "array",
            items: { type: "string" },
            description: "Sources and references used in the research",
          },
          confidence: {
            type: "string",
            description: "Confidence level of the research findings",
          },
        },
      },
      {
        id: "save_research",
        type: "UPDATE_VARIABLE",
        name: "Save Research Result",
        config: { type: "update", variable_id: "research_result" },
        value: "{{research_with_mcp.summary}}",
      },
    ],
  };

  try {
    console.log("🔍 Starting MCP-powered research...");

    const result = await executor.executeFlow(flow, {
      research_topic: "sqlite programming language",
    });

    console.log("\n📊 Research Results:");
    console.log("Summary:", result.outputs.research_result);
    console.log("\n✅ MCP Example completed successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

runMCPLLMFlow().catch(console.error);
