/*
 * VectorSearchNode
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { VectorSearchNode, FlowNode } from "../../types";
import { BaseNode, NodeExecutionContext } from "../base/BaseNode";
import { PineconeProvider } from "./providers/PineconeProvider";
import { VectorSearchResult } from "./types";

export class VectorSearchNodeExecutor extends BaseNode {
  /**
   * Execute Vector Search node
   */
  async execute(node: FlowNode, context: NodeExecutionContext): Promise<any> {
    const vectorNode = node as VectorSearchNode;

    this.log(
      context,
      "info",
      `Executing Vector Search node: ${vectorNode.id} with provider: ${vectorNode.config.provider}`,
    );

    // Resolve input variables
    const resolvedInput = this.resolveObjectVariables(
      vectorNode.input,
      context.registry,
    );
    this.log(context, "debug", `Resolved input:`, resolvedInput);

    // Prepare search parameters
    const searchParams = this.prepareSearchParams(resolvedInput, vectorNode);
    this.log(context, "debug", `Search parameters:`, searchParams);

    // Get provider configuration
    const providerConfig = this.getProviderConfig(
      vectorNode.config.provider || "pinecone",
      context,
    );

    // Create provider instance
    const provider = this.createProvider(
      vectorNode.config.provider || "pinecone",
      providerConfig,
    );

    // Perform search
    const result = await provider.query(vectorNode.config.index_name, {
      vector: searchParams.vector,
      topK: searchParams.topK,
      filter: vectorNode.config.filter,
      namespace: vectorNode.config.namespace,
      includeMetadata: true,
      includeValues: true,
    });

    // Apply similarity threshold filtering if specified
    let filteredResults = result.matches;
    if (vectorNode.config.similarity_threshold !== undefined) {
      filteredResults = result.matches.filter(
        (match) => match.score >= vectorNode.config.similarity_threshold!,
      );
    }

    // Calculate search metadata
    const searchMetadata = this.calculateSearchMetadata(
      filteredResults,
      searchParams,
    );

    this.log(
      context,
      "info",
      `Vector search completed successfully. Found ${filteredResults.length} results`,
    );

    return {
      results: filteredResults.map((match) => ({
        id: match.id,
        score: match.score,
        metadata: match.metadata,
        values: match.values,
      })),
      query_vector: searchParams.vector,
      search_metadata: searchMetadata,
    };
  }

  /**
   * Prepare search parameters from input
   */
  private prepareSearchParams(
    input: any,
    vectorNode: VectorSearchNode,
  ): {
    vector: number[];
    topK: number;
  } {
    let vector: number[] | undefined;
    const topK = vectorNode.config.top_k || input.top_k || 10;

    // Handle search_vector (resolved variable reference)
    if (input.search_vector) {
      if (Array.isArray(input.search_vector)) {
        vector = input.search_vector;
      } else if (
        input.search_vector.values &&
        Array.isArray(input.search_vector.values)
      ) {
        vector = input.search_vector.values;
      } else {
        throw new Error(
          "Invalid search_vector format. Expected array of numbers or object with values array.",
        );
      }
    }

    // Handle search_text (for text-based search - would need embedding provider)
    if (input.search_text && !vector) {
      throw new Error(
        "Text-based search not yet implemented. Please provide search_vector.",
      );
    }

    if (!vector) {
      throw new Error(
        "No search vector provided. Please provide search_vector or search_text.",
      );
    }

    // Validate vector
    this.validateSearchVector(vector);

    return {
      vector,
      topK,
    };
  }

  /**
   * Validate search vector format
   */
  private validateSearchVector(vector: number[]): void {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Search vector must be a non-empty array of numbers.");
    }

    if (!vector.every((v) => typeof v === "number" && isFinite(v))) {
      throw new Error("All search vector values must be finite numbers.");
    }
  }

  /**
   * Calculate search metadata
   */
  private calculateSearchMetadata(
    results: VectorSearchResult[],
    searchParams: any,
  ): {
    total_matches: number;
    max_score: number;
    min_score: number;
    query_time_ms: number;
  } {
    const scores = results.map((r) => r.score);

    return {
      total_matches: results.length,
      max_score: scores.length > 0 ? Math.max(...scores) : 0,
      min_score: scores.length > 0 ? Math.min(...scores) : 0,
      query_time_ms: Date.now(), // Placeholder - would need actual timing
    };
  }

  /**
   * Get provider configuration from context
   */
  private getProviderConfig(
    providerName: string,
    context: NodeExecutionContext,
  ): any {
    if (!context.config.providers?.vectorDB) {
      throw new Error(
        "No vector database providers configured in FlowExecutorConfig",
      );
    }

    const providerConfig =
      context.config.providers.vectorDB[providerName.toLowerCase()];
    if (!providerConfig) {
      throw new Error(
        `Provider configuration not found for: ${providerName}. Available providers: ${Object.keys(context.config.providers.vectorDB).join(", ")}`,
      );
    }

    if (!providerConfig.apiKey) {
      throw new Error(
        `API key not configured for provider: ${providerName} in FlowExecutorConfig`,
      );
    }

    return providerConfig;
  }

  /**
   * Create provider instance
   */
  private createProvider(providerName: string, config: any): PineconeProvider {
    switch (providerName.toLowerCase()) {
      case "pinecone":
        return new PineconeProvider({
          apiKey: config.apiKey,
        });
      default:
        throw new Error(
          `Unsupported vector database provider: ${providerName}`,
        );
    }
  }
}
