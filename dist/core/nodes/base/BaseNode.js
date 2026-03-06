"use strict";
/*
 * BaseNode
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseNode = void 0;
class BaseNode {
    /**
     * Execute node with error handling and timing
     */
    executeWithContext(node, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            try {
                // Set current node in registry for debugging
                context.registry.setCurrentNode(node.id);
                const output = yield this.execute(node, context);
                const executionTime = Date.now() - startTime;
                return {
                    success: true,
                    output,
                    executionTime,
                };
            }
            catch (error) {
                const executionTime = Date.now() - startTime;
                return {
                    success: false,
                    error: error instanceof Error ? error : new Error("Unknown error"),
                    executionTime,
                };
            }
        });
    }
    /**
     * Resolve variables in text using the registry
     */
    resolveVariables(text, registry) {
        return text.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
            const value = registry.resolveExpression(expression.trim());
            if (value !== undefined && value !== null) {
                // Handle objects and arrays by converting to JSON string
                if (typeof value === "object") {
                    return Array.isArray(value)
                        ? value
                            .map((item) => item !== null &&
                            item !== undefined &&
                            typeof item === "object"
                            ? JSON.stringify(item)
                            : String(item))
                            .join(", ")
                        : JSON.stringify(value);
                }
                return String(value);
            }
            return match;
        });
    }
    /**
     * Resolve variables in an object (recursively)
     */
    resolveObjectVariables(obj, registry) {
        // Handle null and undefined
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (typeof obj === "string") {
            return this.resolveValueExpression(obj, registry);
        }
        else if (Array.isArray(obj)) {
            return obj.map((item) => this.resolveObjectVariables(item, registry));
        }
        else if (typeof obj === "object") {
            const resolved = {};
            for (const [key, value] of Object.entries(obj)) {
                resolved[key] = this.resolveObjectVariables(value, registry);
            }
            return resolved;
        }
        return obj;
    }
    /**
     * Resolve value expression - handles both string templates and object references
     */
    resolveValueExpression(value, registry) {
        // Check if it's a single variable reference pattern: {{variable}} or {{node.property}}
        const singleVariableMatch = value.match(/^\{\{([^}]+)\}\}$/);
        if (singleVariableMatch) {
            // It's a single variable reference, resolve it directly as object
            const expression = singleVariableMatch[1].trim();
            return registry.resolveExpression(expression);
        }
        else {
            // It's a string with embedded variables, use string resolution
            return this.resolveVariables(value, registry);
        }
    }
    /**
     * Resolve variables in config object
     */
    resolveConfigVariables(config, registry) {
        return this.resolveObjectVariables(config, registry);
    }
    /**
     * Log with context information
     */
    log(context, level, message, data) {
        context.logger[level](message, data);
    }
}
exports.BaseNode = BaseNode;
