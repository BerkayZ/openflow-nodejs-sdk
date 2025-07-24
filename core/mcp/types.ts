/*
 * MCP Types
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

export interface MCPAuthConfig {
  type:
    | "none"
    | "api_key"
    | "bearer"
    | "basic"
    | "custom_headers"
    | "query_params";
  api_key?: string;
  header_name?: string;
  token?: string;
  username?: string;
  password?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

export interface MCPServerConfig {
  name: string;
  url: string;
  description?: string;
  timeout?: number;
  retry_attempts?: number;
  auth: MCPAuthConfig;
}

export interface MCPToolsConfig {
  mcp_servers?: string[];
  builtin_tools?: string[];
  available_tools?: string[];
  auto_discover?: boolean;
  filter?: string[];
  tool_selection?: "auto" | "manual";
}

export interface MCPConfig {
  mcp_servers: MCPServerConfig[];
  tools?: MCPToolsConfig;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema?: any;
  serverName: string;
}

export interface MCPToolCall {
  name: string;
  arguments: any;
}

export interface MCPToolResult {
  success: boolean;
  result?: any;
  error?: string;
  usage?: {
    tokens?: number;
    cost?: number;
  };
}

export interface MCPRequest {
  method: string;
  params?: any;
  id?: string;
}

export interface MCPResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id?: string;
}

export interface MCPConnection {
  url: string;
  isConnected: boolean;
  lastPing?: Date;
  retryCount: number;
  sessionId?: string;
}

export interface MCPExecutionContext {
  tools: MCPTool[];
  variables: Record<string, any>;
  serverConfigs: MCPServerConfig[];
}
