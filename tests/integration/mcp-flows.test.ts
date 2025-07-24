/**
 * MCP Integration Tests
 * Tests Model Context Protocol integration
 */

import { FlowExecutor } from "../../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../../core/types";

describe("MCP Integration Tests", () => {
  let executor: FlowExecutor;
  let config: FlowExecutorConfig;

  beforeAll(() => {
    if (!process.env.GROK_API_KEY) {
      console.warn("Skipping MCP integration tests - no API keys provided");
      return;
    }

    config = {
      concurrency: { global_limit: 2 },
      providers: {
        llm: {
          grok: {
            apiKey: process.env.GROK_API_KEY!,
          },
        },
      },
      logLevel: "warn",
      timeout: 120000, // 2 minutes for MCP operations
      tempDir: process.env.TEST_TEMP_DIR || "./test_temp",
    };
    executor = new FlowExecutor(config);
  });

  beforeEach(() => {
    if (!process.env.GROK_API_KEY) {
      pending("No API keys provided for MCP integration tests");
    }
  });

  describe("DeepWiki MCP Integration", () => {
    test("should execute research flow with DeepWiki MCP", async () => {
      if (!process.env.GROK_API_KEY) {
        pending("No Grok API key provided");
        return;
      }

      const flow = {
        name: "mcp-deepwiki-test",
        version: "1.0.0",
        description: "DeepWiki MCP integration test",
        author: "Test Suite",
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
              max_tokens: 2000,
              temperature: 0.1,
              mcp_servers: [
                {
                  name: "deepwiki",
                  url:
                    process.env.MCP_DEEPWIKI_URL ||
                    "https://mcp.deepwiki.com/mcp",
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
                text: "You are a research assistant. Use available tools to find information about the requested topic.",
              },
              {
                type: "text",
                role: "user",
                text: "Research the topic: {{research_topic}}. Provide a brief summary.",
              },
            ],
            output: {
              summary: {
                type: "string",
                description: "Research summary",
              },
              sources: {
                type: "array",
                items: { type: "string" },
                description: "Information sources",
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

      const result = await executor.executeFlow(flow, {
        research_topic: "JavaScript programming language",
      });

      expect(result.success).toBe(true);
      expect(result.outputs.research_result).toBeDefined();
      expect(typeof result.outputs.research_result).toBe("string");
      expect(result.outputs.research_result.length).toBeGreaterThan(0);
    }, 60000);
  });

  describe("Semgrep MCP Integration", () => {
    test("should execute code analysis flow with Semgrep MCP", async () => {
      if (!process.env.GROK_API_KEY) {
        pending("No Grok API key provided");
        return;
      }

      const flow = {
        name: "mcp-semgrep-test",
        version: "1.0.0",
        description: "Semgrep MCP integration test",
        author: "Test Suite",
        variables: [{ id: "code_to_analyze" }, { id: "analysis_result" }],
        input: ["code_to_analyze"],
        output: ["analysis_result"],
        nodes: [
          {
            id: "analyze_with_semgrep",
            type: "LLM",
            name: "Analyze Code with Semgrep MCP",
            config: {
              provider: "grok",
              model: "grok-3-latest",
              max_tokens: 2000,
              temperature: 0.1,
              mcp_servers: [
                {
                  name: "semgrep",
                  url:
                    process.env.MCP_SEMGREP_URL || "https://mcp.semgrep.ai/mcp",
                  description: "Code analysis and security scanning",
                  timeout: 30000,
                  retry_attempts: 3,
                  auth: { type: "none" },
                },
              ],
              tools: {
                auto_discover: true,
                mcp_servers: ["semgrep"],
              },
            },
            messages: [
              {
                type: "text",
                role: "system",
                text: "You are a code analysis assistant. Use Semgrep tools to analyze code for potential issues.",
              },
              {
                type: "text",
                role: "user",
                text: "Analyze this code for security issues: {{code_to_analyze}}",
              },
            ],
            output: {
              analysis: {
                type: "string",
                description: "Code analysis result",
              },
              issues: {
                type: "array",
                items: { type: "string" },
                description: "Found issues",
              },
            },
          },
          {
            id: "save_analysis",
            type: "UPDATE_VARIABLE",
            name: "Save Analysis Result",
            config: { type: "update", variable_id: "analysis_result" },
            value: "{{analyze_with_semgrep.analysis}}",
          },
        ],
      };

      const testCode = `
        function authenticate(user, password) {
          if (password === 'admin123') {
            return true;
          }
          return false;
        }
      `;

      const result = await executor.executeFlow(flow, {
        code_to_analyze: testCode,
      });

      expect(result.success).toBe(true);
      expect(result.outputs.analysis_result).toBeDefined();
      expect(typeof result.outputs.analysis_result).toBe("string");
    }, 60000);
  });

  describe("CoinGecko MCP Integration", () => {
    test("should execute cryptocurrency data flow with CoinGecko MCP", async () => {
      if (!process.env.GROK_API_KEY) {
        pending("No Grok API key provided");
        return;
      }

      const flow = {
        name: "mcp-coingecko-test",
        version: "1.0.0",
        description: "CoinGecko MCP integration test",
        author: "Test Suite",
        variables: [{ id: "crypto_symbol" }, { id: "price_analysis" }],
        input: ["crypto_symbol"],
        output: ["price_analysis"],
        nodes: [
          {
            id: "get_crypto_data",
            type: "LLM",
            name: "Get Crypto Data with CoinGecko MCP",
            config: {
              provider: "grok",
              model: "grok-3-latest",
              max_tokens: 1500,
              temperature: 0.1,
              mcp_servers: [
                {
                  name: "coingecko",
                  url:
                    process.env.MCP_COINGECKO_URL ||
                    "https://mcp.api.coingecko.com/mcp",
                  description: "Cryptocurrency market data and analysis",
                  timeout: 30000,
                  retry_attempts: 3,
                  auth: { type: "none" },
                },
              ],
              tools: {
                auto_discover: true,
                mcp_servers: ["coingecko"],
              },
            },
            messages: [
              {
                type: "text",
                role: "system",
                text: "You are a cryptocurrency analyst. Use CoinGecko tools to fetch current market data.",
              },
              {
                type: "text",
                role: "user",
                text: "Get current price data for {{crypto_symbol}} and provide a brief analysis.",
              },
            ],
            output: {
              price_data: {
                type: "object",
                description: "Current price information",
              },
              analysis: {
                type: "string",
                description: "Price analysis",
              },
            },
          },
          {
            id: "save_analysis",
            type: "UPDATE_VARIABLE",
            name: "Save Price Analysis",
            config: { type: "update", variable_id: "price_analysis" },
            value: "{{get_crypto_data.analysis}}",
          },
        ],
      };

      const result = await executor.executeFlow(flow, {
        crypto_symbol: "bitcoin",
      });

      expect(result.success).toBe(true);
      expect(result.outputs.price_analysis).toBeDefined();
      expect(typeof result.outputs.price_analysis).toBe("string");
    }, 60000);
  });

  describe("MCP Error Handling", () => {
    test("should handle MCP server timeout gracefully", async () => {
      if (!process.env.GROK_API_KEY) {
        pending("No Grok API key provided");
        return;
      }

      const flow = {
        name: "mcp-timeout-test",
        version: "1.0.0",
        description: "MCP timeout test",
        author: "Test Suite",
        variables: [{ id: "result" }],
        input: [],
        output: ["result"],
        nodes: [
          {
            id: "timeout_test",
            type: "LLM",
            name: "MCP Timeout Test",
            config: {
              provider: "grok",
              model: "grok-3-latest",
              max_tokens: 500,
              mcp_servers: [
                {
                  name: "test_server",
                  url: "https://nonexistent.mcp.server.com/mcp",
                  description: "Non-existent test server",
                  timeout: 1000, // Very short timeout
                  retry_attempts: 1,
                  auth: { type: "none" },
                },
              ],
              tools: {
                auto_discover: true,
                mcp_servers: ["test_server"],
              },
            },
            messages: [
              {
                type: "text",
                role: "user",
                text: "Try to use tools from the test server.",
              },
            ],
            output: {
              response: {
                type: "string",
                description: "Response",
              },
            },
          },
        ],
      };

      // Should handle MCP timeout gracefully (not crash the entire flow)
      const result = await executor.executeFlow(flow);

      // The flow might succeed with a fallback response or fail gracefully
      expect(result).toBeDefined();
    }, 30000);

    test("should handle MCP authentication errors", async () => {
      if (!process.env.GROK_API_KEY) {
        pending("No Grok API key provided");
        return;
      }

      const flow = {
        name: "mcp-auth-test",
        version: "1.0.0",
        description: "MCP authentication test",
        author: "Test Suite",
        variables: [{ id: "result" }],
        input: [],
        output: ["result"],
        nodes: [
          {
            id: "auth_test",
            type: "LLM",
            name: "MCP Auth Test",
            config: {
              provider: "grok",
              model: "grok-3-latest",
              max_tokens: 500,
              mcp_servers: [
                {
                  name: "auth_test",
                  url: "https://httpbin.org/status/401", // Returns 401 Unauthorized
                  description: "Auth test server",
                  timeout: 5000,
                  retry_attempts: 1,
                  auth: {
                    type: "api_key",
                    api_key: "invalid_key",
                  },
                },
              ],
              tools: {
                auto_discover: true,
                mcp_servers: ["auth_test"],
              },
            },
            messages: [
              {
                type: "text",
                role: "user",
                text: "Try to authenticate with the test server.",
              },
            ],
            output: {
              response: {
                type: "string",
                description: "Response",
              },
            },
          },
        ],
      };

      // Should handle auth errors gracefully
      const result = await executor.executeFlow(flow);
      expect(result).toBeDefined();
    }, 20000);
  });

  describe("Multiple MCP Servers", () => {
    test("should handle multiple MCP servers in one flow", async () => {
      if (!process.env.GROK_API_KEY) {
        pending("No Grok API key provided");
        return;
      }

      const flow = {
        name: "multi-mcp-test",
        version: "1.0.0",
        description: "Multiple MCP servers test",
        author: "Test Suite",
        variables: [{ id: "research_query" }, { id: "combined_result" }],
        input: ["research_query"],
        output: ["combined_result"],
        nodes: [
          {
            id: "multi_mcp_research",
            type: "LLM",
            name: "Research with Multiple MCP Servers",
            config: {
              provider: "grok",
              model: "grok-3-latest",
              max_tokens: 2000,
              temperature: 0.2,
              mcp_servers: [
                {
                  name: "deepwiki",
                  url:
                    process.env.MCP_DEEPWIKI_URL ||
                    "https://mcp.deepwiki.com/mcp",
                  description: "Knowledge search",
                  timeout: 30000,
                  auth: { type: "none" },
                },
                {
                  name: "coingecko",
                  url:
                    process.env.MCP_COINGECKO_URL ||
                    "https://mcp.api.coingecko.com/mcp",
                  description: "Crypto data",
                  timeout: 30000,
                  auth: { type: "none" },
                },
              ],
              tools: {
                auto_discover: true,
                mcp_servers: ["deepwiki", "coingecko"],
              },
            },
            messages: [
              {
                type: "text",
                role: "system",
                text: "You have access to multiple data sources. Use the most appropriate tools for the query.",
              },
              {
                type: "text",
                role: "user",
                text: "Research: {{research_query}}",
              },
            ],
            output: {
              research_result: {
                type: "string",
                description: "Combined research result",
              },
            },
          },
          {
            id: "save_combined",
            type: "UPDATE_VARIABLE",
            name: "Save Combined Result",
            config: { type: "update", variable_id: "combined_result" },
            value: "{{multi_mcp_research.research_result}}",
          },
        ],
      };

      const result = await executor.executeFlow(flow, {
        research_query: "blockchain technology overview",
      });

      expect(result.success).toBe(true);
      expect(result.outputs.combined_result).toBeDefined();
      expect(typeof result.outputs.combined_result).toBe("string");
    }, 90000);
  });
});
