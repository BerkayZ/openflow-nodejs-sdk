/*
 * MCPClient
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import {
  MCPServerConfig,
  MCPRequest,
  MCPResponse,
  MCPTool,
  MCPToolCall,
  MCPToolResult,
} from "../types";
import { MCPConnectionManager } from "./MCPConnection";

export class MCPClient {
  private connectionManager: MCPConnectionManager;
  private requestId: number = 0;

  constructor() {
    this.connectionManager = new MCPConnectionManager();
  }

  public addServer(config: MCPServerConfig): void {
    this.connectionManager.addServer(config);
  }

  public async connect(serverName: string): Promise<void> {
    await this.connectionManager.connect(serverName);
  }

  public async connectAll(): Promise<void> {
    const connections = this.connectionManager.getAllConnections();
    const promises = Object.keys(connections).map((serverName) =>
      this.connectionManager.connect(serverName).catch((error) => {
        console.warn(
          `Failed to connect to server ${serverName}:`,
          error.message,
        );
      }),
    );
    await Promise.allSettled(promises);
  }

  public async disconnect(serverName: string): Promise<void> {
    await this.connectionManager.disconnect(serverName);
  }

  public async listTools(serverName: string): Promise<MCPTool[]> {
    const request: MCPRequest = {
      method: "tools/list",
      id: this.generateRequestId(),
    };

    const response = await this.connectionManager.makeRequest(
      serverName,
      request,
    );

    if (response.error) {
      throw new Error(`Failed to list tools: ${response.error.message}`);
    }

    return (response.result?.tools || []).map((tool: any) => ({
      ...tool,
      serverName,
    }));
  }

  public async listAllTools(): Promise<MCPTool[]> {
    const connections = this.connectionManager.getAllConnections();
    const tools: MCPTool[] = [];

    for (const serverName of Object.keys(connections)) {
      try {
        const serverTools = await this.listTools(serverName);
        tools.push(...serverTools);
      } catch (error) {
        console.warn(`Failed to list tools for server ${serverName}:`, error);
      }
    }

    return tools;
  }

  public async callTool(
    serverName: string,
    toolCall: MCPToolCall,
  ): Promise<MCPToolResult> {
    const request: MCPRequest = {
      method: "tools/call",
      params: {
        name: toolCall.name,
        arguments: toolCall.arguments,
      },
      id: this.generateRequestId(),
    };

    try {
      const response = await this.connectionManager.makeRequest(
        serverName,
        request,
      );

      if (response.error) {
        return {
          success: false,
          error: response.error.message,
        };
      }

      return {
        success: true,
        result: response.result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async getTool(
    serverName: string,
    toolName: string,
  ): Promise<MCPTool | undefined> {
    const tools = await this.listTools(serverName);
    return tools.find((tool) => tool.name === toolName);
  }

  public async findTool(toolName: string): Promise<MCPTool | undefined> {
    const tools = await this.listAllTools();
    return tools.find((tool) => tool.name === toolName);
  }

  public async ping(serverName: string): Promise<boolean> {
    try {
      const request: MCPRequest = {
        method: "ping",
        id: this.generateRequestId(),
      };

      const response = await this.connectionManager.makeRequest(
        serverName,
        request,
      );
      return !response.error;
    } catch (error) {
      return false;
    }
  }

  public async pingAll(): Promise<Record<string, boolean>> {
    const connections = this.connectionManager.getAllConnections();
    const results: Record<string, boolean> = {};

    for (const serverName of Object.keys(connections)) {
      results[serverName] = await this.ping(serverName);
    }

    return results;
  }

  public getConnectionStatus(serverName: string) {
    return this.connectionManager.getConnectionStatus(serverName);
  }

  public getAllConnectionStatus() {
    return this.connectionManager.getAllConnections();
  }

  public isConnected(serverName: string): boolean {
    return this.connectionManager.isConnected(serverName);
  }

  private generateRequestId(): string {
    return `req_${++this.requestId}_${Date.now()}`;
  }
}
