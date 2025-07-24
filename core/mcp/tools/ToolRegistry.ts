/*
 * ToolRegistry
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { MCPTool, MCPToolsConfig } from "../types";
import { MCPClient } from "../client/MCPClient";
import { ToolValidator } from "./ToolValidator";

export class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();
  private serverTools: Map<string, MCPTool[]> = new Map();
  private builtinTools: Map<string, MCPTool> = new Map();
  private client: MCPClient;

  constructor(client: MCPClient) {
    this.client = client;
    this.initializeBuiltinTools();
  }

  private initializeBuiltinTools(): void {
    const builtinToolsDefinitions: MCPTool[] = [
      {
        name: "set_variable",
        description: "Set a variable value in the execution context",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Variable name" },
            value: { description: "Variable value" },
          },
          required: ["name", "value"],
        },
        serverName: "builtin",
      },
      {
        name: "get_variable",
        description: "Get a variable value from the execution context",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Variable name" },
          },
          required: ["name"],
        },
        serverName: "builtin",
      },
    ];

    builtinToolsDefinitions.forEach((tool) => {
      this.builtinTools.set(tool.name, tool);
    });
  }

  public async discoverTools(config: MCPToolsConfig): Promise<void> {
    this.tools.clear();
    this.serverTools.clear();

    if (config.mcp_servers) {
      await this.discoverMCPServerTools(config.mcp_servers, config);
    }

    if (config.builtin_tools) {
      this.addBuiltinTools(config.builtin_tools);
    }

    if (config.available_tools) {
      this.filterAvailableTools(config.available_tools);
    }

    if (config.filter) {
      this.applyFilters(config.filter);
    }
  }

  private async discoverMCPServerTools(
    serverNames: string[],
    config: MCPToolsConfig,
  ): Promise<void> {
    for (const serverName of serverNames) {
      try {
        const serverTools = await this.client.listTools(serverName);
        const validTools = serverTools.filter((tool) =>
          ToolValidator.validateTool(tool),
        );

        this.serverTools.set(serverName, validTools);

        if (config.auto_discover !== false) {
          validTools.forEach((tool) => {
            this.tools.set(tool.name, tool);
          });
        }
      } catch (error) {
        console.warn(
          `Failed to discover tools for server ${serverName}:`,
          error,
        );
      }
    }
  }

  private addBuiltinTools(builtinToolNames: string[]): void {
    builtinToolNames.forEach((toolName) => {
      const tool = this.builtinTools.get(toolName);
      if (tool) {
        this.tools.set(toolName, tool);
      } else {
        console.warn(`Builtin tool '${toolName}' not found`);
      }
    });
  }

  private filterAvailableTools(availableTools: string[]): void {
    const filteredTools = new Map<string, MCPTool>();

    availableTools.forEach((toolName) => {
      const tool = this.tools.get(toolName);
      if (tool) {
        filteredTools.set(toolName, tool);
      }
    });

    this.tools = filteredTools;
  }

  private applyFilters(filters: string[]): void {
    const filteredTools = new Map<string, MCPTool>();

    this.tools.forEach((tool, name) => {
      const matchesFilter = filters.some((filter) => {
        const regex = new RegExp(filter.replace(/\*/g, ".*"), "i");
        return regex.test(name);
      });

      if (matchesFilter) {
        filteredTools.set(name, tool);
      }
    });

    this.tools = filteredTools;
  }

  public getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  public getToolsByServer(serverName: string): MCPTool[] {
    return Array.from(this.tools.values()).filter(
      (tool) => tool.serverName === serverName,
    );
  }

  public getServerTools(serverName: string): MCPTool[] {
    return this.serverTools.get(serverName) || [];
  }

  public getBuiltinTools(): MCPTool[] {
    return Array.from(this.builtinTools.values());
  }

  public hasTools(): boolean {
    return this.tools.size > 0;
  }

  public getToolCount(): number {
    return this.tools.size;
  }

  public getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  public addTool(tool: MCPTool): void {
    if (ToolValidator.validateTool(tool)) {
      this.tools.set(tool.name, tool);
    } else {
      throw new Error(`Invalid tool: ${tool.name}`);
    }
  }

  public removeTool(name: string): boolean {
    return this.tools.delete(name);
  }

  public clearTools(): void {
    this.tools.clear();
  }

  public async refreshTools(): Promise<void> {
    const serverNames = Array.from(this.serverTools.keys());

    for (const serverName of serverNames) {
      try {
        const serverTools = await this.client.listTools(serverName);
        const validTools = serverTools.filter((tool) =>
          ToolValidator.validateTool(tool),
        );

        this.serverTools.set(serverName, validTools);

        validTools.forEach((tool) => {
          this.tools.set(tool.name, tool);
        });
      } catch (error) {
        console.warn(
          `Failed to refresh tools for server ${serverName}:`,
          error,
        );
      }
    }
  }

  public getToolStats(): { total: number; byServer: Record<string, number> } {
    const byServer: Record<string, number> = {};

    this.tools.forEach((tool) => {
      byServer[tool.serverName] = (byServer[tool.serverName] || 0) + 1;
    });

    return {
      total: this.tools.size,
      byServer,
    };
  }
}
