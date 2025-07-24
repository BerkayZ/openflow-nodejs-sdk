/*
 * ConditionNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { BaseNode, NodeExecutionContext } from "../base/BaseNode";
import { ConditionNode, ConditionOperator } from "../../types";

export class ConditionNodeExecutor extends BaseNode {
  async execute(
    node: ConditionNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    this.log(context, "debug", `Executing condition node: ${node.id}`);

    // Resolve the switch value using variable resolution
    const switchValue = this.resolveValueExpression(
      node.input.switch_value,
      context.registry,
    );

    this.log(context, "debug", `Switch value resolved to: ${switchValue}`);

    // Find the matching branch
    const matchingBranch = this.findMatchingBranch(switchValue, node.branches);

    if (matchingBranch) {
      this.log(
        context,
        "debug",
        `Found matching branch: ${matchingBranch.branchName}`,
      );

      // Execute nodes in the matching branch
      const results = [];
      for (const branchNode of matchingBranch.branch.nodes) {
        const result = await this.executeNode(branchNode, context);
        results.push(result);
      }

      return {
        matched_branch: matchingBranch.branchName,
        results: results,
      };
    } else {
      this.log(context, "debug", "No matching branch found, no nodes executed");
      return {
        matched_branch: null,
        results: [],
      };
    }
  }

  private findMatchingBranch(
    switchValue: any,
    branches: Record<string, any>,
  ): { branchName: string; branch: any } | null {
    // Check each branch in order
    for (const [branchName, branch] of Object.entries(branches)) {
      // Handle default branch
      if (branchName === "default") {
        continue; // Process default at the end
      }

      // Check if this branch matches
      if (this.evaluateCondition(switchValue, branch.condition, branch.value)) {
        return { branchName, branch };
      }
    }

    // If no condition matched, check for default branch
    if (branches.default) {
      return { branchName: "default", branch: branches.default };
    }

    return null;
  }

  private evaluateCondition(
    switchValue: any,
    condition: ConditionOperator,
    conditionValue: any,
  ): boolean {
    switch (condition) {
      case "equals":
        return switchValue === conditionValue;

      case "not_equals":
        return switchValue !== conditionValue;

      case "greater_than":
        return Number(switchValue) > Number(conditionValue);

      case "less_than":
        return Number(switchValue) < Number(conditionValue);

      case "contains":
        if (
          typeof switchValue === "string" &&
          typeof conditionValue === "string"
        ) {
          return switchValue.includes(conditionValue);
        }
        if (Array.isArray(switchValue)) {
          return switchValue.includes(conditionValue);
        }
        return false;

      default:
        throw new Error(`Unknown condition operator: ${condition}`);
    }
  }

  private async executeNode(
    node: any,
    context: NodeExecutionContext,
  ): Promise<any> {
    const NodeFactory = await import("../base/NodeFactory");
    const nodeExecutor = NodeFactory.NodeFactory.create(node.type);
    return await nodeExecutor.executeWithContext(node, context);
  }
}
