/*
 * ForEachNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { BaseNode, NodeExecutionContext } from "../base/BaseNode";
import { ForEachNode } from "../../types";

export class ForEachNodeExecutor extends BaseNode {
  async execute(
    node: ForEachNode,
    context: NodeExecutionContext,
  ): Promise<any> {
    try {
      this.log(context, "debug", `Executing for-each node: ${node.id}`);

      // Resolve the input list using variable resolution
      const inputList = this.resolveValueExpression(
        node.input.items,
        context.registry,
      );

      this.log(
        context,
        "debug",
        `Input list resolved to: ${JSON.stringify(inputList)}`,
      );

      // Validate that the input is an array
      if (!Array.isArray(inputList)) {
        throw new Error(
          `ForEach node '${node.id}' input must be an array, but got ${typeof inputList}`,
        );
      }

      // Get delay configuration
      const delayBetween = node.config.delay_between || 0;
      const eachKey = node.config.each_key || "current";

      this.log(
        context,
        "debug",
        `Processing ${inputList.length} items with delay ${delayBetween}ms, each_key: ${eachKey}`,
      );

      // Process each item in the list
      const results = [];
      for (let i = 0; i < inputList.length; i++) {
        const currentItem = inputList[i];

        this.log(
          context,
          "debug",
          `Processing item ${i + 1}/${inputList.length}: ${JSON.stringify(currentItem)}`,
        );

        // Create scoped registry for this iteration
        const scopedRegistry = this.createScopedRegistry(
          context.registry,
          eachKey,
          currentItem,
          i,
        );

        // Execute each node in the each_nodes array
        const iterationResults = [];
        for (const eachNode of node.each_nodes) {
          this.log(
            context,
            "debug",
            `Executing node '${eachNode.id}' (${eachNode.type}) for item ${i + 1}`,
          );

          const result = await this.executeNode(eachNode, {
            ...context,
            registry: scopedRegistry,
          });

          iterationResults.push({
            nodeId: eachNode.id,
            nodeType: eachNode.type,
            result: result.success ? result.output : null,
            success: result.success,
            error: result.error?.message,
            executionTime: result.executionTime,
          });

          // Store the result in the scoped registry for subsequent nodes
          if (result.success) {
            scopedRegistry.setNodeOutput(eachNode.id, result.output);
          }
        }

        results.push({
          item: currentItem,
          index: i,
          results: iterationResults,
        });

        // Apply delay between iterations if specified
        if (delayBetween > 0 && i < inputList.length - 1) {
          await this.delay(delayBetween);
        }
      }

      this.log(
        context,
        "info",
        `ForEach node '${node.id}' completed processing ${inputList.length} items`,
      );

      return {
        total_items: inputList.length,
        processed_items: results.length,
        results: results,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.log(
        context,
        "error",
        `ForEach node execution failed: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Create a scoped registry that includes the current iteration variable
   */
  private createScopedRegistry(
    parentRegistry: any,
    eachKey: string,
    currentItem: any,
    index: number,
  ): any {
    // Create a new registry instance that delegates to the parent
    const scopedRegistry = Object.create(parentRegistry);

    // Create a scoped node output storage for this iteration
    const scopedNodeOutputs = new Map<string, any>();

    // Override variable resolution to include the current item
    const originalResolveExpression =
      parentRegistry.resolveExpression.bind(parentRegistry);
    scopedRegistry.resolveExpression = (expression: string) => {
      const parts = expression.split(".");

      // Check if it's accessing the current item
      if (parts[0] === eachKey) {
        if (parts.length === 1) {
          // {{current}} - return the whole item
          return currentItem;
        } else {
          // {{current.property}} - navigate through the item
          let current = currentItem;
          for (let i = 1; i < parts.length; i++) {
            if (current && typeof current === "object") {
              current = current[parts[i]];
            } else {
              return undefined;
            }
          }
          return current;
        }
      }

      // Check if it's accessing the index
      if (parts[0] === eachKey + "_index") {
        return index;
      }

      // For node output references, use scoped resolution
      if (parts.length > 1) {
        // Node output reference: {{node_id.property}}
        const nodeId = parts[0];
        const nodeOutput = scopedRegistry.getNodeOutput(nodeId);

        if (!nodeOutput) {
          return undefined;
        }

        // Navigate through the path: property.subproperty
        let current = nodeOutput;
        for (let i = 1; i < parts.length; i++) {
          if (current && typeof current === "object") {
            current = current[parts[i]];
          } else {
            return undefined;
          }
        }

        return current;
      }

      // Otherwise, delegate to parent registry
      return originalResolveExpression(expression);
    };

    // Override getVariable to include the current item
    const originalGetVariable = parentRegistry.getVariable.bind(parentRegistry);
    scopedRegistry.getVariable = (variableId: string) => {
      if (variableId === eachKey) {
        return currentItem;
      }
      if (variableId === eachKey + "_index") {
        return index;
      }
      return originalGetVariable(variableId);
    };

    // Override setVariable to delegate to parent
    const originalSetVariable = parentRegistry.setVariable.bind(parentRegistry);
    scopedRegistry.setVariable = (variableId: string, value: any) => {
      return originalSetVariable(variableId, value);
    };

    // Override hasVariable to include the current item
    const originalHasVariable = parentRegistry.hasVariable.bind(parentRegistry);
    scopedRegistry.hasVariable = (variableId: string) => {
      if (variableId === eachKey || variableId === eachKey + "_index") {
        return true;
      }
      return originalHasVariable(variableId);
    };

    // Override setNodeOutput and getNodeOutput to handle scoped node outputs
    const originalSetNodeOutput =
      parentRegistry.setNodeOutput.bind(parentRegistry);
    const originalGetNodeOutput =
      parentRegistry.getNodeOutput.bind(parentRegistry);

    scopedRegistry.setNodeOutput = (nodeId: string, output: any) => {
      // Store in scoped storage for this iteration
      scopedNodeOutputs.set(nodeId, output);
      // Also delegate to parent for global access if needed
      return originalSetNodeOutput(nodeId, output);
    };

    scopedRegistry.getNodeOutput = (nodeId: string) => {
      // First check scoped storage for this iteration
      if (scopedNodeOutputs.has(nodeId)) {
        return scopedNodeOutputs.get(nodeId);
      }
      // Then check parent registry for global nodes
      return originalGetNodeOutput(nodeId);
    };

    return scopedRegistry;
  }

  /**
   * Execute a node with error handling
   */
  private async executeNode(
    node: any,
    context: NodeExecutionContext,
  ): Promise<any> {
    const NodeFactory = await import("../base/NodeFactory");
    const nodeExecutor = NodeFactory.NodeFactory.create(node.type);
    return await nodeExecutor.executeWithContext(node, context);
  }

  /**
   * Delay execution by specified milliseconds
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
