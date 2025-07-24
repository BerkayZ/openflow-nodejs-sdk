/*
 * MCPProvider
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import {
  MCPConfig,
  MCPServerConfig,
  MCPToolsConfig,
  MCPExecutionContext,
} from "../types";
import { MCPClient } from "../client/MCPClient";
import { ToolRegistry } from "../tools/ToolRegistry";
import { ToolExecutor } from "../tools/ToolExecutor";
import { ToolContext } from "../tools/ToolContext";

export class MCPProvider {
  private client: MCPClient;
  private toolRegistry: ToolRegistry;
  private toolExecutor?: ToolExecutor;
  private toolContext?: ToolContext;
  private config?: MCPConfig;

  constructor() {
    this.client = new MCPClient();
    this.toolRegistry = new ToolRegistry(this.client);
  }

  public async initialize(config: MCPConfig): Promise<void> {
    this.config = config;

    config.mcp_servers.forEach((serverConfig) => {
      this.client.addServer(serverConfig);
    });

    await this.client.connectAll();

    const toolsConfig = config.tools || {
      auto_discover: true,
      mcp_servers: config.mcp_servers.map((server) => server.name),
    };

    await this.toolRegistry.discoverTools(toolsConfig);

    const executionContext: MCPExecutionContext = {
      tools: this.toolRegistry.getAllTools(),
      variables: {},
      serverConfigs: config.mcp_servers,
    };

    this.toolContext = new ToolContext(executionContext);
    this.toolExecutor = new ToolExecutor(this.client, this.toolContext);
  }

  public async addServer(serverConfig: MCPServerConfig): Promise<void> {
    this.client.addServer(serverConfig);
    await this.client.connect(serverConfig.name);

    if (this.config) {
      this.config.mcp_servers.push(serverConfig);
      await this.refreshTools();
    }
  }

  public async removeServer(serverName: string): Promise<void> {
    await this.client.disconnect(serverName);

    if (this.config) {
      this.config.mcp_servers = this.config.mcp_servers.filter(
        (server) => server.name !== serverName,
      );
      await this.refreshTools();
    }
  }

  public async refreshTools(): Promise<void> {
    if (!this.config) {
      throw new Error("MCPProvider not initialized");
    }

    const toolsConfig = this.config.tools || {
      auto_discover: true,
      mcp_servers: this.config.mcp_servers.map((server) => server.name),
    };

    await this.toolRegistry.discoverTools(toolsConfig);

    if (this.toolContext) {
      this.toolContext.updateContext({
        tools: this.toolRegistry.getAllTools(),
        serverConfigs: this.config.mcp_servers,
      });
    }
  }

  public getToolExecutor(): ToolExecutor | undefined {
    return this.toolExecutor;
  }

  public getToolContext(): ToolContext | undefined {
    return this.toolContext;
  }

  public getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  public getClient(): MCPClient {
    return this.client;
  }

  public getAvailableTools() {
    return this.toolRegistry.getAllTools();
  }

  public getToolPrompt(): string {
    if (!this.toolContext) {
      return "";
    }
    return this.toolContext.createToolPrompt();
  }

  public async processLLMResponse(response: string) {
    if (!this.toolExecutor) {
      throw new Error("MCPProvider not initialized");
    }
    return await this.toolExecutor.processLLMResponse(response);
  }

  public async getServerStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};
    const connections = this.client.getAllConnectionStatus();

    for (const [serverName, connection] of Object.entries(connections)) {
      const isConnected = await this.client.ping(serverName);
      status[serverName] = {
        ...connection,
        isConnected,
        toolCount: this.toolRegistry.getToolsByServer(serverName).length,
      };
    }

    return status;
  }

  public getStats() {
    return {
      servers: this.config?.mcp_servers.length || 0,
      ...this.toolRegistry.getToolStats(),
    };
  }

  public setVariable(name: string, value: any): void {
    if (!this.toolContext) {
      throw new Error("MCPProvider not initialized");
    }
    this.toolContext.setVariable(name, value);
  }

  public getVariable(name: string): any {
    if (!this.toolContext) {
      throw new Error("MCPProvider not initialized");
    }
    return this.toolContext.getVariable(name);
  }

  public getVariables(): Record<string, any> {
    if (!this.toolContext) {
      throw new Error("MCPProvider not initialized");
    }
    return this.toolContext.getVariables();
  }

  public async disconnect(): Promise<void> {
    if (this.config) {
      for (const server of this.config.mcp_servers) {
        await this.client.disconnect(server.name);
      }
    }
  }

  public isInitialized(): boolean {
    return (
      this.config !== undefined &&
      this.toolExecutor !== undefined &&
      this.toolContext !== undefined
    );
  }
}
