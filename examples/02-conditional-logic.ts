import { FlowExecutor } from "../core/executor/FlowExecutor";
import { FlowExecutorConfig } from "../core/types";

async function runConditionalLogic() {
  const config: FlowExecutorConfig = {
    concurrency: { global_limit: 3 },
    providers: {},
    logLevel: "info",
  };

  const executor = new FlowExecutor(config);

  const flow = {
    name: "conditional-logic",
    version: "1.0.0",
    description: "Conditional logic with user scoring",
    author: "OpenFlow SDK",
    variables: [{ id: "user_score" }, { id: "final_message" }],
    input: ["user_score"],
    output: ["final_message"],
    nodes: [
      {
        id: "score_evaluation",
        type: "CONDITION",
        name: "Evaluate Score",
        input: { switch_value: "{{user_score}}" },
        branches: {
          excellent: {
            condition: "greater_than",
            value: 90,
            nodes: [
              {
                id: "excellent_badge",
                type: "UPDATE_VARIABLE",
                name: "Award Excellent Badge",
                config: { type: "update", variable_id: "final_message" },
                value: "🏆 Excellent! Score: {{user_score}}",
              },
            ],
          },
          good: {
            condition: "greater_than",
            value: 70,
            nodes: [
              {
                id: "good_badge",
                type: "UPDATE_VARIABLE",
                name: "Award Good Badge",
                config: { type: "update", variable_id: "final_message" },
                value: "🥈 Good work! Score: {{user_score}}",
              },
            ],
          },
          default: {
            nodes: [
              {
                id: "needs_improvement",
                type: "UPDATE_VARIABLE",
                name: "Needs Improvement",
                config: { type: "update", variable_id: "final_message" },
                value: "🥉 Keep improving! Score: {{user_score}}",
              },
            ],
          },
        },
      },
    ],
  };

  try {
    const result = await executor.executeFlow(flow, {
      user_score: 90,
    });
    console.log("Result:", result.outputs.final_message);
  } catch (error) {
    console.error("Error:", error);
  }
}

runConditionalLogic().catch(console.error);
