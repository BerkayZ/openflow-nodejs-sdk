/*
 * MCPAuth
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { MCPAuthConfig } from "../types";

export class MCPAuth {
  private config: MCPAuthConfig;

  constructor(config: MCPAuthConfig) {
    this.config = config;
  }

  public applyAuth(headers: Record<string, string>, url: URL): void {
    switch (this.config.type) {
      case "none":
        break;

      case "api_key":
        if (!this.config.api_key) {
          throw new Error("API key is required for api_key authentication");
        }
        const headerName = this.config.header_name || "X-API-Key";
        headers[headerName] = this.config.api_key;
        break;

      case "bearer":
        if (!this.config.token) {
          throw new Error("Token is required for bearer authentication");
        }
        headers["Authorization"] = `Bearer ${this.config.token}`;
        break;

      case "basic":
        if (!this.config.username || !this.config.password) {
          throw new Error(
            "Username and password are required for basic authentication",
          );
        }
        const credentials = Buffer.from(
          `${this.config.username}:${this.config.password}`,
        ).toString("base64");
        headers["Authorization"] = `Basic ${credentials}`;
        break;

      case "custom_headers":
        if (!this.config.headers) {
          throw new Error(
            "Headers are required for custom_headers authentication",
          );
        }
        Object.assign(headers, this.config.headers);
        break;

      case "query_params":
        if (!this.config.params) {
          throw new Error(
            "Params are required for query_params authentication",
          );
        }
        Object.entries(this.config.params).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
        break;

      default:
        throw new Error(`Unsupported authentication type: ${this.config.type}`);
    }
  }

  public validateConfig(): void {
    switch (this.config.type) {
      case "api_key":
        if (!this.config.api_key) {
          throw new Error("api_key is required for api_key authentication");
        }
        break;

      case "bearer":
        if (!this.config.token) {
          throw new Error("token is required for bearer authentication");
        }
        break;

      case "basic":
        if (!this.config.username || !this.config.password) {
          throw new Error(
            "username and password are required for basic authentication",
          );
        }
        break;

      case "custom_headers":
        if (
          !this.config.headers ||
          Object.keys(this.config.headers).length === 0
        ) {
          throw new Error(
            "headers are required for custom_headers authentication",
          );
        }
        break;

      case "query_params":
        if (
          !this.config.params ||
          Object.keys(this.config.params).length === 0
        ) {
          throw new Error(
            "params are required for query_params authentication",
          );
        }
        break;
    }
  }
}
