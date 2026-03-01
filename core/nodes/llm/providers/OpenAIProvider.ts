/*
 * OpenAIProvider
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { BaseProvider, LLMMessage, LLMResponse, StreamChunk } from "./BaseProvider";
import { ProviderConfig, OutputSchema } from "../../../types";
import { PromptBuilder } from "../PromptBuilder";

// Constants
const DEFAULT_MAX_TOKENS = 2000;

export class OpenAIProvider extends BaseProvider {
  private static readonly API_URL = "https://api.openai.com/v1/responses";

  constructor(config: ProviderConfig, apiKey: string) {
    super(config, apiKey);
    this.validateApiKey();
  }

  private validateApiKey(): void {
    if (
      !this.apiKey ||
      this.apiKey.trim() === "" ||
      this.apiKey === "test-key"
    ) {
      throw new Error(
        "Valid OpenAI API key is required. Please provide a valid API key.",
      );
    }
  }

  private convertMessagesToOpenAIFormat(
    messages: LLMMessage[],
    outputSchema: OutputSchema,
  ): any {
    if (messages.length === 1) {
      // Single message format
      const message = messages[0];

      if (Array.isArray(message.content)) {
        // Multimodal message - convert to OpenAI format
        const convertedContent = message.content.map((content) => {
          if (content.type === "text") {
            const outputInstructions =
              PromptBuilder.buildOutputInstructions(outputSchema);
            const enhancedText = content.text + outputInstructions;
            return {
              type: "input_text",
              text: enhancedText,
            };
          } else if (content.type === "image_url") {
            return {
              type: "input_image",
              image_url: content.image_url?.url || "",
            };
          }
          return content;
        });

        return [
          {
            role: message.role,
            content: convertedContent,
          },
        ];
      } else {
        // Simple text message
        const enhancedContent = PromptBuilder.buildPromptWithOutputInstructions(
          message.content,
          outputSchema,
        );
        return enhancedContent;
      }
    } else {
      // Multiple messages - convert to conversation format
      const lastMessage = messages[messages.length - 1];
      let enhancedContent: string | Array<any>;

      if (Array.isArray(lastMessage.content)) {
        // Handle multimodal messages
        const textContent = lastMessage.content.find((c) => c.type === "text");
        const textToEnhance = textContent?.text || "";
        const outputInstructions =
          PromptBuilder.buildOutputInstructions(outputSchema);
        const enhancedPrompt = textToEnhance + outputInstructions;

        enhancedContent = lastMessage.content.map((content) => {
          if (content.type === "text") {
            return {
              type: "input_text",
              text: enhancedPrompt,
            };
          } else if (content.type === "image_url") {
            return {
              type: "input_image",
              image_url: content.image_url?.url || "",
            };
          }
          return content;
        });
      } else {
        // Simple text message
        enhancedContent = PromptBuilder.buildPromptWithOutputInstructions(
          lastMessage.content,
          outputSchema,
        );
      }

      return [
        ...messages.slice(0, -1).map((msg) => ({
          role: msg.role,
          content: Array.isArray(msg.content)
            ? msg.content.map((c) => ({
                type:
                  c.type === "text"
                    ? "input_text"
                    : c.type === "image_url"
                      ? "input_image"
                      : c.type,
                ...(c.type === "text" ? { text: c.text } : {}),
                ...(c.type === "image_url"
                  ? { image_url: c.image_url?.url }
                  : {}),
              }))
            : msg.content,
        })),
        {
          role: lastMessage.role,
          content: Array.isArray(enhancedContent)
            ? enhancedContent
            : [
                {
                  type: "input_text",
                  text: enhancedContent,
                },
              ],
        },
      ];
    }
  }

  async generateCompletion(
    messages: LLMMessage[],
    outputSchema: OutputSchema,
  ): Promise<LLMResponse> {
    const input = this.convertMessagesToOpenAIFormat(messages, outputSchema);

    const requestBody = {
      model: this.config.model || "gpt-4.1",
      input: input,
      max_output_tokens: this.config.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: this.config.temperature || 1.0,
      top_p: 1.0,
      stream: false,
      store: true,
      parallel_tool_calls: true,
      tool_choice: "auto",
      tools: [],
      truncation: "disabled",
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout || 60000);

      const response = await fetch(OpenAIProvider.API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.status !== "completed") {
        throw new Error(
          `OpenAI API response not completed. Status: ${data.status}`,
        );
      }

      if (!data.output || !data.output[0] || !data.output[0].content) {
        throw new Error("Invalid response format from OpenAI API");
      }

      // Extract text content from the response
      const outputMessage = data.output[0];
      const textContent = outputMessage.content.find(
        (c: any) => c.type === "output_text",
      );

      if (!textContent) {
        throw new Error("No text content found in OpenAI API response");
      }

      const content = textContent.text;

      return {
        content: content,
        usage: data.usage
          ? {
              prompt_tokens: data.usage.input_tokens,
              completion_tokens: data.usage.output_tokens,
              total_tokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OpenAI API request timed out after ${this.config.timeout || 60000}ms`);
      }
      throw new Error(
        `Failed to generate completion with OpenAI: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async *generateCompletionStream(
    messages: LLMMessage[],
    outputSchema: OutputSchema,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const input = this.convertMessagesToOpenAIFormat(messages, outputSchema);

    const requestBody = {
      model: this.config.model || "gpt-4.1",
      input: input,
      max_output_tokens: this.config.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: this.config.temperature || 1.0,
      top_p: 1.0,
      stream: true, // Enable streaming
      store: true,
      parallel_tool_calls: true,
      tool_choice: "auto",
      tools: [],
      truncation: "disabled",
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout || 60000);

      const response = await fetch(OpenAIProvider.API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response stream reader");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedContent = "";
      let usage: any = undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "" || line.trim() === "data: [DONE]") continue;

          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr, (key, value) => {
                if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                  return undefined;
                }
                return value;
              });

              // Handle OpenAI streaming format
              if (data.output?.[0]?.content) {
                const outputContent = data.output[0].content.find(
                  (c: any) => c.type === "output_text"
                );

                if (outputContent?.text) {
                  const chunk = outputContent.text;
                  accumulatedContent += chunk;

                  yield {
                    content: chunk,
                    isComplete: false,
                  };
                }
              }

              // Capture usage data if available
              if (data.usage) {
                usage = {
                  prompt_tokens: data.usage.input_tokens,
                  completion_tokens: data.usage.output_tokens,
                  total_tokens: data.usage.total_tokens,
                };
              }
            } catch (error) {
              // Log parsing errors at debug level for debugging, but continue processing
              // This is expected for some SSE events
              if (error instanceof Error) {
                // Debug level logging - would normally use a logger if available
                // console.debug(`Stream parsing error (expected for some SSE events): ${error.message}`);
              }
            }
          }
        }
      }

      // Final chunk with usage data
      yield {
        content: "",
        isComplete: true,
        usage,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate streaming completion with OpenAI: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
