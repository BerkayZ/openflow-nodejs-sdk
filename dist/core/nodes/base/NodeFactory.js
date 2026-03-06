"use strict";
/*
 * NodeFactory
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeFactory = void 0;
const types_1 = require("../../types");
const llm_1 = require("../llm");
const UpdateVariableNode_1 = require("../variable/UpdateVariableNode");
const vector_1 = require("../vector");
const embedding_1 = require("../embedding");
const condition_1 = require("../condition");
const document_1 = require("../document");
const foreach_1 = require("../foreach");
const ConversationMemoryNode_1 = require("../memory/ConversationMemoryNode");
const Logger_1 = require("../../utils/Logger");
class NodeFactory {
    /**
     * Register a node executor for a specific node type
     */
    static register(nodeType, executorClass) {
        NodeFactory.executors.set(nodeType, executorClass);
    }
    /**
     * Create a node executor instance for the given node type
     */
    static create(nodeType) {
        const ExecutorClass = NodeFactory.executors.get(nodeType);
        if (!ExecutorClass) {
            throw new Error(`No executor registered for node type: ${nodeType}`);
        }
        return new ExecutorClass();
    }
    /**
     * Check if a node type is supported
     */
    static isSupported(nodeType) {
        return NodeFactory.executors.has(nodeType);
    }
    /**
     * Get all supported node types
     */
    static getSupportedTypes() {
        return Array.from(NodeFactory.executors.keys());
    }
    /**
     * Get executor class for a node type (for testing/inspection)
     */
    static getExecutorClass(nodeType) {
        return NodeFactory.executors.get(nodeType);
    }
    /**
     * Validate that all required node types are registered
     */
    static validateRegistrations(requiredTypes) {
        const missing = requiredTypes.filter((type) => !NodeFactory.isSupported(type));
        return {
            missing,
            isValid: missing.length === 0,
        };
    }
    /**
     * Set the logger instance to be used by the factory
     */
    static setLogger(logger) {
        NodeFactory.logger = logger;
    }
}
exports.NodeFactory = NodeFactory;
NodeFactory.executors = new Map();
NodeFactory.logger = new Logger_1.Logger();
/**
 * Register node executors
 */
(() => {
    NodeFactory.register(types_1.NodeType.LLM, llm_1.LLMNodeExecutor);
    NodeFactory.register(types_1.NodeType.UPDATE_VARIABLE, UpdateVariableNode_1.UpdateVariableNodeExecutor);
    NodeFactory.register(types_1.NodeType.VECTOR_INSERT, vector_1.VectorInsertNodeExecutor);
    NodeFactory.register(types_1.NodeType.VECTOR_SEARCH, vector_1.VectorSearchNodeExecutor);
    NodeFactory.register(types_1.NodeType.TEXT_EMBEDDING, embedding_1.TextEmbeddingNodeExecutor);
    NodeFactory.register(types_1.NodeType.CONDITION, condition_1.ConditionNodeExecutor);
    NodeFactory.register(types_1.NodeType.DOCUMENT_SPLITTER, document_1.DocumentSplitterNodeExecutor);
    NodeFactory.register(types_1.NodeType.FOR_EACH, foreach_1.ForEachNodeExecutor);
    NodeFactory.register(types_1.NodeType.VECTOR_DELETE, vector_1.VectorDeleteNodeExecutor);
    NodeFactory.register(types_1.NodeType.CONVERSATION_MEMORY, ConversationMemoryNode_1.ConversationMemoryNode);
    // Future node types will be registered here:
    // NodeFactory.register('VECTOR_UPDATE', VectorUpdateNodeExecutor);
    //
})();
