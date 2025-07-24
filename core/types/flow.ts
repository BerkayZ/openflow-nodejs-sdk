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
  type: NodeType;
  name: string;
}

// Node types
export type NodeType =
  | "LLM"
  | "DOCUMENT_SPLITTER"
  | "TEXT_EMBEDDING"
  | "VECTOR_INSERT"
  | "VECTOR_SEARCH"
  | "VECTOR_UPDATE"
  | "VECTOR_DELETE"
  | "FOR_EACH"
  | "UPDATE_VARIABLE"
  | "CONDITION";

// Union type for all possible nodes
export type FlowNode =
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
