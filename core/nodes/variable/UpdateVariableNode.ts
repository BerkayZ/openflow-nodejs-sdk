/*
 * UpdateVariableNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { UpdateVariableNode, FlowNode } from "../../types";
import { BaseNode, NodeExecutionContext } from "../base/BaseNode";

export class UpdateVariableNodeExecutor extends BaseNode {
  /**
   * Execute UPDATE_VARIABLE node
   */
  async execute(node: FlowNode, context: NodeExecutionContext): Promise<any> {
    const updateNode = node as UpdateVariableNode;

    this.log(context, "info", `Executing update node ${node.id}`);

    const { variable_id, type, join_str } = updateNode.config;

    // Validate that target variable exists (optional check)
    this.validateTargetVariable(variable_id, context);

    // Resolve the value expression
    // Handle both string templates and object values
    const resolvedValue =
      typeof updateNode.value === "string"
        ? this.resolveValueExpression(updateNode.value, context.registry)
        : this.resolveObjectVariables(updateNode.value, context.registry);

    this.log(context, "debug", `Resolved value: ${resolvedValue}`);

    // Get current variable value
    const currentValue = context.registry.getVariable(variable_id);

    // Perform the update operation
    const newValue = this.performUpdateOperation(
      type,
      currentValue,
      resolvedValue,
      join_str,
    );

    // Update the variable in registry
    context.registry.setVariable(variable_id, newValue);

    this.log(
      context,
      "info",
      `Updated variable ${variable_id} from ${currentValue} to ${newValue}`,
    );

    // Return operation details as output
    return {
      variable_id,
      previous_value: currentValue,
      new_value: newValue,
      operation: type,
      resolved_input: resolvedValue,
    };
  }

  /**
   * Validate that target variable exists (warn if not)
   */
  private validateTargetVariable(
    variableId: string,
    context: NodeExecutionContext,
  ): void {
    if (!context.registry.hasVariable(variableId)) {
      this.log(
        context,
        "warn",
        `Target variable '${variableId}' does not exist, will be created`,
      );
    }
  }

  /**
   * Perform the update operation based on type
   */
  private performUpdateOperation(
    type: "join" | "update" | "append",
    currentValue: any,
    resolvedValue: any,
    joinStr?: string,
  ): any {
    switch (type) {
      case "join":
        if (currentValue !== undefined) {
          const separator = joinStr !== undefined ? joinStr : "";
          const currentStr =
            typeof currentValue === "object"
              ? JSON.stringify(currentValue)
              : String(currentValue);
          const resolvedStr =
            typeof resolvedValue === "object"
              ? JSON.stringify(resolvedValue)
              : String(resolvedValue);
          return currentStr + separator + resolvedStr;
        } else {
          return typeof resolvedValue === "object"
            ? JSON.stringify(resolvedValue)
            : String(resolvedValue);
        }

      case "update":
        return resolvedValue;

      case "append": {
        if (!Array.isArray(currentValue)) {
          throw new Error(`Cannot append to variable as it is not an array.`);
        }

        // For objects, stringify them before appending
        const valueToAppend = typeof resolvedValue === "object"
          ? JSON.stringify(resolvedValue)
          : resolvedValue;

        if (currentValue !== undefined) {
          return [...currentValue, valueToAppend];
        } else {
          return [valueToAppend];
        }
      }

      default:
        throw new Error(`Unknown update operation type: ${type}`);
    }
  }
}
