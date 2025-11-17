/*
 * LLMNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { LLMNode, FlowNode } from "../../types";
import { BaseNode, NodeExecutionContext } from "../base/BaseNode";
import { ProviderFactory, LLMMessage } from "./providers";
import { OutputFormatter } from "./OutputFormatter";
import { MCPProvider, MCPConfig } from "../../mcp";

export class LLMNodeExecutor extends BaseNode {
  private mcpProvider?: MCPProvider;

  /**
   * Execute LLM node
   */
  async execute(node: FlowNode, context: NodeExecutionContext): Promise<any> {
    const llmNode = node as LLMNode;

    // Resolve config variables
    const resolvedConfig = this.resolveConfigVariables(
      llmNode.config,
      context.registry,
    );

    this.log(
      context,
      "info",
      `Executing LLM node: ${llmNode.id} with provider: ${resolvedConfig.provider}`,
    );

    // Initialize MCP if configured
    if (resolvedConfig.mcp_servers && resolvedConfig.mcp_servers.length > 0) {
      await this.initializeMCP(llmNode, context, resolvedConfig);
    }

    // Resolve variables in messages
    const resolvedMessages = this.resolveMessages(llmNode, context);

    // Convert messages to provider format
    let providerMessages = this.convertToProviderMessages(resolvedMessages);

    // Inject MCP tool prompt if available
    if (this.mcpProvider && this.mcpProvider.isInitialized()) {
      providerMessages = this.injectMCPToolPrompt(providerMessages);
    }

    this.log(context, "debug", `Resolved messages:`, providerMessages);

    // Get provider configuration from context
    const providerConfig = this.getProviderConfig(
      resolvedConfig.provider,
      context,
    );

    // Create provider instance
    const provider = ProviderFactory.createProvider(
      resolvedConfig,
      providerConfig.apiKey,
    );

    // Generate completion with MCP tool support
    const response = await this.generateCompletionWithMCP(
      provider,
      providerMessages,
      llmNode.output,
      context,
    );
    this.log(context, "debug", `Raw LLM response:`, response.content);

    // Parse and validate the response
    const parsedOutput = this.parseProviderResponse(response.content);
    const validatedOutput = OutputFormatter.validateAndFormat(
      parsedOutput,
      llmNode.output,
    );

    this.log(
      context,
      "info",
      `LLM node completed successfully. Tokens used: ${response.usage?.total_tokens || "unknown"}`,
    );

    return validatedOutput;
  }

  /**
   * Get provider configuration from context
   */
  private getProviderConfig(
    providerName: string,
    context: NodeExecutionContext,
  ): any {
    if (!context.config.providers?.llm) {
      throw new Error("No LLM providers configured in FlowExecutorConfig");
    }

    const providerConfig =
      context.config.providers.llm[providerName.toLowerCase()];
    if (!providerConfig) {
      throw new Error(
        `Provider configuration not found for: ${providerName}. Available providers: ${Object.keys(context.config.providers.llm).join(", ")}`,
      );
    }

    if (!providerConfig.apiKey) {
      throw new Error(
        `API key not configured for provider: ${providerName} in FlowExecutorConfig`,
      );
    }

    return providerConfig;
  }

  /**
   * Resolve variables in messages
   */
  private resolveMessages(
    llmNode: LLMNode,
    context: NodeExecutionContext,
  ): any[] {
    return llmNode.messages.map((message) => {
      if (message.type === "text") {
        return {
          ...message,
          text: this.resolveVariables(message.text, context.registry),
        };
      } else if (message.type === "image") {
        const resolvedMessage = { ...message };

        // Handle image_url (could be a file ID or URL)
        if (message.image_url) {
          const resolvedUrl = this.resolveVariables(
            message.image_url,
            context.registry,
          );

          // Check if it's a file ID
          if (
            typeof resolvedUrl === "string" &&
            context.registry.getFileManager().hasFile(resolvedUrl)
          ) {
            // It's a file ID, convert to data URL
            resolvedMessage.image_data =
              context.registry.getFileDataUrl(resolvedUrl);
            resolvedMessage.image_url = undefined; // Clear the URL since we have data
          } else {
            resolvedMessage.image_url = resolvedUrl;
          }
        }

        // Handle image_path (could be a file ID or path)
        if (message.image_path) {
          const resolvedPath = this.resolveVariables(
            message.image_path,
            context.registry,
          );

          // Check if it's a file ID
          if (
            typeof resolvedPath === "string" &&
            context.registry.getFileManager().hasFile(resolvedPath)
          ) {
            // It's a file ID, convert to data URL
            resolvedMessage.image_data =
              context.registry.getFileDataUrl(resolvedPath);
            resolvedMessage.image_path = undefined; // Clear the path since we have data
          } else {
            resolvedMessage.image_path = resolvedPath;
          }
        }

        // Handle direct image_data
        if (message.image_data) {
          const resolvedData = this.resolveVariables(
            message.image_data,
            context.registry,
          );

          // Check if it's a file ID
          if (
            typeof resolvedData === "string" &&
            context.registry.getFileManager().hasFile(resolvedData)
          ) {
            // It's a file ID, convert to data URL
            resolvedMessage.image_data =
              context.registry.getFileDataUrl(resolvedData);
          } else {
            resolvedMessage.image_data = resolvedData;
          }
        }

        return resolvedMessage;
      }
      return message;
    });
  }

  /**
   * Convert internal messages to provider format
   */
  private convertToProviderMessages(messages: any[]): LLMMessage[] {
    return messages.map((msg) => {
      if (msg.type === "text") {
        return {
          role: msg.role,
          content: msg.text,
        };
      } else if (msg.type === "image") {
        // For image messages, we need to create a multimodal message
        const content: any = [];

        // Add text content if available
        if (msg.text) {
          content.push({
            type: "text",
            text: msg.text,
          });
        }

        // Add image content
        if (msg.image_data) {
          content.push({
            type: "image_url",
            image_url: {
              url: msg.image_data,
              detail: "high",
            },
          });
        } else if (msg.image_url) {
          content.push({
            type: "image_url",
            image_url: {
              url: msg.image_url,
              detail: "high",
            },
          });
        }

        return {
          role: msg.role,
          content: content,
        };
      }

      return {
        role: msg.role,
        content: msg.content || "",
      };
    });
  }

  /**
   * Initialize MCP Provider
   */
  private async initializeMCP(
    llmNode: LLMNode,
    context: NodeExecutionContext,
    resolvedConfig: any,
  ): Promise<void> {
    if (!resolvedConfig.mcp_servers) {
      return;
    }

    this.log(
      context,
      "info",
      `Initializing MCP with ${resolvedConfig.mcp_servers.length} servers`,
    );

    const mcpConfig: MCPConfig = {
      mcp_servers: resolvedConfig.mcp_servers,
      tools: resolvedConfig.tools || {
        auto_discover: true,
        mcp_servers: resolvedConfig.mcp_servers.map((server: any) => server.name),
      },
    };

    this.mcpProvider = new MCPProvider();
    await this.mcpProvider.initialize(mcpConfig);

    // Set current variables in MCP context
    const variables = context.registry.getAllVariables();
    Object.entries(variables).forEach(([key, value]) => {
      this.mcpProvider?.setVariable(key, value);
    });

    this.log(
      context,
      "info",
      `MCP initialized with ${this.mcpProvider.getAvailableTools().length} tools`,
    );
  }

  /**
   * Inject MCP tool prompt into messages
   */
  private injectMCPToolPrompt(messages: LLMMessage[]): LLMMessage[] {
    if (!this.mcpProvider) {
      return messages;
    }

    const toolPrompt = this.mcpProvider.getToolPrompt();
    if (!toolPrompt) {
      return messages;
    }

    const enhancedMessages = [...messages];

    // Add tool prompt to system message or create new one
    if (enhancedMessages.length > 0 && enhancedMessages[0].role === "system") {
      const systemMessage = enhancedMessages[0];
      if (typeof systemMessage.content === "string") {
        enhancedMessages[0] = {
          ...systemMessage,
          content: `${systemMessage.content}\n\n${toolPrompt}`,
        };
      }
    } else {
      enhancedMessages.unshift({
        role: "system",
        content: toolPrompt,
      });
    }

    return enhancedMessages;
  }

  /**
   * Generate completion with MCP tool support
   */
  private async generateCompletionWithMCP(
    provider: any,
    messages: LLMMessage[],
    outputSchema: any,
    context: NodeExecutionContext,
  ): Promise<any> {
    if (!this.mcpProvider || !this.mcpProvider.isInitialized()) {
      return await provider.generateCompletion(messages, outputSchema);
    }

    const maxIterations = 5;
    let currentMessages = messages;
    let iteration = 0;
    let totalTokens = 0;

    while (iteration < maxIterations) {
      const response = await provider.generateCompletion(
        currentMessages,
        outputSchema,
      );
      totalTokens += response.usage?.total_tokens || 0;

      this.log(
        context,
        "debug",
        `MCP iteration ${iteration + 1}: checking for tool calls`,
      );

      // Check if response contains tool calls
      const toolProcessingResult = await this.mcpProvider.processLLMResponse(
        response.content,
      );

      if (!toolProcessingResult.hasToolCalls) {
        this.log(
          context,
          "debug",
          `No tool calls found, returning final response`,
        );
        return {
          ...response,
          usage: {
            ...response.usage,
            total_tokens: totalTokens,
          },
        };
      }

      this.log(
        context,
        "info",
        `Processing ${toolProcessingResult.toolResults?.length || 0} tool calls`,
      );

      // Add tool results to conversation
      if (toolProcessingResult.toolResults) {
        currentMessages = this.addToolResultsToMessages(
          currentMessages,
          response.content,
          toolProcessingResult.toolResults,
        );

        // Update variables in context from tool results
        this.updateVariablesFromToolResults(
          toolProcessingResult.toolResults,
          context,
        );
      }

      iteration++;
    }

    throw new Error(`Maximum MCP tool iterations (${maxIterations}) exceeded`);
  }

  /**
   * Add tool results to message conversation
   */
  private addToolResultsToMessages(
    messages: LLMMessage[],
    assistantResponse: string,
    toolResults: any[],
  ): LLMMessage[] {
    const newMessages = [...messages];

    // Add assistant response
    newMessages.push({
      role: "assistant",
      content: assistantResponse,
    });

    // Add tool results
    const toolResultsText = toolResults
      .map((result, index) => {
        if (result.success) {
          return `Tool ${index + 1} Result: ${JSON.stringify(result.result, null, 2)}`;
        } else {
          return `Tool ${index + 1} Error: ${result.error}`;
        }
      })
      .join("\n\n");

    newMessages.push({
      role: "user",
      content: `The tool execution results are:\n\n${toolResultsText}\n\nPlease provide your response based on these results. If you need to call more tools, you can do so.`,
    });

    return newMessages;
  }

  /**
   * Update variables from tool results
   */
  private updateVariablesFromToolResults(
    toolResults: any[],
    context: NodeExecutionContext,
  ): void {
    toolResults.forEach((result) => {
      if (
        result.success &&
        result.result &&
        typeof result.result === "object"
      ) {
        if (result.result.variables) {
          Object.entries(result.result.variables).forEach(([key, value]) => {
            context.registry.setVariable(key, value);
            this.mcpProvider?.setVariable(key, value);
          });
        }
      }
    });
  }

  /**
   * Parse provider response (handles JSON in various formats)
   */
  private parseProviderResponse(content: string): any {
    try {
      let jsonStr = content.trim();

      // Handle markdown code blocks
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7, -3).trim();
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3, -3).trim();
      }

      // Handle cases where the response is wrapped in additional text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      return JSON.parse(jsonStr);
    } catch (error) {
      throw new Error(
        `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : String(error)}. Response: ${content}`,
      );
    }
  }
}
