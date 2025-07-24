/*
 * ToolExecutor
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { MCPTool, MCPToolCall, MCPToolResult } from "../types";
import { MCPClient } from "../client/MCPClient";
import { ToolValidator } from "./ToolValidator";
import { ToolContext } from "./ToolContext";

export class ToolExecutor {
  private client: MCPClient;
  private context: ToolContext;

  constructor(client: MCPClient, context: ToolContext) {
    this.client = client;
    this.context = context;
  }

  public async executeTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    const tool = this.context.getToolByName(toolCall.name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolCall.name}' not found`,
      };
    }

    const resolvedArgs = this.context.resolveArguments(toolCall.arguments);
    const resolvedToolCall: MCPToolCall = {
      name: toolCall.name,
      arguments: resolvedArgs,
    };

    const validation = ToolValidator.validateToolCall(resolvedToolCall, tool);
    if (!validation.valid) {
      return {
        success: false,
        error: `Tool validation failed: ${validation.errors.join(", ")}`,
      };
    }

    try {
      const result = await this.client.callTool(
        tool.serverName,
        resolvedToolCall,
      );

      if (result.success && result.result) {
        this.updateContextFromResult(result.result);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async executeMultipleTools(
    toolCalls: MCPToolCall[],
  ): Promise<MCPToolResult[]> {
    const results: MCPToolResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.executeTool(toolCall);
      results.push(result);

      if (!result.success) {
        break;
      }
    }

    return results;
  }

  public parseToolCallFromResponse(response: string): MCPToolCall | null {
    try {
      let jsonStr = response.trim();

      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7, -3).trim();
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3, -3).trim();
      }

      const parsed = JSON.parse(jsonStr);

      if (
        parsed.tool_call &&
        parsed.tool_call.name &&
        parsed.tool_call.arguments
      ) {
        return {
          name: parsed.tool_call.name,
          arguments: parsed.tool_call.arguments,
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  public parseMultipleToolCalls(response: string): MCPToolCall[] {
    const toolCalls: MCPToolCall[] = [];

    const singleCall = this.parseToolCallFromResponse(response);
    if (singleCall) {
      toolCalls.push(singleCall);
      return toolCalls;
    }

    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            item.tool_call &&
            item.tool_call.name &&
            item.tool_call.arguments
          ) {
            toolCalls.push({
              name: item.tool_call.name,
              arguments: item.tool_call.arguments,
            });
          }
        }
      }
    } catch (error) {}

    return toolCalls;
  }

  public async processLLMResponse(response: string): Promise<{
    hasToolCalls: boolean;
    toolResults?: MCPToolResult[];
    cleanedResponse?: string;
  }> {
    const toolCalls = this.parseMultipleToolCalls(response);

    if (toolCalls.length === 0) {
      return { hasToolCalls: false, cleanedResponse: response };
    }

    const toolResults = await this.executeMultipleTools(toolCalls);

    let cleanedResponse = response;
    try {
      const parsed = JSON.parse(response);
      if (parsed.tool_call) {
        cleanedResponse = "";
      }
    } catch (error) {}

    return {
      hasToolCalls: true,
      toolResults,
      cleanedResponse,
    };
  }

  private updateContextFromResult(result: any): void {
    if (result && typeof result === "object" && result.context_updates) {
      const updates = result.context_updates;
      if (updates.variables) {
        Object.entries(updates.variables).forEach(([key, value]) => {
          this.context.setVariable(key, value);
        });
      }
    }
  }

  public getContext(): ToolContext {
    return this.context;
  }

  public updateContext(updates: any): void {
    this.context.updateContext(updates);
  }
}
