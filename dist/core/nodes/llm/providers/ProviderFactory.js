"use strict";
/*
 * ProviderFactory
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderFactory = void 0;
const GrokProvider_1 = require("./GrokProvider");
const OpenAIProvider_1 = require("./OpenAIProvider");
const AnthropicProvider_1 = require("./AnthropicProvider");
class ProviderFactory {
    static createProvider(config, apiKey) {
        switch (config.provider.toLowerCase()) {
            case "grok":
                return new GrokProvider_1.GrokProvider(config, apiKey);
            case "openai":
                return new OpenAIProvider_1.OpenAIProvider(config, apiKey);
            case "anthropic":
                return new AnthropicProvider_1.AnthropicProvider(config, apiKey);
            default:
                throw new Error(`Unsupported provider: ${config.provider}`);
        }
    }
    static getSupportedProviders() {
        return ["grok", "openai", "anthropic"];
    }
}
exports.ProviderFactory = ProviderFactory;
