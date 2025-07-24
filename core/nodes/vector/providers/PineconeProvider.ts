/*
 * Pinecone Provider
 * OpenFlow Protocol - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import {
  Pinecone,
  PineconeRecord,
  RecordMetadata,
} from "@pinecone-database/pinecone";
import {
  VectorRecord,
  VectorQueryResponse,
  VectorUpsertResponse,
  VectorDeleteResponse,
  VectorSearchResult,
} from "../types";

export interface PineconeConfig {
  apiKey: string;
  environment?: string;
  baseUrl?: string;
  timeout?: number;
}

export class PineconeProvider {
  private client: Pinecone;
  private config: PineconeConfig;

  constructor(config: PineconeConfig) {
    this.config = config;

    this.client = new Pinecone({
      apiKey: config.apiKey,
    });
  }

  async listIndexes(): Promise<any> {
    try {
      const response = await this.client.listIndexes();
      return response;
    } catch (error) {
      throw new Error(
        `Failed to list Pinecone indexes: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getIndexStats(indexName: string, namespace?: string): Promise<any> {
    try {
      const index = this.client.index(indexName);
      const stats = await index.describeIndexStats();
      return stats;
    } catch (error) {
      throw new Error(
        `Failed to get index stats: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async upsert(
    indexName: string,
    options: {
      vectors: VectorRecord[];
      namespace?: string;
    },
  ): Promise<VectorUpsertResponse> {
    try {
      const index = this.client.index(indexName);

      // Convert our VectorRecord format to Pinecone's format
      const pineconeVectors: PineconeRecord[] = options.vectors.map(
        (vector) => {
          const record: PineconeRecord = {
            id: vector.id,
            values: vector.values,
          };

          // Add metadata if present
          if (vector.metadata && Object.keys(vector.metadata).length > 0) {
            record.metadata = vector.metadata as RecordMetadata;
          }

          // Add sparse values if present
          if (vector.sparse_values) {
            record.sparseValues = {
              indices: vector.sparse_values.indices,
              values: vector.sparse_values.values,
            };
          }

          return record;
        },
      );

      console.log(
        `Upserting ${pineconeVectors.length} vectors to index '${indexName}'${options.namespace ? ` in namespace '${options.namespace}'` : ""}`,
      );
      console.log(`Sample vector:`, {
        id: pineconeVectors[0]?.id,
        dimensions: pineconeVectors[0]?.values?.length,
        hasMetadata: !!pineconeVectors[0]?.metadata,
        hasSparseValues: !!pineconeVectors[0]?.sparseValues,
      });

      // Perform the upsert using the correct namespace API
      let response;
      if (options.namespace) {
        response = await index
          .namespace(options.namespace)
          .upsert(pineconeVectors);
      } else {
        response = await index.upsert(pineconeVectors);
      }

      console.log(`Upsert successful:`, response);

      return {
        upserted_count: pineconeVectors.length,
        namespace: options.namespace,
      };
    } catch (error) {
      console.error(`Pinecone upsert failed:`, error);

      if (error instanceof Error) {
        if (error.message.includes("dimension")) {
          throw new Error(`Vector dimension mismatch: ${error.message}`);
        } else if (
          error.message.includes("not found") ||
          error.message.includes("404")
        ) {
          throw new Error(
            `Index '${indexName}' not found. Please create the index first.`,
          );
        } else if (
          error.message.includes("unauthorized") ||
          error.message.includes("401")
        ) {
          throw new Error(`Unauthorized: Please check your Pinecone API key.`);
        } else if (
          error.message.includes("quota") ||
          error.message.includes("limit")
        ) {
          throw new Error(`Quota exceeded: ${error.message}`);
        } else {
          throw new Error(`Pinecone upsert failed: ${error.message}`);
        }
      } else {
        throw new Error(`Pinecone upsert failed: Unknown error`);
      }
    }
  }

  async query(
    indexName: string,
    options: {
      vector?: number[];
      id?: string;
      topK?: number;
      filter?: Record<string, any>;
      namespace?: string;
      includeMetadata?: boolean;
      includeValues?: boolean;
    },
  ): Promise<VectorQueryResponse> {
    try {
      const index = this.client.index(indexName);

      const queryRequest: any = {
        topK: options.topK || 10,
        includeMetadata: options.includeMetadata ?? true,
        includeValues: options.includeValues ?? false,
      };

      if (options.vector) {
        queryRequest.vector = options.vector;
      }

      if (options.id) {
        queryRequest.id = options.id;
      }

      if (options.filter) {
        queryRequest.filter = options.filter;
      }

      let response;
      if (options.namespace) {
        response = await index.namespace(options.namespace).query(queryRequest);
      } else {
        response = await index.query(queryRequest);
      }

      // Convert Pinecone response to our format
      const matches: VectorSearchResult[] =
        response.matches?.map((match: any) => ({
          id: match.id,
          score: match.score || 0,
          values: match.values,
          metadata: match.metadata,
        })) || [];

      return {
        matches,
        namespace: options.namespace,
      };
    } catch (error) {
      throw new Error(
        `Pinecone query failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async deleteVectors(
    indexName: string,
    options: {
      ids?: string[];
      deleteAll?: boolean;
      namespace?: string;
      filter?: Record<string, any>;
    },
  ): Promise<VectorDeleteResponse> {
    try {
      const index = this.client.index(indexName);

      const deleteRequest: any = {};

      if (options.deleteAll) {
        deleteRequest.deleteAll = true;
      } else if (options.ids && options.ids.length > 0) {
        deleteRequest.ids = options.ids;
      } else if (options.filter) {
        deleteRequest.filter = options.filter;
      } else {
        throw new Error(
          "Must specify either ids, deleteAll, or filter for deletion",
        );
      }

      let response;
      if (options.namespace) {
        if (options.deleteAll) {
          response = await index.namespace(options.namespace).deleteAll();
        } else if (options.ids && options.ids.length > 0) {
          response = await index
            .namespace(options.namespace)
            .deleteMany(options.ids);
        } else if (options.filter) {
          response = await index
            .namespace(options.namespace)
            .deleteMany(options.filter);
        }
      } else {
        if (options.deleteAll) {
          response = await index.deleteAll();
        } else if (options.ids && options.ids.length > 0) {
          response = await index.deleteMany(options.ids);
        } else if (options.filter) {
          response = await index.deleteMany(options.filter);
        }
      }

      return {
        deleted_count: options.ids?.length, // Estimate
        namespace: options.namespace,
      };
    } catch (error) {
      throw new Error(
        `Pinecone delete failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Utility method to create an index
  async createIndex(options: {
    name: string;
    dimension: number;
    metric?: "euclidean" | "cosine" | "dotproduct";
    cloud?: string;
    region?: string;
  }): Promise<void> {
    try {
      await this.client.createIndex({
        name: options.name,
        dimension: options.dimension,
        metric: options.metric || "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: options.region || "us-east-1",
          },
        },
      });

      console.log(`Index '${options.name}' created successfully`);
    } catch (error) {
      throw new Error(
        `Failed to create index: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Utility method to delete an index
  async deleteIndex(indexName: string): Promise<void> {
    try {
      await this.client.deleteIndex(indexName);
      console.log(`Index '${indexName}' deleted successfully`);
    } catch (error) {
      throw new Error(
        `Failed to delete index: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // Get index description
  async describeIndex(indexName: string): Promise<any> {
    try {
      const description = await this.client.describeIndex(indexName);
      return description;
    } catch (error) {
      throw new Error(
        `Failed to describe index: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
