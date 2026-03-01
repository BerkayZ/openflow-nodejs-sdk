/*
 * AnthropicProvider
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import {
  BaseProvider,
  LLMMessage,
  LLMResponse,
  StreamChunk,
} from "./BaseProvider";
import { ProviderConfig, OutputSchema } from "../../../types";
import { PromptBuilder } from "../PromptBuilder";

// Constants
const DEFAULT_MAX_TOKENS = 2000;

export class AnthropicProvider extends BaseProvider {
  private static readonly API_URL = "https://api.anthropic.com/v1/messages";

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
        "Valid Anthropic API key is required. Please provide a valid API key.",
      );
    }
  }

  private formatMessages(messages: LLMMessage[]): {
    system?: string;
    messages: any[];
  } {
    const formattedMessages: any[] = [];
    let systemPrompt: string | undefined;

    for (const message of messages) {
      if (message.role === "system") {
        // Anthropic uses a separate system parameter
        if (typeof message.content === "string") {
          systemPrompt = message.content;
        } else {
          // Extract text from multimodal content
          const textContent = message.content.find((c) => c.type === "text");
          systemPrompt = textContent?.text || "";
        }
      } else {
        formattedMessages.push({
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
        });
      }
    }

    return { system: systemPrompt, messages: formattedMessages };
  }

  async generateCompletion(
    messages: LLMMessage[],
    outputSchema: OutputSchema,
  ): Promise<LLMResponse> {
    const userMessage = messages[messages.length - 1];

    // Handle multimodal messages
    let enhancedContent: string | Array<any>;

    if (Array.isArray(userMessage.content)) {
      // For multimodal messages, append the output instructions to the text content
      const textContent = userMessage.content.find((c) => c.type === "text");
      const textToEnhance = textContent?.text || "";

      const outputInstructions =
        PromptBuilder.buildOutputInstructions(outputSchema);
      const enhancedPrompt = textToEnhance + outputInstructions;

      // Create new multimodal content with enhanced text
      enhancedContent = userMessage.content.map((content) => {
        if (content.type === "text") {
          return { ...content, text: enhancedPrompt };
        }
        return content;
      });
    } else {
      // Simple text message
      enhancedContent = PromptBuilder.buildPromptWithOutputInstructions(
        userMessage.content,
        outputSchema,
      );
    }

    // Format messages for Anthropic API
    const { system, messages: formattedMessages } = this.formatMessages([
      ...messages.slice(0, -1),
      { role: "user", content: enhancedContent },
    ]);

    const requestBody: any = {
      model: this.config.model || "claude-3-5-sonnet-latest",
      messages: formattedMessages,
      max_tokens: this.config.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: this.config.temperature || 0.3,
    };

    if (system) {
      requestBody.system = system;
    }

    if (this.config.top_p !== undefined) {
      requestBody.top_p = this.config.top_p;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.timeout || 60000,
      );

      const response = await fetch(AnthropicProvider.API_URL, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Anthropic API error: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();

      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error("Invalid response format from Anthropic API");
      }

      const content = data.content[0].text;

      return {
        content: content,
        usage: data.usage
          ? {
              prompt_tokens: data.usage.input_tokens,
              completion_tokens: data.usage.output_tokens,
              total_tokens: data.usage.input_tokens + data.usage.output_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Anthropic API request timed out after ${this.config.timeout || 60000}ms`,
        );
      }
      throw new Error(
        `Failed to generate completion with Anthropic: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async *generateCompletionStream(
    messages: LLMMessage[],
    outputSchema: OutputSchema,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const userMessage = messages[messages.length - 1];

    // Handle multimodal messages
    let enhancedContent: string | Array<any>;

    if (Array.isArray(userMessage.content)) {
      const textContent = userMessage.content.find((c) => c.type === "text");
      const textToEnhance = textContent?.text || "";
      const outputInstructions =
        PromptBuilder.buildOutputInstructions(outputSchema);
      const enhancedPrompt = textToEnhance + outputInstructions;

      enhancedContent = userMessage.content.map((content) => {
        if (content.type === "text") {
          return { ...content, text: enhancedPrompt };
        }
        return content;
      });
    } else {
      enhancedContent = PromptBuilder.buildPromptWithOutputInstructions(
        userMessage.content,
        outputSchema,
      );
    }

    // Format messages for Anthropic API
    const { system, messages: formattedMessages } = this.formatMessages([
      ...messages.slice(0, -1),
      { role: "user", content: enhancedContent },
    ]);

    const requestBody: any = {
      model: this.config.model || "claude-3-5-sonnet-latest",
      messages: formattedMessages,
      max_tokens: this.config.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: this.config.temperature || 0.3,
      stream: true, // Enable streaming
    };

    if (system) {
      requestBody.system = system;
    }

    if (this.config.top_p !== undefined) {
      requestBody.top_p = this.config.top_p;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.timeout || 60000,
      );

      const response = await fetch(AnthropicProvider.API_URL, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Anthropic API error: ${response.status} - ${errorText}`,
        );
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
          if (line.trim() === "") continue;

          if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim();

            // Read the next line for data
            const nextLineIndex = lines.indexOf(line) + 1;
            if (nextLineIndex < lines.length) {
              const dataLine = lines[nextLineIndex];
              if (dataLine.startsWith("data: ")) {
                try {
                  const jsonStr = dataLine.slice(6);
                  const data = JSON.parse(jsonStr, (key, value) => {
                    if (
                      key === "__proto__" ||
                      key === "constructor" ||
                      key === "prototype"
                    ) {
                      return undefined;
                    }
                    return value;
                  });

                  if (eventType === "content_block_delta" && data.delta?.text) {
                    const chunk = data.delta.text;
                    accumulatedContent += chunk;

                    yield {
                      content: chunk,
                      isComplete: false,
                    };
                  } else if (eventType === "message_delta" && data.usage) {
                    usage = {
                      prompt_tokens: data.usage.input_tokens || 0,
                      completion_tokens: data.usage.output_tokens || 0,
                      total_tokens:
                        (data.usage.input_tokens || 0) +
                        (data.usage.output_tokens || 0),
                    };
                  } else if (eventType === "message_stop") {
                    // Stream completed
                    break;
                  }
                } catch (error) {
                  // Debug level logging - would normally use a logger if available
                  // console.debug(`Stream parsing error: ${error.message}`);
                }
              }
            }
          } else if (line.startsWith("data: ")) {
            // Handle SSE format where event and data are on the same line
            try {
              const jsonStr = line.slice(6);
              if (jsonStr !== "[DONE]") {
                const data = JSON.parse(jsonStr, (key, value) => {
                  if (
                    key === "__proto__" ||
                    key === "constructor" ||
                    key === "prototype"
                  ) {
                    return undefined;
                  }
                  return value;
                });

                if (data.delta?.text) {
                  const chunk = data.delta.text;
                  accumulatedContent += chunk;

                  yield {
                    content: chunk,
                    isComplete: false,
                  };
                }
              }
            } catch (error) {
              // Debug level logging
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
        `Failed to generate streaming completion with Anthropic: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
