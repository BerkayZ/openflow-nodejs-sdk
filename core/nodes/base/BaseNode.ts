/*
 * BaseNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { FlowNode, FlowExecutorConfig } from "../../types";
import { ExecutionRegistry } from "../../executor/ExecutionRegistry";
import { Logger } from "../../utils/Logger";

export interface NodeExecutionContext {
  registry: ExecutionRegistry;
  flowId: string;
  logger: Logger;
  config: FlowExecutorConfig;
}

export interface NodeExecutionResult {
  success: boolean;
  output?: any;
  error?: Error;
  executionTime: number;
}

export abstract class BaseNode {
  /**
   * Execute the node - must be implemented by each node type
   */
  abstract execute(node: FlowNode, context: NodeExecutionContext): Promise<any>;

  /**
   * Execute node with error handling and timing
   */
  async executeWithContext(
    node: FlowNode,
    context: NodeExecutionContext,
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // Set current node in registry for debugging
      context.registry.setCurrentNode(node.id);

      const output = await this.execute(node, context);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
        executionTime,
      };
    }
  }

  /**
   * Resolve variables in text using the registry
   */
  protected resolveVariables(
    text: string,
    registry: ExecutionRegistry,
  ): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      const value = registry.resolveExpression(expression.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Resolve variables in an object (recursively)
   */
  protected resolveObjectVariables(obj: any, registry: ExecutionRegistry): any {
    if (typeof obj === "string") {
      return this.resolveValueExpression(obj, registry);
    } else if (Array.isArray(obj)) {
      return obj.map((item) => this.resolveObjectVariables(item, registry));
    } else if (obj && typeof obj === "object") {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveObjectVariables(value, registry);
      }
      return resolved;
    }
    return obj;
  }

  /**
   * Resolve value expression - handles both string templates and object references
   */
  protected resolveValueExpression(
    value: string,
    registry: ExecutionRegistry,
  ): any {
    // Check if it's a single variable reference pattern: {{variable}} or {{node.property}}
    const singleVariableMatch = value.match(/^\{\{([^}]+)\}\}$/);

    if (singleVariableMatch) {
      // It's a single variable reference, resolve it directly as object
      const expression = singleVariableMatch[1].trim();
      return registry.resolveExpression(expression);
    } else {
      // It's a string with embedded variables, use string resolution
      return this.resolveVariables(value, registry);
    }
  }

  /**
   * Log with context information
   */
  protected log(
    context: NodeExecutionContext,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: any,
  ): void {
    context.logger[level](message, data);
  }
}
