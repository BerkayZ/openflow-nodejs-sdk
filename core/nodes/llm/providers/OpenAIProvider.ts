/*
 * OpenAIProvider
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { BaseProvider, LLMMessage, LLMResponse } from "./BaseProvider";
import { ProviderConfig, OutputSchema } from "../../../types";
import { PromptBuilder } from "../PromptBuilder";

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
        const outputInstructions = PromptBuilder.buildOutputInstructions(outputSchema);
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
      max_output_tokens: this.config.max_tokens || 2000,
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
      const response = await fetch(OpenAIProvider.API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

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
      throw new Error(
        `Failed to generate completion with OpenAI: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
