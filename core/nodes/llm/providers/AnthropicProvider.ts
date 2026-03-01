/*
 * AnthropicProvider
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { BaseProvider, LLMMessage, LLMResponse } from "./BaseProvider";
import { ProviderConfig } from "../../../types";
import { PromptBuilder } from "../PromptBuilder";
import axios, { AxiosInstance, AxiosError } from "axios";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicCompletionRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  system?: string;
  stream?: boolean;
}

interface AnthropicCompletionResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider extends BaseProvider {
  private client: AxiosInstance;
  private modelMapping: Record<string, string> = {
    "claude-sonnet-4-5": "claude-3-5-sonnet-latest",
    "claude-opus": "claude-3-opus-20240229",
    "claude-3-5-sonnet-20241022": "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022": "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229": "claude-3-opus-20240229",
    "claude-3-haiku-20240307": "claude-3-haiku-20240307"
  };

  constructor(config: ProviderConfig, apiKey: string) {
    super(config, apiKey);

    this.client = axios.create({
      baseURL: "https://api.anthropic.com/v1",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      timeout: config.timeout || 60000,
    });
  }

  async generateCompletion(
    messages: LLMMessage[],
    outputSchema?: any,
  ): Promise<LLMResponse> {
    // Convert messages to Anthropic format and extract system message
    const { anthropicMessages, systemMessage } = this.formatMessages(messages);

    // Map model name if needed
    const modelName = this.modelMapping[this.config.model] || this.config.model;

    const request: AnthropicCompletionRequest = {
      model: modelName,
      messages: anthropicMessages,
      max_tokens: this.config.max_tokens || 1024,
      temperature: this.config.temperature,
      top_p: this.config.top_p,
    };

    // Add system message if present
    if (systemMessage) {
      request.system = systemMessage;
    }

    // If output schema is provided, add instruction to output JSON
    if (outputSchema) {
      const systemContent = PromptBuilder.buildOutputInstructions(outputSchema);
      if (request.system) {
        request.system = `${request.system}\n\n${systemContent}`;
      } else {
        request.system = systemContent;
      }
    }

    try {
      const response = await this.client.post<AnthropicCompletionResponse>(
        "/messages",
        request,
      );

      const content = response.data.content[0]?.text || "";

      return {
        content,
        usage: {
          prompt_tokens: response.data.usage.input_tokens,
          completion_tokens: response.data.usage.output_tokens,
          total_tokens: response.data.usage.input_tokens + response.data.usage.output_tokens,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          throw new Error(
            `Anthropic API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`,
          );
        } else if (axiosError.request) {
          throw new Error(
            `No response from Anthropic API: ${axiosError.message}`,
          );
        }
      }
      throw error;
    }
  }

  // Note: This method has a different signature than the base class
  // It uses a callback approach instead of AsyncGenerator
  // For now, we'll keep it as a separate method to avoid breaking existing code
  async generateCompletionStreamWithCallback(
    messages: LLMMessage[],
    outputSchema?: any,
    onStream?: (chunk: any) => void,
  ): Promise<LLMResponse> {
    // Convert messages to Anthropic format and extract system message
    const { anthropicMessages, systemMessage } = this.formatMessages(messages);

    // Map model name if needed
    const modelName = this.modelMapping[this.config.model] || this.config.model;

    const request: AnthropicCompletionRequest = {
      model: modelName,
      messages: anthropicMessages,
      max_tokens: this.config.max_tokens || 1024,
      temperature: this.config.temperature,
      top_p: this.config.top_p,
      stream: true,
    };

    // Add system message if present
    if (systemMessage) {
      request.system = systemMessage;
    }

    // If output schema is provided, add instruction to output JSON
    if (outputSchema) {
      const systemContent = PromptBuilder.buildOutputInstructions(outputSchema);
      if (request.system) {
        request.system = `${request.system}\n\n${systemContent}`;
      } else {
        request.system = systemContent;
      }
    }

    try {
      const response = await this.client.post("/messages", request, {
        responseType: "stream",
      });

      let fullContent = "";
      let totalTokens = 0;
      let promptTokens = 0;
      let completionTokens = 0;

      return new Promise((resolve, reject) => {
        response.data.on("data", (chunk: Buffer) => {
          const lines = chunk.toString().split("\n").filter(Boolean);

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                continue;
              }

              try {
                const parsed = JSON.parse(data);

                // Handle different event types
                if (parsed.type === "message_start") {
                  // Initial message with usage info
                  if (parsed.message?.usage) {
                    promptTokens = parsed.message.usage.input_tokens || 0;
                  }
                } else if (parsed.type === "content_block_delta") {
                  // Content chunks
                  const content = parsed.delta?.text || "";
                  fullContent += content;

                  if (onStream && content) {
                    onStream({
                      content,
                      role: "assistant",
                    });
                  }
                } else if (parsed.type === "message_delta") {
                  // Final usage update
                  if (parsed.usage) {
                    completionTokens = parsed.usage.output_tokens || 0;
                    totalTokens = promptTokens + completionTokens;
                  }
                } else if (parsed.type === "message_stop") {
                  // Stream completed
                  resolve({
                    content: fullContent,
                    usage: {
                      prompt_tokens: promptTokens,
                      completion_tokens: completionTokens,
                      total_tokens: totalTokens,
                    },
                  });
                }
              } catch (error) {
                // Ignore parsing errors for non-JSON lines
              }
            }
          }
        });

        response.data.on("error", (error: Error) => {
          reject(new Error(`Stream error: ${error.message}`));
        });

        response.data.on("end", () => {
          // If we haven't resolved yet, do it now
          if (fullContent) {
            resolve({
              content: fullContent,
              usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: totalTokens,
              },
            });
          }
        });
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          throw new Error(
            `Anthropic API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`,
          );
        } else if (axiosError.request) {
          throw new Error(
            `No response from Anthropic API: ${axiosError.message}`,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Format messages for Anthropic API
   */
  private formatMessages(messages: LLMMessage[]): {
    anthropicMessages: AnthropicMessage[];
    systemMessage?: string;
  } {
    const anthropicMessages: AnthropicMessage[] = [];
    let systemMessage: string | undefined;

    for (const message of messages) {
      if (message.role === "system") {
        // Anthropic uses a separate system parameter
        if (typeof message.content === "string") {
          systemMessage = message.content;
        }
      } else {
        // Convert user/assistant messages
        if (typeof message.content === "string") {
          anthropicMessages.push({
            role: message.role as "user" | "assistant",
            content: message.content,
          });
        } else if (Array.isArray(message.content)) {
          // Handle multimodal content - for now just extract text
          const textContent = message.content
            .filter((item) => item.type === "text")
            .map((item) => item.text || "")
            .join("\n");

          if (textContent) {
            anthropicMessages.push({
              role: message.role as "user" | "assistant",
              content: textContent,
            });
          }
        }
      }
    }

    return { anthropicMessages, systemMessage };
  }
}