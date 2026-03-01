/*
 * ConversationMemoryNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { BaseNode, NodeExecutionContext } from "../base/BaseNode";
import { FlowNode } from "../../types";

export interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export interface ConversationMemoryConfig {
  operation: "append" | "load" | "clear" | "slice" | "serialize" | "deserialize";
  variable_id: string;
  max_messages?: number;
  slice_start?: number;
  slice_end?: number;
}

export class ConversationMemoryNode extends BaseNode {
  async execute(node: FlowNode, context: NodeExecutionContext): Promise<any> {
    const memoryNode = node as any;
    const config = memoryNode.config as ConversationMemoryConfig;

    if (!config || !config.variable_id) {
      throw new Error("ConversationMemoryNode requires variable_id in config");
    }

    // Get or initialize messages array
    let messages = context.registry.getVariable(config.variable_id) || [];

    switch (config.operation) {
      case "append":
        return this.appendMessage(messages, memoryNode.input, config, context);

      case "load":
        return this.loadMessages(memoryNode.input, config, context);

      case "clear":
        return this.clearMessages(config, context);

      case "slice":
        return this.sliceMessages(messages, config, context);

      case "serialize":
        return this.serializeMessages(messages, context);

      case "deserialize":
        return this.deserializeMessages(memoryNode.input, config, context);

      default:
        throw new Error(`Unknown operation: ${config.operation}`);
    }
  }

  private appendMessage(
    messages: ConversationMessage[],
    input: any,
    config: ConversationMemoryConfig,
    context: NodeExecutionContext
  ): any {
    // Resolve input variables
    const resolvedInput = this.resolveObjectVariables(input, context.registry);

    // Create new message
    const newMessage: ConversationMessage = {
      role: resolvedInput.role || "user",
      content: resolvedInput.content || "",
      timestamp: new Date(),
    };

    // Append to messages array
    messages.push(newMessage);

    // Apply max_messages limit if specified
    if (config.max_messages && messages.length > config.max_messages) {
      // Keep only the most recent messages
      messages = messages.slice(-config.max_messages);
    }

    // Update the variable
    context.registry.setVariable(config.variable_id, messages);

    context.logger.debug(
      `Appended message to conversation. Total messages: ${messages.length}`
    );

    return {
      message_count: messages.length,
      last_message: newMessage,
    };
  }

  private loadMessages(
    input: any,
    config: ConversationMemoryConfig,
    context: NodeExecutionContext
  ): any {
    // Resolve input variables
    const resolvedInput = this.resolveObjectVariables(input, context.registry);

    // Load messages from input
    const messages = resolvedInput.messages || [];

    // Validate messages array
    if (!Array.isArray(messages)) {
      throw new Error("Input messages must be an array");
    }

    // Set the variable
    context.registry.setVariable(config.variable_id, messages);

    context.logger.debug(`Loaded ${messages.length} messages into conversation`);

    return {
      message_count: messages.length,
      loaded: true,
    };
  }

  private clearMessages(
    config: ConversationMemoryConfig,
    context: NodeExecutionContext
  ): any {
    // Clear the messages array
    context.registry.setVariable(config.variable_id, []);

    context.logger.debug("Cleared conversation messages");

    return {
      message_count: 0,
      cleared: true,
    };
  }

  private sliceMessages(
    messages: ConversationMessage[],
    config: ConversationMemoryConfig,
    context: NodeExecutionContext
  ): any {
    const start = config.slice_start || 0;
    const end = config.slice_end || messages.length;

    // Slice the messages array
    const slicedMessages = messages.slice(start, end);

    // Update the variable
    context.registry.setVariable(config.variable_id, slicedMessages);

    context.logger.debug(
      `Sliced messages from ${start} to ${end}. New count: ${slicedMessages.length}`
    );

    return {
      message_count: slicedMessages.length,
      sliced: true,
    };
  }

  private serializeMessages(
    messages: ConversationMessage[],
    context: NodeExecutionContext
  ): any {
    // Serialize messages to JSON string
    const serialized = JSON.stringify(messages);

    context.logger.debug(`Serialized ${messages.length} messages`);

    return {
      serialized,
      message_count: messages.length,
    };
  }

  private deserializeMessages(
    input: any,
    config: ConversationMemoryConfig,
    context: NodeExecutionContext
  ): any {
    // Resolve input variables
    const resolvedInput = this.resolveObjectVariables(input, context.registry);

    // Deserialize messages from JSON string
    const serialized = resolvedInput.serialized || "[]";
    let messages: ConversationMessage[];

    try {
      messages = JSON.parse(serialized, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined;
        }
        return value;
      });
    } catch (error) {
      throw new Error(`Failed to deserialize messages: ${error}`);
    }

    // Validate messages array
    if (!Array.isArray(messages)) {
      throw new Error("Deserialized data must be an array");
    }

    // Set the variable
    context.registry.setVariable(config.variable_id, messages);

    context.logger.debug(`Deserialized ${messages.length} messages`);

    return {
      message_count: messages.length,
      deserialized: true,
    };
  }
}