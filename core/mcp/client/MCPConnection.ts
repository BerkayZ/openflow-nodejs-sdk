/*
 * MCPConnection
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import {
  MCPServerConfig,
  MCPConnection,
  MCPRequest,
  MCPResponse,
} from "../types";
import { MCPAuth } from "./MCPAuth";

export class MCPConnectionManager {
  private connections: Map<string, MCPConnection> = new Map();
  private auth: Map<string, MCPAuth> = new Map();
  private serverConfigs: Map<string, MCPServerConfig> = new Map();

  public addServer(config: MCPServerConfig): void {
    this.serverConfigs.set(config.name, config);
    this.auth.set(config.name, new MCPAuth(config.auth));
    this.connections.set(config.name, {
      url: config.url,
      isConnected: false,
      retryCount: 0,
    });
  }

  public async connect(serverName: string): Promise<void> {
    const connection = this.connections.get(serverName);
    const config = this.serverConfigs.get(serverName);

    if (!connection || !config) {
      throw new Error(`Server ${serverName} not found`);
    }

    try {
      // Use MCP initialize handshake
      const initRequest: MCPRequest = {
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          clientInfo: {
            name: "openflow-nodejs-sdk",
            version: "0.0.1",
          },
        },
        id: `init_${Date.now()}`,
      };

      await this.makeRequestDirect(serverName, initRequest);

      connection.isConnected = true;
      connection.lastPing = new Date();
      connection.retryCount = 0;
    } catch (error) {
      connection.isConnected = false;
      connection.retryCount++;
      throw error;
    }
  }

  public async disconnect(serverName: string): Promise<void> {
    const connection = this.connections.get(serverName);
    if (connection) {
      connection.isConnected = false;
      connection.lastPing = undefined;
    }
  }

  public isConnected(serverName: string): boolean {
    const connection = this.connections.get(serverName);
    return connection?.isConnected ?? false;
  }

  public async makeRequest(
    serverName: string,
    request: MCPRequest,
  ): Promise<MCPResponse> {
    const connection = this.connections.get(serverName);

    if (!connection?.isConnected) {
      await this.connect(serverName);
    }

    return await this.makeRequestDirect(serverName, request);
  }

  private async makeRequestDirect(
    serverName: string,
    request: MCPRequest,
  ): Promise<MCPResponse> {
    const connection = this.connections.get(serverName);
    const config = this.serverConfigs.get(serverName);
    const auth = this.auth.get(serverName);

    if (!connection || !config || !auth) {
      throw new Error(`Server ${serverName} not found`);
    }

    const url = new URL(config.url);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "openflow-nodejs-sdk/0.0.1",
      Accept: "application/json, text/event-stream",
    };

    // Include session ID if available and not an initialization request
    if (connection.sessionId && request.method !== "initialize") {
      headers["Mcp-Session-Id"] = connection.sessionId;
    }

    auth.applyAuth(headers, url);

    const timeout = config.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Ensure proper JSON-RPC 2.0 format
      const jsonRpcRequest = {
        jsonrpc: "2.0",
        method: request.method,
        params: request.params || {},
        id: request.id || `req_${Date.now()}`,
      };

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: JSON.stringify(jsonRpcRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Extract session ID from headers if this is an initialization
      if (request.method === "initialize") {
        const sessionId = response.headers.get("mcp-session-id");
        if (sessionId) {
          connection.sessionId = sessionId;
        }
      }

      // Check if response is SSE format
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        // Parse SSE response
        const text = await response.text();
        const data = this.parseSSEResponse(text);
        return data as MCPResponse;
      } else {
        // Parse JSON response
        const data = await response.json();
        return data as MCPResponse;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
      throw new Error(`Request failed: ${String(error)}`);
    }
  }

  private parseSSEResponse(sseText: string): any {
    const lines = sseText.split("\n");
    let eventType = "";
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.substring(7);
      } else if (line.startsWith("data: ")) {
        data = line.substring(6);

        // If this is a message event with JSON data, parse and return it
        if (eventType === "message") {
          try {
            return JSON.parse(data);
          } catch (error) {
            console.warn("Failed to parse SSE JSON data:", data);
          }
        }
      }
    }

    throw new Error("No valid message found in SSE response");
  }

  public getConnectionStatus(serverName: string): MCPConnection | undefined {
    return this.connections.get(serverName);
  }

  public getAllConnections(): Record<string, MCPConnection> {
    const result: Record<string, MCPConnection> = {};
    this.connections.forEach((connection, name) => {
      result[name] = connection;
    });
    return result;
  }

  public async retryConnection(serverName: string): Promise<void> {
    const connection = this.connections.get(serverName);
    const config = this.serverConfigs.get(serverName);

    if (!connection || !config) {
      throw new Error(`Server ${serverName} not found`);
    }

    const maxRetries = config.retry_attempts || 3;
    if (connection.retryCount >= maxRetries) {
      throw new Error(
        `Max retry attempts (${maxRetries}) exceeded for server ${serverName}`,
      );
    }

    await this.connect(serverName);
  }
}
