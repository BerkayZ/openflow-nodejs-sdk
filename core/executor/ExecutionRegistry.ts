/*
 * ExecutionRegistry
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { FlowDefinition, FlowVariable } from "../types";
import { FileManager } from "../utils/FileManager";

export interface RegistryData {
  variables: Map<string, any>;
  nodeOutputs: Map<string, any>;
  metadata: {
    flowId: string;
    flowName: string;
    startTime: Date;
    currentNode?: string;
  };
}

export class ExecutionRegistry {
  private data: RegistryData;
  private fileManager: FileManager;
  private variableTypes: Map<string, FlowVariable>;

  constructor(
    flowId: string,
    flow: FlowDefinition,
    tempDir?: string,
    inputVariables?: Record<string, any>,
  ) {
    this.fileManager = FileManager.getInstance(tempDir);
    this.variableTypes = new Map();
    this.data = {
      variables: new Map(),
      nodeOutputs: new Map(),
      metadata: {
        flowId,
        flowName: flow.name,
        startTime: new Date(),
      },
    };

    // Initialize variables with default values
    this.initializeVariables(flow.variables);

    // Override with input variables if provided
    if (inputVariables) {
      this.setInputVariables(inputVariables);
    }
  }

  /**
   * Initialize flow variables with default values
   */
  private initializeVariables(variables: FlowVariable[]): void {
    for (const variable of variables) {
      // Store variable type information
      this.variableTypes.set(variable.id, variable);

      if (variable.default !== undefined) {
        this.data.variables.set(variable.id, variable.default);
      }
    }
  }

  /**
   * Set input variables, overriding defaults
   */
  private setInputVariables(inputVariables: Record<string, any>): void {
    for (const [variableId, value] of Object.entries(inputVariables)) {
      let processedValue = value;

      // Check if this is a file type variable and auto-register file paths
      const variable = this.variableTypes.get(variableId);
      if (
        variable?.type === "file" &&
        typeof value === "string" &&
        !this.fileManager.hasFile(value)
      ) {
        // This appears to be a file path, not a file ID - register it
        try {
          const fileRef = this.fileManager.registerFile(value);
          processedValue = fileRef.id;
        } catch (error: any) {
          throw new Error(
            `Failed to register file for variable '${variableId}': ${error.message}`,
          );
        }
      }

      // Validate variable type if it exists in flow definition
      this.validateVariableType(variableId, processedValue);
      this.data.variables.set(variableId, processedValue);
    }
  }

  /**
   * Set a variable value
   */
  setVariable(variableId: string, value: any): void {
    // Validate variable type if specified
    this.validateVariableType(variableId, value);
    this.data.variables.set(variableId, value);
  }

  /**
   * Get a variable value
   */
  getVariable(variableId: string): any {
    return this.data.variables.get(variableId);
  }

  /**
   * Check if variable exists
   */
  hasVariable(variableId: string): boolean {
    return this.data.variables.has(variableId);
  }

  /**
   * Get all variables
   */
  getAllVariables(): Record<string, any> {
    return Object.fromEntries(this.data.variables);
  }

  /**
   * Set node output
   */
  setNodeOutput(nodeId: string, output: any): void {
    this.data.nodeOutputs.set(nodeId, output);
  }

  /**
   * Get node output
   */
  getNodeOutput(nodeId: string): any {
    return this.data.nodeOutputs.get(nodeId);
  }

  /**
   * Check if node output exists
   */
  hasNodeOutput(nodeId: string): boolean {
    return this.data.nodeOutputs.has(nodeId);
  }

  /**
   * Get all node outputs
   */
  getAllNodeOutputs(): Record<string, any> {
    return Object.fromEntries(this.data.nodeOutputs);
  }

  /**
   * Resolve variable expression (used by VariableResolver)
   */
  resolveExpression(expression: string): any {
    const parts = expression.split(".");

    if (parts.length === 1) {
      // Could be either a node reference ({{node_id}}) or variable reference ({{variable_id}})
      // Check for node output first
      if (this.hasNodeOutput(parts[0])) {
        return this.getNodeOutput(parts[0]);
      } else {
        // Fall back to variable reference
        return this.getVariable(parts[0]);
      }
    } else {
      // Node output reference: {{node_id.property}}
      const nodeId = parts[0];
      const nodeOutput = this.getNodeOutput(nodeId);

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
  }

  /**
   * Set current executing node (for debugging/monitoring)
   */
  setCurrentNode(nodeId: string): void {
    this.data.metadata.currentNode = nodeId;
  }

  /**
   * Get execution metadata
   */
  getMetadata(): RegistryData["metadata"] {
    return { ...this.data.metadata };
  }

  /**
   * Get execution duration
   */
  getExecutionDuration(): number {
    return Date.now() - this.data.metadata.startTime.getTime();
  }

  /**
   * Create a snapshot of current state (for debugging)
   */
  snapshot(): {
    variables: Record<string, any>;
    nodeOutputs: Record<string, any>;
    metadata: RegistryData["metadata"];
  } {
    return {
      variables: this.getAllVariables(),
      nodeOutputs: this.getAllNodeOutputs(),
      metadata: this.getMetadata(),
    };
  }

  /**
   * Clear all data (cleanup)
   */
  clear(): void {
    this.data.variables.clear();
    this.data.nodeOutputs.clear();
    this.data.metadata.currentNode = undefined;
  }

  /**
   * Get registry size (for memory monitoring)
   */
  getSize(): {
    variables: number;
    nodeOutputs: number;
    totalSize: number;
  } {
    return {
      variables: this.data.variables.size,
      nodeOutputs: this.data.nodeOutputs.size,
      totalSize: this.data.variables.size + this.data.nodeOutputs.size,
    };
  }

  /**
   * Validate variable type
   */
  private validateVariableType(variableId: string, value: any): void {
    const variable = this.variableTypes.get(variableId);
    if (!variable || !variable.type) {
      return; // No type specified, skip validation
    }

    switch (variable.type) {
      case "string":
        if (typeof value !== "string") {
          throw new Error(
            `Variable '${variableId}' should be a string, but got ${typeof value}`,
          );
        }
        break;
      case "number":
        if (typeof value !== "number") {
          throw new Error(
            `Variable '${variableId}' should be a number, but got ${typeof value}`,
          );
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          throw new Error(
            `Variable '${variableId}' should be a boolean, but got ${typeof value}`,
          );
        }
        break;
      case "file":
        this.fileManager.validateFileVariable(value, variableId);
        break;
      case "array":
        if (!Array.isArray(value)) {
          throw new Error(
            `Variable '${variableId}' should be an array, but got ${typeof value}`,
          );
        }
        break;
      case "object":
        if (
          typeof value !== "object" ||
          value === null ||
          Array.isArray(value)
        ) {
          throw new Error(
            `Variable '${variableId}' should be an object, but got ${typeof value}`,
          );
        }
        break;
    }
  }

  /**
   * Register a file and return its ID
   */
  registerFile(filePath: string): string {
    const fileRef = this.fileManager.registerFile(filePath);
    return fileRef.id;
  }

  /**
   * Get file manager instance
   */
  getFileManager(): FileManager {
    return this.fileManager;
  }

  /**
   * Resolve file variable to file data
   */
  resolveFileVariable(variableId: string): any {
    const value = this.getVariable(variableId);
    const variable = this.variableTypes.get(variableId);

    if (variable?.type === "file") {
      if (typeof value === "string" && this.fileManager.hasFile(value)) {
        const fileRef = this.fileManager.getFile(value);
        return {
          id: value,
          ...fileRef,
        };
      }
    }

    return value;
  }

  /**
   * Get file base64 data for image messages
   */
  getFileBase64(fileId: string): string {
    return this.fileManager.getFileBase64(fileId);
  }

  /**
   * Get file data URL for images
   */
  getFileDataUrl(fileId: string): string {
    return this.fileManager.getFileDataUrl(fileId);
  }

  /**
   * Check if variable is a file type
   */
  isFileVariable(variableId: string): boolean {
    const variable = this.variableTypes.get(variableId);
    return variable?.type === "file";
  }

  /**
   * Check if file is an image
   */
  isImageFile(fileId: string): boolean {
    return this.fileManager.isImage(fileId);
  }
}
