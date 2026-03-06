"use strict";
/*
 * AnthropicProvider
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
const BaseProvider_1 = require("./BaseProvider");
const PromptBuilder_1 = require("../PromptBuilder");
// Constants
const DEFAULT_MAX_TOKENS = 2000;
class AnthropicProvider extends BaseProvider_1.BaseProvider {
    constructor(config, apiKey) {
        super(config, apiKey);
        this.validateApiKey();
    }
    validateApiKey() {
        if (!this.apiKey ||
            this.apiKey.trim() === "" ||
            this.apiKey === "test-key") {
            throw new Error("Valid Anthropic API key is required. Please provide a valid API key.");
        }
    }
    formatMessages(messages) {
        const formattedMessages = [];
        let systemPrompt;
        for (const message of messages) {
            if (message.role === "system") {
                // Anthropic uses a separate system parameter
                if (typeof message.content === "string") {
                    systemPrompt = message.content;
                }
                else {
                    // Extract text from multimodal content
                    const textContent = message.content.find((c) => c.type === "text");
                    systemPrompt = (textContent === null || textContent === void 0 ? void 0 : textContent.text) || "";
                }
            }
            else {
                formattedMessages.push({
                    role: message.role === "user" ? "user" : "assistant",
                    content: message.content,
                });
            }
        }
        return { system: systemPrompt, messages: formattedMessages };
    }
    generateCompletion(messages, outputSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            const userMessage = messages[messages.length - 1];
            // Handle multimodal messages
            let enhancedContent;
            if (Array.isArray(userMessage.content)) {
                // For multimodal messages, append the output instructions to the text content
                const textContent = userMessage.content.find((c) => c.type === "text");
                const textToEnhance = (textContent === null || textContent === void 0 ? void 0 : textContent.text) || "";
                const outputInstructions = PromptBuilder_1.PromptBuilder.buildOutputInstructions(outputSchema);
                const enhancedPrompt = textToEnhance + outputInstructions;
                // Create new multimodal content with enhanced text
                enhancedContent = userMessage.content.map((content) => {
                    if (content.type === "text") {
                        return Object.assign(Object.assign({}, content), { text: enhancedPrompt });
                    }
                    return content;
                });
            }
            else {
                // Simple text message
                enhancedContent = PromptBuilder_1.PromptBuilder.buildPromptWithOutputInstructions(userMessage.content, outputSchema);
            }
            // Format messages for Anthropic API
            const { system, messages: formattedMessages } = this.formatMessages([
                ...messages.slice(0, -1),
                { role: "user", content: enhancedContent },
            ]);
            const requestBody = {
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
                const timeout = setTimeout(() => controller.abort(), this.config.timeout || 60000);
                const response = yield fetch(AnthropicProvider.API_URL, {
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
                    const errorText = yield response.text();
                    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
                }
                const data = yield response.json();
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
            }
            catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    throw new Error(`Anthropic API request timed out after ${this.config.timeout || 60000}ms`);
                }
                throw new Error(`Failed to generate completion with Anthropic: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    generateCompletionStream(messages, outputSchema) {
        return __asyncGenerator(this, arguments, function* generateCompletionStream_1() {
            var _a, _b, _c;
            const userMessage = messages[messages.length - 1];
            // Handle multimodal messages
            let enhancedContent;
            if (Array.isArray(userMessage.content)) {
                const textContent = userMessage.content.find((c) => c.type === "text");
                const textToEnhance = (textContent === null || textContent === void 0 ? void 0 : textContent.text) || "";
                const outputInstructions = PromptBuilder_1.PromptBuilder.buildOutputInstructions(outputSchema);
                const enhancedPrompt = textToEnhance + outputInstructions;
                enhancedContent = userMessage.content.map((content) => {
                    if (content.type === "text") {
                        return Object.assign(Object.assign({}, content), { text: enhancedPrompt });
                    }
                    return content;
                });
            }
            else {
                enhancedContent = PromptBuilder_1.PromptBuilder.buildPromptWithOutputInstructions(userMessage.content, outputSchema);
            }
            // Format messages for Anthropic API
            const { system, messages: formattedMessages } = this.formatMessages([
                ...messages.slice(0, -1),
                { role: "user", content: enhancedContent },
            ]);
            const requestBody = {
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
                const timeout = setTimeout(() => controller.abort(), this.config.timeout || 60000);
                const response = yield __await(fetch(AnthropicProvider.API_URL, {
                    method: "POST",
                    headers: {
                        "x-api-key": this.apiKey,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal,
                }));
                clearTimeout(timeout);
                if (!response.ok) {
                    const errorText = yield __await(response.text());
                    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
                }
                const reader = (_a = response.body) === null || _a === void 0 ? void 0 : _a.getReader();
                if (!reader) {
                    throw new Error("Failed to get response stream reader");
                }
                const decoder = new TextDecoder();
                let buffer = "";
                let accumulatedContent = "";
                let usage = undefined;
                while (true) {
                    const { done, value } = yield __await(reader.read());
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";
                    for (const line of lines) {
                        if (line.trim() === "")
                            continue;
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
                                            if (key === "__proto__" ||
                                                key === "constructor" ||
                                                key === "prototype") {
                                                return undefined;
                                            }
                                            return value;
                                        });
                                        if (eventType === "content_block_delta" && ((_b = data.delta) === null || _b === void 0 ? void 0 : _b.text)) {
                                            const chunk = data.delta.text;
                                            accumulatedContent += chunk;
                                            yield yield __await({
                                                content: chunk,
                                                isComplete: false,
                                            });
                                        }
                                        else if (eventType === "message_delta" && data.usage) {
                                            usage = {
                                                prompt_tokens: data.usage.input_tokens || 0,
                                                completion_tokens: data.usage.output_tokens || 0,
                                                total_tokens: (data.usage.input_tokens || 0) +
                                                    (data.usage.output_tokens || 0),
                                            };
                                        }
                                        else if (eventType === "message_stop") {
                                            // Stream completed
                                            break;
                                        }
                                    }
                                    catch (error) {
                                        // Debug level logging - would normally use a logger if available
                                        // console.debug(`Stream parsing error: ${error.message}`);
                                    }
                                }
                            }
                        }
                        else if (line.startsWith("data: ")) {
                            // Handle SSE format where event and data are on the same line
                            try {
                                const jsonStr = line.slice(6);
                                if (jsonStr !== "[DONE]") {
                                    const data = JSON.parse(jsonStr, (key, value) => {
                                        if (key === "__proto__" ||
                                            key === "constructor" ||
                                            key === "prototype") {
                                            return undefined;
                                        }
                                        return value;
                                    });
                                    if ((_c = data.delta) === null || _c === void 0 ? void 0 : _c.text) {
                                        const chunk = data.delta.text;
                                        accumulatedContent += chunk;
                                        yield yield __await({
                                            content: chunk,
                                            isComplete: false,
                                        });
                                    }
                                }
                            }
                            catch (error) {
                                // Debug level logging
                            }
                        }
                    }
                }
                // Final chunk with usage data
                yield yield __await({
                    content: "",
                    isComplete: true,
                    usage,
                });
            }
            catch (error) {
                throw new Error(`Failed to generate streaming completion with Anthropic: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
}
exports.AnthropicProvider = AnthropicProvider;
AnthropicProvider.API_URL = "https://api.anthropic.com/v1/messages";
