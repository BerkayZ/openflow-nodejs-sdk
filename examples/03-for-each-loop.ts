import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../core/types";

async function runForEachLoop() {
  const config: FlowExecutorConfig = {
    concurrency: { global_limit: 1 },
    providers: {},
    logLevel: "info",
  };

  const executor = new FlowExecutor(config);

  const flow = {
    name: "for-each-loop",
    version: "1.0.0",
    description: "FOR_EACH loop with number processing",
    author: "OpenFlow SDK",
    variables: [{ id: "numbers" }, { id: "result_summary", default: "" }],
    input: ["numbers"],
    output: ["result_summary"],
    nodes: [
      {
        id: "process_numbers",
        type: "FOR_EACH",
        name: "Process Each Number",
        config: {
          delay_between: 50,
          each_key: "current",
        },
        input: { items: "{{numbers}}" },
        each_nodes: [
          {
            id: "format_number",
            type: "UPDATE_VARIABLE",
            name: "Format Number",
            config: {
              type: "update",
              variable_id: "formatted_number",
            },
            value: "Number: {{current}} (squared: {{current}}²)",
          },
          {
            id: "add_to_result",
            type: "UPDATE_VARIABLE",
            name: "Add to Result",
            config: {
              type: "join",
              variable_id: "result_summary",
              join_str: "\n",
            },
            value: "{{format_number.new_value}}",
          },
        ],
      },
    ],
  };

  try {
    const result = await executor.executeFlow(flow, {
      numbers: [1, 2, 3, 4, 5],
    });
    console.log("Results:\n" + result.outputs.result_summary);
  } catch (error) {
    console.error("Error:", error);
  }
}

runForEachLoop().catch(console.error);
