export type LogLevel = "debug" | "info" | "warn" | "error";

export interface RetryStrategy {
  max_retries: number;
  backoff: "exponential" | "linear";
  base_delay: number;
}

export interface RateLimit {
  concurrent_limit: number;
  rps: number;
  retry_strategy: RetryStrategy | null;
}

export interface LLMProviderConfig {
  apiKey: string;
  rate_limit?: RateLimit;
}

export interface VectorDBProviderConfig {
  provider: string;
  index_name: string;
  namespace?: string;
  apiKey: string;
  rate_limit?: RateLimit;
}

export interface EmbeddingProviderConfig {
  apiKey: string;
  rate_limit?: RateLimit;
}

export interface ProviderConfigs {
  llm?: Record<string, LLMProviderConfig>;
  vectorDB?: Record<string, VectorDBProviderConfig>;
  embeddings?: Record<string, EmbeddingProviderConfig>;
}

export interface ConcurrencyConfig {
  global_limit: number;
}

export interface FlowExecutorConfig {
  concurrency: ConcurrencyConfig;
  providers: ProviderConfigs;
  timeout?: number;
  logLevel: LogLevel;
  tempDir?: string;
}

// Execution Status Types
export type FlowStatus = "queued" | "running" | "completed" | "failed";

export interface FlowExecution {
  id: string;
  flowName: string;
  status: FlowStatus;
  currentNode?: string;
  startTime: Date;
  endTime?: Date;
  error?: Error;
}

export interface ExecutionProgress {
  totalNodes: number;
  completedNodes: number;
  currentNode?: string;
  failedNodes: string[];
}

export interface QueueStatus {
  waiting: number;
  running: number;
  activeFlows: FlowExecution[];
}
