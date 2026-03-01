/*
 * GrokProvider
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

export class GrokProvider extends BaseProvider {
  private static readonly API_URL = "https://api.x.ai/v1/chat/completions";

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
        "Valid Grok API key is required. Please provide a valid API key.",
      );
    }
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

    const requestBody = {
      model: this.config.model || "grok-3-latest",
      messages: [
        ...messages.slice(0, -1),
        { role: "user", content: enhancedContent },
      ],
      max_tokens: this.config.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: Math.min(this.config.temperature || 0.3, 0.3),
      stream: false,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout || 60000);

      const response = await fetch(GrokProvider.API_URL, {
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
        throw new Error(`Grok API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from Grok API");
      }

      const content = data.choices[0].message.content;

      return {
        content: content,
        usage: data.usage
          ? {
              prompt_tokens: data.usage.prompt_tokens,
              completion_tokens: data.usage.completion_tokens,
              total_tokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Grok API request timed out after ${this.config.timeout || 60000}ms`);
      }
      throw new Error(
        `Failed to generate completion with Grok: ${error instanceof Error ? error.message : String(error)}`,
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

    const requestBody = {
      model: this.config.model || "grok-3-latest",
      messages: [
        ...messages.slice(0, -1),
        { role: "user", content: enhancedContent },
      ],
      max_tokens: this.config.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: Math.min(this.config.temperature || 0.3, 0.3),
      stream: true, // Enable streaming
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout || 60000);

      const response = await fetch(GrokProvider.API_URL, {
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
        throw new Error(`Grok API error: ${response.status} - ${errorText}`);
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
              const data = JSON.parse(jsonStr);

              if (data.choices?.[0]?.delta?.content) {
                const chunk = data.choices[0].delta.content;
                accumulatedContent += chunk;

                yield {
                  content: chunk,
                  isComplete: false,
                };
              }

              // Capture usage data if available
              if (data.usage) {
                usage = {
                  prompt_tokens: data.usage.prompt_tokens,
                  completion_tokens: data.usage.completion_tokens,
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
        `Failed to generate streaming completion with Grok: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
