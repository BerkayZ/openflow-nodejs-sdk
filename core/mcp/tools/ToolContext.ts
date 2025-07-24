/*
 * ToolContext
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { MCPTool, MCPExecutionContext } from "../types";

export class ToolContext {
  private context: MCPExecutionContext;

  constructor(context: MCPExecutionContext) {
    this.context = context;
  }

  public getVariable(name: string): any {
    return this.context.variables[name];
  }

  public setVariable(name: string, value: any): void {
    this.context.variables[name] = value;
  }

  public getVariables(): Record<string, any> {
    return { ...this.context.variables };
  }

  public resolveVariables(text: string): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const value = this.getVariable(variableName.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  public resolveArguments(args: any): any {
    if (typeof args === "string") {
      return this.resolveVariables(args);
    }

    if (Array.isArray(args)) {
      return args.map((arg) => this.resolveArguments(arg));
    }

    if (args && typeof args === "object") {
      const resolved: any = {};
      for (const [key, value] of Object.entries(args)) {
        resolved[key] = this.resolveArguments(value);
      }
      return resolved;
    }

    return args;
  }

  public getAvailableTools(): MCPTool[] {
    return this.context.tools;
  }

  public getToolByName(name: string): MCPTool | undefined {
    return this.context.tools.find((tool) => tool.name === name);
  }

  public getToolsByServer(serverName: string): MCPTool[] {
    return this.context.tools.filter((tool) => tool.serverName === serverName);
  }

  public createToolPrompt(): string {
    if (this.context.tools.length === 0) {
      return "";
    }

    const toolDescriptions = this.context.tools
      .map((tool) => {
        const params = this.formatToolParameters(tool.inputSchema);
        return `- ${tool.name}: ${tool.description}${params ? `\n  Parameters: ${params}` : ""}`;
      })
      .join("\n");

    return `You have access to the following tools:

${toolDescriptions}

To use a tool, respond with a JSON object in this format:
{
  "tool_call": {
    "name": "tool_name",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    }
  }
}

Make sure to include the "tool_call" key and provide all required parameters.`;
  }

  private formatToolParameters(schema: any): string {
    if (!schema || !schema.properties) {
      return "";
    }

    const params: string[] = [];
    const required = schema.required || [];

    for (const [name, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as any;
      const isRequired = required.includes(name);
      const type = prop.type || "any";
      const description = prop.description || "";

      let paramStr = `${name} (${type}${isRequired ? ", required" : ", optional"})`;
      if (description) {
        paramStr += `: ${description}`;
      }

      params.push(paramStr);
    }

    return params.join(", ");
  }

  public updateContext(updates: Partial<MCPExecutionContext>): void {
    if (updates.tools) {
      this.context.tools = updates.tools;
    }
    if (updates.variables) {
      this.context.variables = {
        ...this.context.variables,
        ...updates.variables,
      };
    }
    if (updates.serverConfigs) {
      this.context.serverConfigs = updates.serverConfigs;
    }
  }

  public clone(): ToolContext {
    return new ToolContext({
      tools: [...this.context.tools],
      variables: { ...this.context.variables },
      serverConfigs: [...this.context.serverConfigs],
    });
  }
}
