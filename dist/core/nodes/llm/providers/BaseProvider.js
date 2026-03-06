"use strict";
/*
 * BaseProvider
 * OpenFlow Node.JS SDK - Copyright (C) 2025 Berkay Zelyurt
 *
 * Licensed under GPL v3.0 - see LICENSE file for details
 * If not included, see <https://www.gnu.org/licenses/gpl-3.0.en.html>
 */
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
exports.BaseProvider = void 0;
class BaseProvider {
    constructor(config, apiKey) {
        this.config = config;
        this.apiKey = apiKey;
    }
    /**
     * Generate completion with streaming support
     * Returns an async generator that yields stream chunks
     */
    generateCompletionStream(messages, outputSchema) {
        return __asyncGenerator(this, arguments, function* generateCompletionStream_1() {
            // Default implementation: convert non-streaming to streaming
            // Providers can override this for true streaming support
            const response = yield __await(this.generateCompletion(messages, outputSchema));
            yield yield __await({
                content: response.content,
                isComplete: true,
                usage: response.usage,
            });
        });
    }
    parseJsonResponse(response) {
        try {
            const trimmed = response.trim();
            let jsonStr = trimmed;
            if (trimmed.startsWith("```json")) {
                jsonStr = trimmed.slice(7, -3);
            }
            else if (trimmed.startsWith("```")) {
                jsonStr = trimmed.slice(3, -3);
            }
            return JSON.parse(jsonStr, (key, value) => {
                if (key === "__proto__" ||
                    key === "constructor" ||
                    key === "prototype") {
                    return undefined;
                }
                return value;
            });
        }
        catch (error) {
            throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.BaseProvider = BaseProvider;
