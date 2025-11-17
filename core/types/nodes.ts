import { BaseNode, FlowNode } from "./flow";
import { DataType, NodeType } from "./enums";
import { VectorDBProviderConfig as VectorDBConfig } from "./config";

// MCP Configuration
export interface MCPServerConfig {
  name: string;
  url: string;
  description?: string;
  timeout?: number;
  retry_attempts?: number;
  auth: {
    type:
      | "none"
      | "api_key"
      | "bearer"
      | "basic"
      | "custom_headers"
      | "query_params";
    api_key?: string;
    header_name?: string;
    token?: string;
    username?: string;
    password?: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
  };
}

export interface MCPToolsConfig {
  auto_discover?: boolean;
  mcp_servers?: string[];
  builtin_tools?: string[];
  available_tools?: string[];
  filter?: string[];
  tool_selection?: "auto" | "manual";
}

// Provider configurations
export interface ProviderConfig {
  provider: string;
  model: string;
  max_tokens?: number;
  temperature?: number;
  mcp_servers?: MCPServerConfig[];
  tools?: MCPToolsConfig;
}

export { VectorDBProviderConfig } from "./config";

// Message types for LLM
export interface TextMessage {
  type: "text";
  role: "user" | "assistant" | "system";
  text: string;
}

export interface ImageMessage {
  type: "image";
  role: "user" | "assistant" | "system";
  image_url?: string;
  image_path?: string;
  image_data?: string;
}

export type Message = TextMessage | ImageMessage;

// Output schema definition
export interface OutputProperty {
  type: DataType;
  description: string;
  structure?: Record<string, OutputProperty>;
  items?: OutputProperty;
}

export interface OutputSchema {
  [key: string]: OutputProperty;
}

// LLM Node
export interface LLMNode extends BaseNode {
  type: NodeType.LLM;
  config: ProviderConfig;
  prompt_mapping?: Record<string, string>;
  messages: Message[];
  output: OutputSchema;
}

// Document Splitter Node
export interface DocumentSplitterNode extends BaseNode {
  type: NodeType.DOCUMENT_SPLITTER;
  config: {
    image_quality: "high" | "medium" | "low";
    dpi: number;
    image_format: "png" | "jpg" | "webp";
  };
  document: string;
}

// Text Embedding Node
export interface EmbeddingItem {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface TextEmbeddingNode extends BaseNode {
  type: NodeType.TEXT_EMBEDDING;
  config: ProviderConfig & {
    provider: string;
    model: string;
  };
  input: {
    text?: string;
    texts?: string[];
    items?: EmbeddingItem[];
  };
}

// Vector Database Nodes
export interface VectorEmbedding {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

export interface VectorInsertNode extends BaseNode {
  type: NodeType.VECTOR_INSERT;
  config: VectorDBConfig & {
    provider: string;
    index_name: string;
    namespace?: string;
  };
  input: {
    embedding?: VectorEmbedding;
    embeddings?: VectorEmbedding[];
    source?: string; // Variable reference
  };
}

export interface VectorSearchNode extends BaseNode {
  type: NodeType.VECTOR_SEARCH;
  config: VectorDBConfig & {
    provider: string;
    index_name: string;
    namespace?: string;
    top_k?: number;
    similarity_threshold?: number;
    filter?: Record<string, any>;
  };
  input: {
    search_text?: string;
    search_vector?: string; // Variable reference
    top_k?: number;
  };
}

export interface VectorUpdateNode extends BaseNode {
  type: NodeType.VECTOR_UPDATE;
  config: VectorDBConfig;
  input: {
    update?: VectorEmbedding;
    updates?: VectorEmbedding[];
  };
}

export interface VectorDeleteNode extends BaseNode {
  type: NodeType.VECTOR_DELETE;
  config: VectorDBConfig;
  input: {
    ids: string[];
  };
}

// Control Flow Nodes
export interface ForEachNode extends BaseNode {
  type: NodeType.FOR_EACH;
  config: {
    delay_between?: number;
    each_key: string;
  };
  input: {
    items: string; // Variable reference
  };
  each_nodes: FlowNode[];
}

export interface UpdateVariableNode extends BaseNode {
  type: NodeType.UPDATE_VARIABLE;
  config: {
    type: "join" | "update" | "append";
    variable_id: string;
    join_str?: string;
  };
  value: string | object; // Variable reference or JSON object
}

// Condition types
export type ConditionOperator =
  | "equals"
  | "greater_than"
  | "less_than"
  | "contains"
  | "not_equals";

export interface ConditionBranch {
  condition?: ConditionOperator;
  value?: any;
  nodes: FlowNode[];
}

export interface ConditionNode extends BaseNode {
  type: NodeType.CONDITION;
  input: {
    switch_value: string; // Variable reference
  };
  branches: Record<string, ConditionBranch>;
}

// Embedding Node Types
export interface EmbeddingItem {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingResult {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export interface EmbeddingResponse {
  embeddings: EmbeddingResult[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
