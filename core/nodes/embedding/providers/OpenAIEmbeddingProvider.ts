/*
 * OpenAI Embedding Provider
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import {
  EmbeddingItem,
  EmbeddingResponse,
  EmbeddingResult,
} from "../../../types";

export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeout?: number;
}

export class OpenAIEmbeddingProvider {
  private config: OpenAIEmbeddingConfig;

  constructor(config: OpenAIEmbeddingConfig) {
    this.config = config;
  }

  async generateEmbeddings(items: EmbeddingItem[]): Promise<EmbeddingResponse> {
    try {
      const texts = items.map((item) => item.text);

      const response = await fetch(
        this.config.baseUrl || "https://api.openai.com/v1/embeddings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            input: texts,
            encoding_format: "float",
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
        );
      }

      const data = await response.json();

      // Convert OpenAI response to our format
      const embeddings: EmbeddingResult[] = data.data.map(
        (embedding: any, index: number) => ({
          id: items[index].id,
          text: items[index].text,
          embedding: embedding.embedding,
          metadata: items[index].metadata,
        }),
      );

      return {
        embeddings,
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          throw new Error(
            `OpenAI API authentication failed. Please check your API key.`,
          );
        } else if (
          error.message.includes("quota") ||
          error.message.includes("rate_limit")
        ) {
          throw new Error(`OpenAI API quota exceeded: ${error.message}`);
        } else if (error.message.includes("model")) {
          throw new Error(`OpenAI model error: ${error.message}`);
        } else {
          throw new Error(`OpenAI embedding failed: ${error.message}`);
        }
      } else {
        throw new Error(`OpenAI embedding failed: Unknown error`);
      }
    }
  }

  async generateSingleEmbedding(text: string): Promise<number[]> {
    const items: EmbeddingItem[] = [{ id: "single", text }];
    const response = await this.generateEmbeddings(items);
    return response.embeddings[0].embedding;
  }

  async generateTextEmbeddings(texts: string[]): Promise<number[][]> {
    const items: EmbeddingItem[] = texts.map((text, index) => ({
      id: `text_${index}`,
      text,
    }));
    const response = await this.generateEmbeddings(items);
    return response.embeddings.map((e) => e.embedding);
  }

  validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    if (!this.config.model) {
      throw new Error("OpenAI model is required");
    }
  }
}
