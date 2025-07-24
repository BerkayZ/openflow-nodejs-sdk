/*
 * FlowExecutor
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import {
  FlowExecutorConfig,
  FlowDefinition,
  ExecutionResult,
  QueuedFlow,
  FlowHooks,
  HookSignal,
} from "../types";
import { FlowValidator } from "../validation/FlowValidator";
import { ExecutionRegistry } from "./ExecutionRegistry";
import { NodeFactory } from "../nodes/base/NodeFactory";
import { NodeExecutionContext } from "../nodes/base/BaseNode";
import { Logger } from "../utils/Logger";

export class FlowExecutor {
  private config: FlowExecutorConfig;
  private executionQueue: QueuedFlow[] = [];
  private runningFlows: Set<string> = new Set();
  private executionCounter = 0;
  private logger: Logger;

  constructor(config: FlowExecutorConfig) {
    this.config = config;
    this.validateConfig();
    this.logger = new Logger(this.config.logLevel || "info");

    NodeFactory.setLogger(this.logger);
    FlowValidator.setLogger(this.logger);
  }

  // ==================== PUBLIC API ====================

  /**
   * Execute a flow and return promise with result
   */
  async executeFlow(
    flowJson: any,
    inputVariables?: Record<string, any>,
    hooks?: FlowHooks,
  ): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      const flowId = this.generateFlowId();

      // Validate flow
      const validation = FlowValidator.validateFlow(flowJson);
      if (!validation.isValid) {
        const errorMessage = `Flow validation failed: ${validation.errors.map((e) => e.message).join(", ")}`;
        reject(new Error(errorMessage));
        return;
      }

      // Validate node types are supported
      const nodeTypes = validation.flow!.nodes.map((node) => node.type);
      const typeValidation = NodeFactory.validateRegistrations(nodeTypes);
      if (!typeValidation.isValid) {
        const errorMessage = `Unsupported node types: ${typeValidation.missing.join(", ")}`;
        reject(new Error(errorMessage));
        return;
      }

      // Queue the flow
      const queuedFlow: QueuedFlow = {
        id: flowId,
        flow: validation.flow!,
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
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    waiting: number;
    running: number;
    activeFlows: string[];
  } {
    return {
      waiting: this.executionQueue.length,
      running: this.runningFlows.size,
      activeFlows: Array.from(this.runningFlows),
    };
  }

  /**
   * Graceful shutdown - wait for running flows to complete
   */
  async shutdown(): Promise<void> {
    this.logger.info("Shutting down FlowExecutor...");

    // Reject all queued flows
    while (this.executionQueue.length > 0) {
      const queuedFlow = this.executionQueue.shift()!;
      queuedFlow.reject(new Error("Executor shutdown"));
    }

    // Wait for running flows to complete (with timeout)
    await this.waitForRunningFlows();

    this.logger.info("FlowExecutor shutdown complete");
  }

  // ==================== PRIVATE EXECUTION LOGIC ====================

  /**
   * Process the execution queue respecting concurrency limits
   */
  private async processQueue(): Promise<void> {
    const availableSlots =
      this.config.concurrency.global_limit - this.runningFlows.size;

    if (availableSlots <= 0 || this.executionQueue.length === 0) {
      return;
    }

    // Start as many flows as we have slots for
    for (let i = 0; i < availableSlots && this.executionQueue.length > 0; i++) {
      const queuedFlow = this.executionQueue.shift()!;
      this.executeFlowInternal(queuedFlow);
    }
  }

  /**
   * Execute a single flow internally
   */
  private async executeFlowInternal(queuedFlow: QueuedFlow): Promise<void> {
    const startTime = Date.now();
    this.runningFlows.add(queuedFlow.id);

    // Create execution registry for this flow
    const registry = new ExecutionRegistry(
      queuedFlow.id,
      queuedFlow.flow,
      this.config.tempDir,
      queuedFlow.inputVariables,
    );

    try {
      this.logger.info(`Starting flow execution: ${queuedFlow.id}`);

      // Get execution order
      const executionOrder = this.getExecutionOrder(queuedFlow.flow);
      this.logger.debug(`Execution order: ${executionOrder.join(" → ")}`);

      // Execute nodes sequentially
      await this.executeNodes(
        executionOrder,
        queuedFlow.flow,
        registry,
        queuedFlow.hooks,
      );

      // Collect outputs
      const outputs = this.collectOutputs(queuedFlow.flow, registry);

      // Success result
      const result: ExecutionResult = {
        success: true,
        flowId: queuedFlow.id,
        executionTime: Date.now() - startTime,
        outputs,
      };

      // Call onComplete hook
      if (queuedFlow.hooks?.onComplete) {
        try {
          await queuedFlow.hooks.onComplete({
            flowId: queuedFlow.id,
            executionTime: result.executionTime,
            outputs,
          });
        } catch (hookError) {
          this.logger.warn(
            `onComplete hook failed: ${hookError instanceof Error ? hookError.message : "Unknown error"}`,
          );
        }
      }

      this.logger.info(
        `Flow ${queuedFlow.id} completed successfully in ${result.executionTime}ms`,
      );
      queuedFlow.resolve(result);
    } catch (error) {
      // Error result
      const result: ExecutionResult = {
        success: false,
        flowId: queuedFlow.id,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error : new Error("Unknown error"),
        outputs: {},
      };

      this.logger.error(
        `Flow ${queuedFlow.id} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      if (result.error) {
        queuedFlow.reject(result.error);
      }
    } finally {
      // Cleanup
      registry.clear();
      this.runningFlows.delete(queuedFlow.id);
      this.processQueue(); // Process next flows in queue
    }
  }

  /**
   * Execute all nodes in order
   */
  private async executeNodes(
    executionOrder: string[],
    flow: FlowDefinition,
    registry: ExecutionRegistry,
    hooks?: FlowHooks,
  ): Promise<void> {
    for (const nodeId of executionOrder) {
      const node = flow.nodes.find((n) => n.id === nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found in flow definition`);
      }

      // Call beforeNode hook
      if (hooks?.beforeNode) {
        try {
          await hooks.beforeNode({
            node,
            flowId: registry.getMetadata().flowId,
          });
        } catch (hookError) {
          this.logger.warn(
            `beforeNode hook failed: ${hookError instanceof Error ? hookError.message : "Unknown error"}`,
          );
        }
      }

      this.logger.info(`Executing node: ${nodeId} (${node.type})`);

      try {
        const nodeStartTime = Date.now();
        const result = await this.executeNode(node, registry);

        if (!result.success) {
          throw result.error || new Error("Node execution failed");
        }

        // Store node output in registry
        registry.setNodeOutput(nodeId, result.output);

        const nodeExecutionTime = Date.now() - nodeStartTime;
        this.logger.info(`Node ${nodeId} completed in ${nodeExecutionTime}ms`);

        // Call afterNode hook
        if (hooks?.afterNode) {
          try {
            const signal = await hooks.afterNode({
              node,
              flowId: registry.getMetadata().flowId,
              executionTime: nodeExecutionTime,
            });
            if (signal === HookSignal.STOP) {
              this.logger.info(
                `Flow execution stopped by afterNode hook at node ${nodeId}`,
              );
              break;
            }
          } catch (hookError) {
            this.logger.warn(
              `afterNode hook failed: ${hookError instanceof Error ? hookError.message : "Unknown error"}`,
            );
          }
        }
      } catch (error) {
        const errorMessage = `Node ${nodeId} execution failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        this.logger.error(errorMessage);

        // Call onError hook
        if (hooks?.onError) {
          try {
            const signal = await hooks.onError({
              error: error instanceof Error ? error : new Error(errorMessage),
              node,
              flowId: registry.getMetadata().flowId,
            });
            if (signal === HookSignal.CONTINUE) {
              this.logger.info(
                `Flow execution continuing after error in node ${nodeId} due to onError hook`,
              );
              continue;
            }
          } catch (hookError) {
            this.logger.warn(
              `onError hook failed: ${hookError instanceof Error ? hookError.message : "Unknown error"}`,
            );
          }
        }

        throw new Error(errorMessage);
      }
    }
  }

  /**
   * Execute a single node using NodeFactory
   */
  private async executeNode(
    node: any,
    registry: ExecutionRegistry,
  ): Promise<any> {
    try {
      // Create node executor using factory
      const nodeExecutor = NodeFactory.create(node.type);

      // Create execution context
      const context: NodeExecutionContext = {
        registry,
        flowId: registry.getMetadata().flowId,
        logger: this.logger,
        config: this.config,
      };

      // Execute node with context
      return await nodeExecutor.executeWithContext(node, context);
    } catch (error) {
      throw new Error(
        `Failed to execute node ${node.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get execution order from flow validation
   */
  private getExecutionOrder(flow: FlowDefinition): string[] {
    const validation = FlowValidator.validateFlow(flow);
    const executionOrder = validation.dependencyGraph?.executionOrder || [];

    if (executionOrder.length === 0) {
      throw new Error(
        "No execution order determined - possible circular dependency",
      );
    }

    return executionOrder;
  }

  /**
   * Collect output variables from registry
   */
  private collectOutputs(
    flow: FlowDefinition,
    registry: ExecutionRegistry,
  ): Record<string, any> {
    const outputs: Record<string, any> = {};

    for (const outputVarId of flow.output || []) {
      outputs[outputVarId] = registry.getVariable(outputVarId);
    }

    return outputs;
  }

  /**
   * Generate unique flow ID
   */
  private generateFlowId(): string {
    const timestamp = Date.now();
    const counter = ++this.executionCounter;
    return `${timestamp}_${counter}`;
  }

  /**
   * Validate executor configuration
   */
  private validateConfig(): void {
    if (!this.config.concurrency || this.config.concurrency.global_limit <= 0) {
      throw new Error(
        "Invalid concurrency configuration: global_limit must be > 0",
      );
    }
  }

  /**
   * Wait for running flows to complete with timeout
   */
  private async waitForRunningFlows(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (this.runningFlows.size > 0 && attempts < maxAttempts) {
      this.logger.info(
        `Waiting for ${this.runningFlows.size} flows to complete...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (this.runningFlows.size > 0) {
      this.logger.warn(
        `Force stopping ${this.runningFlows.size} flows after timeout`,
      );
    }
  }
}
