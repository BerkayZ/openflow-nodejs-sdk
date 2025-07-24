/*
 * UpdateVariableNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { UpdateVariableNode, FlowNode } from "../../types";
import { BaseNode, NodeExecutionContext } from "../base/BaseNode";
import { ExecutionRegistry } from "../../executor/ExecutionRegistry";

export class UpdateVariableNodeExecutor extends BaseNode {
  /**
   * Validate UPDATE_VARIABLE node specific configuration
   */
  protected validateNodeSpecific(node: FlowNode): void {
    const updateNode = node as UpdateVariableNode;

    if (!updateNode.config || typeof updateNode.config !== "object") {
      throw new Error(
        `UPDATE_VARIABLE node ${node.id} missing required config`,
      );
    }

    if (
      !updateNode.config.variable_id ||
      typeof updateNode.config.variable_id !== "string"
    ) {
      throw new Error(
        `UPDATE_VARIABLE node ${node.id} missing required config.variable_id`,
      );
    }

    if (
      !updateNode.config.type ||
      !["join", "update"].includes(updateNode.config.type)
    ) {
      throw new Error(
        `UPDATE_VARIABLE node ${node.id} config.type must be 'join' or 'update'`,
      );
    }

    if (!updateNode.value || typeof updateNode.value !== "string") {
      throw new Error(`UPDATE_VARIABLE node ${node.id} missing required value`);
    }

    // Validate join_str for join operations
    if (
      updateNode.config.type === "join" &&
      updateNode.config.join_str !== undefined &&
      typeof updateNode.config.join_str !== "string"
    ) {
      throw new Error(
        `UPDATE_VARIABLE node ${node.id} join_str must be a string`,
      );
    }
  }

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
    // Check if it's a single variable reference (object) or a string with embedded variables
    const resolvedValue = this.resolveValueExpression(
      updateNode.value,
      context.registry,
    );

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
    type: "join" | "update",
    currentValue: any,
    resolvedValue: any,
    joinStr?: string,
  ): any {
    switch (type) {
      case "join":
        if (currentValue !== undefined) {
          const separator = joinStr !== undefined ? joinStr : "";
          return String(currentValue) + separator + String(resolvedValue);
        } else {
          return String(resolvedValue);
        }

      case "update":
        return resolvedValue;

      default:
        throw new Error(`Unknown update operation type: ${type}`);
    }
  }
}
