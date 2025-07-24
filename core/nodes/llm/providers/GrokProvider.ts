/*
 * GrokProvider
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { BaseProvider, LLMMessage, LLMResponse } from "./BaseProvider";
import { ProviderConfig, OutputSchema } from "../../../types";
import { PromptBuilder } from "../PromptBuilder";

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

  private buildOutputInstructions(outputSchema: OutputSchema): string {
    if (!outputSchema || Object.keys(outputSchema).length === 0) {
      return "";
    }

    let instructions = "\n\n" + "=".repeat(80);
    instructions += "\n🚨 CRITICAL: STRICT JSON SCHEMA ENFORCEMENT";
    instructions += "\n" + "=".repeat(80);
    instructions +=
      "\nYou MUST return your response as a valid JSON object with the following structure:\n";

    for (const [key, property] of Object.entries(outputSchema)) {
      instructions += `\n"${key}": ${property.description || "No description provided"} (type: ${property.type})`;
    }

    instructions += "\n\nExample format:";
    const schemaExample: any = {};
    for (const [key, property] of Object.entries(outputSchema)) {
      if (property.type === "string") {
        schemaExample[key] = `A detailed ${property.description || "response"}`;
      } else if (property.type === "number") {
        schemaExample[key] = 0;
      } else if (property.type === "boolean") {
        schemaExample[key] = true;
      } else {
        schemaExample[key] = null;
      }
    }

    instructions += JSON.stringify(schemaExample, null, 2);
    instructions += "\n\n" + "=".repeat(80);
    instructions +=
      "\n🎯 RESPOND WITH ONLY THE JSON OBJECT - PROVIDE ACTUAL ANALYSIS, NOT EXAMPLE VALUES";
    instructions += "\n" + "=".repeat(80);

    return instructions;
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

      const outputInstructions = this.buildOutputInstructions(outputSchema);
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
      max_tokens: this.config.max_tokens || 2000,
      temperature: Math.min(this.config.temperature || 0.3, 0.3),
      stream: false,
    };

    try {
      const response = await fetch(GrokProvider.API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

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
      throw new Error(
        `Failed to generate completion with Grok: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
