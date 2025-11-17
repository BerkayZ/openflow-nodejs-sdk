/*
 * NodeFactory
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { NodeType } from "../../types";
import { BaseNode } from "./BaseNode";
import { LLMNodeExecutor } from "../llm";
import { UpdateVariableNodeExecutor } from "../variable/UpdateVariableNode";
import { VectorInsertNodeExecutor, VectorSearchNodeExecutor } from "../vector";
import { TextEmbeddingNodeExecutor } from "../embedding";
import { ConditionNodeExecutor } from "../condition";
import { DocumentSplitterNodeExecutor } from "../document";
import { ForEachNodeExecutor } from "../foreach";
import { Logger } from "../../utils/Logger";

type NodeExecutorConstructor = new () => BaseNode;

export class NodeFactory {
  private static executors = new Map<NodeType, NodeExecutorConstructor>();
  private static logger: Logger = new Logger();

  /**
   * Register node executors
   */
  static {
    NodeFactory.register(NodeType.LLM, LLMNodeExecutor);
    NodeFactory.register(NodeType.UPDATE_VARIABLE, UpdateVariableNodeExecutor);
    NodeFactory.register(NodeType.VECTOR_INSERT, VectorInsertNodeExecutor);
    NodeFactory.register(NodeType.VECTOR_SEARCH, VectorSearchNodeExecutor);
    NodeFactory.register(NodeType.TEXT_EMBEDDING, TextEmbeddingNodeExecutor);
    NodeFactory.register(NodeType.CONDITION, ConditionNodeExecutor);
    NodeFactory.register(
      NodeType.DOCUMENT_SPLITTER,
      DocumentSplitterNodeExecutor,
    );
    NodeFactory.register(NodeType.FOR_EACH, ForEachNodeExecutor);

    // Future node types will be registered here:
    // NodeFactory.register('VECTOR_UPDATE', VectorUpdateNodeExecutor);
    // NodeFactory.register('VECTOR_DELETE', VectorDeleteNodeExecutor);
  }

  /**
   * Register a node executor for a specific node type
   */
  static register(
    nodeType: NodeType,
    executorClass: NodeExecutorConstructor,
  ): void {
    NodeFactory.executors.set(nodeType, executorClass);
  }

  /**
   * Create a node executor instance for the given node type
   */
  static create(nodeType: NodeType): BaseNode {
    const ExecutorClass = NodeFactory.executors.get(nodeType);

    if (!ExecutorClass) {
      throw new Error(`No executor registered for node type: ${nodeType}`);
    }

    return new ExecutorClass();
  }

  /**
   * Check if a node type is supported
   */
  static isSupported(nodeType: NodeType): boolean {
    return NodeFactory.executors.has(nodeType);
  }

  /**
   * Get all supported node types
   */
  static getSupportedTypes(): NodeType[] {
    return Array.from(NodeFactory.executors.keys());
  }

  /**
   * Get executor class for a node type (for testing/inspection)
   */
  static getExecutorClass(
    nodeType: NodeType,
  ): NodeExecutorConstructor | undefined {
    return NodeFactory.executors.get(nodeType);
  }

  /**
   * Validate that all required node types are registered
   */
  static validateRegistrations(requiredTypes: NodeType[]): {
    missing: NodeType[];
    isValid: boolean;
  } {
    const missing = requiredTypes.filter(
      (type) => !NodeFactory.isSupported(type),
    );

    return {
      missing,
      isValid: missing.length === 0,
    };
  }

  /**
   * Set the logger instance to be used by the factory
   */
  static setLogger(logger: Logger): void {
    NodeFactory.logger = logger;
  }
}
