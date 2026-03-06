"use strict";
/*
 * OpenAIProvider
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
exports.OpenAIProvider = void 0;
const BaseProvider_1 = require("./BaseProvider");
const PromptBuilder_1 = require("../PromptBuilder");
// Constants
const DEFAULT_MAX_TOKENS = 2000;
class OpenAIProvider extends BaseProvider_1.BaseProvider {
    constructor(config, apiKey) {
        super(config, apiKey);
        this.validateApiKey();
    }
    validateApiKey() {
        if (!this.apiKey ||
            this.apiKey.trim() === "" ||
            this.apiKey === "test-key") {
            throw new Error("Valid OpenAI API key is required. Please provide a valid API key.");
        }
    }
    convertMessagesToOpenAIFormat(messages, outputSchema) {
        if (messages.length === 1) {
            // Single message format
            const message = messages[0];
            if (Array.isArray(message.content)) {
                // Multimodal message - convert to OpenAI format
                const convertedContent = message.content.map((content) => {
                    var _a;
                    if (content.type === "text") {
                        const outputInstructions = PromptBuilder_1.PromptBuilder.buildOutputInstructions(outputSchema);
                        const enhancedText = content.text + outputInstructions;
                        return {
                            type: "input_text",
                            text: enhancedText,
                        };
                    }
                    else if (content.type === "image_url") {
                        return {
                            type: "input_image",
                            image_url: ((_a = content.image_url) === null || _a === void 0 ? void 0 : _a.url) || "",
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
            }
            else {
                // Simple text message
                const enhancedContent = PromptBuilder_1.PromptBuilder.buildPromptWithOutputInstructions(message.content, outputSchema);
                return enhancedContent;
            }
        }
        else {
            // Multiple messages - convert to conversation format
            const lastMessage = messages[messages.length - 1];
            let enhancedContent;
            if (Array.isArray(lastMessage.content)) {
                // Handle multimodal messages
                const textContent = lastMessage.content.find((c) => c.type === "text");
                const textToEnhance = (textContent === null || textContent === void 0 ? void 0 : textContent.text) || "";
                const outputInstructions = PromptBuilder_1.PromptBuilder.buildOutputInstructions(outputSchema);
                const enhancedPrompt = textToEnhance + outputInstructions;
                enhancedContent = lastMessage.content.map((content) => {
                    var _a;
                    if (content.type === "text") {
                        return {
                            type: "input_text",
                            text: enhancedPrompt,
                        };
                    }
                    else if (content.type === "image_url") {
                        return {
                            type: "input_image",
                            image_url: ((_a = content.image_url) === null || _a === void 0 ? void 0 : _a.url) || "",
                        };
                    }
                    return content;
                });
            }
            else {
                // Simple text message
                enhancedContent = PromptBuilder_1.PromptBuilder.buildPromptWithOutputInstructions(lastMessage.content, outputSchema);
            }
            return [
                ...messages.slice(0, -1).map((msg) => ({
                    role: msg.role,
                    content: Array.isArray(msg.content)
                        ? msg.content.map((c) => {
                            var _a;
                            return (Object.assign(Object.assign({ type: c.type === "text"
                                    ? "input_text"
                                    : c.type === "image_url"
                                        ? "input_image"
                                        : c.type }, (c.type === "text" ? { text: c.text } : {})), (c.type === "image_url"
                                ? { image_url: (_a = c.image_url) === null || _a === void 0 ? void 0 : _a.url }
                                : {})));
                        })
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
    generateCompletion(messages, outputSchema) {
        return __awaiter(this, void 0, void 0, function* () {
            const input = this.convertMessagesToOpenAIFormat(messages, outputSchema);
            const requestBody = {
                model: this.config.model || "gpt-4.1",
                input: input,
                max_output_tokens: this.config.max_tokens || DEFAULT_MAX_TOKENS,
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
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), this.config.timeout || 60000);
                const response = yield fetch(OpenAIProvider.API_URL, {
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
                    const errorText = yield response.text();
                    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
                }
                const data = yield response.json();
                if (data.status !== "completed") {
                    throw new Error(`OpenAI API response not completed. Status: ${data.status}`);
                }
                if (!data.output || !data.output[0] || !data.output[0].content) {
                    throw new Error("Invalid response format from OpenAI API");
                }
                // Extract text content from the response
                const outputMessage = data.output[0];
                const textContent = outputMessage.content.find((c) => c.type === "output_text");
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
            }
            catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    throw new Error(`OpenAI API request timed out after ${this.config.timeout || 60000}ms`);
                }
                throw new Error(`Failed to generate completion with OpenAI: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    generateCompletionStream(messages, outputSchema) {
        return __asyncGenerator(this, arguments, function* generateCompletionStream_1() {
            var _a, _b, _c;
            const input = this.convertMessagesToOpenAIFormat(messages, outputSchema);
            const requestBody = {
                model: this.config.model || "gpt-4.1",
                input: input,
                max_output_tokens: this.config.max_tokens || DEFAULT_MAX_TOKENS,
                temperature: this.config.temperature || 1.0,
                top_p: 1.0,
                stream: true, // Enable streaming
                store: true,
                parallel_tool_calls: true,
                tool_choice: "auto",
                tools: [],
                truncation: "disabled",
            };
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), this.config.timeout || 60000);
                const response = yield __await(fetch(OpenAIProvider.API_URL, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal,
                }));
                clearTimeout(timeout);
                if (!response.ok) {
                    const errorText = yield __await(response.text());
                    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
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
                        if (line.trim() === "" || line.trim() === "data: [DONE]")
                            continue;
                        if (line.startsWith("data: ")) {
                            try {
                                const jsonStr = line.slice(6);
                                const data = JSON.parse(jsonStr, (key, value) => {
                                    if (key === "__proto__" ||
                                        key === "constructor" ||
                                        key === "prototype") {
                                        return undefined;
                                    }
                                    return value;
                                });
                                // Handle OpenAI streaming format
                                if ((_c = (_b = data.output) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) {
                                    const outputContent = data.output[0].content.find((c) => c.type === "output_text");
                                    if (outputContent === null || outputContent === void 0 ? void 0 : outputContent.text) {
                                        const chunk = outputContent.text;
                                        accumulatedContent += chunk;
                                        yield yield __await({
                                            content: chunk,
                                            isComplete: false,
                                        });
                                    }
                                }
                                // Capture usage data if available
                                if (data.usage) {
                                    usage = {
                                        prompt_tokens: data.usage.input_tokens,
                                        completion_tokens: data.usage.output_tokens,
                                        total_tokens: data.usage.total_tokens,
                                    };
                                }
                            }
                            catch (error) {
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
                yield yield __await({
                    content: "",
                    isComplete: true,
                    usage,
                });
            }
            catch (error) {
                throw new Error(`Failed to generate streaming completion with OpenAI: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
}
exports.OpenAIProvider = OpenAIProvider;
OpenAIProvider.API_URL = "https://api.openai.com/v1/responses";
