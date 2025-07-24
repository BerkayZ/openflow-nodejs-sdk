import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../core/types";

require("dotenv").config({ path: ".env.test" });

async function runMCPSemgrepFlow() {
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
    name: "mcp-semgrep-flow",
    version: "1.0.0",
    description:
      "Code generation and security scanning flow with MCP Semgrep integration",
    author: "OpenFlow SDK",
    variables: [
      { id: "code_request" },
      { id: "generated_code" },
      { id: "security_scan_results" },
    ],
    input: ["code_request"],
    output: ["generated_code", "security_scan_results"],
    nodes: [
      {
        id: "generate_code",
        type: "LLM",
        name: "Generate Code",
        config: {
          provider: "grok",
          model: "grok-3-latest",
          max_tokens: 2000,
          temperature: 0.1,
        },
        messages: [
          {
            type: "text",
            role: "system",
            text: "You are a code generation assistant. Generate clean, functional code based on the user's request. Focus on creating realistic code that might have common security vulnerabilities for demonstration purposes.",
          },
          {
            type: "text",
            role: "user",
            text: "Generate code for: {{code_request}}. Please provide complete, functional code that demonstrates the requested functionality.",
          },
        ],
        output: {
          code: {
            type: "string",
            description: "Generated code",
          },
          language: {
            type: "string",
            description: "Programming language used",
          },
          description: {
            type: "string",
            description: "Brief description of what the code does",
          },
        },
      },
      {
        id: "save_generated_code",
        type: "UPDATE_VARIABLE",
        name: "Save Generated Code",
        config: { type: "update", variable_id: "generated_code" },
        value: "{{generate_code.code}}",
      },
      {
        id: "scan_code_security",
        type: "LLM",
        name: "Scan Code with Semgrep",
        config: {
          provider: "grok",
          model: "grok-3-latest",
          max_tokens: 3000,
          temperature: 0.1,
          // MCP configuration
          mcp_servers: [
            {
              name: "semgrep",
              url: "https://mcp.semgrep.ai/mcp",
              description: "Semgrep security scanning capabilities",
              timeout: 45000,
              retry_attempts: 3,
              auth: { type: "none" },
            },
          ],
          tools: {
            auto_discover: true,
            mcp_servers: ["semgrep"],
            builtin_tools: ["set_variable", "get_variable"],
          },
        },
        messages: [
          {
            type: "text",
            role: "system",
            text: "You are a security analysis assistant with access to Semgrep scanning tools. Use the semgrep_scan tool to analyze code for security vulnerabilities and provide detailed security analysis reports.",
          },
          {
            type: "text",
            role: "user",
            text: "Please analyze the following code for security vulnerabilities using Semgrep:\n\nLanguage: {{generate_code.language}}\nCode:\n```\n{{generate_code.code}}\n```\n\nUse the semgrep_scan tool to perform a comprehensive security analysis and provide detailed findings.",
          },
        ],
        output: {
          scan_results: {
            type: "string",
            description: "Detailed security scan results",
          },
          vulnerabilities_found: {
            type: "array",
            items: { type: "string" },
            description: "List of security vulnerabilities found",
          },
          security_score: {
            type: "string",
            description: "Overall security assessment score",
          },
          recommendations: {
            type: "array",
            items: { type: "string" },
            description: "Security improvement recommendations",
          },
        },
      },
      {
        id: "save_scan_results",
        type: "UPDATE_VARIABLE",
        name: "Save Scan Results",
        config: { type: "update", variable_id: "security_scan_results" },
        value: "{{scan_code_security.scan_results}}",
      },
    ],
  };

  try {
    console.log(
      "🔒 Starting MCP-powered code generation and security scanning...",
    );

    const result = await executor.executeFlow(flow, {
      code_request:
        "a Python web application with user authentication and file upload functionality",
    });

    console.log("\n📝 Generated Code:");
    console.log(result.outputs.generated_code);
    console.log("\n🔍 Security Scan Results:");
    console.log(result.outputs.security_scan_results);
    console.log("\n✅ MCP Semgrep Example completed successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

runMCPSemgrepFlow().catch(console.error);
