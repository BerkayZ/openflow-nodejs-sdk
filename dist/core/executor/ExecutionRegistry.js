"use strict";
/*
 * ExecutionRegistry
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionRegistry = void 0;
const FileManager_1 = require("../utils/FileManager");
class ExecutionRegistry {
    constructor(flowId, flow, tempDir, inputVariables) {
        this.fileManager = FileManager_1.FileManager.getInstance(tempDir);
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
    initializeVariables(variables) {
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
    setInputVariables(inputVariables) {
        for (const [variableId, value] of Object.entries(inputVariables)) {
            let processedValue = value;
            // Check if this is a file type variable and auto-register file paths
            const variable = this.variableTypes.get(variableId);
            if ((variable === null || variable === void 0 ? void 0 : variable.type) === "file" &&
                typeof value === "string" &&
                !this.fileManager.hasFile(value)) {
                // This appears to be a file path, not a file ID - register it
                try {
                    const fileRef = this.fileManager.registerFile(value);
                    processedValue = fileRef.id;
                }
                catch (error) {
                    throw new Error(`Failed to register file for variable '${variableId}': ${error.message}`);
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
    setVariable(variableId, value) {
        // Validate variable type if specified
        this.validateVariableType(variableId, value);
        this.data.variables.set(variableId, value);
    }
    /**
     * Get a variable value
     */
    getVariable(variableId) {
        return this.data.variables.get(variableId);
    }
    /**
     * Check if variable exists
     */
    hasVariable(variableId) {
        return this.data.variables.has(variableId);
    }
    /**
     * Get all variables
     */
    getAllVariables() {
        return Object.fromEntries(this.data.variables);
    }
    /**
     * Set node output
     */
    setNodeOutput(nodeId, output) {
        this.data.nodeOutputs.set(nodeId, output);
    }
    /**
     * Get node output
     */
    getNodeOutput(nodeId) {
        return this.data.nodeOutputs.get(nodeId);
    }
    /**
     * Check if node output exists
     */
    hasNodeOutput(nodeId) {
        return this.data.nodeOutputs.has(nodeId);
    }
    /**
     * Get all node outputs
     */
    getAllNodeOutputs() {
        return Object.fromEntries(this.data.nodeOutputs);
    }
    /**
     * Resolve variable expression (used by VariableResolver)
     * New syntax:
     * - @variable_id -> flow variable reference
     * - node_id.field -> node output field reference
     * - node_id -> entire node output object
     */
    resolveExpression(expression) {
        // Check if it's a variable reference with @ prefix
        if (expression.startsWith("@")) {
            const variableId = expression.substring(1);
            return this.getVariable(variableId);
        }
        // Otherwise, it's a node output reference
        const parts = expression.split(".");
        if (parts.length === 1) {
            // Direct node output reference: {{node_id}}
            return this.getNodeOutput(parts[0]);
        }
        else {
            // Node output field reference: {{node_id.property}}
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
                }
                else {
                    return undefined;
                }
            }
            return current;
        }
    }
    /**
     * Set current executing node (for debugging/monitoring)
     */
    setCurrentNode(nodeId) {
        this.data.metadata.currentNode = nodeId;
    }
    /**
     * Get execution metadata
     */
    getMetadata() {
        return Object.assign({}, this.data.metadata);
    }
    /**
     * Get execution duration
     */
    getExecutionDuration() {
        return Date.now() - this.data.metadata.startTime.getTime();
    }
    /**
     * Create a snapshot of current state (for debugging)
     */
    snapshot() {
        return {
            variables: this.getAllVariables(),
            nodeOutputs: this.getAllNodeOutputs(),
            metadata: this.getMetadata(),
        };
    }
    /**
     * Clear all data (cleanup)
     */
    clear() {
        this.data.variables.clear();
        this.data.nodeOutputs.clear();
        this.data.metadata.currentNode = undefined;
        this.fileManager.cleanup();
    }
    /**
     * Get registry size (for memory monitoring)
     */
    getSize() {
        return {
            variables: this.data.variables.size,
            nodeOutputs: this.data.nodeOutputs.size,
            totalSize: this.data.variables.size + this.data.nodeOutputs.size,
        };
    }
    /**
     * Validate variable type
     */
    validateVariableType(variableId, value) {
        const variable = this.variableTypes.get(variableId);
        if (!variable || !variable.type) {
            return; // No type specified, skip validation
        }
        switch (variable.type) {
            case "string":
                if (typeof value !== "string") {
                    throw new Error(`Variable '${variableId}' should be a string, but got ${typeof value}`);
                }
                break;
            case "number":
                if (typeof value !== "number") {
                    throw new Error(`Variable '${variableId}' should be a number, but got ${typeof value}`);
                }
                break;
            case "boolean":
                if (typeof value !== "boolean") {
                    throw new Error(`Variable '${variableId}' should be a boolean, but got ${typeof value}`);
                }
                break;
            case "file":
                this.fileManager.validateFileVariable(value, variableId);
                break;
            case "array":
                if (!Array.isArray(value)) {
                    throw new Error(`Variable '${variableId}' should be an array, but got ${typeof value}`);
                }
                break;
            case "object":
                if (typeof value !== "object" ||
                    value === null ||
                    Array.isArray(value)) {
                    throw new Error(`Variable '${variableId}' should be an object, but got ${typeof value}`);
                }
                break;
        }
    }
    /**
     * Register a file and return its ID
     */
    registerFile(filePath) {
        const fileRef = this.fileManager.registerFile(filePath);
        return fileRef.id;
    }
    /**
     * Get file manager instance
     */
    getFileManager() {
        return this.fileManager;
    }
    /**
     * Resolve file variable to file data
     */
    resolveFileVariable(variableId) {
        const value = this.getVariable(variableId);
        const variable = this.variableTypes.get(variableId);
        if ((variable === null || variable === void 0 ? void 0 : variable.type) === "file") {
            if (typeof value === "string" && this.fileManager.hasFile(value)) {
                const fileRef = this.fileManager.getFile(value);
                return Object.assign({ id: value }, fileRef);
            }
        }
        return value;
    }
    /**
     * Get file base64 data for image messages
     */
    getFileBase64(fileId) {
        return this.fileManager.getFileBase64(fileId);
    }
    /**
     * Get file data URL for images
     */
    getFileDataUrl(fileId) {
        return this.fileManager.getFileDataUrl(fileId);
    }
    /**
     * Check if variable is a file type
     */
    isFileVariable(variableId) {
        const variable = this.variableTypes.get(variableId);
        return (variable === null || variable === void 0 ? void 0 : variable.type) === "file";
    }
    /**
     * Check if file is an image
     */
    isImageFile(fileId) {
        return this.fileManager.isImage(fileId);
    }
}
exports.ExecutionRegistry = ExecutionRegistry;
