"use strict";
/*
 * ToolContext
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolContext = void 0;
class ToolContext {
    constructor(context) {
        this.context = context;
    }
    getVariable(name) {
        return this.context.variables[name];
    }
    setVariable(name, value) {
        this.context.variables[name] = value;
    }
    getVariables() {
        return Object.assign({}, this.context.variables);
    }
    resolveVariables(text) {
        return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
            const value = this.getVariable(variableName.trim());
            return value !== undefined ? String(value) : match;
        });
    }
    resolveArguments(args) {
        if (typeof args === "string") {
            return this.resolveVariables(args);
        }
        if (Array.isArray(args)) {
            return args.map((arg) => this.resolveArguments(arg));
        }
        if (args && typeof args === "object") {
            const resolved = {};
            for (const [key, value] of Object.entries(args)) {
                resolved[key] = this.resolveArguments(value);
            }
            return resolved;
        }
        return args;
    }
    getAvailableTools() {
        return this.context.tools;
    }
    getToolByName(name) {
        return this.context.tools.find((tool) => tool.name === name);
    }
    getToolsByServer(serverName) {
        return this.context.tools.filter((tool) => tool.serverName === serverName);
    }
    createToolPrompt() {
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
    formatToolParameters(schema) {
        if (!schema || !schema.properties) {
            return "";
        }
        const params = [];
        const required = schema.required || [];
        for (const [name, propSchema] of Object.entries(schema.properties)) {
            const prop = propSchema;
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
    updateContext(updates) {
        if (updates.tools) {
            this.context.tools = updates.tools;
        }
        if (updates.variables) {
            this.context.variables = Object.assign(Object.assign({}, this.context.variables), updates.variables);
        }
        if (updates.serverConfigs) {
            this.context.serverConfigs = updates.serverConfigs;
        }
    }
    clone() {
        return new ToolContext({
            tools: [...this.context.tools],
            variables: Object.assign({}, this.context.variables),
            serverConfigs: [...this.context.serverConfigs],
        });
    }
}
exports.ToolContext = ToolContext;
