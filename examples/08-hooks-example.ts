import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig, HookSignal } from "../core/types";

require("dotenv").config({ path: ".env.test" });

async function runHooksExample() {
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
    name: "hooks-example",
    version: "1.0.0",
    description: "Example demonstrating flow execution hooks",
    author: "OpenFlow SDK",
    variables: [
      { id: "user_input" },
      { id: "processed_result" },
      { id: "final_output" },
    ],
    input: ["user_input"],
    output: ["final_output"],
    nodes: [
      {
        id: "process_input",
        type: "UPDATE_VARIABLE",
        name: "Process Input",
        config: { type: "update", variable_id: "processed_result" },
        value: "Processed: {{user_input}}",
      },
      {
        id: "llm_analysis",
        type: "LLM",
        name: "LLM Analysis",
        config: { provider: "grok", model: "grok-3-latest" },
        messages: [
          {
            type: "text",
            role: "user",
            text: "Analyze this text: {{processed_result}}",
          },
        ],
        output: {
          analysis: {
            type: "string",
            description: "LLM analysis result",
          },
        },
      },
      {
        id: "finalize_output",
        type: "UPDATE_VARIABLE",
        name: "Finalize Output",
        config: { type: "update", variable_id: "final_output" },
        value: "Final: {{llm_analysis.analysis}}",
      },
    ],
  };

  try {
    console.log("Starting flow execution with hooks...");

    const result = await executor.executeFlow(
      flow,
      {
        user_input: "Hello, this is a test input for hooks demonstration",
      },
      {
        beforeNode: async ({ node }) => {
          console.log(`🚀 About to execute node: ${node.name} (${node.id})`);
        },
        afterNode: async ({ node, executionTime }) => {
          console.log(
            `✅ Node completed: ${node.name} (${node.id}) - ${executionTime}ms`,
          );
          return HookSignal.CONTINUE;
        },
        onError: async ({ error, node }) => {
          console.error(
            `❌ Error in node ${node.name} (${node.id}):`,
            error.message,
          );
          // You can return HookSignal.CONTINUE to continue execution despite errors
          return HookSignal.CONTINUE;
        },
        onComplete: async ({ flowId, executionTime, outputs }) => {
          console.log(`🎉 Flow ${flowId} completed successfully!`);
          console.log(`⏱️  Total execution time: ${executionTime}ms`);
          console.log(`📊 Outputs:`, outputs);
        },
      },
    );

    console.log("Final result:", result.outputs.final_output);
  } catch (error) {
    console.error("Flow execution failed:", error);
  }
}

runHooksExample().catch(console.error);
