"use strict";
/*
 * FlowExecutor
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowExecutor = void 0;
const types_1 = require("../types");
const FlowValidator_1 = require("../validation/FlowValidator");
const ExecutionRegistry_1 = require("./ExecutionRegistry");
const NodeFactory_1 = require("../nodes/base/NodeFactory");
const Logger_1 = require("../utils/Logger");
// Constants
const MAX_SHUTDOWN_WAIT_SECONDS = 30;
class FlowExecutor {
    constructor(config) {
        this.executionQueue = [];
        this.runningFlows = new Set();
        this.executionCounter = 0;
        this.queueLock = Promise.resolve();
        this.config = config;
        this.validateConfig();
        this.logger = new Logger_1.Logger(this.config.logLevel || "info");
        NodeFactory_1.NodeFactory.setLogger(this.logger);
        FlowValidator_1.FlowValidator.setLogger(this.logger);
    }
    // ==================== PUBLIC API ====================
    /**
     * Execute a flow and return promise with result
     */
    executeFlow(flowJson, inputVariables, hooks) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const flowId = this.generateFlowId();
                // Validate flow
                const validation = FlowValidator_1.FlowValidator.validateFlow(flowJson);
                if (!validation.isValid) {
                    const errorMessage = `Flow validation failed: ${validation.errors.map((e) => e.message).join(", ")}`;
                    reject(new Error(errorMessage));
                    return;
                }
                // Validate node types are supported
                const nodeTypes = validation.flow.nodes.map((node) => node.type);
                const typeValidation = NodeFactory_1.NodeFactory.validateRegistrations(nodeTypes);
                if (!typeValidation.isValid) {
                    const errorMessage = `Unsupported node types: ${typeValidation.missing.join(", ")}`;
                    reject(new Error(errorMessage));
                    return;
                }
                // Queue the flow
                const queuedFlow = {
                    id: flowId,
                    flow: validation.flow,
                    timestamp: new Date(),
                    resolve,
                    reject,
                    inputVariables,
                    hooks,
                };
                this.executionQueue.push(queuedFlow);
                this.logger.info(`Flow ${flowId} queued for execution`);
                this.processQueue();
            });
        });
    }
    /**
     * Execute a flow with streaming support
     * Returns an async generator that yields execution chunks
     */
    executeFlowStream(flowJson, inputVariables, hooks) {
        return __asyncGenerator(this, arguments, function* executeFlowStream_1() {
            var _a, e_1, _b, _c;
            const flowId = this.generateFlowId();
            const startTime = Date.now();
            // Validate flow
            const validation = FlowValidator_1.FlowValidator.validateFlow(flowJson);
            if (!validation.isValid) {
                const errorMessage = `Flow validation failed: ${validation.errors.map((e) => e.message).join(", ")}`;
                yield yield __await({
                    type: "error",
                    error: new Error(errorMessage),
                });
                return yield __await(void 0);
            }
            // Validate node types are supported
            const nodeTypes = validation.flow.nodes.map((node) => node.type);
            const typeValidation = NodeFactory_1.NodeFactory.validateRegistrations(nodeTypes);
            if (!typeValidation.isValid) {
                const errorMessage = `Unsupported node types: ${typeValidation.missing.join(", ")}`;
                yield yield __await({
                    type: "error",
                    error: new Error(errorMessage),
                });
                return yield __await(void 0);
            }
            const flow = validation.flow;
            const registry = new ExecutionRegistry_1.ExecutionRegistry(flowId, flow, this.config.tempDir, inputVariables);
            try {
                // Execute nodes in order with streaming
                const executionOrder = this.getExecutionOrder(flow);
                for (const nodeId of executionOrder) {
                    const node = flow.nodes.find((n) => n.id === nodeId);
                    if (!node)
                        continue;
                    // Notify node start
                    yield yield __await({
                        type: "node_start",
                        nodeId: node.id,
                    });
                    // Check if this is an LLM node that supports streaming
                    if (node.type === "LLM" && this.config.enableStreaming !== false) {
                        // Stream LLM responses
                        const nodeExecutor = NodeFactory_1.NodeFactory.create(node.type);
                        const context = {
                            registry,
                            flowId,
                            logger: this.logger,
                            config: this.config,
                        };
                        // Check if the node executor has a streaming method
                        const llmNode = nodeExecutor;
                        if (llmNode.executeStream) {
                            const streamGenerator = llmNode.executeStream(node, context);
                            try {
                                for (var _d = true, streamGenerator_1 = (e_1 = void 0, __asyncValues(streamGenerator)), streamGenerator_1_1; streamGenerator_1_1 = yield __await(streamGenerator_1.next()), _a = streamGenerator_1_1.done, !_a; _d = true) {
                                    _c = streamGenerator_1_1.value;
                                    _d = false;
                                    const chunk = _c;
                                    yield yield __await({
                                        type: "stream_chunk",
                                        nodeId: node.id,
                                        content: chunk.content,
                                        isComplete: chunk.isComplete,
                                    });
                                }
                            }
                            catch (e_1_1) { e_1 = { error: e_1_1 }; }
                            finally {
                                try {
                                    if (!_d && !_a && (_b = streamGenerator_1.return)) yield __await(_b.call(streamGenerator_1));
                                }
                                finally { if (e_1) throw e_1.error; }
                            }
                        }
                        else {
                            // Fallback to non-streaming execution
                            const result = yield __await(nodeExecutor.executeWithContext(node, context));
                            if (!result.success) {
                                throw result.error || new Error("Node execution failed");
                            }
                            if (node.output && result.output) {
                                registry.setNodeOutput(node.id, result.output);
                            }
                        }
                    }
                    else {
                        // Regular node execution
                        const result = yield __await(this.executeNode(node, registry));
                        if (!result.success) {
                            throw result.error || new Error("Node execution failed");
                        }
                    }
                    // Notify node completion
                    yield yield __await({
                        type: "node_complete",
                        nodeId: node.id,
                    });
                }
                // Collect output variables
                const outputs = {};
                if (flow.output) {
                    for (const outputVar of flow.output) {
                        outputs[outputVar] = registry.getVariable(outputVar);
                    }
                }
                // Flow complete
                yield yield __await({
                    type: "flow_complete",
                    outputs,
                    executionTime: Date.now() - startTime,
                });
            }
            catch (error) {
                yield yield __await({
                    type: "error",
                    error: error instanceof Error ? error : new Error(String(error)),
                });
            }
        });
    }
    /**
     * Get current queue status
     */
    getQueueStatus() {
        return {
            waiting: this.executionQueue.length,
            running: this.runningFlows.size,
            activeFlows: Array.from(this.runningFlows),
        };
    }
    /**
     * Graceful shutdown - wait for running flows to complete
     */
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info("Shutting down FlowExecutor...");
            // Reject all queued flows
            while (this.executionQueue.length > 0) {
                const queuedFlow = this.executionQueue.shift();
                queuedFlow.reject(new Error("Executor shutdown"));
            }
            // Wait for running flows to complete (with timeout)
            yield this.waitForRunningFlows();
            this.logger.info("FlowExecutor shutdown complete");
        });
    }
    // ==================== PRIVATE EXECUTION LOGIC ====================
    /**
     * Process the execution queue respecting concurrency limits
     */
    processQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            this.queueLock = this.queueLock.then(() => __awaiter(this, void 0, void 0, function* () {
                const availableSlots = this.config.concurrency.global_limit - this.runningFlows.size;
                if (availableSlots <= 0 || this.executionQueue.length === 0) {
                    return;
                }
                // Start as many flows as we have slots for
                for (let i = 0; i < availableSlots && this.executionQueue.length > 0; i++) {
                    const queuedFlow = this.executionQueue.shift();
                    this.executeFlowInternal(queuedFlow);
                }
            }));
            return this.queueLock;
        });
    }
    /**
     * Execute a single flow internally
     */
    executeFlowInternal(queuedFlow) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const startTime = Date.now();
            this.runningFlows.add(queuedFlow.id);
            // Create execution registry for this flow
            const registry = new ExecutionRegistry_1.ExecutionRegistry(queuedFlow.id, queuedFlow.flow, this.config.tempDir, queuedFlow.inputVariables);
            try {
                this.logger.info(`Starting flow execution: ${queuedFlow.id}`);
                // Get execution order
                const executionOrder = this.getExecutionOrder(queuedFlow.flow);
                this.logger.debug(`Execution order: ${executionOrder.join(" â†’ ")}`);
                // Execute nodes sequentially
                yield this.executeNodes(executionOrder, queuedFlow.flow, registry, queuedFlow.hooks);
                // Collect outputs
                const outputs = this.collectOutputs(queuedFlow.flow, registry);
                // Success result
                const result = {
                    success: true,
                    flowId: queuedFlow.id,
                    executionTime: Date.now() - startTime,
                    outputs,
                };
                // Call onComplete hook
                if ((_a = queuedFlow.hooks) === null || _a === void 0 ? void 0 : _a.onComplete) {
                    try {
                        yield queuedFlow.hooks.onComplete({
                            flowId: queuedFlow.id,
                            executionTime: result.executionTime,
                            outputs,
                            nodeOutputs: registry.getAllNodeOutputs(),
                        });
                    }
                    catch (hookError) {
                        this.logger.warn(`onComplete hook failed: ${hookError instanceof Error ? hookError.message : "Unknown error"}`);
                    }
                }
                this.logger.info(`Flow ${queuedFlow.id} completed successfully in ${result.executionTime}ms`);
                queuedFlow.resolve(result);
            }
            catch (error) {
                // Error result
                const result = {
                    success: false,
                    flowId: queuedFlow.id,
                    executionTime: Date.now() - startTime,
                    error: error instanceof Error ? error : new Error("Unknown error"),
                    outputs: {},
                };
                this.logger.error(`Flow ${queuedFlow.id} failed: ${error instanceof Error ? error.message : "Unknown error"}`);
                if (result.error) {
                    queuedFlow.reject(result.error);
                }
            }
            finally {
                // Cleanup
                registry.clear();
                this.runningFlows.delete(queuedFlow.id);
                this.processQueue(); // Process next flows in queue
            }
        });
    }
    /**
     * Execute all nodes in order
     */
    executeNodes(executionOrder, flow, registry, hooks) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const nodeId of executionOrder) {
                const node = flow.nodes.find((n) => n.id === nodeId);
                if (!node) {
                    throw new Error(`Node ${nodeId} not found in flow definition`);
                }
                // Call beforeNode hook
                if (hooks === null || hooks === void 0 ? void 0 : hooks.beforeNode) {
                    try {
                        yield hooks.beforeNode({
                            node,
                            flowId: registry.getMetadata().flowId,
                        });
                    }
                    catch (hookError) {
                        this.logger.warn(`beforeNode hook failed: ${hookError instanceof Error ? hookError.message : "Unknown error"}`);
                    }
                }
                this.logger.info(`Executing node: ${nodeId} (${node.type})`);
                try {
                    const nodeStartTime = Date.now();
                    const result = yield this.executeNode(node, registry);
                    if (!result.success) {
                        throw result.error || new Error("Node execution failed");
                    }
                    // Store node output in registry
                    registry.setNodeOutput(nodeId, result.output);
                    const nodeExecutionTime = Date.now() - nodeStartTime;
                    this.logger.info(`Node ${nodeId} completed in ${nodeExecutionTime}ms`);
                    // Call afterNode hook
                    if (hooks === null || hooks === void 0 ? void 0 : hooks.afterNode) {
                        try {
                            const signal = yield hooks.afterNode({
                                node,
                                flowId: registry.getMetadata().flowId,
                                executionTime: nodeExecutionTime,
                                output: result.output,
                            });
                            if (signal === types_1.HookSignal.STOP) {
                                this.logger.info(`Flow execution stopped by afterNode hook at node ${nodeId}`);
                                break;
                            }
                        }
                        catch (hookError) {
                            this.logger.warn(`afterNode hook failed: ${hookError instanceof Error ? hookError.message : "Unknown error"}`);
                        }
                    }
                }
                catch (error) {
                    const errorMessage = `Node ${nodeId} execution failed: ${error instanceof Error ? error.message : "Unknown error"}`;
                    this.logger.error(errorMessage);
                    // Call onError hook
                    if (hooks === null || hooks === void 0 ? void 0 : hooks.onError) {
                        try {
                            const signal = yield hooks.onError({
                                error: error instanceof Error ? error : new Error(errorMessage),
                                node,
                                flowId: registry.getMetadata().flowId,
                            });
                            if (signal === types_1.HookSignal.CONTINUE) {
                                this.logger.info(`Flow execution continuing after error in node ${nodeId} due to onError hook`);
                                continue;
                            }
                        }
                        catch (hookError) {
                            this.logger.warn(`onError hook failed: ${hookError instanceof Error ? hookError.message : "Unknown error"}`);
                        }
                    }
                    throw new Error(errorMessage);
                }
            }
        });
    }
    /**
     * Execute a single node using NodeFactory
     */
    executeNode(node, registry) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create node executor using factory
                const nodeExecutor = NodeFactory_1.NodeFactory.create(node.type);
                // Create execution context
                const context = {
                    registry,
                    flowId: registry.getMetadata().flowId,
                    logger: this.logger,
                    config: this.config,
                };
                // Execute node with context
                return yield nodeExecutor.executeWithContext(node, context);
            }
            catch (error) {
                throw new Error(`Failed to execute node ${node.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
            }
        });
    }
    // ==================== HELPER METHODS ====================
    /**
     * Get execution order from flow validation
     */
    getExecutionOrder(flow) {
        var _a;
        const validation = FlowValidator_1.FlowValidator.validateFlow(flow);
        const executionOrder = ((_a = validation.dependencyGraph) === null || _a === void 0 ? void 0 : _a.executionOrder) || [];
        if (executionOrder.length === 0) {
            throw new Error("No execution order determined - possible circular dependency");
        }
        return executionOrder;
    }
    /**
     * Collect output variables from registry
     */
    collectOutputs(flow, registry) {
        const outputs = {};
        for (const outputVarId of flow.output || []) {
            outputs[outputVarId] = registry.getVariable(outputVarId);
        }
        return outputs;
    }
    /**
     * Generate unique flow ID
     */
    generateFlowId() {
        const timestamp = Date.now();
        const counter = ++this.executionCounter;
        return `${timestamp}_${counter}`;
    }
    /**
     * Validate executor configuration
     */
    validateConfig() {
        if (!this.config.concurrency || this.config.concurrency.global_limit <= 0) {
            throw new Error("Invalid concurrency configuration: global_limit must be > 0");
        }
    }
    /**
     * Wait for running flows to complete with timeout
     */
    waitForRunningFlows() {
        return __awaiter(this, void 0, void 0, function* () {
            let attempts = 0;
            const maxAttempts = MAX_SHUTDOWN_WAIT_SECONDS;
            while (this.runningFlows.size > 0 && attempts < maxAttempts) {
                this.logger.info(`Waiting for ${this.runningFlows.size} flows to complete...`);
                yield new Promise((resolve) => setTimeout(resolve, 1000));
                attempts++;
            }
            if (this.runningFlows.size > 0) {
                this.logger.warn(`Force stopping ${this.runningFlows.size} flows after timeout`);
            }
        });
    }
}
exports.FlowExecutor = FlowExecutor;
