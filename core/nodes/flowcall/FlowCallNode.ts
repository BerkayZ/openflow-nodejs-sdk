/*
 * FlowCallNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { BaseNode, NodeExecutionContext } from "../base/BaseNode";
import { FlowNode } from "../../types";
import { FlowExecutor } from "../../executor/FlowExecutor";

export class FlowCallNode extends BaseNode {
  async execute(node: FlowNode, context: NodeExecutionContext): Promise<any> {
    const { config, input_mapping = {}, output_selection = [] } = node as any;
    const flowId: string = config?.flow_id;

    if (!flowId) {
      throw new Error("FLOW_CALL: flow_id is required");
    }

    const flowLoader = context.config.flowLoader;
    if (!flowLoader) {
      throw new Error("FLOW_CALL: flowLoader not configured");
    }

    // Depth check - prevent infinite recursion
    const currentDepth = (context.config as any)._callDepth || 0;
    if (currentDepth >= 5) {
      throw new Error("FLOW_CALL: max call depth (5) exceeded");
    }

    // Load target flow
    const targetFlow = await flowLoader(flowId);

    // Resolve input variables from parent registry
    const inputVariables: Record<string, any> = {};
    for (const [targetKey, sourceRef] of Object.entries(input_mapping)) {
      inputVariables[targetKey] = this.resolveValueExpression(
        sourceRef as string,
        context.registry,
      );
    }

    // Execute child flow with incremented depth
    const childExecutor = new FlowExecutor({
      ...context.config,
      _callDepth: currentDepth + 1,
    } as any);

    const result = await childExecutor.executeFlow(targetFlow, inputVariables);

    if (!result.success) {
      throw result.error || new Error("FLOW_CALL: child flow failed");
    }

    // Filter outputs by output_selection
    const outputs: Record<string, any> = {};
    const outputKeys = output_selection as string[];
    if (outputKeys.length > 0) {
      for (const key of outputKeys) {
        if (key in (result.outputs || {})) {
          outputs[key] = result.outputs[key];
        }
      }
    } else {
      Object.assign(outputs, result.outputs || {});
    }

    this.log(
      context,
      "info",
      `FLOW_CALL node '${node.id}' completed, calling flow '${flowId}'`,
    );

    return outputs;
  }
}
