import {
  ConditionNode,
  DocumentSplitterNode,
  ForEachNode,
  LLMNode,
  TextEmbeddingNode,
  UpdateVariableNode,
  VectorDeleteNode,
  VectorInsertNode,
  VectorSearchNode,
  VectorUpdateNode,
} from "./nodes";
import { NodeType } from "./enums";

export interface FlowDefinition {
  name: string;
  version: string;
  description: string;
  author: string;
  variables: FlowVariable[];
  input: string[];
  output: string[];
  nodes: FlowNode[];
}

export interface FlowVariable {
  id: string;
  default?: any;
  type?: "string" | "number" | "boolean" | "file" | "array" | "object";
}

// Base node interface
export interface BaseNode {
  id: string;
  type: NodeTypes;
  name: string;
}

// Node types
export type NodeTypes =
  | NodeType.LLM
  | NodeType.DOCUMENT_SPLITTER
  | NodeType.TEXT_EMBEDDING
  | NodeType.VECTOR_INSERT
  | NodeType.VECTOR_SEARCH
  | NodeType.VECTOR_UPDATE
  | NodeType.VECTOR_DELETE
  | NodeType.FOR_EACH
  | NodeType.UPDATE_VARIABLE
  | NodeType.CONDITION;

// Base flow node with common properties and flexible config
export interface BaseFlowNode {
  id: string;
  type: NodeType;
  name: string;
  config?: Record<string, any>;
  depends_on?: string[];
  [key: string]: any; // Allow additional properties
}

// Union type for all possible nodes - used for type-safe implementations
export type SpecificFlowNode =
  | LLMNode
  | DocumentSplitterNode
  | TextEmbeddingNode
  | VectorInsertNode
  | VectorSearchNode
  | VectorUpdateNode
  | VectorDeleteNode
  | ForEachNode
  | UpdateVariableNode
  | ConditionNode;

// FlowNode type that accepts both specific nodes and generic nodes with NodeType enum
export type FlowNode = BaseFlowNode;
