import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../core/types";

require("dotenv").config({ path: ".env.test" });

async function runBasicLLM() {
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
    name: "basic-llm",
    version: "1.0.0",
    description: "Basic LLM interaction",
    author: "OpenFlow SDK",
    variables: [{ id: "user_prompt" }, { id: "llm_response" }],
    input: ["user_prompt"],
    output: ["llm_response"],
    nodes: [
      {
        id: "llm_process",
        type: "LLM",
        name: "Process with LLM",
        config: { provider: "grok", model: "grok-3-latest" },
        messages: [
          {
            type: "text",
            role: "user",
            text: "{{user_prompt}}",
          },
        ],
        output: {
          explanation: {
            type: "string",
            description: "LLM response",
          },
        },
      },
      {
        id: "save_response",
        type: "UPDATE_VARIABLE",
        name: "Save Response",
        config: { type: "update", variable_id: "llm_response" },
        value: "{{llm_process.explanation}}",
      },
    ],
  };

  try {
    const result = await executor.executeFlow(flow, {
      user_prompt: "Explain quantum computing in simple terms",
    });
    console.log("Response:", result.outputs.llm_response);
  } catch (error) {
    console.error("Error:", error);
  }
}

runBasicLLM().catch(console.error);
