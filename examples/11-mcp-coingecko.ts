import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../core/types";

require("dotenv").config({ path: ".env.test" });

async function runMCPCoinGeckoFlow() {
  const config: FlowExecutorConfig = {
    concurrency: { global_limit: 3 },
    providers: {
      llm: {
        openai: {
          apiKey: process.env.OPENAI_API_KEY!,
        },
      },
    },
    logLevel: "info",
  };

  const executor = new FlowExecutor(config);

  const flow = {
    name: "mcp-coingecko-flow",
    version: "1.0.0",
    description:
      "Cryptocurrency price analysis flow with MCP CoinGecko integration",
    author: "OpenFlow SDK",
    variables: [{ id: "crypto_query" }, { id: "price_analysis" }],
    input: ["crypto_query"],
    output: ["price_analysis"],
    nodes: [
      {
        id: "crypto_price_analysis",
        type: "LLM",
        name: "Cryptocurrency Price Analysis",
        config: {
          provider: "openai",
          model: "gpt-4.1-2025-04-14",
          max_tokens: 3000,
          temperature: 0.1,
          // MCP configuration
          mcp_servers: [
            {
              name: "coingecko",
              url: "https://mcp.api.coingecko.com/mcp",
              description:
                "CoinGecko cryptocurrency data and price information",
              timeout: 30000,
              retry_attempts: 3,
              auth: { type: "none" },
            },
          ],
          tools: {
            auto_discover: true,
            mcp_servers: ["coingecko"],
            builtin_tools: ["set_variable", "get_variable"],
          },
        },
        messages: [
          {
            type: "text",
            role: "system",
            text: "You are a cryptocurrency analysis assistant with access to CoinGecko price data and market information. You MUST use multiple CoinGecko tools to gather comprehensive data before providing analysis. Use get_simple_price to get current prices, then get_id_coins for detailed market data, then get_coins_markets for additional market information. Make multiple tool calls to gather all necessary data.",
          },
          {
            type: "text",
            role: "user",
            text: "Analyze Bitcoin (BTC) comprehensively. You must make multiple tool calls to get all the data needed: 1) First call get_simple_price with ids=bitcoin, vs_currencies=usd, include_24hr_change=true, include_24hr_vol=true, include_market_cap=true to get basic price data. 2) Then call get_id_coins with id=bitcoin to get detailed market data and metadata. 3) Finally call get_coins_markets with ids=bitcoin, vs_currency=usd, include_24hr_change=true to get comprehensive market data. After fetching all this real-time data, provide a detailed analysis.",
          },
        ],
        output: {
          current_price: {
            type: "string",
            description: "Current price of the cryptocurrency",
          },
          market_data: {
            type: "object",
            description: "Market data including market cap, volume, etc.",
          },
          price_analysis: {
            type: "string",
            description: "Comprehensive price and market analysis",
          },
          trends: {
            type: "array",
            items: { type: "string" },
            description: "Key trends and insights",
          },
          recommendation: {
            type: "string",
            description: "Analysis summary and market outlook",
          },
        },
      },
      {
        id: "save_analysis",
        type: "UPDATE_VARIABLE",
        name: "Save Price Analysis",
        config: { type: "update", variable_id: "price_analysis" },
        value: "{{crypto_price_analysis.price_analysis}}",
      },
    ],
  };

  try {
    console.log("💰 Starting MCP-powered cryptocurrency analysis...");

    const result = await executor.executeFlow(flow, {
      crypto_query: "Bitcoin (BTC) price and market analysis",
    });

    console.log("\n📊 Cryptocurrency Analysis Results:");
    console.log("Analysis:", result.outputs.price_analysis);
    console.log("\n✅ MCP CoinGecko Example completed successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

runMCPCoinGeckoFlow().catch(console.error);
