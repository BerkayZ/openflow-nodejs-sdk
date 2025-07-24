/*
 * Vector Node Types
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

export interface VectorRecord {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
  sparse_values?: {
    indices: number[];
    values: number[];
  };
}

export interface VectorSearchResult {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, any>;
}

export interface VectorQueryResponse {
  matches: VectorSearchResult[];
  namespace?: string;
}

export interface VectorUpsertResponse {
  upserted_count: number;
  namespace?: string;
}

export interface VectorDeleteResponse {
  deleted_count?: number;
  namespace?: string;
}
