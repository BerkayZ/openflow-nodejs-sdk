/*
 * ProviderFactory
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */

import { BaseProvider } from "./BaseProvider";
import { GrokProvider } from "./GrokProvider";
import { OpenAIProvider } from "./OpenAIProvider";
import { ProviderConfig } from "../../../types";

export class ProviderFactory {
  static createProvider(config: ProviderConfig, apiKey: string): BaseProvider {
    switch (config.provider.toLowerCase()) {
      case "grok":
        return new GrokProvider(config, apiKey);
      case "openai":
        return new OpenAIProvider(config, apiKey);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  static getSupportedProviders(): string[] {
    return ["grok", "openai"];
  }
}
