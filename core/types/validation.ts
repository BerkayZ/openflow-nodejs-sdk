import { ValidationErrorCode } from "./enums";

export interface ValidationError {
  path: string;
  message: string;
  code: ValidationErrorCode;
  details?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface DependencyGraph {
  nodes: Map<string, Set<string>>; // node_id -> dependencies
  executionOrder: string[];
}

export interface VariableReference {
  nodeId: string;
  path: string; // e.g., "output.text" or "output.results[0].metadata"
  fullReference: string; // e.g., "{{node_id.output.text}}"
  scopeContext?: {
    forEachNodes?: Set<string>;
    scopeKeys?: Set<string>;
  };
}
