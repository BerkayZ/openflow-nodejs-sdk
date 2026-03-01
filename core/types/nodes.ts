import { BaseNode, BaseFlowNode as FlowNode } from "./flow";
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

/**
 * Provider configurations
 * Note: Config keys use snake_case intentionally for JSON compatibility
 * and consistency with API/configuration file formats
 */
export interface ProviderConfig {
  provider: string;
  model: string;
  /** Maximum tokens to generate - snake_case for JSON compatibility */
  max_tokens?: number;
  temperature?: number;
  /** Timeout in milliseconds for API calls */
  timeout?: number;
  /** Top-p sampling parameter */
  top_p?: number;
  mcp_servers?: MCPServerConfig[];
  tools?: MCPToolsConfig;
  retry?: {
    max_attempts: number;
    delay_ms: number;
  };
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
    /** Delay between iterations in milliseconds - snake_case for JSON compatibility */
    delay_between?: number;
    /** Key name for current iteration item - snake_case for JSON compatibility */
    each_key: string;
    /** Whether to run iterations in parallel */
    parallel?: boolean;
  };
  input: {
    items: string; // Variable reference
  };
  each_nodes: any[];
}

export interface UpdateVariableNode extends BaseNode {
  type: NodeType.UPDATE_VARIABLE;
  config: {
    type:
      | "join"
      | "update"
      | "append"
      | "extract"
      | "pick"
      | "omit"
      | "map"
      | "filter"
      | "slice"
      | "flatten"
      | "concat";
    variable_id: string;
    join_str?: string;
    field_path?: string; // For extract: "text", "metadata.title"
    fields?: string[]; // For pick/omit: ["text", "doc_id"]
    mapping?: Record<string, any>; // For transform operations
    condition?: {
      // For filter operations
      field: string;
      operator:
        | "equals"
        | "contains"
        | "greater_than"
        | "less_than"
        | "not_equals";
      value: any;
    };
    slice_start?: number; // For slice operations
    slice_end?: number;
    stringify_output?: boolean; // Whether to JSON.stringify the output (default: true for join/append, false for others)
  };
  value: string | object; // Variable reference or JSON object
}

// Condition types
export type ConditionOperator =
  | "equals"
  | "greater_than"
  | "less_than"
  | "contains"
  | "not_equals"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "regex";

export interface ConditionBranch {
  condition?: ConditionOperator;
  value?: any;
  nodes: any[];
}

export interface ConditionNode extends BaseNode {
  type: NodeType.CONDITION;
  input: {
    switch_value: string; // Variable reference
  };
  branches: Record<string, ConditionBranch>;
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
