/*
 * BaseProvider
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { ProviderConfig, OutputSchema } from "../../../types";

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<{
        type: "text" | "image_url";
        text?: string;
        image_url?: {
          url: string;
          detail?: "low" | "high";
        };
      }>;
}

export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected apiKey: string;

  constructor(config: ProviderConfig, apiKey: string) {
    this.config = config;
    this.apiKey = apiKey;
  }

  abstract generateCompletion(
    messages: LLMMessage[],
    outputSchema: OutputSchema,
  ): Promise<LLMResponse>;

  protected parseJsonResponse(response: string): any {
    try {
      const trimmed = response.trim();
      let jsonStr = trimmed;

      if (trimmed.startsWith("```json")) {
        jsonStr = trimmed.slice(7, -3);
      } else if (trimmed.startsWith("```")) {
        jsonStr = trimmed.slice(3, -3);
      }

      return JSON.parse(jsonStr);
    } catch (error) {
      throw new Error(
        `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
