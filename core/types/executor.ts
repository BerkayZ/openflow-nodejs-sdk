export interface ExecutionResult {
  success: boolean;
  flowId: string;
  executionTime: number;
  error?: Error;
  outputs: Record<string, any>;
}

export interface QueuedFlow {
  id: string;
  flow: any;
  timestamp: Date;
  resolve: (result: ExecutionResult) => void;
  reject: (error: Error) => void;
  inputVariables?: Record<string, any>;
  hooks?: FlowHooks;
}

export enum HookSignal {
  CONTINUE = "continue",
  STOP = "stop",
}

export interface NodeHookContext {
  node: any;
  flowId: string;
  executionTime?: number;
}

export interface ErrorHookContext {
  error: Error;
  node: any;
  flowId: string;
}

export interface CompleteHookContext {
  flowId: string;
  executionTime: number;
  outputs: Record<string, any>;
}

export interface FlowHooks {
  beforeNode?: (context: NodeHookContext) => Promise<void> | void;
  afterNode?: (context: NodeHookContext) => Promise<HookSignal> | HookSignal;
  onError?: (context: ErrorHookContext) => Promise<HookSignal> | HookSignal;
  onComplete?: (context: CompleteHookContext) => Promise<void> | void;
}
